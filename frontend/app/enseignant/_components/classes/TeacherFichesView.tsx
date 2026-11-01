"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { getTeacherClass, issueCredentialsAsTeacher } from "@/app/_scolaire/lib/enseignantApi";
import { className } from "@/app/_scolaire/lib/levels";
import { useApi } from "@/app/_scolaire/lib/useApi";
import type { SheetItem } from "@/app/_scolaire/ui/CredentialSheet";
import { CredentialsExplanation, CredentialsPicker, IssuedSheet } from "@/app/_scolaire/ui/CredentialsPicker";
import { useSchool } from "@/app/_scolaire/ui/SchoolContext";
import { ErrorMessage, PageHeader, Skeleton } from "@/app/_scolaire/ui/ui";

/** Fiches de connexion d'UNE classe de l'enseignant (nouveaux mots de passe). */
export function TeacherFichesView({ classId }: { classId: string }) {
  const { school } = useSchool();
  const load = useCallback(() => getTeacherClass(classId), [classId]);
  const { data, error } = useApi(load);
  const [sheet, setSheet] = useState<SheetItem[] | null>(null);
  const generate = useCallback((ids: string[]) => issueCredentialsAsTeacher(classId, ids), [classId]);

  const label = data ? className(data.classroom) : "";
  const back = <Link href={`/enseignant/classes/${classId}`} className="ec-back"><ArrowLeft size={16} aria-hidden="true" /> {label || "Retour à la classe"}</Link>;

  if (error) return <>{back}<ErrorMessage message={error} /></>;

  return (
    <>
      {back}
      <PageHeader title="Fiches de connexion" subtitle={data ? `Identifiants à remettre aux élèves de ${label}.` : undefined} />
      {sheet ? (
        <IssuedSheet items={sheet} schoolName={school?.name ?? ""} backLabel="Générer d'autres fiches" onBack={() => setSheet(null)} />
      ) : !data ? (
        <div className="ec-card"><Skeleton height={160} /></div>
      ) : (
        <>
          <CredentialsExplanation />
          <CredentialsPicker students={data.students.map(row => row.student)} classLabel={label} generate={generate} onIssued={setSheet} />
        </>
      )}
    </>
  );
}
