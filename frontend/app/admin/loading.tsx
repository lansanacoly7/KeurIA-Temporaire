import { SpaceSkeleton } from "../_space/SpaceSkeleton";

// Affiché dans l'espace (barre latérale déjà en place) pendant qu'une page se prépare.
export default function Loading() {
  return <SpaceSkeleton kind="gestion" contentOnly />;
}
