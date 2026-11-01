"use client";

import { useParentSettings } from "./useParentSettings";
import { SettingsToast, SettingsSidebar, DeleteAccountDialog } from "./SettingsPanels";
import { SettingsContent } from "./SettingsContent";
import { LinkChildModal } from "./components/LinkChildModal";

export function ParentSettingsView({
  initialDisplayName,
  initialEmail,
  onProfileUpdated,
}: {
  initialDisplayName?: string;
  initialEmail?: string;
  onProfileUpdated?: (profile: { displayName: string; email: string }) => void;
} = {}) {
  const s = useParentSettings({ initialDisplayName, initialEmail, onProfileUpdated });


  return (
    <div className="parent-settings-container" style={{ 
      maxWidth: 1200, margin: "0 auto", padding: "40px 24px", color: "#0f172a", 
      display: "flex", gap: 50, fontFamily: "'Plus Jakarta Sans', sans-serif",
      position: "relative"
    }}>
      {/* Toast Notification */}
      
      <SettingsToast s={s} />

      {/* Menu latéral des paramètres */}
      
      <SettingsSidebar s={s} />

      {/* Contenu principal */}
      
      <SettingsContent s={s} />

      
      <DeleteAccountDialog s={s} />

      {/* Modale Relier mon enfant */}
      {s.linkOpen && (
        <LinkChildModal
          onClose={() => s.setLinkOpen(false)}
          onLinked={() => {
            s.setLinkOpen(false);
            void s.loadSettings(s.selectedChildId);
            s.showToast("Votre enfant a été relié avec succès !");
          }}
        />
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .parent-settings-container,
        .parent-settings-container *,
        .parent-settings-container button,
        .parent-settings-container input,
        .parent-settings-container select,
        .parent-settings-container textarea,
        .parent-settings-container label,
        .parent-settings-container h1,
        .parent-settings-container h2,
        .parent-settings-container h3,
        .parent-settings-container h4,
        .parent-settings-container p,
        .parent-settings-container span {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @media (max-width: 960px) {
          .parent-settings-container {
            flex-direction: column !important;
            gap: 18px !important;
            padding: 0 0 40px !important;
          }
        }
      `}} />
    </div>
  );
}
