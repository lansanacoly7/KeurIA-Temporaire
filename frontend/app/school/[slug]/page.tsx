import Link from "next/link";
import { ArrowRight, Bot, GraduationCap, Lightbulb, Rocket, School, Sparkles, Sprout } from "lucide-react";
import { tracks, AgeKey } from "../../lms-data";
import { DJANGO_API_URL, SSR_HEADERS } from "../../local-auth";
import "../school-space.css";

export const dynamic = "force-dynamic";

export default async function SchoolSpace({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let school;
  try {
    const res = await fetch(`${DJANGO_API_URL}/api/schools/${encodeURIComponent(slug)}`, { cache: "no-store", headers: SSR_HEADERS });
    if (res.ok) {
      school = (await res.json()).school;
    }
  } catch (error) {
    // La marque de l'école est facultative : la page s'affiche sans elle, mais l'incident est visible dans les journaux du serveur.
    console.warn("Marque de l'école indisponible", error);
  }

  if (!school) {
    return (
      <main className="ss-missing">
        <School size={64} color="#0d3b5c" />
        <h1>Espace école introuvable</h1>
        <p>Vérifie l’adresse que ton école t’a donnée.</p>
        <Link href="/">Retour à kEur IA</Link>
      </main>
    );
  }

  const keys = Object.keys(tracks) as AgeKey[];
  const trackIcons = [<Sprout key="0" size={32} />, <Rocket key="1" size={32} />, <Lightbulb key="2" size={32} />];
  const loginHref = `/dashboard?school=${school.slug}`;

  return (
    <main
      className="ss"
      style={{
        "--school-primary": school.primaryColor,
        "--school-secondary": school.secondaryColor,
        "--school-accent": school.accentColor,
      } as React.CSSProperties}
    >
      <header className="ss-top">
        <Link href="/" className="ss-brand" aria-label="kEur IA, accueil">
          <span className="ss-mark" aria-hidden="true"><b>k</b><i>IA</i></span>
          <span className="ss-brand-text">
            <small>Espace d’apprentissage</small>
            <strong>{school.name}</strong>
          </span>
        </Link>
        <a className="ss-btn" href={loginHref}>Se connecter</a>
      </header>

      <section className="ss-hero">
        <div>
          <span className="ss-eyebrow"><School size={18} aria-hidden="true" /> Bienvenue dans ton école</span>
          <h1>{school.name}</h1>
          <p>{school.motto}</p>
          <div className="ss-actions">
            <a className="ss-btn" href={loginHref}>Commencer mon aventure <ArrowRight size={22} aria-hidden="true" /></a>
          </div>
        </div>
        <div className="ss-art" aria-hidden="true">
          <span className="ss-art-disc" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="ss-palou" src="/images/palou/Palou_Hero.png" alt="" width={900} height={900} />
          <span className="ss-chip a"><Bot size={20} /> Comprendre l’IA</span>
          <span className="ss-chip b"><Sparkles size={20} /> Créer</span>
          <span className="ss-chip c"><GraduationCap size={20} /> Apprendre</span>
        </div>
      </section>

      <section className="ss-tracks">
        <div className="ss-tracks-head">
          <small>Parcours adaptés</small>
          <h2>Choisis ta tranche d’âge</h2>
          <p>Les modules, les jeux et les projets évoluent avec toi.</p>
        </div>
        <div className="ss-grid">
          {keys.map((k, i) => (
            <a className="ss-card" key={k} href={loginHref}>
              <span className="ss-card-icon" aria-hidden="true">{trackIcons[i]}</span>
              <small>Parcours {i + 1}</small>
              <h3>{tracks[k].label}</h3>
              <h4>{tracks[k].name}</h4>
              <p>{tracks[k].tagline}</p>
              <b>{tracks[k].worlds.length} modules <ArrowRight size={20} aria-hidden="true" /></b>
            </a>
          ))}
        </div>
      </section>

      <footer className="ss-foot">
        <span>kEur IA × {school.name}</span>
        <small>Une plateforme ludique pour comprendre, créer et apprendre avec l’intelligence artificielle.</small>
      </footer>
    </main>
  );
}
