import type { Metadata } from "next";
import "./fonts.css"; // polices hébergées par le site (pas de requête vers Google)
import "./design/tokens.css";
import "./design/animations.css";
import "./globals.css";
import "./pilot.css";
import "./pilot-label.css";
import "./age-lock.css";
import "./readability.css";
import "./daily-program.css";
import "./logo.css";
import "./icon-cleanup.css";
import "./registration-policy.css";
import "./games-extra.css";
import "./lesson-play.css";
import "./unique-lesson-play.css";
import "./design/tutorial.css";
import "./games-map.css";
import "./dashboard/programmation/programmation.css";
import "./responsive.css"; // toujours en dernier : elle remplace les règles responsives contradictoires des feuilles précédentes
import "./scroll-down-hint.css";
import ActivityPing from "./activity-ping";
import CsrfFetch from "./csrf-fetch";
import ClientErrorReporter from "./client-error-reporter";
import DisplayZoomScript from "./components/DisplayZoomScript";

export const metadata: Metadata = {
  title: "kEur IA — Apprendre l'IA en jouant",
  description: "La plateforme ludique pour comprendre, questionner et créer avec l'intelligence artificielle. Parcours adaptés de 7 à 15 ans.",
  // Le navigateur réclame /favicon.ico à chaque page : on lui indique le fichier qui existe (sinon : erreur 404 dans la console).
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" data-theme="aventurier">
      <head>
        <DisplayZoomScript />
      </head>
      <body suppressHydrationWarning>
        <CsrfFetch />
        <ClientErrorReporter />
        <ActivityPing />
        {children}
      </body>
    </html>
  );
}
