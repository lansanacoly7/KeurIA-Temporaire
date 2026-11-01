"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { playFeedbackSound } from "./sound";

export function useDrawingGuess({
  onComplete,
}: {
  onComplete: (stars?: number, feedback?: React.ReactNode) => void;
}) {
    const canvas = useRef<HTMLCanvasElement | null>(null);
    const drawing = useRef(false);
    const [strokes, setStrokes] = useState(0);
    const [pointsCount, setPointsCount] = useState(0);
    const [bounds, setBounds] = useState<{ minX: number; maxX: number; minY: number; maxY: number } | null>(null);
    const [showCatalog, setShowCatalog] = useState(true);
    const [phase, setPhase] = useState<"drawing" | "analyzing" | "confirming" | "success" | "retry">("drawing");
    const [palouGuess, setPalouGuess] = useState<{ name: string; icon: string; explanation: string }>({
    name: "un soleil",
    icon: "sun",
    explanation: "J'ai détecté des formes arrondies avec des traits rayonnants !",
  });
    const [retryCount, setRetryCount] = useState(0);
    const [warningMsg, setWarningMsg] = useState("");
    useEffect(() => {
    let progress = 0;
    if (phase === "drawing") {
      progress = Math.min(0.5, strokes * 0.1);
    } else if (phase === "analyzing" || phase === "confirming") {
      progress = 0.8;
    } else if (phase === "retry") {
      progress = 0.6;
    } else if (phase === "success") {
      progress = 1;
    }
    window.dispatchEvent(new CustomEvent("levelProgress", { detail: progress }));
  }, [phase, strokes]);
    const point = (e: PointerEvent<HTMLCanvasElement>) => {
    const c = canvas.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * c.width) / r.width, y: ((e.clientY - r.top) * c.height) / r.height };
  };
    const start = (e: PointerEvent<HTMLCanvasElement>) => {
    if (phase !== "drawing") return;
    drawing.current = true;
    setStrokes((s) => s + 1);
    setWarningMsg("");
    const p = point(e);
    const x = canvas.current?.getContext("2d");
    if (p && x) {
      x.beginPath();
      x.moveTo(p.x, p.y);
      setPointsCount((cnt) => cnt + 1);
      setBounds((b) =>
        b
          ? {
              minX: Math.min(b.minX, p.x),
              maxX: Math.max(b.maxX, p.x),
              minY: Math.min(b.minY, p.y),
              maxY: Math.max(b.maxY, p.y),
            }
          : { minX: p.x, maxX: p.x, minY: p.y, maxY: p.y }
      );
    }
  };
    const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || phase !== "drawing") return;
    const p = point(e);
    const x = canvas.current?.getContext("2d");
    if (p && x) {
      x.lineWidth = 12;
      x.lineCap = "round";
      x.strokeStyle = "#0E3A2E";
      x.lineTo(p.x, p.y);
      x.stroke();
      setPointsCount((cnt) => cnt + 1);
      setBounds((b) =>
        b
          ? {
              minX: Math.min(b.minX, p.x),
              maxX: Math.max(b.maxX, p.x),
              minY: Math.min(b.minY, p.y),
              maxY: Math.max(b.maxY, p.y),
            }
          : { minX: p.x, maxX: p.x, minY: p.y, maxY: p.y }
      );
    }
  };
    const clear = () => {
    const c = canvas.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setStrokes(0);
    setPointsCount(0);
    setBounds(null);
    setWarningMsg("");
    setPhase("drawing");
  };
    const analyzeCanvasPixels = (
    c: HTMLCanvasElement,
    b: { minX: number; maxX: number; minY: number; maxY: number },
    strokeCnt: number
  ) => {
    const ctx = c.getContext("2d");
    if (!ctx) return null;

    const width = c.width;
    const height = c.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const pixels = imgData.data;

    const minX = Math.max(0, Math.floor(b.minX));
    const maxX = Math.min(width - 1, Math.ceil(b.maxX));
    const minY = Math.max(0, Math.floor(b.minY));
    const maxY = Math.min(height - 1, Math.ceil(b.maxY));

    const boxW = maxX - minX;
    const boxH = maxY - minY;
    if (boxW <= 3 || boxH <= 3) return null;

    const aspect = boxW / (boxH || 1);

    let totalDrawn = 0;
    let topDrawn = 0;
    let botDrawn = 0;
    let botCenterDrawn = 0;
    let botOuterDrawn = 0;
    let topEarsLeft = 0;
    let topEarsRight = 0;
    let topEarsCenter = 0;

    for (let y = minY; y <= maxY; y++) {
      const relY = (y - minY) / boxH;
      for (let x = minX; x <= maxX; x++) {
        const relX = (x - minX) / boxW;
        const alphaIndex = (y * width + x) * 4 + 3;
        if (pixels[alphaIndex] > 30) {
          totalDrawn++;
          if (relY <= 0.45) {
            topDrawn++;
          } else if (relY >= 0.55) {
            botDrawn++;
            if (relX >= 0.35 && relX <= 0.65) botCenterDrawn++;
            else botOuterDrawn++;
          }

          if (relY <= 0.35) {
            if (relX <= 0.35) topEarsLeft++;
            else if (relX >= 0.65) topEarsRight++;
            else topEarsCenter++;
          }
        }
      }
    }

    if (totalDrawn < 15) return null;

    const topRatio = topDrawn / totalDrawn;
    const botRatio = botDrawn / totalDrawn;
    const botCenterRatio = botCenterDrawn / (botDrawn || 1);

    const isTreeHeight = aspect <= 1.25;
    const treeScore =
      (isTreeHeight ? 30 : 0) +
      (topRatio > 0.35 ? 30 : 0) +
      (botCenterRatio > 0.45 ? 40 : 0) +
      (botDrawn > 0 ? 10 : 0);

    const flowerScore =
      (isTreeHeight ? 25 : 0) + (topRatio > 0.4 ? 35 : 0) + (botCenterRatio > 0.4 ? 30 : 0);

    const houseScore =
      (aspect >= 0.75 && aspect <= 1.35 ? 25 : 0) +
      (topEarsCenter > (topEarsLeft + topEarsRight) * 0.7 ? 35 : 0) +
      (botRatio > 0.25 ? 25 : 0);

    const boatScore =
      (aspect >= 1.05 ? 30 : 0) + (botOuterDrawn > 0 ? 30 : 0) + (topEarsCenter > 0 ? 25 : 0);

    const fishScore =
      (aspect > 1.25 ? 35 : 0) + (topRatio > 0.25 && botRatio > 0.25 ? 30 : 0);

    const carScore =
      (aspect > 1.15 ? 40 : 0) +
      (botDrawn > topDrawn ? 25 : 0) +
      (botOuterDrawn > botCenterDrawn * 0.4 ? 25 : 0);

    const rocketScore =
      (aspect < 0.8 ? 40 : 0) + (topEarsCenter > topEarsLeft + topEarsRight ? 35 : 0);

    const catScore =
      (topEarsLeft > 4 && topEarsRight > 4 ? 45 : 0) + (aspect >= 0.7 && aspect <= 1.3 ? 20 : 0);

    const personScore =
      (aspect < 0.85 ? 30 : 0) + (topRatio > 0.2 && botRatio > 0.3 ? 35 : 0);

    const crownScore =
      (aspect > 1.1 ? 30 : 0) +
      (topEarsLeft > 2 && topEarsRight > 2 && topEarsCenter > 2 ? 40 : 0);

    const umbrellaScore =
      (aspect >= 0.9 && aspect <= 1.4 ? 25 : 0) +
      (topRatio > 0.45 ? 35 : 0) +
      (botCenterRatio > 0.5 ? 30 : 0);

    const cloudScore = (aspect > 1.3 ? 35 : 0) + (topRatio > 0.4 ? 30 : 0);

    const sunScore =
      (aspect >= 0.8 && aspect <= 1.25 ? 30 : 0) +
      (Math.abs(topRatio - botRatio) < 0.2 ? 30 : 0) +
      (strokeCnt >= 4 ? 30 : 0);

    const ballScore =
      (aspect >= 0.85 && aspect <= 1.15 ? 45 : 0) +
      (Math.abs(topRatio - botRatio) < 0.18 ? 35 : 0);

    const candidates = [
      {
        name: "un arbre",
        icon: "tree",
        score: treeScore,
        explanation: "Palou a analysé la géométrie : le feuillage est étalé en haut et le tronc vertical est centré au bas !",
      },
      {
        name: "une fleur",
        icon: "flower",
        score: flowerScore,
        explanation: "Palou a décelé une forme de corolle en haut surmontant une tige !",
      },
      {
        name: "une maison",
        icon: "home",
        score: houseScore,
        explanation: "Palou a identifié le toit triangulaire au sommet et la structure de la maison !",
      },
      {
        name: "un bateau",
        icon: "boat",
        score: boatScore,
        explanation: "Palou a aperçu la coque allongée en bas et la voile dressée !",
      },
      {
        name: "un poisson",
        icon: "fish",
        score: fishScore,
        explanation: "Palou a analysé la forme horizontale profilée et la nageoire !",
      },
      {
        name: "une voiture",
        icon: "car",
        score: carScore,
        explanation: "Palou a repéré la silhouette horizontale avec la base des roues !",
      },
      {
        name: "une fusée",
        icon: "rocket",
        score: rocketScore,
        explanation: "Palou a décelé la forme élancée verticale et la pointe au sommet !",
      },
      {
        name: "un chat",
        icon: "cat",
        score: catScore,
        explanation: "Palou a repéré les deux pointes qui ressemblent à des petites oreilles !",
      },
      {
        name: "un bonhomme",
        icon: "user",
        score: personScore,
        explanation: "Palou a identifié une tête au sommet et la silhouette d'un personnage !",
      },
      {
        name: "une couronne",
        icon: "crown",
        score: crownScore,
        explanation: "Palou a décelé les pointes alignées en haut de ton dessin !",
      },
      {
        name: "un parapluie",
        icon: "umbrella",
        score: umbrellaScore,
        explanation: "Palou a aperçu la coupole arrondie en haut et le manche au centre !",
      },
      {
        name: "un nuage",
        icon: "cloud",
        score: cloudScore,
        explanation: "Palou a décelé une forme vaporeuse et étalée horizontalement !",
      },
      {
        name: "un soleil",
        icon: "sun",
        score: sunScore,
        explanation: "Palou a décelé une forme centrale circulaire entourée de rayons !",
      },
      {
        name: "un ballon",
        icon: "ball",
        score: ballScore,
        explanation: "Palou a mesuré les proportions : une forme ronde parfaitement équilibrée !",
      },
    ];

    candidates.sort((x1, x2) => x2.score - x1.score);
    return candidates;
  };
    const analyzeDrawing = () => {
    if (strokes < 2 || pointsCount < 8 || !bounds) {
      setWarningMsg("Ton dessin a besoin d'un peu plus de traits ! Dessine un objet pour que Palou l'analyse.");
      playFeedbackSound(false);
      return;
    }

    setPhase("analyzing");
    playFeedbackSound(true);

    let candidates = canvas.current && bounds ? analyzeCanvasPixels(canvas.current, bounds, strokes) : null;
    if (!candidates || candidates.length === 0) {
      candidates = [
        {
          name: "un arbre",
          icon: "tree",
          score: 50,
          explanation: "Palou a analysé la géométrie : le feuillage est étalé en haut et le tronc est centré au bas !",
        },
        {
          name: "un soleil",
          icon: "sun",
          score: 40,
          explanation: "Palou a décelé une forme circulaire bien équilibrée avec des rayons !",
        },
        {
          name: "une maison",
          icon: "home",
          score: 30,
          explanation: "Palou a repéré une structure avec un toit triangulaire et une base carrée !",
        },
      ];
    }

    const selected = candidates[retryCount % candidates.length];
    setPalouGuess(selected);

    setTimeout(() => {
      setPhase("confirming");
    }, 1200);
  };
    const handleTeachPalou = () => {
    playFeedbackSound(true);
    setPhase("success");
    onComplete(3);
  };
    const handleChildResponse = (correct: boolean) => {
    if (correct) {
      playFeedbackSound(true);
      setPhase("success");
      onComplete(3);
    } else {
      playFeedbackSound(false);
      setRetryCount((r) => r + 1);
      setPhase("retry");
    }
  };

  return { canvas, drawing, strokes, showCatalog, setShowCatalog, phase, setPhase, palouGuess, warningMsg, start, move, clear, analyzeDrawing, handleTeachPalou, handleChildResponse };
}
