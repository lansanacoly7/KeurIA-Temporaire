"use client";


import { Info } from "lucide-react";
import { getTeacherSettings } from "@/app/_scolaire/lib/enseignantApi";
import { formatDate, formatRelative, fullName } from "@/app/_scolaire/lib/format";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { useSchool } from "@/app/_scolaire/ui/SchoolContext";
import { ErrorMessage, PageHeader, Skeleton, StatusBadge } from "@/app/_scolaire/ui/ui";

/** Paramètres de l'enseignant : tout est en lecture seule, géré par la direction. */
export function SettingsView() {
  const { school } = useSchool();
  const load = getTeacherSettings;
  const { data, error } = useApi(load);

  const header = <PageHeader title="Paramètres" subtitle="Vos informations personnelles et de compte." />;

  if (error) return <>{header}<ErrorMessage message={error} /></>;
  if (!data) return <>{header}<Skeleton height={260} /></>;

  const { teacher } = data;

  return (
    <>
      {header}

      <div className="ec-info">
        <Info size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          Ces informations sont gérées par la direction de votre école{school ? ` (${school.admin.title.toLowerCase()} : ${fullName(school.admin)})` : ""}.
          Pour les modifier, ou pour qu&apos;on vous confie une autre classe, adressez-vous à elle.
        </div>
      </div>

      <div className="ec-cards-3" style={{ marginBottom: 24 }}>
        <section className="ec-card" aria-labelledby="infos-titre">
          <h2 id="infos-titre">Mes informations</h2>
          <dl className="ec-dl">
            <dt>Prénom et nom</dt><dd>{fullName(teacher)}</dd>
            <dt>E-mail</dt><dd>{teacher.email}</dd>
            <dt>Téléphone</dt><dd>{teacher.phone}</dd>
          </dl>
        </section>

        <section className="ec-card" aria-labelledby="compte-titre">
          <h2 id="compte-titre">Mon compte</h2>
          <dl className="ec-dl">
            <dt>Identifiant de connexion</dt><dd>votre adresse e-mail</dd>
            <dt>Statut</dt><dd><StatusBadge status={teacher.status} /></dd>
            <dt>Dernière connexion</dt><dd>{formatRelative(teacher.lastLoginAt)}</dd>
            <dt>Compte créé le</dt><dd>{formatDate(teacher.createdAt)}</dd>
          </dl>
        </section>

        {school && (
          <section className="ec-card" aria-labelledby="ecole-titre">
            <h2 id="ecole-titre">Mon établissement</h2>
            <dl className="ec-dl">
              <dt>École</dt><dd>{school.name}</dd>
              <dt>Ville</dt><dd>{school.city}</dd>
              <dt>Année scolaire</dt><dd>{school.academicYear}</dd>
            </dl>
          </section>
        )}
      </div>
    </>
  );
}
