"use client";



// LISTES COMPLÈTES : 24 HEURES & 60 MINUTES
export const ALL_HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i.toString().padStart(2, "0"),
  label: `${i.toString().padStart(2, "0")} h`
}));

export const ALL_MINUTES = Array.from({ length: 60 }, (_, i) => ({
  value: i.toString().padStart(2, "0"),
  label: `${i.toString().padStart(2, "0")} min`
}));
