import { Check, Clock, Hourglass, ShieldAlert } from "lucide-react";

const STEPS = [
  { icon: Check, label: "Adresse e-mail confirmée", state: "done" },
  { icon: Hourglass, label: "Validation par l'équipe kEur IA", state: "current" },
  { icon: Clock, label: "Connexion à votre espace parent", state: "todo" },
] as const;

const TONES = {
  done: { background: "#E8F6F1", color: "#0D846E" },
  current: { background: "#FFF4DC", color: "#9A5B00" },
  todo: { background: "#F1F5F4", color: "#94A3A0" },
};

/**
 * Écran affiché quand l'inscription d'un parent attend (ou n'a pas reçu) l'accord de l'équipe kEur IA :
 * à la fin de l'inscription, et à chaque tentative de connexion tant que la demande n'est pas acceptée.
 */
export function PendingApproval({ declined, text, onBack }: { declined: boolean; text: string; onBack: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, textAlign: "center", padding: "6px 0" }}>
      <div style={{
        width: 68, height: 68, borderRadius: "50%", margin: "0 auto", display: "grid", placeItems: "center",
        background: declined ? "#FDECEA" : "#FFF4DC", color: declined ? "#B42318" : "#9A5B00",
        boxShadow: declined ? "0 4px 12px rgba(180, 35, 24, 0.15)" : "0 4px 12px rgba(154, 91, 0, 0.18)",
      }}>
        {declined ? <ShieldAlert size={34} aria-hidden="true" /> : <Hourglass size={34} aria-hidden="true" />}
      </div>
      <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#0F172A" }}>
        {declined ? "Demande non acceptée" : "Demande bien reçue !"}
      </h3>
      <p style={{ margin: 0, fontSize: 15, color: "#475569", lineHeight: 1.6 }} role="status">{text}</p>

      {!declined && (
        <ol aria-label="Étapes de l'inscription" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8, textAlign: "left" }}>
          {STEPS.map(({ icon: Icon, label, state }) => (
            <li key={label} aria-current={state === "current" ? "step" : undefined}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 14, border: "1px solid #E1EAE7", background: state === "current" ? "#FFFBF0" : "#fff" }}>
              <span style={{ ...TONES[state], width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Icon size={16} aria-hidden="true" />
              </span>
              <span style={{ fontWeight: state === "current" ? 800 : 600, color: state === "todo" ? "#94A3A0" : "#173E3C" }}>{label}</span>
            </li>
          ))}
        </ol>
      )}

      <button type="button" className="auth-submit" onClick={onBack} style={{ marginTop: 6, padding: "16px", fontSize: 16, fontWeight: 800, borderRadius: 16 }}>
        Retour à la connexion
      </button>
    </div>
  );
}
