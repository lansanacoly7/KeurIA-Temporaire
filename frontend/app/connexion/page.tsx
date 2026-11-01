import { redirect } from "next/navigation";
import { getLocalUser, safeReturnTo } from "../local-auth";
import { homePathFor } from "../space-home";
import ConnexionClient from "./ConnexionClient";
import "./connexion.css";
import "./auth-local.css";
import "./auth-roles.css";

export const dynamic="force-dynamic";
export default async function ConnexionPage({searchParams}:{searchParams?:Promise<{returnTo?:string; choix?:string; select?:string; expired?:string}>}){
  // Sans page demandée (« / ») : l'espace du compte, voir space-home.ts.
  const params=await searchParams;
  const returnTo=safeReturnTo(params?.returnTo||"/");
  const forceChoose = Boolean(params?.choix || params?.select);
  // L'administration de la plateforme a sa propre porte d'entrée : on y renvoie toute demande vers /admin
  // (accès direct, session expirée, déconnexion), pour qu'aucun lien n'ouvre l'espace admin depuis la connexion des utilisateurs.
  if(returnTo==="/admin"||returnTo.startsWith("/admin/")){
    redirect(`/connexion/admin?returnTo=${encodeURIComponent(returnTo)}${params?.expired?"&expired=1":""}`);
  }
  const user=await getLocalUser();
  if(user)redirect(returnTo==="/"||returnTo==="/dashboard"?homePathFor(user.role,user.schoolId):returnTo);
  return <ConnexionClient returnTo={returnTo} forceChoose={forceChoose} expired={Boolean(params?.expired)} />;
}
