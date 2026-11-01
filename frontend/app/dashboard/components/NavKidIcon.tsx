import { Map, BookOpen, Gamepad2, Code2, Rocket, Sparkles, Trophy, GraduationCap, Users, Settings, User, CalendarCheck, Compass, Star, Puzzle, type LucideIcon } from "lucide-react";
import ChildAvatar from "../../components/ChildAvatar";
import "./nav-kid-icon.css";

export type NavKidIconName =
  | "aventure" | "modules" | "jeux" | "programmation" | "arcade" | "badges" | "classement" | "devoirs"
  | "aujourdhui" | "parcours" | "classe" | "etoiles" | "libre"
  | "profil" | "suivi" | "admin" | "compte";

const ICONS: Record<Exclude<NavKidIconName, "profil">, LucideIcon> = {
  aventure: Map,
  modules: BookOpen,
  jeux: Gamepad2,
  programmation: Code2,
  arcade: Rocket,
  badges: Sparkles,
  classement: Trophy,
  devoirs: GraduationCap,
  // Cahier de classe de l'élève d'école (T9).
  aujourdhui: CalendarCheck,
  parcours: Compass,
  classe: Users,
  etoiles: Star,
  libre: Puzzle,
  // Espaces adultes.
  suivi: Users,
  admin: Settings,
  compte: User,
};

/** Médaillon d'icône de la barre latérale : icône Lucide au trait, ou portrait de l'élève pour « profil ». */
export default function NavKidIcon({ name, avatarId }: { name: NavKidIconName; avatarId?: string | null }) {
  if (name === "profil") {
    return <span className="nav-icon nav-kid-icon nav-kid-avatar" aria-hidden="true"><ChildAvatar id={avatarId} size={30} /></span>;
  }
  const Icon = ICONS[name];
  return (
    <span className="nav-icon nav-kid-icon" aria-hidden="true">
      <Icon size={19} strokeWidth={2} />
    </span>
  );
}
