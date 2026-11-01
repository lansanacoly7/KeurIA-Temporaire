"""
Import de listes : lecture des fichiers Excel et aperçu ligne par ligne (miroir de
previewStudentImport / previewTeacherImport et de lib/importing.ts).
Le CSV est lu dans le navigateur ; l'Excel (.xlsx) est lu ici avec openpyxl.
"""
import re
from datetime import date, datetime
from io import BytesIO
from zipfile import BadZipFile

from openpyxl import load_workbook
from openpyxl.utils.exceptions import InvalidFileException

from ..errors import ApiError
from ..identifiers import normalize_text
from ..levels import class_name, level_info
from ..models import Classroom, StudentProfile
from .common import age_from, get_classroom
from apps.accounts.serializers import phone_problem

from .ecole import _birth_date_problem, _email_problem

MAX_FILE_BYTES = 5 * 1024 * 1024
MAX_ROWS = 2000
MAX_PDF_PAGES = 50  # un PDF de 5 Mo peut contenir des milliers de pages : on borne le travail
STUDENT_FIELDS = ('matricule', 'firstName', 'lastName', 'sexe', 'birthDate', 'className')
TEACHER_FIELDS = ('firstName', 'lastName', 'email', 'phone', 'classNames')


# ─── Lecture Excel ───────────────────────────────────────────────────────────

def _cell_text(value) -> str:
    if value is None:
        return ''
    if isinstance(value, datetime):
        value = value.date()
    if isinstance(value, date):
        # Formatage explicite : `strftime('%Y')` ne complète pas l'année à 4 chiffres sous Linux (« 210 »), contrairement à Windows (« 0210 »).
        return f"{value.day:02d}/{value.month:02d}/{value.year:04d}"
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def read_pdf(upload) -> list:
    """Extrait les lignes d'un PDF sous forme de tableau de cellules (string[][])."""
    if upload.size > MAX_FILE_BYTES:
        raise ApiError('Fichier trop lourd (5 Mo maximum).')
    try:
        import pypdf
        reader = pypdf.PdfReader(BytesIO(upload.read()))
    except Exception:
        raise ApiError('Fichier PDF illisible ou corrompu.') from None

    if reader.is_encrypted:
        raise ApiError('Ce PDF est protégé par un mot de passe : exportez-le sans protection.')
    if len(reader.pages) > MAX_PDF_PAGES:
        raise ApiError(f'PDF trop long ({MAX_PDF_PAGES} pages maximum).')

    table = []
    for page in reader.pages:
        try:
            text = page.extract_text() or ''
        except Exception:
            raise ApiError('Fichier PDF illisible ou corrompu.') from None
        for raw_line in text.splitlines():
            line = raw_line.strip()
            if not line:
                continue
            if '\t' in line:
                cells = [c.strip() for c in line.split('\t')]
            elif ';' in line:
                cells = [c.strip() for c in line.split(';')]
            elif ',' in line and not re.search(r'\d,\d', line):
                cells = [c.strip() for c in line.split(',')]
            else:
                cells = [c.strip() for c in re.split(r'\s{2,}', line)]

            cells = [c for c in cells if c]
            if len(cells) >= 2:
                table.append(cells)
            if len(table) > MAX_ROWS + 1:
                raise ApiError(f'Fichier trop long ({MAX_ROWS} lignes maximum).')

    if len(table) < 2:
        raise ApiError('Le fichier PDF ne contient pas de tableau de données exploitable (vérifiez qu’il contient du texte et non une image scannée).')
    return table


def read_excel(upload) -> list:
    """Première feuille d'un .xlsx → tableau de textes (comme le lecteur CSV du navigateur)."""
    name = (upload.name or '').lower()
    if name.endswith('.xls'):
        raise ApiError('Ancien format Excel (.xls) : enregistrez le fichier au format .xlsx, puis réessayez.')
    if not name.endswith('.xlsx'):
        raise ApiError('Format non pris en charge : utilisez un fichier Excel (.xlsx), CSV ou PDF.')
    if upload.size > MAX_FILE_BYTES:
        raise ApiError('Fichier trop lourd (5 Mo maximum).')
    try:
        workbook = load_workbook(BytesIO(upload.read()), read_only=True, data_only=True)
    except (BadZipFile, InvalidFileException, KeyError, OSError, ValueError, TypeError):
        raise ApiError('Fichier Excel illisible : vérifiez qu\'il s\'agit bien d\'un classeur .xlsx.') from None
    try:
        sheet = workbook.worksheets[0]
        table = []
        for row in sheet.iter_rows(values_only=True):
            cells = [_cell_text(v) for v in row]
            if any(cells):
                table.append(cells)
            if len(table) > MAX_ROWS + 1:
                raise ApiError(f'Fichier trop long ({MAX_ROWS} lignes maximum).')
    finally:
        workbook.close()
    if len(table) < 2:
        raise ApiError('Le fichier ne contient aucune ligne de données.')
    return table


def read_file(upload) -> list:
    """Lit un fichier téléversé : .xlsx ou .pdf."""
    name = (upload.name or '').lower()
    if name.endswith('.pdf'):
        return read_pdf(upload)
    if name.endswith('.xlsx'):
        return read_excel(upload)
    if name.endswith('.xls'):
        raise ApiError('Ancien format Excel (.xls) : convertissez-le en .xlsx ou .pdf.')
    raise ApiError('Format non pris en charge : utilisez un fichier Excel (.xlsx), CSV (.csv) ou PDF (.pdf).')



# ─── Aperçu ──────────────────────────────────────────────────────────────────

def parse_date(value: str):
    """« 14/03/2018 », « 14-03-2018 » ou « 2018-03-14 » → date (None si illisible)."""
    text = value.strip()
    match = re.fullmatch(r'(\d{4})-(\d{1,2})-(\d{1,2})', text)
    if match:
        year, month, day = match.groups()
    else:
        match = re.fullmatch(r'(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})', text)
        if not match:
            return None
        day, month, year = match.groups()
    try:
        return date(int(year), int(month), int(day))
    except ValueError:
        return None


def parse_sexe(value: str):
    text = re.sub(r'[^a-z0-9]', '', normalize_text(value))
    if text in ('f', 'fille', 'feminin', 'femme'):
        return 'F'
    if text in ('m', 'g', 'garcon', 'masculin', 'homme'):
        return 'M'
    return None


def _records(raw, fields) -> list:
    if not isinstance(raw, list) or not 0 < len(raw) <= MAX_ROWS:
        raise ApiError(f'Entre 1 et {MAX_ROWS} lignes par import.')
    records = []
    for item in raw:
        values = item.get('values') if isinstance(item, dict) else None
        if not isinstance(values, dict) or not isinstance(item.get('line'), int):
            raise ApiError('Lignes invalides.')
        records.append({'line': item['line'], 'values': {f: str(values.get(f, ''))[:200] for f in fields}})
    return records


def _label_key(label: str) -> str:
    return re.sub(r'[^a-z0-9]', '', normalize_text(label))


def _classrooms_by_label(school) -> dict:
    """« ce1 a », « CE1-A », « CE1A » → la classe CE1 A (non archivée)."""
    return {_label_key(class_name(c.level, c.section)): c
            for c in Classroom.objects.filter(school=school, archived=False).select_related('teacher__staff_profile')}


def preview_students(school, raw_records, default_class_id) -> list:
    records = _records(raw_records, STUDENT_FIELDS)
    default_class = get_classroom(school, default_class_id, active=True) if default_class_id else None
    by_label = _classrooms_by_label(school)
    existing = set(StudentProfile.objects.filter(school=school).values_list('matricule', flat=True))
    counts = {}
    for r in records:
        key = r['values']['matricule'].strip().upper()
        counts[key] = counts.get(key, 0) + 1

    rows = []
    for r in records:
        values = r['values']
        errors, warnings = {}, {}
        matricule = values['matricule'].strip().upper()
        sexe = parse_sexe(values['sexe'])
        birth = parse_date(values['birthDate'])
        label = values['className'].strip()
        classroom = by_label.get(_label_key(label)) if label else None

        if not values['firstName'].strip():
            errors['firstName'] = 'Prénom manquant.'
        if not values['lastName'].strip():
            errors['lastName'] = 'Nom manquant.'
        if not matricule:
            errors['matricule'] = 'Le matricule est obligatoire.'
        elif matricule in existing:
            errors['matricule'] = f'Le matricule {matricule} est déjà attribué.'
        elif counts.get(matricule, 0) > 1:
            errors['matricule'] = 'Matricule présent plusieurs fois dans le fichier.'
        if not sexe:
            errors['sexe'] = 'Indiquez F ou M.'
        if not values['birthDate'].strip():
            errors['birthDate'] = 'Date de naissance manquante.'
        elif birth is None:
            errors['birthDate'] = 'Date invalide ou illisible (format JJ/MM/AAAA).'
        elif _birth_date_problem(birth):
            errors['birthDate'] = _birth_date_problem(birth)
        if label and classroom is None:
            errors['className'] = f'Classe « {label} » introuvable.'

        target = classroom or default_class
        if birth and 'birthDate' not in errors and target:
            expected = level_info(target.level).typical_age
            age = age_from(birth)
            if abs(age - expected) > 2:
                warnings['birthDate'] = f'{age} ans : âge inhabituel en {target.level}.'

        valid = not errors
        rows.append({
            'line': r['line'], 'values': values, 'errors': errors, 'warnings': warnings,
            'input': {
                'matricule': matricule, 'firstName': values['firstName'].strip(), 'lastName': values['lastName'].strip(),
                'sexe': sexe, 'birthDate': birth.isoformat(),
                'classId': str(classroom.pk) if classroom else (str(default_class.pk) if default_class else None),
            } if valid else None,
        })
    return rows


def preview_teachers(school, raw_records) -> list:
    records = _records(raw_records, TEACHER_FIELDS)
    by_label = _classrooms_by_label(school)
    counts = {}
    for r in records:
        key = r['values']['email'].strip().lower()
        counts[key] = counts.get(key, 0) + 1
    # Une classe ne peut être confiée qu'à un seul enseignant du fichier.
    class_owner = {}

    rows = []
    for r in records:
        values = r['values']
        errors, warnings = {}, {}
        email = values['email'].strip().lower()
        phone = values['phone'].strip()
        if not values['firstName'].strip():
            errors['firstName'] = 'Prénom manquant.'
        if not values['lastName'].strip():
            errors['lastName'] = 'Nom manquant.'
        email_error = _email_problem(email) or ('E-mail présent plusieurs fois dans le fichier.' if counts.get(email, 0) > 1 else None)
        if email_error:
            errors['email'] = email_error
        phone_error = phone_problem(phone)
        if phone_error:
            errors['phone'] = phone_error

        class_ids, class_errors, class_warnings = [], [], []
        for label in [part.strip() for part in re.split(r'[,;/]', values['classNames']) if part.strip()]:
            classroom = by_label.get(_label_key(label))
            if classroom is None:
                class_errors.append(f'Classe « {label} » introuvable.')
                continue
            owner = class_owner.get(classroom.pk)
            if owner is not None and owner != r['line']:
                class_errors.append(f'{class_name(classroom.level, classroom.section)} est déjà confiée ligne {owner}.')
                continue
            class_owner[classroom.pk] = r['line']
            class_ids.append(str(classroom.pk))
            if classroom.teacher_id:
                staff = classroom.teacher.staff_profile
                class_warnings.append(f'{class_name(classroom.level, classroom.section)} sera retirée à {staff.first_name} {staff.last_name}.')
        if class_errors:
            errors['classNames'] = ' '.join(class_errors)
        if class_warnings:
            warnings['classNames'] = ' '.join(class_warnings)

        rows.append({
            'line': r['line'], 'values': values, 'errors': errors, 'warnings': warnings,
            'input': {'firstName': values['firstName'].strip(), 'lastName': values['lastName'].strip(),
                      'email': email, 'phone': phone, 'classIds': class_ids} if not errors else None,
        })
    return rows

