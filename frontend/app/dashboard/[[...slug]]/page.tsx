import DashboardClient from "../DashboardClient";
import { appLoginPath, localSignOutPath, getLocalUser, DJANGO_API_URL, SSR_HEADERS } from "../../local-auth";
import { isAdminEmail } from "../../admin-auth";
import { redirect } from "next/navigation";
import type { ComponentProps } from "react";

export const dynamic = "force-dynamic";

export default async function DashboardPage({params, searchParams}:{params:Promise<{slug?:string[]}>, searchParams:Promise<{school?:string}>}){
  const {slug}=await params;
  // Sans onglet dans l'adresse : l'élève d'école ouvre son cahier « Aujourd'hui », les autres leur aventure.
  const tabFromUrl = slug && slug.length > 0 ? slug[0] : null;
  const {school:schoolSlug}=await searchParams;
  const user=await getLocalUser();
  const returnTo=schoolSlug?`/dashboard?school=${encodeURIComponent(schoolSlug)}`:"/dashboard";
  if(!user)redirect(appLoginPath(returnTo));
  // Personnel d'une école : chacun dans son espace de gestion.
  if(user.role==="admin_ecole")redirect("/ecole");
  if(user.role==="enseignant")redirect("/enseignant");
  const isAdmin=user.role==="admin"||await isAdminEmail(user.email);
  const accountRole = user.role;
  // Parcours de l'élève, relu à chaque chargement (page dynamique, profil sans cache) : enfant de famille → celui de son âge,
  // fixé à l'inscription ; élève d'école → son parcours effectif calculé par le serveur (exception de l'enseignant, sinon
  // niveau de sa classe). Sans parcours connu, parcours de départ.
  const assignedAge: "7-9" | "10-12" | "13-15" =
    user.ageGroup === "10-12" || user.ageGroup === "13-15" || user.ageGroup === "7-9" ? user.ageGroup : "7-9";
  let school = null;
  // Un élève d'une école voit toujours l'habillage de SA école (le thème choisi par la direction), sans paramètre dans
  // l'adresse. Pour les autres comptes, l'habillage ne vient que du paramètre ?school=.
  const brandSlug = (user.role === "eleve" || user.role === "enfant") && user.schoolSlug ? user.schoolSlug : schoolSlug;
  try {
    if (brandSlug) {
      const res = await fetch(`${DJANGO_API_URL}/api/schools/${encodeURIComponent(brandSlug)}`, { cache: 'no-store', headers: SSR_HEADERS });
      if (res.ok) school = (await res.json()).school ?? null;
    }
  } catch (error) {
    // La marque de l'école est facultative : la page s'affiche sans elle, mais l'incident est visible dans les journaux du serveur.
    console.warn("Marque de l'école indisponible", error);
  }
  return <DashboardClient signedIn isAdmin={isAdmin} accountRole={accountRole} isSchoolStudent={Boolean(user.isSchoolStudent)} assignedAge={assignedAge} school={school?{name:school.name,slug:school.slug,primaryColor:school.primaryColor,secondaryColor:school.secondaryColor,accentColor:school.accentColor}:null} displayName={user.displayName} email={user.email} signInUrl={appLoginPath(returnTo)} signOutUrl={localSignOutPath("/")} activeTab={(tabFromUrl ?? (user.isSchoolStudent ? "aujourdhui" : "aventure")) as ComponentProps<typeof DashboardClient>["activeTab"]} />;
}
