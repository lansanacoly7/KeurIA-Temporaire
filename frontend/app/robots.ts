import type { MetadataRoute } from "next";

// L'application est un espace privé (comptes d'enfants) : seule la vitrine est indexable.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/"], disallow: ["/dashboard", "/api/", "/connexion", "/admin", "/ecole", "/enseignant", "/parent", "/profile"] }],
  };
}