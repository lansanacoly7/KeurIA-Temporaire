import HomeClient from "./HomeClient";

// Page d'accueil publique pré-générée statiquement avec réactualisation horaire (ISR) :
// élimine le temps de rendu SSR à chaque visiteur et sert la page en quelques millisecondes.
export const revalidate = 3600;

export default function Home() {
  return <HomeClient />;
}
