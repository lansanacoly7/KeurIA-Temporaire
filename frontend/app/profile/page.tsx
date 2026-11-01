import { redirect } from "next/navigation";
import { localSignOutPath, requireLocalUser } from "../local-auth";
import ProfileClient from "./ProfileClient";

export const dynamic="force-dynamic";

export default async function ProfilePage(){
  const user=await requireLocalUser("/profile");
  if(user.role==="eleve"||user.role==="enfant")redirect("/dashboard/profil");
  return <ProfileClient authName={user.displayName} email={user.email} signOutUrl={localSignOutPath("/")} />;
}
