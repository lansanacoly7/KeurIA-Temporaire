"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ArrowLeft, KeyRound, Pencil, School, UserRoundCheck, UserRoundX } from "lucide-react";
import { getTeacher, listClassrooms, resetTeacherPassword, setTeacherStatus } from "@/app/_scolaire/lib/ecoleApi";
import { deName, dePrefix, formatDate, formatRelative, fullName, plural } from "@/app/_scolaire/lib/format";
import { className, levelInfo } from "@/app/_scolaire/lib/levels";
import type { Credentials } from "@/app/_scolaire/lib/types";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { CredentialsModal } from "@/app/_scolaire/ui/CredentialsModal";
import { Badge, ConfirmModal, EmptyState, ErrorMessage, Notice, PageHeader, Skeleton, StatusBadge } from "@/app/_scolaire/ui/ui";
import { TeacherFormModal } from "./TeacherFormModal";

type Dialog = "edit" | "reset" | "status" | null;

export function TeacherDetailView({ id }: { id: string }) {
  const load = useCallback(() => getTeacher(id), [id]);
  const { data, error, reload } = useApi(load);
  const { data: allClassrooms, reload: reloadClassrooms } = useApi(listClassrooms);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const back = <Link href="/ecole/enseignants" className="ec-back"><ArrowLeft size={16} aria-hidden="true" /> Tous les enseignants</Link>;

  if (error) return <>{back}<ErrorMessage message={error} /></>;
  if (!data) return <>{back}<Skeleton height={48} width={260} /><div style={{ height: 24 }} /><Skeleton height={200} /></>;

  const { teacher, classrooms } = data;
  const name = fullName(teacher);
  const disabled = teacher.status === "desactive";
  const studentCount = (classId: string) => allClassrooms?.find(row => row.classroom.id === classId)?.studentCount;

  function done(message: string) {
    setDialog(null);
    setBusy(false);
    setNotice(message);
    reload();
    reloadClassrooms();
  }

  async function confirmReset() {
    setBusy(true);
    const result = await resetTeacherPassword(teacher.id);
    setDialog(null);
    setBusy(false);
    setCredentials(result);
  }

  async function confirmStatus() {
    setBusy(true);
    await setTeacherStatus(teacher.id, disabled ? "actif" : "desactive");
    done(disabled
      ? `Le compte ${deName(name)} est réactivé. Pensez à lui confier ses classes.`
      : `Le compte ${deName(name)} est désactivé.`);
  }

  return (
    <>
      {back}
      <PageHeader
        title={name}
        subtitle={classrooms.length ? `Enseignant·e · ${classrooms.map(className).join(", ")}` : "Enseignant·e · aucune classe"}
        actions={
          <>
            <button type="button" className="ec-btn" onClick={() => setDialog("edit")} disabled={disabled}><Pencil size={17} aria-hidden="true" /> Modifier</button>
            <button type="button" className="ec-btn" onClick={() => setDialog("reset")} disabled={disabled}><KeyRound size={17} aria-hidden="true" /> Nouveau mot de passe</button>
            <button type="button" className={`ec-btn ${disabled ? "" : "ec-btn--danger"}`} onClick={() => setDialog("status")}>
              {disabled ? <UserRoundCheck size={17} aria-hidden="true" /> : <UserRoundX size={17} aria-hidden="true" />}
              {disabled ? " Réactiver" : " Désactiver"}
            </button>
          </>
        }
      />

      {notice && <Notice>{notice}</Notice>}

      <div className="ec-cards-3">
        <section className="ec-card" aria-labelledby="coordonnees-titre">
          <h2 id="coordonnees-titre">Coordonnées</h2>
          <dl className="ec-dl">
            <dt>Prénom et nom</dt><dd>{name}</dd>
            <dt>E-mail</dt><dd>{teacher.email}</dd>
            <dt>Téléphone</dt><dd>{teacher.phone}</dd>
          </dl>
        </section>

        <section className="ec-card" aria-labelledby="compte-titre">
          <h2 id="compte-titre">Compte de connexion</h2>
          <dl className="ec-dl">
            <dt>Identifiant</dt><dd className="ec-login">{teacher.email}</dd>
            <dt>Statut</dt><dd><StatusBadge status={teacher.status} /></dd>
            <dt>Dernière connexion</dt><dd>{formatRelative(teacher.lastLoginAt)}</dd>
            <dt>Ajouté le</dt><dd>{formatDate(teacher.createdAt)}</dd>
          </dl>
        </section>
      </div>

      <PageHeader section title="Classes confiées" />
      {classrooms.length === 0 ? (
        <div className="ec-card">
          <EmptyState
            icon={School}
            title="Aucune classe"
            text={disabled ? "Un compte désactivé n'a pas de classe." : "Confiez-lui une ou plusieurs classes avec le bouton « Modifier »."}
          />
        </div>
      ) : (
        <div className="ec-grid-cards">
          {classrooms.map(classroom => {
            const level = levelInfo(classroom.level);
            const count = studentCount(classroom.id);
            return (
              <Link key={classroom.id} href={`/ecole/classes/${classroom.id}`} className="ec-class-card" data-track={level.track}>
                <div className="ec-class-card-head">
                  <div>
                    <b>{className(classroom)}</b>
                    <span>{level.label}</span>
                  </div>
                  <Badge tone="info">{level.track} ans</Badge>
                </div>
                <div className="ec-class-card-foot">
                  <span className="ec-meta"><b>{count === undefined ? "…" : plural(count, "élève")}</b></span>
                  <span className="ec-meta">{classroom.academicYear}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {dialog === "edit" && (
        <TeacherFormModal
          teacher={teacher}
          currentClassIds={classrooms.map(c => c.id)}
          onClose={() => setDialog(null)}
          onSaved={() => done("Les informations de l'enseignant ont été mises à jour.")}
        />
      )}
      {dialog === "reset" && (
        <ConfirmModal
          title="Générer un nouveau mot de passe ?"
          consequences={[
            <>L&apos;ancien mot de passe {dePrefix(name)}<b>{name}</b>{" "}ne fonctionnera plus, immédiatement.</>,
            "Un mot de passe provisoire s'affichera une seule fois : il faudra le transmettre à l'enseignant.",
          ]}
          unchanged="l'identifiant de connexion, le compte et la progression."
          reversibility="Action définitive : l'ancien mot de passe ne peut pas être rétabli."
          confirmLabel="Générer le mot de passe"
          danger
          busy={busy}
          onConfirm={confirmReset}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "status" && (
        <ConfirmModal
          title={disabled ? `Réactiver le compte ${deName(name)} ?` : `Désactiver le compte ${deName(name)} ?`}
          message={disabled ? "L'enseignant pourra de nouveau se connecter. Ses anciennes classes ne lui sont pas rendues automatiquement." : undefined}
          consequences={disabled ? undefined : [
            "L'enseignant ne peut plus se connecter à kEur IA.",
            classrooms.length > 0
              ? <><b>{classrooms.map(className).join(", ")}</b>{" "}{classrooms.length > 1 ? "se retrouvent sans enseignant : il faudra les confier" : "se retrouve sans enseignant : il faudra la confier"} à quelqu&apos;un d&apos;autre.</>
              : "Aucune classe ne lui était confiée.",
          ]}
          unchanged={disabled ? undefined : "les classes, leurs élèves et les devoirs déjà donnés."}
          reversibility={disabled ? undefined : "Vous pourrez réactiver le compte, puis lui confier de nouveau ses classes."}
          confirmLabel={disabled ? "Réactiver le compte" : "Désactiver le compte"}
          danger={!disabled}
          busy={busy}
          onConfirm={confirmStatus}
          onClose={() => setDialog(null)}
        />
      )}
      {credentials && (
        <CredentialsModal
          title="Nouveau mot de passe"
          personName={name}
          subtitle="Enseignant·e"
          credentials={credentials}
          onClose={() => { setCredentials(null); setNotice(`Nouveau mot de passe généré pour ${name}.`); }}
        />
      )}
    </>
  );
}
