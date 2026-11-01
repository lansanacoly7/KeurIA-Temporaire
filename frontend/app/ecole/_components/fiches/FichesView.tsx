"use client";

import { useCallback, useState } from "react";
import { Printer, Upload } from "lucide-react";
import { getClassroom, issueStudentCredentials, listClassrooms } from "@/app/_scolaire/lib/ecoleApi";
import type { ImportKind } from "@/app/_scolaire/lib/importing";
import { className } from "@/app/_scolaire/lib/levels";
import { useApi } from "@/app/_scolaire/lib/useApi";
import type { SheetItem } from "@/app/_scolaire/ui/CredentialSheet";
import { CredentialsExplanation, CredentialsPicker, IssuedSheet } from "@/app/_scolaire/ui/CredentialsPicker";
import { useSchool } from "@/app/_scolaire/ui/SchoolContext";
import { ErrorMessage, Field, PageHeader, Skeleton } from "@/app/_scolaire/ui/ui";
import { ImportWizard } from "../import/ImportWizard";

function ClassStudents({ classId, onIssued }: { classId: string; onIssued: (items: SheetItem[]) => void }) {
  const load = useCallback(() => getClassroom(classId), [classId]);
  const { data, error } = useApi(load);

  if (error) return <ErrorMessage message={error} />;
  if (!data) return <div className="ec-card"><Skeleton height={160} /></div>;
  return <CredentialsPicker students={data.students} classLabel={className(data.classroom)} generate={issueStudentCredentials} onIssued={onIssued} />;
}

export function FichesView({
  initialClassId,
  initialTab = "fiches",
  initialKind = "eleves",
}: {
  initialClassId?: string | null;
  initialTab?: "fiches" | "import";
  initialKind?: ImportKind;
}) {
  const [tab, setTab] = useState<"fiches" | "import">(initialTab);
  const { data: classrooms } = useApi(listClassrooms);
  const { school } = useSchool();
  const [classId, setClassId] = useState(initialClassId ?? "");
  const [sheet, setSheet] = useState<SheetItem[] | null>(null);

  return (
    <>
      <PageHeader
        title="Fiches & Connexions"
        subtitle="Mise en route des apprenants : importez vos listes ou imprimez les fiches d'identifiants par classe."
      />

      <div className="ec-segmented" role="tablist" aria-label="Mise en route et fiches" style={{ marginBottom: 24 }}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "fiches"}
          onClick={() => { setTab("fiches"); setSheet(null); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <Printer size={16} aria-hidden="true" />
          <span>Fiches par classe</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "import"}
          onClick={() => { setTab("import"); setSheet(null); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <Upload size={16} aria-hidden="true" />
          <span>Importer une liste (PDF, Excel, CSV)</span>
        </button>
      </div>

      {tab === "fiches" ? (
        sheet ? (
          <IssuedSheet items={sheet} schoolName={school?.name ?? ""} backLabel="Autre classe" onBack={() => setSheet(null)} />
        ) : (
          <>
            <CredentialsExplanation />
            <div className="ec-card" style={{ marginBottom: 16 }}>
              <Field label="Classe">
                <select className="ec-select" value={classId} onChange={e => setClassId(e.target.value)}>
                  <option value="">Choisir une classe…</option>
                  {(classrooms ?? []).map(({ classroom, studentCount }) => (
                    <option key={classroom.id} value={classroom.id}>{className(classroom)} ({studentCount} élèves)</option>
                  ))}
                </select>
              </Field>
            </div>
            {classId && <ClassStudents key={classId} classId={classId} onIssued={setSheet} />}
          </>
        )
      ) : (
        <ImportWizard initialKind={initialKind} embedded />
      )}
    </>
  );
}
