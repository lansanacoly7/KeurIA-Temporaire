"use client";

import React from "react";
import Link from "next/link";
import { Eye, School as SchoolIcon } from "lucide-react";
import { SchoolBrand } from "../dashboardShared";

interface ParentLinkBannerProps {
  school: SchoolBrand | null;
  visitorChildId: string | null;
  onExitVisitor: () => void;
}

export default function ParentLinkBanner({
  school,
  visitorChildId,
  onExitVisitor,
}: ParentLinkBannerProps) {
  return (
    <>
      {school && (
        <div className="school-dashboard-banner" role="region" aria-label="Espace école">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}>
              <SchoolIcon size={20} color="currentColor" />
            </div>
            <div>
              <small>ESPACE DE MON ÉCOLE</small>
              <b>{school.name}</b>
            </div>
          </div>
          <Link href={`/school/${school.slug}`} className="school-link">
            Voir l’accueil de l’école
          </Link>
        </div>
      )}

      {visitorChildId && (
        <aside
          role="status"
          aria-live="polite"
          className="visitor-mode-pill"
          style={{
            position: "fixed",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(15, 35, 30, 0.94)",
            backdropFilter: "blur(14px)",
            border: "1.5px solid rgba(217, 239, 89, 0.35)",
            color: "white",
            padding: "8px 16px",
            zIndex: 999999,
            display: "inline-flex",
            gap: 12,
            alignItems: "center",
            borderRadius: 999,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.28)",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            maxWidth: "calc(100vw - 24px)",
            width: "max-content",
            boxSizing: "border-box",
            whiteSpace: "nowrap"
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>
            <span style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "rgba(217, 239, 89, 0.2)",
              flexShrink: 0
            }}>
              <Eye size={14} color="#D9EF59" />
            </span>
            <span style={{ color: "#E6F4EA" }}>Mode consultation parent</span>
          </div>
          <div style={{ width: 1, height: 16, background: "rgba(255, 255, 255, 0.2)", flexShrink: 0 }} />
          <button
            type="button"
            onClick={onExitVisitor}
            style={{
              background: "#EF4444",
              border: "none",
              color: "#FFFFFF",
              fontWeight: 800,
              cursor: "pointer",
              padding: "5px 12px",
              borderRadius: 99,
              fontSize: 12,
              whiteSpace: "nowrap",
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(239, 68, 68, 0.3)"
            }}
          >
            Quitter
          </button>
        </aside>
      )}
    </>
  );
}
