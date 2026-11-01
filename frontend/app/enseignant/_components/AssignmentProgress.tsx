import { CalendarClock } from "lucide-react";
import { isPastDue, type AssignmentSummary } from "@/app/_scolaire/lib/enseignantApi";
import { dueLabel } from "@/app/_scolaire/lib/format";
import { className } from "@/app/_scolaire/lib/levels";

/** Un devoir : titre, classe, barre « x/y élèves ont terminé » et échéance. */
export function AssignmentProgress({ summary, showClass = true }: { summary: AssignmentSummary; showClass?: boolean }) {
  const { assignment, mission, classroom, completed, total } = summary;
  return (
    <div className="ec-progress-row">
      <header>
        <b style={{ color: "var(--ec-text)" }}>{mission.title}</b>
        {showClass && <span>{className(classroom)}</span>}
      </header>
      <div className="ec-progress" role="progressbar" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={total} aria-label={`Réalisation du devoir ${mission.title}`}>
        <span style={{ width: `${total ? (completed / total) * 100 : 0}%` }} />
      </div>
      <header>
        <span>{completed}/{total} élèves ont terminé</span>
        <span><CalendarClock size={13} aria-hidden="true" style={{ verticalAlign: -2 }} /> {assignment.dueDate === null ? "Sans date limite" : `${isPastDue(assignment) ? "Date limite passée" : "À rendre"} ${dueLabel(assignment.dueDate)}`}</span>
      </header>
    </div>
  );
}
