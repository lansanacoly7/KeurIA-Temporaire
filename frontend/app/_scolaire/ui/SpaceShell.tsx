"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { signOut } from "@/app/sign-out-client";
import { ShellUserProvider } from "./ShellUserContext";
import "./nav-badge.css";

/** activeFor : autres pages rattachées à cette entrée (ex. les années scolaires, ouvertes depuis Paramètres). */
export type NavItem = { href: string; label: string; icon: LucideIcon; activeFor?: string[]; badge?: number };

/**
 * Cadre commun des espaces école et enseignant : menu latéral (repliable sur
 * mobile), nom de l'école, utilisateur connecté et déconnexion.
 */
export function SpaceShell({ spaceLabel, rootHref, nav, user, signOutInSidebar = false, children }: {
  /** « Gestion de l'école », « Espace enseignant »… */
  spaceLabel: string;
  /** Page d'accueil de l'espace : active seulement quand on y est exactement. */
  rootHref: string;
  nav: NavItem[];
  user: { initials: string; name: string; role: string } | null;
  /** Bouton de déconnexion en bas de la barre latérale (comme l'espace parent) au lieu du bandeau du haut. */
  signOutInSidebar?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Fermer le menu mobile avec Échap.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // L'administration de la plateforme a sa propre page de connexion.
  const loginPath = pathname === "/admin" || pathname.startsWith("/admin/") ? "/connexion/admin" : "/connexion";
  const matches = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const isActive = ({ href, activeFor = [] }: NavItem) => href === rootHref ? pathname === href : matches(href) || activeFor.some(matches);

  return (
    <ShellUserProvider value={user}>
      <div className="ec-app">
        <div className="ec-overlay" data-open={menuOpen} onClick={() => setMenuOpen(false)} aria-hidden="true" />

        <aside className="ec-sidebar" data-open={menuOpen} aria-label={`Menu : ${spaceLabel}`}>
          <div className="ec-brand">
            {/* Logo officiel (texte foncé sur fond blanc) : posé sur une carte blanche. */}
            <Link href={rootHref} className="ec-brand-logo" onClick={() => setMenuOpen(false)}>
              <Image src="/images/keur-ia-logo.png" alt="kEur IA — Apprendre, jouer, créer" width={1800} height={600} sizes="220px" priority />
            </Link>
            <small>{spaceLabel}</small>
          </div>

          <nav className="ec-nav">
            {nav.map(item => {
              const { href, label, icon: Icon, badge } = item;
              const active = isActive(item);
              return (
                <Link key={href} href={href} aria-current={active ? "page" : undefined} onClick={() => setMenuOpen(false)}>
                  <Icon size={19} strokeWidth={active ? 2.4 : 1.8} aria-hidden="true" />
                  {label}
                  {badge ? <span className="ec-nav-badge" aria-label={`${badge} en attente`}>{badge}</span> : null}
                </Link>
              );
            })}
          </nav>

          <div style={{ marginTop: "auto" }}>
            {user && (
              <div className="ec-user">
                <div className="ec-avatar" aria-hidden="true">{user.initials}</div>
                <div>
                  <b>{user.name}</b>
                  <span>{user.role}</span>
                </div>
              </div>
            )}

            {signOutInSidebar && (
              <div className="ec-account" style={user ? { marginTop: 0 } : undefined}>
                <button type="button" className="ec-logout" onClick={() => signOut(loginPath)}>
                  <LogOut size={16} aria-hidden="true" /> Se déconnecter
                </button>
              </div>
            )}
          </div>
        </aside>

        <div className="ec-shell">
          <header className={signOutInSidebar ? "ec-topbar ec-topbar--mobile" : "ec-topbar"}>
            <button
              type="button"
              className="ec-icon-btn ec-menu-button"
              onClick={() => setMenuOpen(open => !open)}
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {!signOutInSidebar && (
              <div className="ec-topbar-extra">
                <button type="button" className="ec-btn" onClick={() => signOut(loginPath)}>
                  <LogOut size={16} aria-hidden="true" /> Se déconnecter
                </button>
              </div>
            )}
          </header>
          <main className="ec-main">{children}</main>
        </div>
      </div>
    </ShellUserProvider>
  );
}
