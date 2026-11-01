"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ShieldCheck,
  Gamepad2,
  Code2,
  Users,
  School,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  LogIn,
  UserPlus,
  Compass,
  Lightbulb,
  PhoneCall,
  Mail,
  Lock,
  Layers,
  Zap,
  Plus,
  Menu,
  X,
} from "lucide-react";
import "./home.css";

// 4 Piliers pédagogiques animés sous forme d'album en arc de cercle
const PILLARS = [
  {
    id: "jeu",
    color: "mint",
    sticker: "/images/parcours79/stickers/m09-sticker.webp",
    alt: "Palou en détective avec sa loupe",
    badge: "Mini-Jeux & Quêtes",
    title: "Apprendre par le jeu",
    desc: "Des défis interactifs et des missions d’investigation où chaque concept d’IA devient une aventure passionnante.",
    points: ["Quiz rythmés & énigmes", "XP et récompenses stimulantes"],
  },
  {
    id: "scratch",
    color: "cyan",
    sticker: "/images/parcours79/stickers/m07-sticker-clean.webp",
    alt: "Palou créateur avec son pinceau",
    badge: "Studio Scratch 3.0",
    title: "Créer ses projets",
    desc: "Passer de spectateur à créateur en programmant des animations et des mini-jeux intelligents sur Scratch.",
    points: ["Moteur Scratch officiel", "Blocs d’intelligence artificielle"],
  },
  {
    id: "critique",
    color: "amber",
    sticker: "/images/parcours79/stickers/m08-sticker.webp",
    alt: "Palou protecteur avec son bouclier doré",
    badge: "Esprit Critique & Éthique",
    title: "Décoder le numérique",
    desc: "Développer les bons réflexes pour reconnaître les contenus générés et protéger ses données en ligne.",
    points: ["Détecter fausses images & biais", "Protection des données privées"],
  },
  {
    id: "bienveillance",
    color: "purple",
    sticker: "/images/parcours79/stickers/m10-sticker.webp",
    alt: "Palou célébrant avec sa médaille et son drapeau",
    badge: "Bienveillance & Progrès",
    title: "Accompagnement Palou",
    desc: "Palou encourage chacun à son rythme avec des retours constants, bienveillants et ultra valorisants.",
    points: ["Mascotte toujours à l'écoute", "Visibilité totale pour les parents"],
  },
];


// Modules phares présentés en vitrine sur la page d'accueil
const PREVIEW_MODULES = [
  {
    n: 1,
    title: "Bonjour, l’IA !",
    sub: "Fais connaissance avec Palou et découvre ce que signifie réellement l’intelligence artificielle.",
    xp: "80 XP",
    tag: "Découverte",
    image: "/images/parcours79/modules/m01-carte.webp",
    position: "center 42%",
  },
  {
    n: 2,
    title: "L’IA autour de moi",
    sub: "Dans le car rapide et en ville : repère les technologies et algorithmes cachés de ton quotidien.",
    xp: "100 XP",
    tag: "Quotidien",
    image: "/images/parcours79/modules/m02-carte.webp",
    position: "center 52%",
  },
  {
    n: 3,
    title: "La grande famille des données",
    sub: "Au marché avec Fatou : apprends comment une machine trie, classe et organise les informations.",
    xp: "120 XP",
    tag: "Données",
    image: "/images/parcours79/modules/m03-carte.webp",
    position: "center 48%",
  },
  {
    n: 4,
    title: "Apprendre avec des exemples",
    sub: "À la plage des pirogues : entraîne un modèle à reconnaître des objets et des images pas à pas.",
    xp: "140 XP",
    tag: "Apprentissage",
    image: "/images/parcours79/modules/m04-carte.webp",
    position: "center 75%",
  },
  {
    n: 5,
    title: "L’IA qui regarde",
    sub: "Sous le manguier : explore la vision par ordinateur et comment une caméra analyse son environnement.",
    xp: "160 XP",
    tag: "Vision",
    image: "/images/parcours79/modules/m05-carte.webp",
    position: "center 82%",
  },
  {
    n: 6,
    title: "L’IA qui parle",
    sub: "Reconnaissance vocale, langage et esprit critique : communique efficacement avec les assistants intelligents.",
    xp: "180 XP",
    tag: "Langage",
    image: "/images/parcours79/modules/m06-carte.webp",
    position: "center 55%",
  },
];

// Partenaires et établissements engagés avec kEur IA
const PARTNERS_DATA = [
  {
    id: "gspe-b2d",
    type: "school",
    name: "Groupe Scolaire Privé Excellence (GSPE-B2D)",
    role: "Établissement Pilote Partenaire",
    location: "Dakar, Sénégal",
    logo: "/images/partner-gspe-b2d.png",
    logoType: "logo",
  },
  {
    id: "join-network",
    type: "invite",
    name: "Votre Établissement Scolaire",
    role: "Rejoignez le réseau des écoles pionnières en IA",
    location: "Sénégal & International",
    logo: "",
    logoType: "plus",
  },
];

export default function HomeClient() {
  const [activePillar, setActivePillar] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);

  // Carrousel des partenaires en rotation douce continue (3.8s)
  const [activePartner, setActivePartner] = useState(0);
  const [isPartnerPaused, setIsPartnerPaused] = useState(false);

  // État du tiroir de navigation mobile (responsive)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Verrouillage du scroll d'arrière-plan quand le menu mobile est ouvert
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Swipe tactile pour le carrousel des piliers pédagogiques
  const [pillarTouchStart, setPillarTouchStart] = useState<number | null>(null);
  const handlePillarTouchStart = (e: React.TouchEvent) => {
    setIsCarouselPaused(true);
    setPillarTouchStart(e.touches[0].clientX);
  };
  const handlePillarTouchEnd = (e: React.TouchEvent) => {
    setIsCarouselPaused(false);
    if (pillarTouchStart === null) return;
    const diff = pillarTouchStart - e.changedTouches[0].clientX;
    if (diff > 45) {
      setActivePillar((prev) => (prev + 1) % PILLARS.length);
    } else if (diff < -45) {
      setActivePillar((prev) => (prev - 1 + PILLARS.length) % PILLARS.length);
    }
    setPillarTouchStart(null);
  };

  // Swipe tactile pour le slider des partenaires
  const [partnerTouchStart, setPartnerTouchStart] = useState<number | null>(null);
  const handlePartnerTouchStart = (e: React.TouchEvent) => {
    setIsPartnerPaused(true);
    setPartnerTouchStart(e.touches[0].clientX);
  };
  const handlePartnerTouchEnd = (e: React.TouchEvent) => {
    setIsPartnerPaused(false);
    if (partnerTouchStart === null) return;
    const diff = partnerTouchStart - e.changedTouches[0].clientX;
    if (diff > 45) {
      setActivePartner((prev) => Math.min(PARTNERS_DATA.length - 1, prev + 1));
    } else if (diff < -45) {
      setActivePartner((prev) => Math.max(0, prev - 1));
    }
    setPartnerTouchStart(null);
  };

  // Rotation automatique des 4 piliers (« Pourquoi choisir kEur IA ») réglée à 5s
  useEffect(() => {
    if (isCarouselPaused) return;
    const timer = setInterval(() => {
      setActivePillar((prev) => (prev + 1) % PILLARS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isCarouselPaused]);

  // Rotation circulaire douce continue des partenaires
  useEffect(() => {
    if (isPartnerPaused) return;
    const timer = setInterval(() => {
      setActivePartner((prev) => (prev + 1) % PARTNERS_DATA.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [isPartnerPaused]);

  useEffect(() => {
    // 1. Observateur pour les blocs standards : une fois révélé, l'élément reste visible sans clignotement
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-active");
          }
        });
      },
      {
        threshold: 0.05,
        rootMargin: "60px 0px 60px 0px",
      }
    );

    const elements = document.querySelectorAll(
      ".reveal-on-scroll, .anim-fade-up, .anim-fade-down, .anim-fade-left, .anim-fade-right, .anim-scale-up, .anim-album-reveal"
    );

    // Sur écran mobile ou lors du chargement, afficher immédiatement les blocs
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      elements.forEach((el) => el.classList.add("reveal-active"));
    } else {
      elements.forEach((el) => observer.observe(el));
    }

    return () => {
      observer.disconnect();
    };
  }, []);


  return (
    <div className="landing-page">
      {/* 1. TOPBAR DE NAVIGATION (COMPACTE 64px, ÉLÉGANTE) */}
      <header className="landing-topbar">
        <Link href="/" className="landing-brand" aria-label="kEur IA — Accueil">
          <img
            src="/images/keur-ia-logo.png"
            alt="kEur IA — Apprendre, jouer, créer"
            className="official-logo"
            width={180}
            height={60}
          />
        </Link>

        <nav className="landing-nav" aria-label="Menu principal">
          <a href="#parcours">Les Parcours</a>
          <a href="#methode">Notre Méthode</a>
          <a href="#parents-ecoles">Parents & Écoles</a>
          <a href="#partenaires">Partenaires</a>
        </nav>

        <div className="landing-topbar-actions">
          <div className="landing-auth-buttons">
            <Link href="/connexion?choix=1" className="btn-landing-login">
              <LogIn size={14} />
              <span>Se connecter</span>
            </Link>
            <Link href="/connexion?choix=1" className="btn-landing-signup">
              <UserPlus size={14} />
              <span>Commencer</span>
            </Link>
          </div>

          <button
            type="button"
            className="landing-mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label={isMobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu de navigation"}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* TIROIR DE NAVIGATION MOBILE (DRAWER MODERNE & ACCESSIBLE) */}
      <div
        className={`landing-mobile-drawer-backdrop ${isMobileMenuOpen ? "open" : ""}`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`landing-mobile-drawer ${isMobileMenuOpen ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navigation mobile"
      >
        <div className="drawer-header">
          <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="drawer-brand">
            <img
              src="/images/keur-ia-logo.png"
              alt="kEur IA"
              className="drawer-logo"
              width={150}
              height={50}
            />
          </Link>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Fermer le menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="drawer-nav">
          <a href="#parcours" onClick={() => setIsMobileMenuOpen(false)}>
            <Compass size={18} />
            <span>Les Parcours</span>
          </a>
          <a href="#methode" onClick={() => setIsMobileMenuOpen(false)}>
            <Sparkles size={18} />
            <span>Notre Méthode</span>
          </a>
          <a href="#parents-ecoles" onClick={() => setIsMobileMenuOpen(false)}>
            <Users size={18} />
            <span>Parents & Écoles</span>
          </a>
          <a href="#partenaires" onClick={() => setIsMobileMenuOpen(false)}>
            <School size={18} />
            <span>Partenaires</span>
          </a>
        </nav>

        <div className="drawer-actions">
          <Link
            href="/connexion?choix=1"
            className="btn-drawer-signup"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <UserPlus size={16} />
            <span>Commencer l’aventure</span>
          </Link>
          <Link
            href="/connexion?choix=1"
            className="btn-drawer-login"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <LogIn size={16} />
            <span>Se connecter</span>
          </Link>
        </div>
      </aside>

      <main id="main-content" className="landing-main-content">
      {/* 2. HERO SECTION COLORÉE, CHALEUREUSE & DYNAMIQUE (STYLE DUOLINGO / KIDZONE) */}
      <section className="landing-hero" id="accueil">
        {/* Décor panoramique contextuel officiel de kEur IA (Cour de l'école et grand Baobab) */}
        <div className="hero-scene-panoramic" aria-hidden="true">
          <img
            src="/images/parcours79/modules/m01-fond.webp"
            alt=""
            className="hero-scene-img"
          />
          <div className="hero-scene-gradient-overlay" />
        </div>

        {/* Micro-doodles et formes géométriques flottantes */}
        <div className="hero-doodles-layer" aria-hidden="true">
          <span className="doodle doodle-star-1"><Sparkles size={22} /></span>
          <span className="doodle doodle-circle-1" />
          <span className="doodle doodle-code"><Code2 size={20} /></span>
          <span className="doodle doodle-ring-1" />
          <span className="doodle doodle-star-2">✦</span>
          <span className="doodle doodle-circle-2" />
          <span className="doodle doodle-bulb"><Lightbulb size={20} /></span>
        </div>

        <div className="landing-hero-grid">
          {/* Écritures à gauche */}
          <div className="landing-hero-copy">
            <div className="landing-trust-pill">
              <Sparkles size={13} />
              <span className="trust-pill-desktop">Plateforme d’apprentissage de l’IA • Ouverte à tous</span>
              <span className="trust-pill-mobile">Apprendre l'IA en s'amusant</span>
            </div>

            <h1>
              <span className="title-text-desktop">
                L’Intelligence Artificielle à la portée de tous,{" "}
                <span className="highlight">en s’amusant</span>
              </span>
              <span className="title-text-mobile">
                L’IA pour tous,{" "}
                <span className="highlight">en s’amusant</span>
              </span>
            </h1>

            <p className="landing-hero-desc">
              <span className="hero-desc-desktop">
                Découvrez l'IA pas à pas avec Palou : mini-jeux, défis interactifs sur Scratch 3.0 et parcours adaptés pour toute la famille.
              </span>
              <span className="hero-desc-mobile">
                Mini-jeux, défis Scratch et quêtes interactives guidés par Palou.
              </span>
            </p>
          </div>

          {/* Palou à droite */}
          <div className="landing-hero-art" aria-label="Palou, la mascotte officielle de kEur IA">
            <div className="mascot-backdrop-glow" />
            <div className="landing-mascot-wrapper">
              <div className="palou-speech-bubble" role="status" aria-label="Message de Palou">
                <p className="palou-bubble-text">
                  <span className="bubble-text-desktop">
                    Salut ! Moi c’est <span className="palou-bubble-name">Palou</span> ! Prêt à explorer l’IA en t’amusant ?
                  </span>
                  <span className="bubble-text-mobile">
                    Salut ! Moi c’est <span className="palou-bubble-name">Palou</span> !
                  </span>
                </p>
                <div className="palou-bubble-tail" aria-hidden="true" />
              </div>
              <img
                src="/images/palou/Palou_Hero.png"
                alt="Palou, mascotte officielle kEur IA"
                className="landing-mascot-img"
                width={900}
                height={900}
              />
              <div className="palou-floating-badge" aria-label="Contenu guidé par Palou">
                <span className="badge-pulse-dot" />
                <span className="badge-text-desktop">+60 Défis guidés avec Palou</span>
                <span className="badge-text-mobile">+60 Défis guidés</span>
              </div>
            </div>
            <div className="palou-ground-shadow" aria-hidden="true" />
          </div>

          {/* Les boutons en bas */}
          <div className="landing-hero-bottom">
            <div className="landing-hero-actions">
              <Link href="/connexion?choix=1" className="btn-hero-cta">
                <span>Commencer l’aventure</span>
                <ArrowRight size={16} />
              </Link>
              <a href="#parcours" className="btn-hero-secondary">
                <Compass size={15} />
                <span>Découvrir les programmes</span>
              </a>
            </div>

            <a href="#methode" className="scroll-indicator-link">
              <span>Voir ce qui vous attend sur la plateforme</span>
              <ChevronRight size={13} style={{ transform: "rotate(90deg)" }} />
            </a>
          </div>
        </div>

        {/* Transition organique en douce vague (style Kindero & Duolingo) */}
        <div className="hero-wave-bottom" aria-hidden="true">
          <svg viewBox="0 0 1440 70" fill="none" preserveAspectRatio="none">
            <path
              d="M0,25 C320,65 680,68 1020,30 C1200,10 1340,28 1440,35 L1440,70 L0,70 Z"
              fill="#f4f7f6"
            />
          </svg>
        </div>
      </section>

      {/* BANDEAU DÉFILANT UNIFIÉ (TRANSITION HERO -> MÉTHODE) */}
      <div className="fun-ribbon-ticker-wrap anim-fade-up" aria-label="Points forts de kEur IA">
        <div className="fun-ribbon-track">
          {[
            { label: "Studio Scratch 3.0 officiel", icon: Code2 },
            { label: "Défis & Quêtes interactives", icon: Gamepad2 },
            { label: "Guidé pas à pas par Palou", icon: Sparkles },
            { label: "100% Sécurisé & Sans pub", icon: ShieldCheck },
            { label: "XP & Badges à débloquer", icon: Zap },
            { label: "Studio Scratch 3.0 officiel", icon: Code2 },
            { label: "Défis & Quêtes interactives", icon: Gamepad2 },
            { label: "Guidé pas à pas par Palou", icon: Sparkles },
            { label: "100% Sécurisé & Sans pub", icon: ShieldCheck },
            { label: "XP & Badges à débloquer", icon: Zap },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="fun-ticker-chip">
                <Icon size={18} className="chip-icon" />
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. SECTION NOTRE MÉTHODE (STYLE BENTO DUOLINGO AVEC PALOU ANIMÉ) */}
      <section className="landing-section landing-section-alt" id="methode">
        <div className="landing-section-header anim-fade-up">
          <span className="tag">Pédagogie active</span>
          <h2>Pourquoi choisir kEur IA ?</h2>
          <p>
            De la découverte des algorithmes à la création de projets intelligents : apprenez à maîtriser l’IA pas à pas en toute sécurité.
          </p>
        </div>

        {/* Album carrousel 3D en arc de cercle (style Cover Flow & Duolingo) */}
        <div
          className="pillars-album-wrapper"
          onMouseEnter={() => setIsCarouselPaused(true)}
          onMouseLeave={() => setIsCarouselPaused(false)}
          onTouchStart={handlePillarTouchStart}
          onTouchEnd={handlePillarTouchEnd}
        >
          {/* Bouton navigation Précédent */}
          <button
            type="button"
            className="album-nav-btn prev"
            onClick={() => setActivePillar((prev) => (prev - 1 + PILLARS.length) % PILLARS.length)}
            aria-label="Voir le pilier précédent"
          >
            <ChevronLeft size={22} />
          </button>

          {/* Scène en arc de cercle 3D avec déploiement en éventail */}
          <div className="pillars-album-stage anim-album-reveal">
            {PILLARS.map((p, idx) => {
              // Calcul de l'écart relatif (-1: gauche, 0: centre, 1: droite, 2: arrière)
              const diff = (idx - activePillar + PILLARS.length) % PILLARS.length;
              let posClass = "back";
              if (diff === 0) posClass = "active";
              else if (diff === 1) posClass = "next";
              else if (diff === PILLARS.length - 1) posClass = "prev";

              return (
                <article
                  key={p.id}
                  className={`pillar-album-card ${p.color} pos-${posClass}`}
                  onClick={() => setActivePillar(idx)}
                >
                  <div className="pillar-sticker-wrap">
                    <img src={p.sticker} alt={p.alt} className="pillar-sticker-img" />
                  </div>
                  <div className="pillar-badge-pill">{p.badge}</div>
                  <h3>{p.title}</h3>
                  <p>{p.desc}</p>
                  <ul className="pillar-points-list">
                    {p.points.map((pt, pIdx) => (
                      <li key={pIdx}>
                        <CheckCircle2 size={14} className="pillar-check-icon" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>

          {/* Bouton navigation Suivant */}
          <button
            type="button"
            className="album-nav-btn next"
            onClick={() => setActivePillar((prev) => (prev + 1) % PILLARS.length)}
            aria-label="Voir le pilier suivant"
          >
            <ChevronRight size={22} />
          </button>

          {/* Indicateurs / Puces de progression cliquables */}
          <div className="album-dots-nav">
            {PILLARS.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                className={`album-dot ${idx === activePillar ? `active ${p.color}` : ""}`}
                onClick={() => setActivePillar(idx)}
                aria-label={`Aller au pilier : ${p.title}`}
              >
                <span className="dot-inner" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 5. SECTION APERÇU DES MODULES */}
      <section className="landing-section" id="parcours">
        <div className="landing-section-header anim-fade-up">
          <span className="tag">Programme interactif</span>
          <h2>Aperçu de nos modules d’apprentissage</h2>
          <p>Une progression pas à pas pour comprendre l’IA, explorer ses usages et créer des projets concrets.</p>
        </div>

        {/* Grille des modules */}
        <div className="modules-grid">
          {PREVIEW_MODULES.map((mod, idx) => (
            <article className={`module-landing-card reveal-on-scroll reveal-delay-${idx + 1}`} key={mod.n}>
              <div className="module-card-img-wrap">
                <img
                  src={mod.image}
                  alt={`Illustration module ${mod.n} : ${mod.title}`}
                  loading="lazy"
                  style={{ objectPosition: mod.position || "center center" }}
                />
                <span className="module-card-number">0{mod.n}</span>
                <span className="module-card-badge">{mod.tag}</span>
              </div>
              <div className="module-card-content">
                <h3>{mod.title}</h3>
                <p>{mod.sub}</p>
                <div className="module-card-footer">
                  <span className="module-card-xp-badge">
                    <Zap size={13} color="#0d846e" />
                    <span>{mod.xp} à remporter</span>
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Bouton global d'exploration vers la connexion */}
        <div className="modules-cta-wrapper anim-fade-up">
          <Link href="/connexion?choix=1" className="btn-modules-explore">
            <span>Venez explorer tous les modules</span>
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      {/* 6. SECTION PARENTS & ÉCOLES (RÈGLES SIRIBRA / KEUR IA) */}
      <section className="landing-section landing-section-alt" id="parents-ecoles">
        <div className="landing-section-header anim-fade-up">
          <span className="tag">Confiance & Sécurité</span>
          <h2>Conçu pour les familles et les établissements</h2>
          <p>Un environnement numérique sain, supervisé et aligné sur les programmes pédagogiques.</p>
        </div>

        <div className="family-school-grid">
          {/* Bloc Famille */}
          <div className="family-box anim-fade-left">
            <div className="showcase-card-img-wrap">
              <img
                src="/images/landing/family_showcase.webp"
                alt="Famille explorant kEur IA avec Palou"
                className="showcase-card-img"
                loading="lazy"
                width={1200}
                height={896}
              />
            </div>
            <div className="box-header">
              <div className="box-header-icon amber">
                <Users size={22} />
              </div>
              <div>
                <h3>Espace Famille</h3>
                <p>Pour les parents soucieux de l'éveil numérique de leurs enfants</p>
              </div>
            </div>

            <div className="feature-check-list">
              <div className="feature-check-item">
                <CheckCircle2 size={16} />
                <span><b>Contrôle parental complet :</b> Gérez le temps d’écran et activez les dialogues avec Palou en un clic.</span>
              </div>
              <div className="feature-check-item">
                <CheckCircle2 size={16} />
                <span><b>Zéro distraction commerciale :</b> Espace 100% protégé sans publicité ni algorithmes addictifs.</span>
              </div>
              <div className="feature-check-item">
                <CheckCircle2 size={16} />
                <span><b>Suivi des acquis en direct :</b> Visualisez les compétences validées et les badges remportés.</span>
              </div>
            </div>

            <Link href="/connexion?choix=1" className="btn-family-cta">
              <span>Créer un compte famille</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          {/* Bloc Écoles & Enseignants (Création accompagnée par l'équipe SIRIBRA) */}
          <div className="school-box anim-fade-right">
            <div className="showcase-card-img-wrap">
              <img
                src="/images/landing/school_showcase.webp"
                alt="Classe d'école codant avec Scratch et Palou"
                className="showcase-card-img"
                loading="lazy"
                width={1200}
                height={896}
              />
            </div>
            <div className="box-header">
              <div className="box-header-icon teal">
                <School size={22} />
              </div>
              <div>
                <h3>Espace Établissements & Enseignants</h3>
                <p>Pour les écoles primaires, collèges et ateliers périscolaires</p>
              </div>
            </div>

            <div className="feature-check-list">
              <div className="feature-check-item">
                <CheckCircle2 size={16} />
                <span><b>Tableau de bord classe :</b> Assignez des leçons d’IA et suivez la progression de chaque élève.</span>
              </div>
              <div className="feature-check-item">
                <CheckCircle2 size={16} />
                <span><b>Ressources pédagogiques :</b> Fiches d’activités clés en main alignées sur les programmes scolaires.</span>
              </div>
              <div className="feature-check-item">
                <CheckCircle2 size={16} />
                <span><b>Comptes sécurisés par code :</b> Connexion simple et protégée, sans obligation d’adresse e-mail.</span>
              </div>
            </div>

            <div className="school-policy-notice">
              <Lock size={15} />
              <span><b>Accès sur mesure :</b> Activation personnalisée et accompagnement direct par l'équipe SIRIBRA.</span>
            </div>

            <a
              href="mailto:contact@keuria.sn?subject=Demande%20d%27acc%C3%A8s%20%C3%A9tablissement%20Keur%20IA"
              className="btn-school-cta"
            >
              <PhoneCall size={14} />
              <span>Demander un accès école (SIRIBRA)</span>
            </a>
          </div>
        </div>
      </section>

      {/* 7. SECTION PARTENAIRES & ÉCOLES PILOTES (CARROUSEL CIRCULAIRE 3D) */}
      <section className="landing-section" id="partenaires">
        <div className="landing-section-header anim-fade-up">
          <span className="tag">Partenariat d’excellence</span>
          <h2>Nos établissements et partenaires engagés</h2>
          <p>Les acteurs éducatifs de référence qui intègrent kEur IA pour éveiller leurs classes au monde de demain.</p>
        </div>

        {/* Carrousel Défilant : Glissement Horizontal Fluide */}
        <div
          className="partners-slider-wrapper anim-fade-up"
          onMouseEnter={() => setIsPartnerPaused(true)}
          onMouseLeave={() => setIsPartnerPaused(false)}
          onTouchStart={handlePartnerTouchStart}
          onTouchEnd={handlePartnerTouchEnd}
        >
          {/* Bouton navigation Précédent (désactivé si premier élément) */}
          <button
            type="button"
            className={`partner-nav-btn prev ${activePartner === 0 ? "disabled" : ""}`}
            onClick={() => setActivePartner((prev) => Math.max(0, prev - 1))}
            disabled={activePartner === 0}
            aria-label="Voir le partenaire précédent"
          >
            <ChevronLeft size={22} />
          </button>

          {/* Fenêtre de cadrage (Viewport étanche sans débordement) */}
          <div className="partners-slider-viewport">
            <div
              className="partners-slider-track"
              style={{ transform: `translateX(-${activePartner * 100}%)` }}
            >
              {PARTNERS_DATA.map((partner) => (
                <div key={partner.id} className="partner-slide">
                  <div className={`partner-medallion-circle ${partner.logoType === "plus" ? "is-invite" : "is-school-logo"}`}>
                    {partner.logoType === "plus" ? (
                      <div className="partner-plus-symbol" aria-hidden="true">
                        <Plus size={44} strokeWidth={2.5} />
                      </div>
                    ) : (
                      <img
                        src={partner.logo}
                        alt={`Logo ${partner.name}`}
                        className="partner-circle-logo-img"
                      />
                    )}
                  </div>

                  <div className="partner-medallion-details">
                    <h3 className="partner-school-name">{partner.name}</h3>
                    {partner.type === "invite" ? (
                      <>
                        <p className="partner-school-sub">{partner.role}</p>
                        <a
                          href="mailto:contact@keuria.sn?subject=Candidature%20%C3%89tablissement%20Partenaire%20Keur%20IA"
                          className="btn-partner-cta"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>Devenir école partenaire</span>
                          <ArrowRight size={14} />
                        </a>
                      </>
                    ) : (
                      <>
                        <div className="partner-status-pill">
                          <span className="badge-pulse-dot" />
                          <span>{partner.role} • {partner.location}</span>
                        </div>
                        <span className="partner-accredited-label">
                          <CheckCircle2 size={13} />
                          <span>Partenaire Officiel Certifié</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bouton navigation Suivant (désactivé si dernier élément) */}
          <button
            type="button"
            className={`partner-nav-btn next ${activePartner === PARTNERS_DATA.length - 1 ? "disabled" : ""}`}
            onClick={() => setActivePartner((prev) => Math.min(PARTNERS_DATA.length - 1, prev + 1))}
            disabled={activePartner === PARTNERS_DATA.length - 1}
            aria-label="Voir le partenaire suivant"
          >
            <ChevronRight size={22} />
          </button>

          {/* Puces de pagination circulaires */}
          <div className="partner-dots-nav">
            {PARTNERS_DATA.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                className={`partner-dot ${idx === activePartner ? "active" : ""}`}
                onClick={() => setActivePartner(idx)}
                aria-label={`Aller au partenaire ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 8. SECTION SHOWCASE APPRENTISSAGE PERSONNALISÉ (STYLE DUOLINGO ADAPTÉ KEUR IA) */}
      <section className="landing-showcase-duo" id="decouvrir">
        <div className="showcase-duo-container">
          {/* Colonne gauche : Le vrai Palou officiel et Fatou sur plateformes 3D avec badges volants animés */}
          <div className="showcase-duo-art anim-fade-left">
            {/* Badge volant 1 : Palou (haut gauche) */}
            <div className="showcase-float-badge badge-palou" aria-hidden="true">
              <span className="float-badge-icon amber">
                <Sparkles size={13} />
              </span>
              <span>Palou • Guide & Coach IA</span>
            </div>

            {/* Badge volant 2 : Fatou (haut droite) */}
            <div className="showcase-float-badge badge-fatou" aria-hidden="true">
              <span className="float-badge-icon teal">
                <Compass size={13} />
              </span>
              <span>Fatou • Élève & Exploratrice IA</span>
            </div>

            <img
              src="/images/landing/keuria-showcase-duo.png"
              alt="Palou et Fatou en apprentissage guidé sur kEur IA"
              className="showcase-duo-img"
              loading="lazy"
              width={1127}
              height={862}
            />
          </div>

          {/* Colonne droite : Titre officiel kEur IA, texte fluide et boutons tactiles */}
          <div className="showcase-duo-content anim-fade-right">
            <span className="tag">Apprentissage sur mesure</span>
            <h2 className="showcase-duo-title">
              Un apprentissage <span>personnalisé</span>
            </h2>
            <p className="showcase-duo-desc">
              Conçues pour s'adapter au niveau et au rythme de chaque élève,
              nos leçons combinent le meilleur de la pédagogie interactive,
              du code Scratch, de l'intelligence artificielle et de la bienveillance de Palou.
            </p>
            <div className="showcase-duo-actions">
              <Link href="/connexion?choix=1" className="btn-showcase-primary">
                <span>Commencer l’aventure</span>
                <ArrowRight size={17} />
              </Link>
              <Link href="/connexion?choix=1" className="btn-showcase-secondary">
                <span>J’ai déjà un compte</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
      </main>

      {/* 9. FOOTER MODERNE, HARMONIEUX & AÉRÉ (STYLE DUOLINGO / KHAN ACADEMY) */}
      <footer className="landing-footer-clean">
        <div className="footer-clean-container">
          <div className="footer-clean-grid">
            {/* Colonne 1 : kEur IA */}
            <div className="footer-clean-col col-brand">
              <Link href="/" className="footer-brand-link" aria-label="kEur IA — Accueil">
                <div className="footer-brand-pill">
                  <img
                    src="/images/keur-ia-logo.png"
                    alt="kEur IA — Apprendre, jouer, créer"
                    className="footer-brand-logo-img"
                    width={160}
                    height={53}
                  />
                </div>
              </Link>
              <p className="footer-clean-desc">
                La plateforme éducative de référence pour comprendre, questionner et créer avec l'Intelligence Artificielle en toute confiance.
              </p>
              <div className="footer-clean-badge">
                <ShieldCheck size={14} />
                <span>Espace 100% protégé • Conforme RGPD</span>
              </div>
            </div>

            {/* Colonne 2 : Parcours & Méthode */}
            <div className="footer-clean-col">
              <h3>Parcours & Méthode</h3>
              <ul className="footer-clean-links">
                <li><a href="#parcours">Découverte de l’IA (Initiation)</a></li>
                <li><a href="#parcours">Studio & Projets Scratch 3.0</a></li>
                <li><a href="#parcours">Esprit critique & Éthique</a></li>
                <li><a href="#methode">Pourquoi choisir kEur IA ?</a></li>
                <li><a href="#methode">Apprentissage guidé avec Palou</a></li>
              </ul>
            </div>

            {/* Colonne 3 : Établissements & Contact */}
            <div className="footer-clean-col">
              <h3>Établissements & Contact</h3>
              <ul className="footer-clean-links">
                <li><Link href="/connexion?choix=1">Espace Élève</Link></li>
                <li><Link href="/connexion?choix=1">Espace Famille (Parents)</Link></li>
                <li><a href="#parents-ecoles">Espace Établissements & Enseignants</a></li>
                <li><a href="#partenaires">Nos Écoles Partenaires</a></li>
              </ul>
              <div className="footer-clean-contact">
                <a href="mailto:contact@keuria.sn" className="contact-item">
                  <Mail size={14} />
                  <span>contact@keuria.sn</span>
                </a>
                <div className="contact-item">
                  <Compass size={14} />
                  <span>Dakar, Sénégal</span>
                </div>
              </div>
            </div>

            {/* Colonne 4 : SIRIBRA (Éditeur & Concepteur technologique) */}
            <div className="footer-clean-col col-siribra">
              <h3>Propulsé et conçu par</h3>
              <div className="footer-siribra-brand-large">
                <img
                  src="/images/siribra-logo-dark.png"
                  alt="SIRIBRA — Technologie, Vision, Impact"
                  className="siribra-logo-large-img"
                  width={738}
                  height={613}
                />
              </div>
            </div>
          </div>

          {/* Ligne inférieure légale */}
          <div className="footer-clean-bottom">
            <p className="footer-clean-copyright">
              © {new Date().getFullYear()} kEur IA. Tous droits réservés.
            </p>
            <div className="footer-clean-legal">
              <Link href="/conditions">Conditions Générales</Link>
              <span className="legal-dot">•</span>
              <Link href="/confidentialite">Politique de Confidentialité</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
