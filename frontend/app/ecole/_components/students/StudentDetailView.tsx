"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { ArrowLeft, ArrowRightLeft, Award, KeyRound, Pencil, UserRoundCheck, UserRoundX } from "lucide-react";
import { getStudent, resetStudentPassword, setStudentStatus } from "@/app/_scolaire/lib/ecoleApi";
import { ageFrom, deName, dePrefix, formatDate, formatRelative, fullName } from "@/app/_scolaire/lib/format";
import { className, levelInfo } from "@/app/_scolaire/lib/levels";
import type { Credentials } from "@/app/_scolaire/lib/types";
import { generateParentLinkCode, getParentLink, unlinkParent } from "@/app/_scolaire/lib/parentLinks";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { ParentLinkCard } from "@/app/_scolaire/ui/ParentLinkCard";
import { MovedMessage, MoveStudentModal } from "../classes/MoveStudentModal";
import { CredentialsModal } from "@/app/_scolaire/ui/CredentialsModal";
import { Badge, ConfirmModal, ErrorMessage, Notice, PageHeader, Skeleton, StatusBadge } from "@/app/_scolaire/ui/ui";
import { StudentFormModal } from "./StudentFormModal";

type Dialog = "edit" | "move" | "reset" | "status" | null;

export function StudentDetailView({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const shouldReset = searchParams.get("reset") === "1";
  const load = useCallback(() => getStudent(id), [id]);
  const loadLink = useCallback(() => getParentLink(id), [id]);
  const generateLink = useCallback(() => generateParentLinkCode(id), [id]);
  const removeLink = useCallback(() => unlinkParent(id), [id]);
  const { data, error, reload } = useApi(load);
  const [dialog, setDialog] = useState<Dialog>(shouldReset ? "reset" : null);
  const [prevShouldReset, setPrevShouldReset] = useState(shouldReset);
  if (shouldReset !== prevShouldReset) {
    setPrevShouldReset(shouldReset);
    if (shouldReset) {
      setDialog("reset");
    }
  }
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [notice, setNotice] = useState<React.ReactNode>(null);

  const back = <Link href="/ecole/eleves" className="ec-back"><ArrowLeft size={16} aria-hidden="true" /> Tous les élèves</Link>;

  if (error) return <>{back}<ErrorMessage message={error} /></>;
  if (!data) return <>{back}<Skeleton height={48} width={260} /><div style={{ height: 24 }} /><Skeleton height={200} /></>;

  const { student, classroom } = data;
  const name = fullName(student);
  const disabled = student.status === "desactive";

  function done(message: React.ReactNode) {
    setDialog(null);
    setBusy(false);
    setNotice(message);
    reload();
  }

  async function confirmReset() {
    setBusy(true);
    const result = await resetStudentPassword(student.id);
    setDialog(null);
    setBusy(false);
    setCredentials(result);
  }

  async function confirmStatus() {
    setBusy(true);
    await setStudentStatus(student.id, disabled ? "actif" : "desactive");
    done(disabled ? `Le compte ${deName(name)} est réactivé.` : `Le compte ${deName(name)} est désactivé : l'élève ne peut plus se connecter.`);
  }

  return (
    <>
      {back}
      <PageHeader
        title={name}
        subtitle={`${student.matricule} · ${classroom ? className(classroom) : "Sans classe"}`}
        actions={
          <>
            <Link className="ec-btn" href={`/ecole/certificats?eleve=${student.id}`} target="_blank" rel="noopener noreferrer">
              <Award size={17} aria-hidden="true" /> Certificat
            </Link>
            <button type="button" className="ec-btn" onClick={() => setDialog("edit")}><Pencil size={17} aria-hidden="true" /> Modifier</button>
            <button type="button" className="ec-btn ec-btn--caution" onClick={() => setDialog("move")} disabled={disabled}><ArrowRightLeft size={17} aria-hidden="true" /> Changer de classe</button>
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
        <section className="ec-card" aria-labelledby="identite-titre">
          <h2 id="identite-titre">Identité</h2>
          <dl className="ec-dl">
            <dt>Prénom et nom</dt><dd>{name}</dd>
            <dt>Sexe</dt><dd>{student.sexe === "F" ? "Fille" : "Garçon"}</dd>
            <dt>Date de naissance</dt><dd>{formatDate(student.birthDate)} ({ageFrom(student.birthDate)} ans)</dd>
            <dt>Matricule</dt><dd>{student.matricule}</dd>
            <dt>Classe</dt>
            <dd>
              {classroom
                ? <Link href={`/ecole/classes/${classroom.id}`}>{className(classroom)}</Link>
                : <Badge tone="warn">Sans classe</Badge>}
            </dd>
            {student.parentPhone && (
              <>
                <dt>Contact parent</dt>
                <dd>{student.parentPhone}</dd>
              </>
            )}
          </dl>
        </section>

        <section className="ec-card" aria-labelledby="compte-titre">
          <h2 id="compte-titre">Compte de connexion</h2>
          <dl className="ec-dl">
            <dt>Identifiant</dt><dd className="ec-login">{student.login}</dd>
            <dt>Statut</dt><dd><StatusBadge status={student.status} /></dd>
            <dt>Dernière connexion</dt><dd>{formatRelative(student.lastLoginAt)}</dd>
            <dt>Inscrit le</dt><dd>{formatDate(student.createdAt)}</dd>
          </dl>
        </section>

        <section className="ec-card" aria-labelledby="progression-titre">
          <h2 id="progression-titre">Progression</h2>
          <div className="ec-mini-stats">
            <div><small>XP</small><b>{student.xp}</b></div>
            <div><small>Leçons terminées</small><b>{student.lessonsCompleted}</b></div>
            <div><small>Parcours</small><b>{classroom ? `${levelInfo(classroom.level).track} ans` : "—"}</b></div>
          </div>
        </section>

        {/* key : recharge le bloc quand le statut du compte change (désactivé → pas de code). */}
        <ParentLinkCard key={student.status} load={loadLink} generate={generateLink} unlink={removeLink} showContact />
      </div>

      {dialog === "edit" && (
        <StudentFormModal student={student} onClose={() => setDialog(null)} onSaved={() => done("Les informations de l'élève ont été mises à jour.")} />
      )}
      {dialog === "move" && (
        <MoveStudentModal student={student} onClose={() => setDialog(null)} onMoved={result => done(<MovedMessage student={student} result={result} onUndone={message => { setNotice(message); reload(); }} />)} />
      )}
      {dialog === "reset" && (
        <ConfirmModal
          title="Générer un nouveau mot de passe ?"
          consequences={[
            <>L&apos;ancien mot de passe {dePrefix(name)}<b>{name}</b>{" "}ne fonctionnera plus, immédiatement.</>,
            "Un mot de passe provisoire s'affichera une seule fois : il faudra le remettre à l'élève.",
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
          message={disabled ? "L'élève pourra de nouveau se connecter avec son identifiant et son mot de passe." : undefined}
          consequences={disabled ? undefined : [
            "L'élève ne peut plus se connecter à kEur IA.",
            "Il n'apparaît plus comme actif dans sa classe ni dans le suivi des devoirs.",
          ]}
          unchanged={disabled ? undefined : "le compte, la classe, le matricule et toute la progression."}
          reversibility={disabled ? undefined : "Vous pourrez réactiver le compte à tout moment."}
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
          subtitle={classroom ? className(classroom) : undefined}
          credentials={credentials}
          onClose={() => { setCredentials(null); setNotice(`Nouveau mot de passe généré pour ${name}.`); }}
        />
      )}
    </>
  );
}
