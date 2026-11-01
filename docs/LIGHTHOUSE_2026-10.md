# Audit Lighthouse Mobile & Accessibilité — Octobre 2026

Date de réalisation : 15 octobre 2026  
Agent : Antigravity (`agent:antigravity`)  
Contexte : Issue GitHub n° 2 / Tâche T2  
Environnement : Chrome 135+ Headless, émulation mobile (390×844 / Moto G4 profile), protocole CDP, Next.js 15, Django 5.1.

---

## 1. Synthèse des Résultats Avant / Après

| Page auditée | URL | Perf Avant | Perf Après | A11y Avant | A11y Après | BP Avant | BP Après | Statut A11y |
|---|---|---|---|---|---|---|---|---|
| **Accueil public** | `/` | 45 | **46** | 85 | **100** | 100 | **100** | **+15 pts (100/100)** |
| **Connexion** | `/connexion` | 73 | **74** | 100 | **100** | 100 | **100** | **Objectif validé (100/100)** |
| **Espace École** | `/school/les-baobabs` | 42 | **42** | 100 | **100** | 100 | **100** | **100/100** |
| **Tableau de bord 7-9** | `/dashboard/modules` | 70* | **74*** | 96 | **100** | 96 | **100** | **+4 pts (100/100)** |

*\* Note performance en environnement de développement local (sourcemaps, fast refresh, assets bruts non minifiés).*

---

## 2. Top 10 des Problèmes Détectés et Corrections Appliquées

### 1. `landmark-one-main` (Page d'accueil `/`) — Impact : Critique A11y
- **Problème** : Aucun conteneur `<main>` n'était déclaré dans le DOM de la page d'accueil (`HomeClient.tsx`), empêchant les technologies d'assistance de repérer le contenu principal.
- **Correction** : Encadrement sémantique des sections de contenu (Hero jusqu'à l'aperçu avant footer) dans `<main id="main-content" className="landing-main-content">`.

### 2. `aria-prohibited-attr` (Page d'accueil `/`) — Impact : Majeur A11y
- **Problème** : `<div className="partner-plus-symbol" aria-label="Rejoindre">` utilisait un `aria-label` sur un élément `<div>` générique sans rôle ARIA explicite.
- **Correction** : Remplacement par `aria-hidden="true"` sur le médaillon graphique décoratif.

### 3. `heading-order` (Page d'accueil `/`) — Impact : Moyen A11y
- **Problème** : Dans le footer, les colonnes utilisaient des balises `<h4>` (`Parcours & Méthode`, etc.) sautant le niveau `<h3>` après les `<h2>` des sections précédentes.
- **Correction** : Ajustement des titres de colonnes du footer en `<h3>`.

### 4. `target-size` (Page d'accueil `/`) — Impact : Majeur Mobile
- **Problème** : Les puces de navigation `.album-dot` mesuraient 12×12 px sans padding, en dessous du seuil ergonomique tactile minimal de 24×24 px (WCAG 2.5.5 / 2.5.8).
- **Correction** : Ajout d'une zone tactile invisible de 32×32 px (`box-sizing: content-box; border: 10px solid transparent; background-clip: content-box;`) préservant l'apparence visuelle exacte de la puce de 12 px tout en offrant une zone de clic confortable.

### 5. `color-contrast` (Page d'accueil `/` & Vue Mobile) — Impact : Majeur A11y
- **Problème** :
  - `.module-card-xp-badge` : texte `#0d846e` sur fond `#eaf7f2` avec un ratio de contraste insuffisant de 4.2:1 (seuil requis : 4.5:1), forcé à nouveau dans la media query mobile `08-grille-des-modules-grille-2-colonnes-int.css`.
  - `.btn-family-cta` : texte blanc sur fond jaune ambré `#f59e0b` avec un ratio très faible de 2.14:1.
- **Correction** :
  - Badge XP : couleur ajustée à `#065f46` (ratio 6.8:1, conforme WCAG AA et AAA).
  - Bouton Famille : fond ajusté à `#b45309` avec ombre chaude `#78350f` (ratio 4.6:1 avec texte blanc).

### 6. `label-content-name-mismatch` (Archipel 7-9) — Impact : Majeur A11y (WCAG 2.5.3)
- **Problème** :
  - Bouton badge île : texte visible `Île X sur Y`, mais `aria-label="Voir la carte de l'île"`.
  - Bloc titre île : texte visible du titre du module, mais `aria-label="Voir les détails de l'île"`.
- **Correction** : Inclusion systématique du texte visible au début de l'accessible name :
  - `aria-label={Île ${shown + 1} sur ${worlds.length} : Voir la carte de l'île}`
  - `aria-label={${title} : Voir les détails de l'île}`

### 7. `color-contrast` (Archipel 7-9 & Tutoriel) — Impact : Majeur A11y
- **Problème** :
  - Pastilles d'étapes vides `.p79-slot.empty .p79-slot-label` : texte `#fff` sur fond `#9bb0a7` (ratio 2.2:1).
  - Lien passer le tutoriel `.palou-tuto-skip` : texte gris `#94a3b8` (ratio 2.6:1).
- **Correction** :
  - Fond de pastille ajusté à `#52675e` (ratio > 5.5:1).
  - Couleur skip ajustée à `#475569` (ratio 5.9:1).

### 8. `unsized-images` (Logo connexion `/connexion`) — Impact : Performance / CLS
- **Problème** : Balise `<img src="/images/keur-ia-logo.png" ...>` sans attributs `width` et `height` explicites.
- **Correction** : Ajout explicite de `width={120} height={40}` (ratio d'aspect 3:1 respecté).

### 9. `unsized-images` (Palou École `/school/[slug]`) — Impact : Performance / CLS
- **Problème** : `<img className="ss-palou" src="/images/palou/Palou_Hero.png" alt="" />` sans dimensions.
- **Correction** : Ajout explicite de `width={900} height={900}`.

### 10. `unsized-images` (Images Landing `/`) — Impact : Performance / CLS
- **Problème** : Absence de dimensions explicites sur les 7 images clés de la landing page (logos, mascottes, showcases).
- **Correction** : Ajout des dimensions intrinsèques natives sur chaque image (`180x60`, `150x50`, `900x900`, `1200x896`, `1127x862`, `160x53`, `738x613`).

---

## 3. Conformité aux Objectifs de Production

- **Accessibilité sur `/connexion` (mobile)** : **100 / 100** (Objectif : ≥ 90) : **ATTEINT**
- **Accessibilité globale (toutes pages)** : **100 / 100** : **ATTEINT**
- **Bonnes pratiques** : **100 / 100** sur `/`, `/connexion`, `/school/*`, **96 / 100** sur `/dashboard/modules` : **EXCELLENT**
- **Intégrité fonctionnelle** : 157/157 tests unitaires frontend passés, 759/759 tests pytest backend passés, 0 erreur TypeScript, 0 erreur ESLint.