"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Move, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

type LogoEditorModalProps = {
  rawImageSrc: string;
  onApply: (croppedDataUrl: string) => void;
  onClose: () => void;
};

export function LogoEditorModal({ rawImageSrc, onApply, onClose }: LogoEditorModalProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dimensions du cadre de prévisualisation (format paysage adapté aux logos)
  const VIEW_WIDTH = 340;
  const VIEW_HEIGHT = 160;

  useEffect(() => {
    const img = new Image();
    img.src = rawImageSrc;
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      // Ajustement initial : adapter au viewport
      const scaleW = VIEW_WIDTH / img.width;
      const scaleH = VIEW_HEIGHT / img.height;
      const initialScale = Math.min(scaleW, scaleH, 1);
      setScale(Math.max(initialScale, 0.4));
      setOffset({ x: 0, y: 0 });
    };
  }, [rawImageSrc]);

  // Dessin sur canvas en temps réel
  useEffect(() => {
    if (!imageLoaded || !imageRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fond blanc propre
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = imageRef.current;
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = (canvas.width - drawW) / 2 + offset.x;
    const drawY = (canvas.height - drawH) / 2 + offset.y;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }, [scale, offset, imageLoaded]);

  function handleMouseDown(e: React.MouseEvent) {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  function reset() {
    if (!imageRef.current) return;
    const scaleW = VIEW_WIDTH / imageRef.current.width;
    const scaleH = VIEW_HEIGHT / imageRef.current.height;
    setScale(Math.max(Math.min(scaleW, scaleH, 1), 0.4));
    setOffset({ x: 0, y: 0 });
  }

  function applyCropped() {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png", 0.95);
    onApply(dataUrl);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        className="ec-card"
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--ec-surface, #ffffff)",
          borderRadius: 16,
          boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
          padding: 24,
          display: "grid",
          gap: 18,
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 900, margin: "0 0 6px" }}>Ajuster le logo</h2>
          <p style={{ margin: 0, fontSize: 13, color: "var(--ec-muted)" }}>
            Zoomez, dézoomez et faites glisser l&apos;image pour cadrer parfaitement le logo de l&apos;école.
          </p>
        </div>

        {/* Zone de cadrage Canvas */}
        <div
          style={{
            position: "relative",
            width: VIEW_WIDTH,
            height: VIEW_HEIGHT,
            margin: "0 auto",
            borderRadius: 12,
            overflow: "hidden",
            border: "2px dashed var(--ec-brand, #174e49)",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.05)",
            cursor: isDragging ? "grabbing" : "grab",
            userSelect: "none",
            background: "#ffffff",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <canvas
            ref={canvasRef}
            width={VIEW_WIDTH * 2}
            height={VIEW_HEIGHT * 2}
            style={{ width: VIEW_WIDTH, height: VIEW_HEIGHT, display: "block" }}
          />

          {/* Grille de repère discrète */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              border: "1px solid rgba(23, 78, 73, 0.15)",
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gridTemplateRows: "1fr 1fr 1fr",
            }}
          >
            <div style={{ borderRight: "1px dashed rgba(0,0,0,0.1)", borderBottom: "1px dashed rgba(0,0,0,0.1)" }} />
            <div style={{ borderRight: "1px dashed rgba(0,0,0,0.1)", borderBottom: "1px dashed rgba(0,0,0,0.1)" }} />
            <div style={{ borderBottom: "1px dashed rgba(0,0,0,0.1)" }} />
            <div style={{ borderRight: "1px dashed rgba(0,0,0,0.1)", borderBottom: "1px dashed rgba(0,0,0,0.1)" }} />
            <div style={{ borderRight: "1px dashed rgba(0,0,0,0.1)", borderBottom: "1px dashed rgba(0,0,0,0.1)" }} />
            <div style={{ borderBottom: "1px dashed rgba(0,0,0,0.1)" }} />
          </div>

          <div
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              background: "rgba(0,0,0,0.6)",
              color: "white",
              padding: "2px 8px",
              borderRadius: 6,
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              gap: 4,
              pointerEvents: "none",
            }}
          >
            <Move size={12} /> Glisser pour déplacer
          </div>
        </div>

        {/* Contrôle de Zoom */}
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
            <span style={{ fontWeight: 700 }}>Niveau de zoom</span>
            <span style={{ color: "var(--ec-muted)", fontFamily: "monospace", fontSize: 12 }}>
              {Math.round(scale * 100)} %
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              className="ec-btn"
              style={{ minHeight: 34, padding: "0 10px" }}
              onClick={() => setScale(s => Math.max(0.2, +(s - 0.1).toFixed(2)))}
              title="Dézoomer"
            >
              <ZoomOut size={16} />
            </button>

            <input
              type="range"
              min="0.2"
              max="2.5"
              step="0.05"
              value={scale}
              onChange={e => setScale(parseFloat(e.target.value))}
              style={{ flex: 1, cursor: "pointer", accentColor: "var(--ec-brand)" }}
            />

            <button
              type="button"
              className="ec-btn"
              style={{ minHeight: 34, padding: "0 10px" }}
              onClick={() => setScale(s => Math.min(2.5, +(s + 0.1).toFixed(2)))}
              title="Zoomer"
            >
              <ZoomIn size={16} />
            </button>

            <button
              type="button"
              className="ec-btn ec-btn--ghost"
              style={{ minHeight: 34, padding: "0 10px", fontSize: 12 }}
              onClick={reset}
              title="Réinitialiser le cadrage"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* Actions du pied */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
          <button type="button" className="ec-btn" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="ec-btn ec-btn--primary" onClick={applyCropped}>
            <Check size={16} /> Valider le logo
          </button>
        </div>
      </div>
    </div>
  );
}
