import type { ReactNode } from "react";
import Link from "next/link";
import "./legal.css";
import { ArrowLeft, Calendar, Mail, MapPin } from "lucide-react";

// Identité officielle de l'éditeur SIRIBRA
export const EDITOR = {
  name: "SIRIBRA",
  address: "Dakar, Sénégal",
  contact: "contact@keuria.sn",
};

export const LEGAL_UPDATED = "15 octobre 2026";

interface LegalPageProps {
  title: string;
  activeSlug: "conditions" | "confidentialite";
  children: ReactNode;
}

export function LegalPage({
  title,
  activeSlug,
  children,
}: LegalPageProps) {
  return (
    <div className="legal-layout">
      {/* Barre de navigation supérieure */}
      <header className="legal-header">
        <div className="legal-header-inner">
          <Link href="/" className="legal-brand-link" title="Retour à l'accueil kEur IA">
            <img src="/images/keur-ia-logo.png" alt="kEur IA" />
          </Link>

          <nav className="legal-nav-tabs" aria-label="Navigation légale">
            <Link
              href="/conditions"
              className={`legal-nav-tab ${activeSlug === "conditions" ? "active" : ""}`}
            >
              Conditions d&apos;utilisation
            </Link>
            <Link
              href="/confidentialite"
              className={`legal-nav-tab ${activeSlug === "confidentialite" ? "active" : ""}`}
            >
              Politique de confidentialité
            </Link>
          </nav>

          <Link href="/" className="legal-back-btn">
            <ArrowLeft size={14} />
            <span>Retour à l&apos;accueil</span>
          </Link>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="legal-main">
        <article className="legal-card">
          <h1>{title}</h1>

          <div className="legal-meta-bar">
            <div className="legal-meta-item">
              <Calendar size={14} />
              <span>Dernière révision : <b>{LEGAL_UPDATED}</b></span>
            </div>
            <div className="legal-meta-item">
              <MapPin size={14} />
              <span>Éditeur : <b>{EDITOR.name}</b> ({EDITOR.address})</span>
            </div>
            <div className="legal-meta-item">
              <Mail size={14} />
              <span>Délégué / Contact : <b>{EDITOR.contact}</b></span>
            </div>
          </div>

          <div className="legal-content">
            {children}
          </div>
        </article>
      </main>
    </div>
  );
}
