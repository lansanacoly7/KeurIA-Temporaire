# T21 — Créer, supprimer, réordonner des leçons et des modules (Catalogue en base)

## 1. Problématique & Objectif
Aujourd'hui, la liste des 10 modules et des 40 leçons est figée dans le code (`backend/apps/curriculum/data/tracks_data.py`).
L'administrateur peut éditer le *contenu* d'une leçon existante, mais ne peut ni créer une 5e leçon dans un module, ni créer un 11e module, ni masquer une leçon obsolète, ni réordonner les cours.
L'objectif de T21 est d'introduire un **catalogue versionné en base** (`CatalogVersion`) qui surcharge `tracks_data.py` en toute sécurité, sans risquer de corrompre la progression des élèves existants.

---

## 2. Règles d'or & Sécurité de la progression
1. **Socle immuable + Surcharge versionnée** :
   - `tracks_data.py` reste le socle de référence par défaut.
   - Le catalogue actif est calculé en appliquant la version publiée du catalogue (`CatalogVersion` avec `status="live"`) sur ce socle.
2. **Identifiants uniques et pérennes** :
   - Un identifiant de leçon (`pX-Y`) ou de module (`pX`) n'est jamais réutilisé.
   - Un nouveau module reçoit le prochain numéro disponible (`p11`, etc.).
   - Une nouvelle leçon dans un module reçoit le prochain index disponible (`p1-5`, etc.).
3. **Protection contre la destruction de données (Soft-delete / Masquage)** :
   - Si une leçon possède de l'historique d'apprentissage (entrées dans `UserTrackProgress`, `ActivityCompletion`, badges ou XP), sa suppression définitive est **bloquée par le serveur** ; elle est alors **masquée** (`hidden=true`).
   - Une leçon masquée reste accessible pour consulter les historiques mais n'apparaît plus sur l'archipel des enfants.
4. **Modèle de publication identique aux leçons** :
   - Brouillon (`draft`) -> Publication programmée (`pending` avec délai de sécurité) -> En ligne (`live`) -> Historique (`archived`).
   - Possibilité d'annulation ou de mise en ligne immédiate.

---

## 3. Modèle de données (`backend/apps/curriculum/models.py`)

```python
class CatalogVersion(models.Model):
    STATUS_DRAFT = 'draft'
    STATUS_PENDING = 'pending'
    STATUS_LIVE = 'live'
    STATUS_ARCHIVED = 'archived'
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Brouillon'),
        (STATUS_PENDING, 'Publication programmée'),
        (STATUS_LIVE, 'En ligne'),
        (STATUS_ARCHIVED, 'Archivée'),
    ]

    track_key = models.CharField(max_length=16, default='7-9')
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    version_number = models.PositiveIntegerField(default=1)
    content = models.JSONField(help_text="Structure complète {modules: [...], lessons: [...]}")
    note = models.CharField(max_length=255, blank=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    publish_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-version_number']
```

Format du JSON `content` :
```json
{
  "modules": [
    { "id": "p1", "title": "Bonjour, l’IA !", "description": "...", "color": "sun", "icon": "🤖", "order": 1, "hidden": false }
  ],
  "lessons": [
    { "id": "p1-1", "moduleId": "p1", "title": "C’est quoi une IA ?", "order": 1, "hidden": false }
  ]
}
```

---

## 4. API Superadmin & Public

### Endpoints Superadmin (`/api/superadmin/studio79/catalog`)
- `GET /api/superadmin/studio79/catalog` : retourne le catalogue de travail (brouillon s'il existe, sinon en ligne), l'état des versions et publications en attente.
- `PUT /api/superadmin/studio79/catalog/draft` : sauvegarde des modifications du catalogue (titres, ordres, visibilité).
- `POST /api/superadmin/studio79/catalog/lessons/new` : crée une nouvelle leçon avec identifiant garanti libre et contenu vierge valide (histoire, découvre, activité, je retiens).
- `POST /api/superadmin/studio79/catalog/lessons/<id>/duplicate` : duplique une leçon existante vers un nouvel identifiant.
- `POST /api/superadmin/studio79/catalog/lessons/<id>/toggle-hide` : masque ou démasque une leçon.
- `DELETE /api/superadmin/studio79/catalog/lessons/<id>` : suppression autorisée uniquement si aucun élève n'a de progression associée.
- `POST /api/superadmin/studio79/catalog/modules/new` : ajoute un nouveau module `p(N+1)`.
- `POST /api/superadmin/studio79/catalog/publish` : programme la publication du catalogue.

### Endpoint Public Élève (`/api/curriculum/tracks/7-9/` & `/api/curriculum/content79/`)
- Relaye automatiquement les modules et leçons actifs (`live` et non masqués).

---

## 5. Côté Frontend & Carte des Îles (`Archipel79.tsx`)
- Mise à jour de la fonction `computeMap` pour positionner dynamiquement les modules (10 îles d'origine + nouvelles îles réparties harmonieusement).
- Prise en charge des leçons créées dans `isPlayable` : chargement direct du contenu studio publié si le fichier statique n'existe pas.
- Dans `StudioHome.tsx` :
  - Bouton « Nouveau module ».
  - Bouton « Nouvelle leçon » dans chaque bloc de module.
  - Boutons de réordonnancement (Monter / Descendre).
  - Bouton « Dupliquer ».
  - Bouton « Masquer » (avec badge visuel « Masquée »).
  - Bouton « Supprimer » avec modale de confirmation.
  - Bandeau de publication du catalogue avec délai de 15 minutes.

---

## 6. Plan de test et validation
1. Tests unitaires backend (`test_catalog79.py`) :
   - Création de module et leçon, incrément d'ID correct.
   - Refus de suppression si progression existante (code 409 / Conflict).
   - Masquage et démasquage.
   - Réordonnancement.
   - Publication du catalogue et passage en `live`.
2. Tests unitaires frontend (`parcours79-logic.test.mjs`) :
   - Calcul de la carte avec N modules.
   - Jouabilité des leçons virtuelles.
3. Vérification de bout en bout (navigateur CDP) :
   - Création d'une leçon dans le module 1.
   - Publication immédiate.
   - Vérification de l'apparition sur la carte élève et jeu de la leçon.
   - Progression enregistrée.
   - Tentative de suppression refusée (sécurité validée) et bascule en masquée.
