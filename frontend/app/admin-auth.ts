import { getLocalUser } from "./local-auth";

function configuredAdmins(value: unknown){
  return String(value ?? "").split(",").map(v=>v.trim().toLowerCase()).filter(Boolean);
}

export async function isAdminEmail(email: string){
  const adminEmails = configuredAdmins(process.env.KEUR_ADMIN_EMAILS);
  return adminEmails.includes(email.trim().toLowerCase());
}

export async function getAdminUser(){
  const user=await getLocalUser();
  if(!user || (user.role!=="admin" && !(await isAdminEmail(user.email)))) return null;
  return user;
}
