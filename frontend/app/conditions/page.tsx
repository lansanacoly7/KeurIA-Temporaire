import type { Metadata } from "next";
import { EDITOR, LegalPage } from "../legal-page";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation — kEur IA",
  description: "Conditions générales d'utilisation de la plateforme éducative kEur IA, éditée par SIRIBRA.",
};

export default function ConditionsPage() {
  return (
    <LegalPage
      title="Conditions Générales d'Utilisation"
      activeSlug="conditions"
    >
      <div className="legal-note">
        <strong>Préambule :</strong> kEur IA est un environnement numérique d&apos;apprentissage dédié à l&apos;initiation des jeunes de 7 à 15 ans à l&apos;intelligence artificielle et à la programmation. L&apos;accès des élèves mineurs est impérativement supervisé par un représentant légal (parent ou tuteur) ou par un enseignant dans le cadre d&apos;un projet pédagogique scolaire.
      </div>

      <nav className="legal-toc" aria-label="Sommaire">
        <div className="legal-toc-title">Sommaire des articles</div>
        <ul className="legal-toc-list">
          <li><a href="#art1">Article 1 — Objet et champ d&apos;application</a></li>
          <li><a href="#art2">Article 2 — Protection des mineurs et accord parental</a></li>
          <li><a href="#art3">Article 3 — Cadre scolaire et comptes élèves</a></li>
          <li><a href="#art4">Article 4 — Règles de conduite et d&apos;usage</a></li>
          <li><a href="#art5">Article 5 — Studio de programmation et créations</a></li>
          <li><a href="#art6">Article 6 — Encadrement du tuteur Palou</a></li>
          <li><a href="#art7">Article 7 — Responsabilité de l&apos;éditeur</a></li>
          <li><a href="#art8">Article 8 — Résiliation et droit applicable</a></li>
        </ul>
      </nav>

      <section id="art1" className="legal-article">
        <h2>Article 1 — Objet et champ d&apos;application</h2>
        <p>
          Les présentes Conditions Générales d&apos;Utilisation (ci-après « CGU ») régissent les modalités d&apos;accès et d&apos;utilisation de la plateforme <strong>kEur IA</strong>, éditée et exploitée par la structure <strong>{EDITOR.name}</strong>, domiciliée à {EDITOR.address}.
        </p>
        <p>
          Toute utilisation de la plateforme implique l&apos;acceptation sans réserve des présentes conditions par l&apos;utilisateur ou par son représentant légal pour les utilisateurs mineurs.
        </p>
      </section>

      <section id="art2" className="legal-article">
        <h2>Article 2 — Protection des mineurs et consentement parental</h2>
        <p>
          Conformément aux réglementations internationales de protection des mineurs sur Internet :
        </p>
        <ol>
          <li>
            <strong>Inscription encadrée :</strong> Aucun enfant de moins de 16 ans ne peut ouvrir un compte individuel de manière autonome. La création du compte doit obligatoirement être réalisée ou validée par un parent, un tuteur légal ou un enseignant agréé.
          </li>
          <li>
            <strong>Supervision parentale :</strong> Le titulaire du compte parent dispose d&apos;un accès dédié lui permettant de vérifier les temps d&apos;utilisation, de consulter les progrès et d&apos;activer ou restreindre les fonctionnalités de l&apos;enfant.
          </li>
          <li>
            <strong>Retrait du consentement :</strong> Le représentant légal peut à tout moment demander la modification ou la suppression définitive du compte de l&apos;enfant ainsi que de l&apos;ensemble de ses productions.
          </li>
        </ol>
      </section>

      <section id="art3" className="legal-article">
        <h2>Article 3 — Utilisation en milieu scolaire</h2>
        <p>
          Pour les établissements scolaires partenaires (écoles primaires, collèges) :
        </p>
        <ul>
          <li>
            <strong>Attribution centralisée :</strong> Les accès d&apos;établissements sont délivrés de manière contractuelle par SIRIBRA.
          </li>
          <li>
            <strong>Anonymisation des élèves :</strong> Dans le cadre d&apos;une utilisation scolaire, les élèves n&apos;ont pas à fournir d&apos;adresse électronique personnelle. Les accès s&apos;effectuent au moyen d&apos;identifiants et de fiches de connexion générés par l&apos;établissement.
          </li>
          <li>
            <strong>Encadrement pédagogique :</strong> L&apos;équipe éducative s&apos;assure de l&apos;adéquation des activités avec les programmes scolaires et veille au respect des consignes de bienveillance.
          </li>
        </ul>
      </section>

      <section id="art4" className="legal-article">
        <h2>Article 4 — Règles de conduite et d&apos;usage acceptable</h2>
        <p>
          kEur IA constitue un espace d&apos;apprentissage bienveillant. Les utilisateurs s&apos;interdisent formellement :
        </p>
        <ul>
          <li>Toute publication ou saisie de propos injurieux, haineux, discriminatoires ou contraires à la protection des mineurs.</li>
          <li>Toute tentative d&apos;intrusion, d&apos;altération du système informatique ou de contournement des contrôles parentaux.</li>
          <li>L&apos;usurpation de l&apos;identité d&apos;un autre apprenant ou d&apos;un membre de l&apos;équipe éducative.</li>
          <li>Tout usage de la messagerie familiale autre que les échanges entre un parent et ses enfants : elle est réservée à la famille.</li>
          <li>L&apos;introduction d&apos;outils automatisés (bots, scrapers) ou de requêtes abusives susceptibles de saturer les infrastructures.</li>
        </ul>
      </section>

      <section id="art5" className="legal-article">
        <h2>Article 5 — Studio de programmation et créations d&apos;élèves</h2>
        <p>
          La plateforme intègre un environnement de programmation visuelle basé sur les technologies Scratch 3.0 :
        </p>
        <ul>
          <li>
            <strong>Propriété des œuvres :</strong> Les élèves conservent la pleine propriété intellectuelle des programmes, histoires et jeux créés dans le cadre de leurs ateliers.
          </li>
          <li>
            <strong>Environnement cloisonné :</strong> Par mesure de sécurité, les projets réalisés au sein de kEur IA demeurent strictement cantonnés à l&apos;espace de l&apos;élève ou de sa classe, excluant toute exposition publique non contrôlée.
          </li>
        </ul>
      </section>

      <section id="art6" className="legal-article">
        <h2>Article 6 — Encadrement de l&apos;assistant pédagogique Palou</h2>
        <p>
          Palou est un compagnon virtuel interactif conçu pour expliquer des concepts et guider les exercices :
        </p>
        <ul>
          <li>Les réponses sont filtrées pour convenir à un public d&apos;enfants (vocabulaire adapté, filtres éthiques stricts).</li>
          <li>L&apos;assistant a un rôle purement éducatif et ne dispense en aucun cas de conseils médicaux, juridiques ou personnels.</li>
          <li>En cas de sollicitation hors sujet ou inadaptée, le tuteur oriente systématiquement l&apos;apprenant vers ses parents ou son enseignant.</li>
        </ul>
      </section>

      <section id="art7" className="legal-article">
        <h2>Article 7 — Responsabilité et disponibilité du service</h2>
        <p>
          SIRIBRA s&apos;engage à mettre en œuvre les moyens techniques nécessaires pour assurer la continuité et la sécurité du service. Toutefois, SIRIBRA ne saurait être tenue responsable des interruptions temporaires liées à la maintenance, aux pannes de réseaux de télécommunications tiers ou aux cas de force majeure.
        </p>
      </section>

      <section id="art8" className="legal-article">
        <h2>Article 8 — Résiliation, révision et droit applicable</h2>
        <p>
          Les présentes CGU peuvent être mises à jour pour refléter les évolutions légales ou techniques. En cas de modification substantielle, les utilisateurs ou leurs représentants légaux en seront notifiés.
        </p>
        <p>
          Les présentes conditions sont soumises à la législation en vigueur relative aux services numériques et à la protection des données. Tout litige relatif à leur interprétation ou exécution sera porté devant les juridictions compétentes.
        </p>
        <p>
          Pour toute question : <a href={`mailto:${EDITOR.contact}`}>{EDITOR.contact}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
