"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { getClassroom, getSchool, getStudent } from "@/app/_scolaire/lib/ecoleApi";
import type { School } from "@/app/_scolaire/lib/types";
import { CertificateDocument, type CertificateData } from "@/app/_scolaire/ui/CertificateDocument";
import { ErrorMessage, Skeleton } from "@/app/_scolaire/ui/ui";

export function CertificatesPrintView({
  studentId,
  classId,
}: {
  studentId?: string | null;
  classId?: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const [backHref, setBackHref] = useState("/ecole/eleves");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const schoolData = await getSchool();
        if (cancelled) return;
        setSchool(schoolData);

        if (studentId) {
          setBackHref(`/ecole/eleves/${studentId}`);
          const res = await getStudent(studentId);
          if (cancelled) return;
          const cert: CertificateData = {
            school: {
              name: schoolData.name,
              city: schoolData.city,
              logoUrl: schoolData.logoUrl,
            },
            student: res.student,
            classroom: res.classroom
              ? {
                  level: res.classroom.level,
                  section: res.classroom.section,
                  academicYear: res.classroom.academicYear,
                }
              : null,
          };
          setCertificates([cert]);
        } else if (classId) {
          setBackHref(`/ecole/classes/${classId}`);
          const res = await getClassroom(classId);
          if (cancelled) return;
          const certs: CertificateData[] = res.students.map(s => ({
            school: {
              name: schoolData.name,
              city: schoolData.city,
              logoUrl: schoolData.logoUrl,
            },
            student: s,
            classroom: {
              level: res.classroom.level,
              section: res.classroom.section,
              academicYear: res.classroom.academicYear,
            },
          }));
          setCertificates(certs);
        } else {
          setError("Veuillez sélectionner un élève ou une classe pour imprimer un certificat.");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erreur de chargement des données.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [studentId, classId]);

  if (error) {
    return (
      <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
        <Link href={backHref} className="ec-back" style={{ marginBottom: 16 }}>
          <ArrowLeft size={16} aria-hidden="true" /> Retour
        </Link>
        <ErrorMessage message={error} />
      </div>
    );
  }

  if (loading || !school) {
    return (
      <div style={{ padding: 24, maxWidth: 900, margin: "0 auto", display: "grid", gap: 16 }}>
        <Skeleton height={42} width={260} />
        <Skeleton height={400} />
      </div>
    );
  }

  return (
    <div className="ec-cert-page ec-print-area">
      {/* Barre d'action supérieure, masquée lors de l'impression */}
      <aside className="ec-cert-actions" aria-label="Commandes d'impression">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={backHref} className="ec-btn" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Retour</span>
          </Link>
          <div style={{ fontSize: 14 }}>
            <b>
              {certificates.length === 1
                ? "Certificat officiel prêt"
                : `${certificates.length} certificats de classe prêts`}
            </b>
            <span style={{ color: "var(--ec-muted)", marginLeft: 8, fontSize: 13 }}>
              (Format A4 Paysage · Activer les graphiques d&apos;arrière-plan)
            </span>
          </div>
        </div>

        <button
          type="button"
          className="ec-btn ec-btn--primary"
          onClick={() => window.print()}
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <Printer size={18} aria-hidden="true" />
          <span>Imprimer ou Exporter en PDF</span>
        </button>
      </aside>

      {/* Diplômes à imprimer */}
      {certificates.map(cert => (
        <CertificateDocument key={cert.student.id} data={cert} />
      ))}
    </div>
  );
}
