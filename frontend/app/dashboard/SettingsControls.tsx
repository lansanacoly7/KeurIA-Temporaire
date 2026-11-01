"use client";

import React, { useState, useEffect, useRef } from "react";
import { Check, ChevronRight, ChevronDown } from "lucide-react";
import { ALL_HOURS, ALL_MINUTES } from "./SettingsShared";

export const CustomDropdown = ({ options, value, onChange }: { options: string[], value: string, onChange: (v: string) => void }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <div style={{position: 'relative', flex: 1}}>
      <div 
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)} 
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsOpen(!isOpen); } }}
        style={{ padding: "18px 15px", fontSize: 17, fontWeight: 700, color: "#0F172A", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        {value}
        <ChevronRight size={18} color="#94A3B8" style={{ transform: isOpen ? "rotate(-90deg)" : "rotate(90deg)", transition: "transform 0.2s" }} />
      </div>
      {isOpen && (
        <div role="listbox" style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", borderRadius: 16, border: "1px solid #E2E8F0", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", zIndex: 10, overflow: "hidden", marginTop: 8 }}>
          {options.map(opt => (
            <div 
              key={opt} 
              role="option"
              tabIndex={0}
              aria-selected={value === opt}
              onClick={() => { onChange(opt); setIsOpen(false); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(opt); setIsOpen(false); } }}
              style={{ padding: "14px 20px", cursor: "pointer", background: value === opt ? "#F0FDF4" : "white", color: value === opt ? "#16A34A" : "#334155", fontWeight: value === opt ? 700 : 500 }}
              onMouseOver={e => e.currentTarget.style.background = value === opt ? "#F0FDF4" : "#F8FAFC"}
              onMouseOut={e => e.currentTarget.style.background = value === opt ? "#F0FDF4" : "white"}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// COMPOSANT LISTE DÉROULANTE ÉLÉGANTE POUR SÉLECTIONNER HEURE OU MINUTE
const TimeSelectDropdown = ({ 
  options, 
  value, 
  onChange,
  prefixLabel
}: { 
  options: { value: string; label: string }[]; 
  value: string; 
  onChange: (v: string) => void;
  prefixLabel?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Défilement automatique vers l'élément sélectionné à l'ouverture
  useEffect(() => {
    if (isOpen && listRef.current) {
      const selectedItem = listRef.current.querySelector('[data-selected="true"]') as HTMLElement;
      if (selectedItem) {
        listRef.current.scrollTop = selectedItem.offsetTop - 50;
      }
    }
  }, [isOpen]);

  const selectedOpt = options.find(o => o.value === value) || options[0];

  return (
    <div ref={containerRef} style={{ position: "relative", flex: 1 }}>
      {prefixLabel && (
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 4, letterSpacing: "0.03em" }}>
          {prefixLabel}
        </div>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          padding: "12px 16px",
          borderRadius: 16,
          border: isOpen ? "2px solid #0f766e" : "1.5px solid var(--field-border)",
          background: isOpen ? "#F0FDF4" : "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          transition: "all 0.2s",
          boxShadow: isOpen ? "0 0 0 4px rgba(15, 118, 110, 0.12)" : "0 1px 3px rgba(0,0,0,0.02)"
        }}
      >
        <span style={{ fontSize: 17, fontWeight: 800, color: "#0F172A" }}>
          {selectedOpt.label}
        </span>
        <ChevronDown 
          size={18} 
          color={isOpen ? "#0f766e" : "#94A3B8"} 
          style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} 
        />
      </button>

      {/* Menu déroulant élégant avec défilement fluide */}
      {isOpen && (
        <div 
          ref={listRef}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "white",
            borderRadius: 16,
            border: "1px solid #E2E8F0",
            boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
            zIndex: 100,
            maxHeight: 220,
            overflowY: "auto",
            padding: 6,
            animation: "fadeIn 0.15s ease-out"
          }}
        >
          {options.map(opt => {
            const isSel = opt.value === value;
            return (
              <div
                key={opt.value}
                data-selected={isSel}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: isSel ? 800 : 500,
                  color: isSel ? "#065F46" : "#334155",
                  background: isSel ? "#ccfbf1" : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "background 0.15s"
                }}
                onMouseOver={e => !isSel && (e.currentTarget.style.background = "#F8FAFC")}
                onMouseOut={e => !isSel && (e.currentTarget.style.background = "transparent")}
              >
                <span>{opt.label}</span>
                {isSel && <Check size={16} color="#0f766e" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// COMPOSANT MODERNE SOUS FORME DE LISTES DÉROULANTES SIMPLES ET ÉLÉGANTES
export const ModernTimePicker = ({ 
  label, 
  value, 
  onChange, 
  icon
}: { 
  label: string; 
  value: string; 
  onChange: (v: string) => void; 
  icon: React.ReactNode;
  presets?: string[];
}) => {
  const [hh, mm] = (value || "20:00").split(":");
  const currentHour = (hh || "20").padStart(2, "0");
  const currentMin = (mm || "00").padStart(2, "0");

  const handleHourChange = (newH: string) => {
    onChange(`${newH}:${currentMin}`);
  };

  const handleMinuteChange = (newM: string) => {
    onChange(`${currentHour}:${newM}`);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minWidth: "min(260px, 100%)", width: "100%" }}>
      {/* Label & En-tête */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {label}
        </span>
      </div>

      {/* Deux listes déroulantes côte à côte (Heure et Minute) */}
      <div style={{
        background: "#F8FAFC",
        border: "1.5px solid #E2E8F0",
        borderRadius: 20,
        padding: "14px",
        display: "flex",
        alignItems: "flex-end",
        gap: 10
      }}>
        <TimeSelectDropdown 
          prefixLabel="Heure"
          options={ALL_HOURS}
          value={currentHour}
          onChange={handleHourChange}
        />
        <div style={{ 
          fontSize: 22, 
          fontWeight: 900, 
          color: "#94A3B8", 
          paddingBottom: 10 
        }}>
          :
        </div>
        <TimeSelectDropdown 
          prefixLabel="Minute"
          options={ALL_MINUTES}
          value={currentMin}
          onChange={handleMinuteChange}
        />
      </div>
    </div>
  );
};

export const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <div 
    role="switch"
    aria-checked={checked}
    tabIndex={0}
    onClick={onChange} 
    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(); } }}
    style={{ 
      cursor: "pointer", display: "flex", alignItems: "center",
      // flexShrink : sans lui, l'interrupteur est écrasé (et rogné) dans une carte étroite.
      flexShrink: 0,
      width: 56, height: 32, borderRadius: 32,
      background: checked ? "linear-gradient(135deg, #134e4a 0%, #0f766e 100%)" : "#E2E8F0",
      position: "relative",
      transition: "background 0.3s ease",
      boxShadow: checked ? "inset 0 2px 4px rgba(0,0,0,0.1), 0 4px 10px rgba(15, 118, 110,0.3)" : "inset 0 2px 4px rgba(0,0,0,0.05)"
    }}
  >
    <div style={{
      width: 26, height: 26, borderRadius: "50%", background: "white",
      position: "absolute", top: 3, left: checked ? 27 : 3,
      transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
      boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
    }} />
  </div>
);
