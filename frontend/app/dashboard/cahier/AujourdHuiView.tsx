"use client";

/*
 * « Aujourd’hui » : la page d’accueil du cahier de classe (maquette 01). La
 * séance ouverte par l'enseignant, le mot ou le sondage de la classe et les
 * devoirs à rendre tiennent sur un seul écran, lisible pour un enfant de 6 à 9
 * ans : grandes cartes, verbes simples, aucune donnée d'adulte.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CalendarDays, Clock } from "lucide-react";
import { tracks } from "../../lms-data";
import { pollPercentages } from "../../_scolaire/lib/classeVivante";
import {
  duePhrase,
  remainingLabel,
  rulesMessages,
  type AssignmentsPayload,
  type Restrictions,
  type Today,
  type TodayAnnouncement,
} from "./cahierLogic";
import { answerAnnouncement, fetchCahierData } from "./eleveApi";
import "./cahier.css";

/** Titre de la leçon liée à la séance : les identifiants (« p1-1 ») sont les mêmes dans les trois parcours. */
function lessonTitle(lessonId: string | null | undefined): string | null {
  if (!lessonId) return null;
  for (const key of ["7-9", "10-12", "13-15"] as const) {
    for (const world of tracks[key].worlds) {
      const lesson = world.lessons.find(l => l.id === lessonId);
      if (lesson) return lesson.title;
    }
  }
  return null;
}

function publishedOn(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export function AujourdHuiView() {
  const router = useRouter();
  const [today, setToday] = useState<Today | null>(null);
  const [devoirs, setDevoirs] = useState<AssignmentsPayload | null>(null);
  // Les phrases de règles viennent de /api/eleve/restrictions : le payload d'accueil
  // (aujourdhui) contient bien les règles, mais sans les messages écrits pour l'enfant.
  const [rules, setRules] = useState<Restrictions | null>(null);
  const [left, setLeft] = useState(0);
  const [seedKey, setSeedKey] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchCahierData().then(({ day, hw, rules: restrictionRules }) => {
      if (!alive) return;
      setToday(day);
      setDevoirs(hw);
      setRules(restrictionRules);
    });
    return () => {
      alive = false;
    };
  }, []);

  const session = today?.session ?? null;
  // À chaque nouvelle séance (ou nouveau temps serveur), on repart du serveur ; ensuite le décompte coule localement.
  const sessionKey = session ? `${session.id}:${session.remainingSeconds}` : "";
  if (sessionKey !== seedKey) {
    setSeedKey(sessionKey);
    setLeft(session?.remainingSeconds ?? 0);
  }
  useEffect(() => {
    if (!sessionKey) return;
    const timer = setInterval(() => setLeft(value => (value > 0 ? value - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [sessionKey]);
  useEffect(() => {
    // La séance est finie (ou vient de finir) : le serveur décide, on reinterroge.
    if (!sessionKey || left !== 0) return;
    let alive = true;
    fetchCahierData().then(({ day, hw, rules: restrictionRules }) => {
      if (!alive) return;
      setToday(day);
      setDevoirs(hw);
      setRules(restrictionRules);
    });
    return () => {
      alive = false;
    };
  }, [left, sessionKey]);

  async function respond(announcement: TodayAnnouncement, choice: number) {
    setBusyId(announcement.id);
    setFailed(false);
    const answer = await answerAnnouncement(announcement.id, choice);
    setBusyId(null);
    if (!answer) {
      setFailed(true);
      return;
    }
    setToday(current =>
      current
        ? {
            ...current,
            announcements: current.announcements.map(item =>
              item.id === announcement.id ? { ...item, myChoice: answer.myChoice, counts: answer.counts } : item,
            ),
          }
        : current,
    );
  }

  const messages = rulesMessages(rules ?? today?.restrictions);
  const todo = (devoirs?.assignments ?? []).filter(item => item.status !== "termine").slice(0, 3);
  const linkedLesson = lessonTitle(session?.lessonId);

  return (
    <div className="dash-content cahier">
      <header className="cahier-head">
        <span>MON CAHIER DE CLASSE</span>
        <h2>Aujourd’hui</h2>
      </header>

      {messages.length > 0 && (
        <section className="cahier-rules" aria-label="Les règles de ta classe">
          {messages.map(line => (
            <p key={line}>{line}</p>
          ))}
        </section>
      )}

      {session ? (
        <section className="cahier-card cahier-seance">
          <b className="cahier-live">
            <i aria-hidden="true" /> Séance en cours
          </b>
          <h3>{session.title}</h3>
          {linkedLesson && <p className="cahier-sub">Leçon : {linkedLesson}</p>}
          <div className="cahier-seance-foot">
            <p className="cahier-count">
              <Clock size={18} aria-hidden="true" /> <b>{remainingLabel(left)}</b> restantes
            </p>
            <button type="button" onClick={() => router.push("/dashboard/parcours")}>
              Rejoindre la séance
            </button>
          </div>
        </section>
      ) : null}

      {today && today.announcements.length > 0 && (
        <section className="cahier-block">
          <h3>
            <Bell size={18} aria-hidden="true" /> Les nouvelles de ta classe
          </h3>
          {today.announcements.map(item =>
            item.kind === "text" ? (
              <article className="cahier-card" key={item.id}>
                {item.title && <h4>{item.title}</h4>}
                <p>{item.text}</p>
                <small>Publiée le {publishedOn(item.createdAt)}</small>
              </article>
            ) : (
              <PollCard
                key={item.id}
                announcement={item}
                busy={busyId === item.id}
                onChoose={choice => void respond(item, choice)}
              />
            ),
          )}
          {failed && (
            <p className="cahier-notice" role="alert">
              La réponse n’a pas été enregistrée. Réessaie.
            </p>
          )}
        </section>
      )}

      {devoirs?.isSchoolStudent && (
        <section className="cahier-block">
          <h3>
            <CalendarDays size={18} aria-hidden="true" /> Devoirs à rendre
          </h3>
          {todo.length === 0 ? (
            <p className="cahier-empty">Tout est propre : aucun devoir à rendre.</p>
          ) : (
            todo.map(item => (
              <article className="cahier-card cahier-hw" key={item.id}>
                <div>
                  <h4>{item.mission.title}</h4>
                  <small>Donné par {item.teacherName}</small>
                </div>
                <b className={item.status === "en_retard" ? "late" : ""}>{duePhrase(item)}</b>
              </article>
            ))
          )}
          <Link className="cahier-more" href="/dashboard/devoirs">
            Voir tous mes devoirs
          </Link>
        </section>
      )}

      {devoirs && !devoirs.isSchoolStudent && (
        <p className="cahier-empty">Ta classe n’est pas encore ouverte dans le cahier. Parle à ton enseignant.</p>
      )}
      {!today && !devoirs && (
        <p className="cahier-empty" role="status">
          Ton cahier de classe s’ouvre…
        </p>
      )}
    </div>
  );
}

function PollCard({
  announcement,
  busy,
  onChoose,
}: {
  announcement: TodayAnnouncement;
  busy: boolean;
  onChoose: (choice: number) => void;
}) {
  const answered = announcement.myChoice !== null && announcement.myChoice !== undefined;
  const percentages = answered && announcement.counts ? pollPercentages(announcement.counts) : null;
  const total = announcement.counts ? announcement.counts.reduce((sum, n) => sum + n, 0) : 0;

  return (
    <article className="cahier-card cahier-poll">
      {announcement.title && <h4>{announcement.title}</h4>}
      <p className="cahier-question">{announcement.text}</p>
      <div className="cahier-poll-options">
        {announcement.options.map((option, index) => (
          <button
            key={option}
            type="button"
            disabled={busy}
            className={announcement.myChoice === index ? "chosen" : ""}
            aria-pressed={announcement.myChoice === index}
            onClick={() => onChoose(index)}
          >
            <span>{option}</span>
            {percentages && <b>{percentages[index]} %</b>}
            {announcement.myChoice === index && <small>Ta réponse</small>}
          </button>
        ))}
      </div>
      {answered && <p className="cahier-poll-total">{total} réponse{total > 1 ? "s" : ""} de la classe</p>}
    </article>
  );
}
