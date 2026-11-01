"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, Compass, LogOut, Pencil, Shield, User, UserPlus, X } from "lucide-react";
import ChildAvatar from "../components/ChildAvatar";
import { signOut } from "../sign-out-client";
import "./profile.css";

type StudentRow = { displayName: string; email: string; ageTrack: string; password: string };
type StudentProfile = { id: number; nickname: string; learnerEmail: string | null; ageTrack: string; avatar: string };

const blankStudent = (): StudentRow => ({ displayName: "", email: "", ageTrack: "10-12", password: "" });
const roleLabel: Record<string, string> = { parent: "Parent", enseignant: "Enseignant", admin: "Administrateur" };

async function readJson(r: Response) {
  try { return await r.json(); } catch { return {}; }
}

/** Gestion du compte des adultes. L'élève a son profil dans le tableau de bord (/dashboard/profil). */
export default function ProfileClient({ authName, email }: { authName: string; email: string; signOutUrl?: string }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(authName);
  const [role, setRole] = useState("parent");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [studentRows, setStudentRows] = useState<StudentRow[]>([blankStudent()]);
  const [enrolling, setEnrolling] = useState(false);
  const [studentNotice, setStudentNotice] = useState("");
  const [studentError, setStudentError] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then(async (r) => ({ ok: r.ok, data: await readJson(r) }))
      .then(({ ok, data }) => {
        if (ok && data.profile) {
          if (data.profile.role === "eleve" || data.profile.role === "enfant") { router.replace("/dashboard/profil"); return; }
          setDisplayName(data.profile.displayName);
          setRole(data.profile.role);
        } else setError(data.error || "Impossible de charger le profil");
      })
      .catch(() => setError("Impossible de charger le profil"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (loading || role !== "parent") return;
    fetch("/api/profiles")
      .then(async (r) => ({ ok: r.ok, data: await readJson(r) }))
      .then(({ ok, data }) => { if (ok) setStudents(data.profiles || []); })
      .catch(() => {});
  }, [loading, role]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      const r = await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName: displayName.trim() }) });
      const d = await readJson(r);
      if (!r.ok) { setError(d.error || "Impossible d'enregistrer."); return; }
      setDisplayName(d.profile.displayName);
      setRole(d.profile.role);
      setNotice("Votre profil a été mis à jour avec succès.");
    } catch {
      setError("Impossible d'enregistrer le profil.");
    } finally {
      setSaving(false);
    }
  };

  const updateStudent = (index: number, key: keyof StudentRow, value: string) =>
    setStudentRows((rows) => rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));

  const enroll = async (e: FormEvent) => {
    e.preventDefault();
    setEnrolling(true); setStudentError(""); setStudentNotice("");
    try {
      const r = await fetch("/api/profiles", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ students: studentRows }) });
      const d = await readJson(r);
      if (!r.ok) { setStudentError(d.error || "Inscription impossible"); return; }
      setStudents((s) => [...s, ...(d.profiles || [])]);
      setStudentRows([blankStudent()]);
      setStudentNotice(`${d.count} élève${d.count > 1 ? "s" : ""} inscrit${d.count > 1 ? "s" : ""} avec succès.`);
    } catch {
      setStudentError("Inscription impossible");
    } finally {
      setEnrolling(false);
    }
  };

  const sidebar = (
    <aside className="pf-sidebar">
      <Link className="pf-logo" href="/dashboard"><img src="/images/keur-ia-logo.png" alt="kEur IA" /></Link>
      <nav aria-label="Navigation principale">
        <Link href="/dashboard"><Compass size={19} /><span>Tableau de bord</span></Link>
        <Link className="on" href="/profile" aria-current="page"><User size={19} /><span>Mon profil</span></Link>
      </nav>
      <button type="button" className="pf-signout" onClick={() => signOut("/connexion")}><LogOut size={19} /><span>Déconnexion</span></button>
    </aside>
  );

  const topBar = (
    <header className="pf-top">
      <p className="pf-top-title">Paramètres du compte</p>
      <button type="button" className="pf-logout" onClick={() => signOut("/connexion")}>Déconnexion</button>
    </header>
  );

  const flash = (
    <>
      {notice && <div className="pf-notice ok" role="status"><CheckCircle2 size={18} />{notice}</div>}
      {error && <div className="pf-notice bad" role="alert">{error}</div>}
    </>
  );

  /* ================= Vue adulte : gestion du compte ================= */
  return (
    <div className="pf-page">
      {sidebar}
      <div className="pf-body">
      {topBar}
      <main className="pf-content">
        <section className="pf-card pf-hero" style={{ gridTemplateColumns: "auto 1fr" }}>
          <div className="pf-avatar-ring"><User size={44} color="#0f755f" /></div>
          <div>
            <span className="pf-eyebrow">Mon compte</span>
            <h1>{displayName || authName}</h1>
            <div className="pf-status"><span className="pf-chip"><Shield size={15} />{roleLabel[role] || "Parent"}</span></div>
          </div>
        </section>

        {flash}

        <form className="pf-card pf-form" onSubmit={save}>
          <div className="pf-card-head"><h2><Pencil size={20} color="#0f755f" />Mes informations</h2><small>{loading ? "Chargement…" : "À jour"}</small></div>
          <label className="pf-field">Nom d&apos;affichage
            <span>Le nom utilisé dans votre tableau de bord et vos activités.</span>
            <input disabled={loading} required minLength={2} maxLength={80} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </label>
          <label className="pf-field">Adresse e-mail
            <span>Identifiant de connexion de votre compte, non modifiable ici.</span>
            <input readOnly value={email} />
          </label>
          <div className="pf-role"><span><Shield size={20} /></span><div><small>RÔLE DU COMPTE</small><b>{roleLabel[role] || "Parent"}</b></div></div>
          <div className="pf-actions">
            <Link className="pf-btn ghost" href="/dashboard">Annuler</Link>
            <button className="pf-btn" disabled={loading || saving} type="submit">{saving ? "Enregistrement…" : "Enregistrer les modifications"}</button>
          </div>
        </form>

        {role === "parent" && (
          <section className="pf-card">
            <div className="pf-card-head">
              <h2><UserPlus size={20} color="#0f755f" />Inscrire mes enfants</h2>
              <small>{students.length} élève{students.length > 1 ? "s" : ""}</small>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--pf-muted)", fontWeight: 600 }}>
              Créez un ou plusieurs comptes élèves rattachés à votre compte parent. Le rôle « Élève » leur est attribué automatiquement.
            </p>
            {studentNotice && <div className="pf-notice ok" style={{ marginBottom: 12 }}><CheckCircle2 size={18} />{studentNotice}</div>}
            {studentError && <div className="pf-notice bad" style={{ marginBottom: 12 }}>{studentError}</div>}
            {students.length > 0 && (
              <div className="pf-enrolled">
                {students.map((s) => (
                  <article key={s.id}>
                    <ChildAvatar id={s.avatar} size={44} />
                    <div><b>{s.nickname}</b><small>{s.learnerEmail || "Compte historique"} • {s.ageTrack} ans</small></div>
                  </article>
                ))}
              </div>
            )}
            <form className="pf-form" onSubmit={enroll}>
              <div className="pf-rows">
                {studentRows.map((row, i) => (
                  <div className="pf-student-row" key={i}>
                    <label className="pf-field">Nom complet<input required minLength={2} value={row.displayName} onChange={(e) => updateStudent(i, "displayName", e.target.value)} placeholder="Ex. Awa Ndiaye" /></label>
                    <label className="pf-field">Adresse e-mail<input required type="email" value={row.email} onChange={(e) => updateStudent(i, "email", e.target.value)} placeholder="awa@exemple.sn" /></label>
                    <label className="pf-field">Mot de passe<input required minLength={8} type="password" value={row.password} onChange={(e) => updateStudent(i, "password", e.target.value)} /></label>
                    <label className="pf-field">Tranche d&apos;âge
                      <select value={row.ageTrack} onChange={(e) => updateStudent(i, "ageTrack", e.target.value)}>
                        <option value="7-9">7–9 ans</option><option value="10-12">10–12 ans</option><option value="13-15">13–15 ans</option>
                      </select>
                    </label>
                    {studentRows.length > 1 && <button type="button" className="pf-remove" aria-label="Retirer cet élève" onClick={() => setStudentRows((rows) => rows.filter((_, x) => x !== i))}><X size={15} /></button>}
                  </div>
                ))}
              </div>
              <div className="pf-actions">
                <button type="button" className="pf-btn ghost" onClick={() => setStudentRows((rows) => [...rows, blankStudent()])}>Ajouter un autre élève</button>
                <button className="pf-btn" disabled={enrolling} type="submit">{enrolling ? "Création des comptes…" : `Inscrire ${studentRows.length} élève${studentRows.length > 1 ? "s" : ""}`}</button>
              </div>
            </form>
          </section>
        )}

        <section className="pf-card pf-role">
          <span><Shield size={20} /></span>
          <div>
            <b>Gestion sécurisée des rôles</b>
            <small style={{ fontWeight: 600, fontSize: 13, letterSpacing: 0, textTransform: "none" }}>Seuls les parents peuvent inscrire leurs enfants ; les comptes enseignants sont créés par un administrateur.</small>
          </div>
        </section>
      </main>
      </div>
    </div>
  );
}
