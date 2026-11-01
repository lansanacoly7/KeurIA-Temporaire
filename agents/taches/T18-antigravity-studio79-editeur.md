# T18 — Antigravity — assembler l'éditeur du studio 7-9 et en faire une référence de design

Tu sors de ton rôle habituel (images, vérification visuelle) pour écrire du code d'interface : dis-le dans le message de chaque commit. C'est voulu par Lansana :
le studio doit être une page « banger », belle, fluide, et tu as l'œil pour ça. Tu vérifies **toi-même, dans un vrai navigateur**, ce que tu construis.

**Lis d'abord `docs/STUDIO79.md`** (décisions, serveur, interface) et `docs/REGLES_AGENTS.md`. Pars du sommet de `Dev_Lansana_Coly` (commit `[claude]` « studio 7-9 : fondation »).
Après le `git pull` : `manage.py migrate` (nouvelles tables) et relance le site depuis ton clone.

## Le but

L'administrateur général (rôle `admin`, ex. Siribra) modifie les leçons du parcours 7-9 **sans coder** : il ouvre une leçon, voit ses écrans, change le texte, la pose de Palou,
l'image, les activités, réordonne par glisser-déposer, voit l'**aperçu fidèle** (le vrai lecteur de l'enfant), puis **publie** ; la modification est visible des enfants **15 minutes après**
(il peut annuler pendant ce temps). Beaucoup des briques existent déjà ; il reste à les **assembler** et à **habiller** le tout.

## Ce qui existe (ne le réécris pas ; corrige-le s'il a un défaut, et dis-le dans le rapport)

Dans `frontend/app/admin/_components/studio79/` : `ScreenRail` (liste des écrans), `ScreenInspector` + `LessonInfoInspector` (panneau de droite), `PreviewFrame` (aperçu),
`MediaPicker` (médiathèque), `SchemaForm` + `roundSchemas` (formulaires des 17 activités), `studioModel`. Client API : `frontend/app/_scolaire/lib/studio79Api.ts`
(`getStudioOverview`, `getStudioLesson`, `saveDraft`, `discardDraft`, `publishLesson`, `publishRefusal`, `cancelPublication`, `rollbackLesson`, `listMedia`, `uploadMedia`).
Composants maison réutilisables : `frontend/app/_scolaire/ui/ui.tsx` (`Modal`, `ConfirmModal`, `Notice`, `ErrorMessage`, `Skeleton`, `Badge`, `EmptyState`, `PageHeader`), `useApi`, `formatRelative`.
Variables de couleur : `--ec-ink #173e3c`, `--ec-ink-deep #0d2e2c`, `--ec-brand #0d846e`, `--ec-lime #d9ef59`, `--ec-brand-soft`, `--ec-line`, `--ec-muted`, `--ec-radius`, `--ec-shadow` (voir `frontend/app/_scolaire/styles/scolaire/`).

## À construire

### 1. `LessonEditor.tsx` — l'espace de travail d'une leçon (route `/admin/studio79/[lessonId]`)

Plein écran (grille : barre du haut 56 px · colonne des écrans ~300 px · aperçu · inspecteur ~380 px), avec un bouton « Quitter » vers `/admin/studio79`. Lis le guide Next de
`frontend/node_modules/next/dist/docs/` avant d'écrire la route (Next 16 : `params` est une promesse côté serveur ; `frontend/AGENTS.md`).

- **État** : `content` (copie de travail, au départ `lesson.working.content`), `selected` (`-1` = fiche de la leçon, sinon l'index de l'écran), `issues`, état d'enregistrement.
  Passe `content`, `selected` à `PreviewFrame`, `ScreenRail` (`onChange(screens, selected)`), `ScreenInspector` / `LessonInfoInspector`. `severity` du rail = par n° d'écran (`issue.screen`, 1-based) : `error` l'emporte sur `warning`.
- **Enregistrement automatique** : 1,2 s après la dernière frappe, `saveDraft(id, content)`. Indicateur toujours visible et annoncé aux lecteurs d'écran (`aria-live="polite"`) :
  « Enregistrement… », « Brouillon enregistré à 14:32 », « Non enregistré — réessayer » (erreur réseau : bouton de nouvelle tentative, rien n'est perdu). `beforeunload` si des modifications ne sont pas parties.
  La réponse de `saveDraft` contient les `issues` à jour.
- **Annuler / Rétablir** (50 états gardés) : `Ctrl+Z`, `Ctrl+Maj+Z`/`Ctrl+Y`, et deux boutons. **`Ctrl+S`** force l'enregistrement. Raccourcis ignorés dans un champ de texte pour Annuler/Rétablir (le navigateur gère).
- **Barre du haut** : « Quitter », titre de la leçon + module, indicateur d'enregistrement, bouton **Problèmes** (pastille rouge = erreurs, orange = avertissements ; ouvre un panneau qui liste `issues` ;
  un clic saute à l'écran concerné ; sans écran → ouvre la fiche), **Historique**, **Écarter le brouillon** (si brouillon ; `ConfirmModal`, puis `discardDraft` et rechargement), **Publier** (bouton principal citron/vert foncé ;
  désactivé s'il n'y a aucun changement par rapport à la version en ligne).
- **Bandeau de publication en attente** (si `lesson.pending`) : « La version 3 sera en ligne à 14:47 (dans 12 min) », compte à rebours vivant, bouton **Annuler la publication** (`cancelPublication`, puis rechargement ; le
  contenu redevient le brouillon).
- **Aperçu** : `PreviewFrame` tel quel. Un bouton « Aperçu plein écran » (même cadre agrandi dans un `Modal` large) est un plus.
- **Largeurs** : complet à partir de 1200 px ; entre 900 et 1199 px, l'inspecteur devient un tiroir à droite ; en dessous de 900 px, un message poli (« Le studio se travaille sur ordinateur ou sur une tablette large ») au lieu d'une interface écrasée.

### 2. `PublishPanel.tsx` — publier sans fausse manœuvre

`Modal` ouvert par « Publier » (enregistre d'abord le brouillon en attente). Il montre : un **résumé des changements** par rapport à `lesson.live.content` (écrans modifiés / ajoutés / supprimés : comparaison simple des
écrans par position) ; la phrase **« Visible des enfants à HH:MM (dans 15 minutes). Vous pourrez annuler jusqu'à cette heure. »** (`lesson.delayMinutes`) ; les problèmes :
- **erreurs** (`severity: "error"`) : rouge, le bouton de publication est désactivé, chaque ligne a « Corriger » (ferme le modal et saute à l'écran) ;
- **avertissements** (`warning`) : orange, case obligatoire « Je confirme publier malgré ces règles de style » ; sans la case, le bouton reste désactivé ; avec elle, `publishLesson(id, true)`.
Gère les refus du serveur avec `publishRefusal(error)` : `blocking` (422) → montre `issues` ; `needsAcknowledge` (409) → coche manquante. Succès → fermeture, notification, rechargement (le bandeau d'attente apparaît).

### 3. Historique (tiroir)

Liste `lesson.history` : numéro, étiquette d'état (**En ligne**, **En attente**, **Ancienne**), origine (`import` = « Contenu d'origine », `studio` = « Modification », `rollback` = « Retour arrière »), auteur, date relative + exacte au survol, note.
**Restaurer** sur une version ancienne (pas sur celle en ligne) : `ConfirmModal` qui dit clairement « Le retour est **immédiat** : les enfants verront cette version tout de suite », puis `rollbackLesson`.

### 4. `StudioHome.tsx` — l'accueil du studio (route `/admin/studio79`)

`getStudioOverview()` (40 leçons, 10 modules). En-tête avec 3 chiffres (leçons modifiées · brouillons en cours · publications en attente), recherche, filtres (Tout · Brouillons · En attente · Modifiées).
Un bloc par module (titre, numéro, couleur propre à chaque module : décline la palette de marque, pas d'emoji) avec ses 4 leçons : pastilles d'état (**Modifiée**, **Brouillon**, **En attente 14:47**), dernière modification (`lastEditedBy`, `lastEditedAt`),
bouton « Ouvrir ». État vide et squelettes de chargement soignés. Un bouton **Médiathèque** ouvre `MediaPicker` (consultation).

### 5. Menu et liens

Dans `frontend/app/admin/_components/AdminShell.tsx`, ajoute **« Studio 7-9 ans »** (icône `Wand2` de lucide) sous « Studio de contenus ». Sur `/admin/studio` (ancien studio), ajoute un bandeau qui renvoie vers le nouveau
(« Les leçons des 7-9 ans se modifient maintenant ici »).

### 6. `studio79.css` — le design

Écris la feuille de style pour **toutes** les classes `sx-*` déjà utilisées par les composants : `sx-add, sx-advanced, sx-check, sx-chip, sx-chips, sx-counter, sx-device, sx-dl, sx-drop, sx-field, sx-fields, sx-flag, sx-ghost, sx-group, sx-handle, sx-hint,
sx-icon-btn, sx-image, sx-image-actions, sx-image-empty, sx-input, sx-inspector-body, sx-item, sx-item-body, sx-item-head, sx-item-title, sx-kind-banner, sx-kind-dot, sx-label, sx-list, sx-media, sx-media-grid, sx-media-title, sx-media-video, sx-picker, sx-picker-head,
sx-pict, sx-pict-empty, sx-pict-list, sx-pict-search, sx-pict-thumb, sx-pose, sx-poses, sx-preview, sx-preview-bar, sx-rail, sx-rail-info, sx-rail-title, sx-round, sx-round-head, sx-row, sx-rows, sx-screen, sx-screen-actions, sx-screen-main, sx-screens, sx-screen-text, sx-section, sx-seg, sx-stage`
(retrouve-les avec `rg "sx-[a-z-]+" frontend/app/admin/_components/studio79`) ; ajoute celles de tes nouveaux composants. Repères :
- **Esprit** : calme, précis, chaleureux ; couleurs de marque (vert foncé `#173e3c`, vert `#0d846e`, citron `#d9ef59`), coins arrondis, ombres douces, beaucoup d'air. Pas d'emoji. Icônes `lucide-react`.
- **Détails qui font la différence** : écran sélectionné bien visible (liseré citron), poignée de glisser-déposer qui apparaît au survol, fantôme de déplacement net, pastilles d'état, transitions courtes (≤ 150 ms, coupées avec `prefers-reduced-motion`),
  focus clavier très visible (anneau 3 px), cibles ≥ 40 px, lisibilité (corps 14–15 px, contraste AA), panneaux qui défilent sans faire défiler la page, états vides et chargement soignés, notifications (toasts) discrètes.
- Les types d'écrans ont chacun une teinte (`data-tone` : `mint`, `lemon`, `lavender`, `sky`, `rose`) : choisis-les dans la palette `--ec-tint-*`.
- Pas de dépendance nouvelle sans nécessité.

## Vérification (obligatoire, dans un vrai navigateur, comme un utilisateur)

Compte admin : crée-le avec `manage.py shell` si besoin (rôle `admin`, e-mail vérifié) et connecte-toi sur `/connexion/admin`. Parcours à jouer et à **filmer en captures** (1440, 1280, 1024 px) :
1. Accueil du studio → ouvrir `p1-1`. 2. Changer le texte de l'écran 1 : l'aperçu se met à jour ; compteur de phrases ; état « Brouillon enregistré ». 3. Ajouter un écran « À toi de jouer », choisir un type d'activité, remplir, voir l'erreur de structure puis la corriger.
4. Glisser un écran pour le déplacer. 5. Envoyer une image (glisser un PNG), l'utiliser sur un écran « Histoire », la voir dans l'aperçu. 6. Annuler / Rétablir. 7. Publier avec un avertissement de style (confirmer) ; voir le bandeau et le compte à rebours ;
annuler la publication. 8. Republier ; vérifier côté enfant que rien n'a changé avant l'heure (`GET /api/curriculum/content79/p1-1/` → 404 jusqu'à l'heure). 9. Historique → restaurer la version d'origine (immédiat).
10. Aperçu en mode téléphone. 11. Tout cela au clavier seul.

Mesure `document.documentElement.scrollWidth` à 1440/1280/1024 (aucun débordement) et lance Lighthouse accessibilité sur `/admin/studio79` et sur l'éditeur (≥ 95).

**Disque** : utilise UN seul profil Chrome temporaire avec `--disk-cache-size=1` et supprime-le après chaque série de captures (le disque C: s'est déjà rempli à cause de profils oubliés). Vérifie `Get-PSDrive C` avant de commencer. Lance les suppressions dans une commande à part.

## Contrôles avant chaque push (la CI doit rester verte)

`npm run typecheck`, `npm run lint` (0 erreur), `npm test`. Pas de `use client` ailleurs qu'en première ligne, fichiers en UTF-8. Si tu touches à un composant existant, garde ses props (ou mets à jour tous ses usages) et note-le dans le rapport.

## Rendu

Commits signés `[antigravity] feat(studio79): … (T18)` + `Agent: antigravity`, auteur `Antigravity <antigravity@keuria.local>`, fichiers ajoutés un par un, push sur `Dev_Lansana_Coly` uniquement.
Rapport `agents/rapports/T18-antigravity.md` : ce qui est fait, ce qui ne l'est pas, les captures (`agents/rapports/T18-captures/`), les défauts trouvés dans les briques existantes, et les idées d'amélioration.
Ne dis « terminé » que si le parcours des 11 points marche réellement.
