"use client";

import React from "react";
import {
  Bot,
  Eye,
  ShoppingBasket,
  PawPrint,
  Image as ImageIcon,
  MessageSquare,
  Palette,
  Shield,
  Search,
  Globe,
  Compass,
  Smartphone,
  Puzzle,
  Brain,
  Camera,
  Sparkles,
  Wand2,
  Scale,
  Lock,
  Flag,
  BarChart3,
  Settings,
  Dna,
  Keyboard,
  Rocket,
  Award,
  Star,
  Target,
  Trophy,
  Zap,
  HelpCircle,
  Gamepad2,
  FlaskConical,
  Landmark,
  Pencil,
  Mic,
  Music,
  School,
  Hand,
  Home,
  RefreshCw,
  Cloud,
  Folder,
  Lightbulb,
  Sun,
  Trees,
  Flower2,
  Ship,
  Fish,
  Car,
  Cat,
  User,
  Crown,
  Umbrella,
  CircleDot,
  LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  bot: Bot,
  eye: Eye,
  basket: ShoppingBasket,
  paw: PawPrint,
  image: ImageIcon,
  message: MessageSquare,
  palette: Palette,
  shield: Shield,
  search: Search,
  globe: Globe,
  compass: Compass,
  smartphone: Smartphone,
  puzzle: Puzzle,
  brain: Brain,
  camera: Camera,
  sparkles: Sparkles,
  wand: Wand2,
  scale: Scale,
  lock: Lock,
  flag: Flag,
  chart: BarChart3,
  settings: Settings,
  dna: Dna,
  keyboard: Keyboard,
  rocket: Rocket,
  award: Award,
  star: Star,
  target: Target,
  trophy: Trophy,
  zap: Zap,
  help: HelpCircle,
  gamepad: Gamepad2,
  flask: FlaskConical,
  landmark: Landmark,
  pencil: Pencil,
  speech: Mic,
  mic: Mic,
  music: Music,
  school: School,
  hand: Hand,
  home: Home,
  recycle: RefreshCw,
  cloud: Cloud,
  folder: Folder,
  lightbulb: Lightbulb,
  sun: Sun,
  tree: Trees,
  flower: Flower2,
  boat: Ship,
  fish: Fish,
  car: Car,
  cat: Cat,
  user: User,
  person: User,
  crown: Crown,
  umbrella: Umbrella,
  ball: CircleDot,
  butterfly: Sparkles,
  papillon: Sparkles,
};

interface ModuleIconProps {
  name?: string;
  size?: number;
  className?: string;
  color?: string;
  strokeWidth?: number;
}

export function ModuleIcon({
  name,
  size = 24,
  className = "",
  color,
  strokeWidth = 2,
}: ModuleIconProps) {
  const normalizedKey = (name || "").toLowerCase().trim();
  const IconComponent = ICON_MAP[normalizedKey] || Bot;

  return (
    <IconComponent
      size={size}
      className={className}
      color={color}
      strokeWidth={strokeWidth}
      aria-hidden="true"
    />
  );
}

export default ModuleIcon;
