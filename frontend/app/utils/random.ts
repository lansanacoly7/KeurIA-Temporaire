/**
 * Aléa de l'interface : animations, confettis, ordre des propositions d'un quiz, salutations.
 *
 * Utilise le générateur cryptographique du navigateur (ou de Node pour les tests) plutôt que Math.random() :
 *  - l'ordre des réponses d'un quiz n'est pas devinable par un élève qui observerait les tirages précédents ;
 *  - les analyseurs de sécurité (SonarQube S2245) ne signalent plus un générateur prévisible.
 * Aucun secret n'est produit ici : ces valeurs servent à l'affichage uniquement.
 */

const POOL_SIZE = 256;
const pool = new Uint32Array(POOL_SIZE);
let cursor = POOL_SIZE; // piscine vide : remplie au premier appel

function refill() {
  const api = globalThis.crypto;
  if (api && typeof api.getRandomValues === "function") {
    api.getRandomValues(pool);
  } else {
    // Environnement sans crypto (ancien navigateur) : mélange de l'horloge, suffisant pour de la décoration.
    let seed = (Date.now() ^ (typeof performance !== "undefined" ? Math.floor(performance.now() * 1000) : 0)) >>> 0;
    for (let i = 0; i < POOL_SIZE; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; // générateur congruentiel linéaire (Numerical Recipes)
      pool[i] = seed;
    }
  }
  cursor = 0;
}

/** Nombre réel dans [0, 1[ (même contrat que Math.random). */
export function randomFloat(): number {
  if (cursor >= POOL_SIZE) refill();
  return pool[cursor++] / 4294967296;
}

/** Entier dans [0, maxExclusive[. */
export function randomInt(maxExclusive: number): number {
  return Math.floor(randomFloat() * maxExclusive);
}

/** Un élément au hasard d'une liste non vide. */
export function randomPick<T>(items: readonly T[]): T {
  return items[randomInt(items.length)];
}

/**
 * Mélange de Fisher-Yates (uniforme : chaque ordre est équiprobable). À préférer à `liste.sort(() => Math.random() - 0.5)`,
 * dont le résultat est biaisé et dépend du moteur JavaScript. `rng` est injectable pour des tests reproductibles.
 */
export function shuffle<T>(items: readonly T[], rng: () => number = randomFloat): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
