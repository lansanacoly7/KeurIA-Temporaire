"use client";

import Image from "next/image";

export type CertificateData = {
  school: {
    name: string;
    city: string;
    logoUrl?: string | null;
  };
  student: {
    id: string;
    firstName: string;
    lastName: string;
    matricule: string;
    lessonsCompleted?: number;
    xp?: number;
  };
  classroom?: {
    level: string;
    section: string;
    academicYear?: string;
  } | null;
  issuedDate?: string;
  serialNumber?: string;
};

export function CertificateDocument({ data }: { data: CertificateData }) {
  const { school, student, classroom, issuedDate, serialNumber } = data;
  const fullName = `${student.firstName} ${student.lastName.toUpperCase()}`;
  const classLabel = classroom ? `${classroom.level} ${classroom.section}`.trim() : null;
  const dateFormatted = issuedDate || new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const serial = serialNumber || `KIA-2026-${student.matricule || student.id.slice(0, 6)}`;
  const lessons = student.lessonsCompleted && student.lessonsCompleted > 0 ? student.lessonsCompleted : 15;

  return (
    <article className="ec-cert-frame ec-print-area" aria-label={`Certificat de ${fullName}`}>
      <div className="ec-cert-inner">
        {/* En-tête : logo kEur IA et logo de l'école si disponible */}
        <header className={`ec-cert-header ${school.logoUrl ? "" : "is-centered"}`}>
          {school.logoUrl && (
            <div style={{ maxHeight: 52, maxWidth: 180, display: "flex", alignItems: "center" }}>
              <img
                src={school.logoUrl}
                alt={school.name}
                style={{ maxHeight: 48, maxWidth: "100%", width: "auto", height: "auto", objectFit: "contain" }}
              />
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Image
              src="/images/keur-ia-logo.png"
              alt="kEur IA — Apprendre, jouer, créer"
              width={220}
              height={70}
              style={{ maxHeight: 52, width: "auto", height: "auto", objectFit: "contain" }}
              priority
              unoptimized
            />
          </div>
        </header>

        {/* Titre officiel du certificat */}
        <div>
          <h1 className="ec-cert-title">
            Certificat d&apos;Initiation à l&apos;IA et à la Programmation
          </h1>

          <div className="ec-cert-recipient">
            <small>Décerné avec honneur à :</small>
            <div className="ec-cert-name">{fullName}</div>
            <div className="ec-cert-context">
              {classLabel ? `Élève en classe de ${classLabel}` : "Élève"} · {school.name} ({school.city})
            </div>
          </div>
        </div>

        {/* Formule d'accomplissement pédagogique */}
        <p className="ec-cert-desc">
          Pour avoir exploré avec curiosité et complété avec succès le parcours d&apos;apprentissage des
          fondamentaux de l&apos;Intelligence Artificielle, de la logique algorithmique et de la programmation avec kEur IA.
        </p>

        {/* 3 Médaillons d'accomplissement */}
        <div className="ec-cert-badges">
          <div className="ec-cert-badge">
            <b>{lessons}</b>
            <span>Défis réussis</span>
          </div>
          <div className="ec-cert-badge">
            <b>Explorateur</b>
            <span>Niveau IA</span>
          </div>
          <div className="ec-cert-badge">
            <b>{classroom?.academicYear || "2025-2026"}</b>
            <span>Session</span>
          </div>
        </div>

        {/* Pied de page : Sceau d'honneur, signatures et numéro de série */}
        <footer className="ec-cert-footer">
          <div className="ec-cert-sign">
            <div className="ec-cert-seal" aria-hidden="true">
              Sceau d&apos;Excellence
            </div>
            <div className="ec-cert-sign-line" />
            <b>La Direction de l&apos;Établissement</b>
            <span style={{ fontSize: 10, color: "var(--ec-muted)" }}>Cachet &amp; Signature</span>
          </div>

          <div style={{ textAlign: "center", alignSelf: "center", marginBottom: 8 }}>
            <div>Fait le {dateFormatted}</div>
            <div style={{ fontSize: 10, color: "var(--ec-muted)", marginTop: 2 }}>{school.city}</div>
          </div>

          <div className="ec-cert-sign" style={{ alignItems: "flex-end" }}>
            <div style={{ height: 42, display: "flex", alignItems: "flex-end", paddingBottom: 6 }}>
              <span style={{ fontFamily: "cursive", fontSize: 18, color: "#174e49" }}>kEur IA Académie</span>
            </div>
            <div className="ec-cert-sign-line" />
            <b>L&apos;Équipe Pédagogique kEur IA</b>
            <span style={{ fontSize: 10, color: "var(--ec-muted)", marginTop: 2 }}>
              N° {serial}
            </span>
          </div>
        </footer>
      </div>
    </article>
  );
}
