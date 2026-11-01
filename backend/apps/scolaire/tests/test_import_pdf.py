from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase
from pypdf import PdfWriter

from ..errors import ApiError
from ..services import imports


def text_pdf(lines):
    """PDF minimal d'une page contenant les lignes de texte données."""
    stream = 'BT /F1 12 Tf 50 700 Td ' + ' 0 -20 Td '.join(f'({line}) Tj' for line in lines) + ' ET'
    objects = [
        '<</Type/Catalog/Pages 2 0 R>>',
        '<</Type/Pages/Kids[3 0 R]/Count 1>>',
        '<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>',
        f'<</Length {len(stream)}>>\nstream\n{stream}\nendstream',
        '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>',
    ]
    out = b'%PDF-1.4\n'
    offsets = []
    for i, obj in enumerate(objects, 1):
        offsets.append(len(out))
        out += f'{i} 0 obj\n{obj}\nendobj\n'.encode('latin-1')
    xref_at = len(out)
    out += f'xref\n0 {len(objects) + 1}\n0000000000 65535 f \n'.encode()
    out += ''.join(f'{offset:010d} 00000 n \n' for offset in offsets).encode()
    out += f'trailer\n<</Size {len(objects) + 1}/Root 1 0 R>>\nstartxref\n{xref_at}\n%%EOF'.encode()
    return out


def upload(data, name='liste.pdf'):
    return SimpleUploadedFile(name, data, content_type='application/pdf')


def blank_pdf(pages, password=None):
    writer = PdfWriter()
    for _ in range(pages):
        writer.add_blank_page(width=100, height=100)
    if password:
        writer.encrypt(password)
    buffer = BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


class ReadPdfTests(SimpleTestCase):
    def test_reads_a_table_from_a_text_pdf(self):
        table = imports.read_pdf(upload(text_pdf(['Nom;Prenom;Classe', 'Sarr;Awa;CE1 A', 'Fall;Moussa;CE1 B'])))

        self.assertEqual(table[0], ['Nom', 'Prenom', 'Classe'])
        self.assertEqual(table[1], ['Sarr', 'Awa', 'CE1 A'])
        self.assertEqual(len(table), 3)

    def test_garbage_is_refused_cleanly(self):
        with self.assertRaises(ApiError) as ctx:
            imports.read_pdf(upload(b'ceci n est pas un pdf'))
        self.assertIn('illisible', str(ctx.exception))

    def test_pdf_without_a_table_is_refused(self):
        with self.assertRaises(ApiError):
            imports.read_pdf(upload(blank_pdf(1)))

    def test_too_many_pages_are_refused_before_any_extraction(self):
        with self.assertRaises(ApiError) as ctx:
            imports.read_pdf(upload(blank_pdf(imports.MAX_PDF_PAGES + 1)))
        self.assertIn('trop long', str(ctx.exception))

    def test_password_protected_pdf_is_refused_with_a_clear_message(self):
        with self.assertRaises(ApiError) as ctx:
            imports.read_pdf(upload(blank_pdf(1, password='secret')))
        self.assertIn('mot de passe', str(ctx.exception))

    def test_oversized_file_is_refused(self):
        with self.assertRaises(ApiError) as ctx:
            imports.read_pdf(upload(b'0' * (imports.MAX_FILE_BYTES + 1)))
        self.assertIn('trop lourd', str(ctx.exception))
