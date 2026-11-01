import type { Metadata } from "next";
import { EDITOR, LegalPage } from "../legal-page";

export const metadata: Metadata = {
  title: "Politique de Confidentialité — kEur IA",
  description: "Politique de protection des données personnelles et de la vie privée des mineurs sur la plateforme kEur IA.",
};

export default function ConfidentialitePage() {
  return (
    <LegalPage
      title="Politique de Protection des Données et Confidentialité"
      activeSlug="confidentialite"
    >
      <div className="legal-note">
        <strong>Engagement fondamental :</strong> kEur IA applique une politique stricte de confidentialité adaptée aux mineurs. Nous ne vendons aucune donnée, nous n&apos;affichons aucune publicité commerciale et nous collectons uniquement les informations strictement requises pour le bon déroulement des apprentissages.
      </div>

      <nav className="legal-toc" aria-label="Sommaire">
        <div className="legal-toc-title">Sommaire des articles</div>
        <ul className="legal-toc-list">
          <li><a href="#art1">Article 1 — Responsable du traitement</a></li>
          <li><a href="#art2">Article 2 — Principes de protection de l&apos;enfance</a></li>
          <li><a href="#art3">Article 3 — Données collectées par profil</a></li>
          <li><a href="#art4">Article 4 — Finalités et bases légales</a></li>
          <li><a href="#art5">Article 5 — Absence totale de monétisation</a></li>
          <li><a href="#art6">Article 6 — Traitement des requêtes à l&apos;IA (Palou)</a></li>
          <li><a href="#art7">Article 7 — Durée de conservation</a></li>
          <li><a href="#art8">Article 8 — Sécurité et sous-traitants</a></li>
          <li><a href="#art9">Article 9 — Vos droits et contacts</a></li>
        </ul>
      </nav>

      <section id="art1" className="legal-article">
        <h2>Article 1 — Responsable du traitement des données</h2>
        <p>
          Le responsable du traitement des données à caractère personnel collectées sur la plateforme kEur IA est :
        </p>
        <p>
          <strong>{EDITOR.name}</strong><br />
          Siège social : {EDITOR.address}<br />
          Contact Délégué à la Protection des Données (DPO) :{" "}
          <a href={`mailto:${EDITOR.contact}`}>{EDITOR.contact}</a>
        </p>
      </section>

      <section id="art2" className="legal-article">
        <h2>Article 2 — Principes directeurs de protection de l&apos;enfance</h2>
        <p>
          Conformément aux normes en vigueur relatives à la protection des mineurs dans l&apos;espace numérique (directives de la Commission de Protection des Données Personnelles et standards internationaux) :
        </p>
        <ul>
          <li>
            <strong>Consentement parental obligatoire :</strong> Aucun compte élève de moins de 16 ans n&apos;est créé sans le consentement vérifié d&apos;un représentant légal ou le mandat d&apos;un établissement scolaire.
          </li>
          <li>
            <strong>Minimisation stricte :</strong> Seules les données indispensables à l&apos;expérience pédagogique sont collectées. L&apos;état civil complet, la localisation précise par GPS ou les numéros d&apos;identification nationaux ne sont jamais demandés.
          </li>
          <li>
            <strong>Environnement sanctuarisé :</strong> La plateforme ne comporte aucune publicité, aucun algorithme de recommandation commerciale et aucun mécanisme incitatif à l&apos;achat.
          </li>
        </ul>
      </section>

      <section id="art3" className="legal-article">
        <h2>Article 3 — Catégories de données collectées selon les profils</h2>

        <h3>3.1. Profil Élève / Apprenant</h3>
        <ul>
          <li><strong>Identifiant d&apos;usage :</strong> Prénom ou pseudonyme, âge ou tranche d&apos;âge (ex. 7–9 ans, 10–12 ans, 13–15 ans) indiqué par le parent, avatar sélectionné.</li>
          <li><strong>Genre :</strong> « garçon » ou « fille », indiqué par le parent à la création du profil de l&apos;enfant.</li>
          <li><strong>Messagerie familiale :</strong> les messages échangés entre l&apos;enfant et son parent sont enregistrés sur nos serveurs. Seuls les membres de la famille y ont accès. Ils sont supprimés avec le compte.</li>
          <li><strong>Données de parcours :</strong> Modules consultés, leçons validées, points d&apos;expérience (XP), badges obtenus.</li>
          <li><strong>Projets Scratch :</strong> Scripts et créations enregistrés dans le cadre des activités de programmation.</li>
        </ul>

        <h3>3.2. Profil Parent / Responsable légal</h3>
        <ul>
          <li><strong>Coordonnées :</strong> Prénom, nom, adresse e-mail, numéro de téléphone (utilisé pour la vérification de compte et les alertes de sécurité).</li>
          <li><strong>Authentification :</strong> Mot de passe chiffré par fonction de hachage à sens unique (irréversible et jamais accessible en clair).</li>
          <li><strong>Paramètres de contrôle :</strong> Historique de validation des accès et préférences de supervision.</li>
          <li><strong>Alertes sur l&apos;appareil (notifications push) :</strong> si le parent les active, l&apos;adresse technique de son navigateur est enregistrée pour pouvoir lui envoyer les alertes. Elle est supprimée avec le compte.</li>
        </ul>

        <h3>3.3. Profil Établissements et Enseignants</h3>
        <ul>
          <li>Nom de l&apos;école, classe, nom de l&apos;enseignant référent et e-mail professionnel pour la gestion pédagogique.</li>
        </ul>
      </section>

      <section id="art4" className="legal-article">
        <h2>Article 4 — Finalités du traitement des données</h2>
        <p>Les données recueillies sont exclusivement utilisées pour :</p>
        <ol>
          <li>Délivrer le service d&apos;apprentissage et adapter le niveau de difficulté à l&apos;âge de l&apos;enfant.</li>
          <li>Permettre aux parents de suivre la progression et de gérer le temps d&apos;écran de leur enfant.</li>
          <li>Permettre aux enseignants de suivre les travaux de classe dans un cadre scolaire sécurisé.</li>
          <li>Assurer la maintenance technique, la prévention des fraudes et la sécurité des infrastructures.</li>
        </ol>
      </section>

      <section id="art5" className="legal-article">
        <h2>Article 5 — Absence totale de commercialisation et de publicité</h2>
        <p>
          SIRIBRA s&apos;interdit formellement de vendre, louer, échanger ou monétiser toute donnée relative aux utilisateurs de kEur IA, en particulier les données concernant des mineurs.
        </p>
        <p>
          Aucun profilage publicitaire n&apos;est mis en place, et aucun traceur publicitaire tiers n&apos;est intégré dans nos applications.
        </p>
      </section>

      <section id="art6" className="legal-article">
        <h2>Article 6 — Traitement des requêtes à l&apos;assistant éducatif Palou</h2>
        <p>
          Palou est un assistant qui répond aux questions des enfants. Il est désactivé par défaut : un parent doit l&apos;autoriser dans ses réglages, et peut le désactiver à tout moment.
        </p>
        <ul>
          <li><strong>Service tiers :</strong> Les réponses sont générées par l&apos;API d&apos;Anthropic (Claude), un prestataire situé hors du Sénégal. Le texte des messages de l&apos;enfant, les réponses précédentes de la conversation en cours et sa tranche d&apos;âge lui sont transmis.</li>
          <li><strong>Données que nous n&apos;envoyons pas :</strong> le nom de l&apos;enfant, son adresse e-mail, son identifiant, son école et ses résultats. Les adresses e-mail et numéros de téléphone tapés dans un message sont masqués avant l&apos;envoi. Un enfant peut toutefois écrire un prénom ou une adresse dans une phrase : Palou lui rappelle de ne jamais partager ces informations.</li>
          <li><strong>Mémoire éphémère :</strong> La conversation n&apos;est jamais écrite en base de données. Elle est gardée une heure au plus dans un cache temporaire, pour la suite du dialogue, puis effacée.</li>
          <li><strong>Consignes de sécurité :</strong> Palou reçoit des consignes strictes (réponses courtes et bienveillantes, aucune demande d&apos;information personnelle, orientation vers un adulte de confiance en cas de danger). Aucun système automatique n&apos;est infaillible : un parent peut couper Palou à tout moment.</li>
        </ul>
      </section>

      <section id="art7" className="legal-article">
        <h2>Article 7 — Durée de conservation des données</h2>
        <p>
          Les données sont conservées uniquement pendant la durée nécessaire à la fourniture du service éducatif :
        </p>
        <ul>
          <li><strong>Comptes actifs :</strong> Données conservées tant que le compte est utilisé ou jusqu&apos;à demande expresse de suppression.</li>
          <li><strong>Comptes inactifs :</strong> Suppression automatique après 24 mois consécutifs sans connexion, après notification préalable au représentant légal.</li>
          <li><strong>Journaux de connexion (logs) :</strong> Conservés pour des raisons de sécurité technique pendant une durée maximale de 12 mois conformément aux obligations légales.</li>
        </ul>
      </section>

      <section id="art8" className="legal-article">
        <h2>Article 8 — Sécurité et hébergement</h2>
        <p>
          Toutes les communications entre votre terminal et nos serveurs sont protégées par chiffrement HTTPS / TLS. Les accès aux bases de données sont restreints et réservés à des comptes authentifiés.
        </p>
        <ul>
          <li><strong>Cookies :</strong> seuls des cookies strictement nécessaires sont utilisés : un cookie de session (14 jours au plus) et un cookie de sécurité contre les requêtes frauduleuses. Aucun cookie publicitaire, aucun outil de mesure d&apos;audience tiers.</li>
          <li><strong>Stockage local du navigateur :</strong> les préférences (son, affichage) et une copie de la progression y sont gardées pour que l&apos;application reste fluide. Elles sont effacées à la déconnexion.</li>
          <li><strong>Caméra :</strong> le jeu des gestes demande l&apos;accès à la caméra. L&apos;image est analysée sur l&apos;appareil lui-même : elle n&apos;est ni envoyée ni enregistrée.</li>
          <li><strong>Rapports d&apos;erreurs :</strong> quand une page plante, un court rapport technique (message d&apos;erreur et chemin de la page, sans paramètres ni identifiant) est envoyé à nos serveurs pour corriger le problème.</li>
        </ul>
      </section>

      <section id="art9" className="legal-article">
        <h2>Article 9 — Vos droits et exercice des recours</h2>
        <p>
          Conformément aux lois applicables sur la protection des données, tout utilisateur ou son représentant légal dispose des droits suivants :
        </p>
        <ul>
          <li><strong>Droit d&apos;accès et de rectification :</strong> Consulter et corriger les informations enregistrées sur son compte.</li>
          <li><strong>Droit à l&apos;effacement (« droit à l&apos;oubli ») :</strong> Demander la suppression intégrale de son compte et de ses données.</li>
          <li><strong>Droit d&apos;opposition et de limitation :</strong> Restreindre certains traitements non essentiels.</li>
        </ul>
        <p>
          Pour exercer ces droits, vous pouvez nous écrire directement à : <a href={`mailto:${EDITOR.contact}`}>{EDITOR.contact}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
