"use client";

import { sayUi } from "../parcours79/uiVoice";
import { useEffect, useRef, useState } from "react";
import { GestureRecognizer, FilesetResolver } from "@mediapipe/tasks-vision";
import {
  Volume2,
  Lock,
  Camera,
  ThumbsUp,
  ThumbsDown,
  Hand,
  Check,
} from "lucide-react";
import { playFeedbackSound } from "./sound";

export function GestureCameraGame({
  onComplete,
}: {
  onComplete: (stars?: number, feedback?: React.ReactNode) => void;
}) {
  const video = useRef<HTMLVideoElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState("Autorise la caméra pour commencer !");
  const [up, setUp] = useState(0);
  const [down, setDown] = useState(0);
  const [done, setDone] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [isCamOn, setIsCamOn] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);

  const recognizer = useRef<GestureRecognizer | null>(null);
  const requestRef = useRef<number>(0);
  const lastVideoTime = useRef<number>(-1);
  const inferenceTime = useRef<number>(0);
  const currentGesture = useRef<{ name: string; startTime: number } | null>(null);

  useEffect(() => {
    async function loadModel() {
      setLoadingModel(true);
      try {
        // Moteur et modèle servis par le site lui-même (public/mediapipe) : aucune requête vers un CDN ou vers Google.
        const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
        recognizer.current = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/mediapipe/gesture_recognizer.task",
          },
          runningMode: "VIDEO",
        });
      } catch (err) {
        console.error("Erreur chargement modèle:", err);
      }
      setLoadingModel(false);
    }
    void loadModel();

    return () => {
      stream.current?.getTracks().forEach((t) => t.stop());
      if (video.current?.srcObject) {
        try {
          (video.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
          video.current.srcObject = null;
        } catch {
          // cleanup safe
        }
      }
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const detectGestures = () => {
    if (!video.current || !recognizer.current || done) return;

    if (video.current.readyState >= 2 && video.current.videoWidth > 0) {
      if (video.current.currentTime !== lastVideoTime.current) {
        lastVideoTime.current = video.current.currentTime;
        inferenceTime.current += 16;
        const nowInMs = inferenceTime.current;
        const results = recognizer.current.recognizeForVideo(video.current, nowInMs);

        let detectedName = "None";
        if (results.gestures.length > 0) {
          const categoryScore = results.gestures[0][0].score;
          if (categoryScore > 0.6) {
            detectedName = results.gestures[0][0].categoryName;
          }
        }

        if (detectedName === "Thumb_Up" || detectedName === "Thumb_Down") {
          if (currentGesture.current?.name !== detectedName) {
            currentGesture.current = { name: detectedName, startTime: nowInMs };
          } else {
            if (nowInMs - currentGesture.current.startTime >= 1000) {
              if (detectedName === "Thumb_Up") {
                setUp((prev) => {
                  if (prev < 3) playFeedbackSound(true);
                  return Math.min(3, prev + 1);
                });
              } else {
                setDown((prev) => {
                  if (prev < 3) playFeedbackSound(true);
                  return Math.min(3, prev + 1);
                });
              }
              currentGesture.current = null;
            }
          }
        } else {
          currentGesture.current = null;
        }
      }
    }

    requestRef.current = requestAnimationFrame(detectGestures);
  };

  useEffect(() => {
    if (isCamOn && recognizer.current && !done) {
      requestRef.current = requestAnimationFrame(detectGestures);
    } else if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
  }, [isCamOn, done]);

  useEffect(() => {
    const progress = (up + down) / 6;
    window.dispatchEvent(new CustomEvent("levelProgress", { detail: Math.min(1, progress) }));
  }, [up, down]);

  useEffect(() => {
    if (up >= 3 && down >= 3 && !done) {
      setDone(true);
      window.dispatchEvent(new CustomEvent("levelProgress", { detail: 1 }));
      playFeedbackSound(true);
      setTimeout(() => onComplete(3), 1500);
    }
  }, [up, down, done, onComplete]);

  const start = async () => {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (video.current) video.current.srcObject = stream.current;
      setIsCamOn(true);
      setStatus("Caméra prête ! Montre ton geste.");
      setCameraError(false);
    } catch {
      setStatus("Caméra non détectée ou permission refusée.");
      setCameraError(true);
    }
  };

  const stop = () => {
    if (stream.current) {
      stream.current.getTracks().forEach((t) => t.stop());
      stream.current = null;
    }
    if (video.current) video.current.srcObject = null;
    setIsCamOn(false);
    setStatus("Caméra coupée. Allume-la pour continuer.");
  };

  const test = () => {
    setDone(true);
    playFeedbackSound(true);
    onComplete(3);
  };

  const dots = (n: number) => "●".repeat(n) + "○".repeat(3 - n);

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.7)), url('/images/games/niveau5_bg.jpg') center/cover",
          }}
        />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          width: "100%",
          padding: "10px",
          marginTop: "-30px",
        }}
      >
        {/* Mascotte Palou */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, maxWidth: 320 }}>
          <div
            style={{
              position: "relative",
              background: "#FFF",
              borderRadius: 24,
              padding: "16px 24px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
              width: "100%",
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                position: "absolute",
                bottom: -20,
                left: "50%",
                transform: "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: "20px solid transparent",
                borderRight: "20px solid transparent",
                borderTop: "20px solid #FFF",
              }}
            />
            <h3 style={{ fontSize: 24, color: "#144C3A", margin: 0, lineHeight: 1.3, fontWeight: 900 }}>
              Apprends des gestes à l'IA !
            </h3>
          </div>
          <img
            src="/images/palou/game-palou-reflexion.png"
            alt="Palou"
            style={{ width: 160, animation: "kiFloatSlow 2.5s infinite alternate" }}
          />
          <button
            style={{
              padding: "8px 20px",
              background: "#FFF",
              border: "3px solid #10B981",
              borderRadius: 999,
              color: "#0E4B3C",
              fontWeight: 800,
              fontSize: 16,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 0 #059669",
            }}
            onClick={() => {
              void sayUi("jeu-gestes", { force: true });
            }}
            aria-label="Écouter les consignes de Palou"
          >
            <Volume2 size={18} /> Écouter Palou
          </button>
        </div>

        {/* Écran caméra & gestes */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            maxWidth: 1000,
            overflow: "visible",
          }}
        >
          <div
            className="real-stage gesture-game"
            style={{ textAlign: "center", padding: "10px", width: "100%", background: "transparent" }}
          >
            <div
              className="stage-help"
              style={{
                fontSize: 15,
                color: "#166534",
                marginBottom: 15,
                background: "#F0FDF4",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 16px",
                borderRadius: 16,
                border: "2px solid #22C55E",
                maxWidth: 900,
                lineHeight: 1.4,
              }}
            >
              <Lock size={15} /> <b>Confidentialité garantie</b> : L'analyse est 100% locale. L'image ne quitte jamais
              cet appareil, n'est ni sauvegardée, ni partagée.
            </div>
            {!cameraError ? (
              <div
                className="gesture-layout"
                style={{
                  display: "flex",
                  gap: 30,
                  justifyContent: "center",
                  alignItems: "stretch",
                  marginBottom: 10,
                  minHeight: 380,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", width: 480, minWidth: "min(480px, 100%)" }}>
                  <div
                    className="camera-frame"
                    style={{
                      flex: 1,
                      width: "100%",
                      background: "#000",
                      borderRadius: 24,
                      overflow: "hidden",
                      position: "relative",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                      border: "4px solid #E4DEC6",
                    }}
                  >
                    <video
                      ref={video}
                      autoPlay
                      muted
                      playsInline
                      style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
                    />
                    {!isCamOn && (
                      <button
                        onClick={start}
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          padding: "16px 28px",
                          fontSize: 22,
                          fontWeight: 900,
                          borderRadius: 20,
                          background: "#C8F24D",
                          color: "#0E3A2E",
                          border: "none",
                          cursor: loadingModel ? "wait" : "pointer",
                          boxShadow: "0 6px 0 #9DC237, 0 15px 30px rgba(0,0,0,0.3)",
                          width: "max-content",
                          transition: "transform 0.1s",
                        }}
                        onMouseDown={(e) =>
                          (e.currentTarget.style.transform = "translate(-50%, calc(-50% + 6px))")
                        }
                        onMouseUp={(e) => (e.currentTarget.style.transform = "translate(-50%, -50%)")}
                        disabled={loadingModel}
                      >
                        {loadingModel ? "Chargement de l'IA..." : "Allumer la caméra"}
                      </button>
                    )}
                    {isCamOn && (
                      <button
                        onClick={stop}
                        style={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          padding: "8px 16px",
                          fontSize: 14,
                          fontWeight: 700,
                          background: "rgba(239, 68, 68, 0.9)",
                          color: "#FFF",
                          border: "none",
                          borderRadius: 12,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          zIndex: 20,
                          backdropFilter: "blur(4px)",
                        }}
                      >
                        Couper
                      </button>
                    )}
                    {done && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "rgba(16, 185, 129, 0.9)",
                          color: "#FFF",
                          fontSize: 28,
                          fontWeight: 900,
                          zIndex: 30,
                          borderRadius: 24,
                          backdropFilter: "blur(8px)",
                        }}
                      >
                        Entraînement validé !
                      </div>
                    )}
                  </div>
                </div>
                <div
                  className="gesture-training"
                  style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 20, minWidth: "min(300px, 100%)" }}
                >
                  <h3
                    style={{
                      fontSize: 24,
                      margin: 0,
                      color: "#0E3A2E",
                      background: "#FFF",
                      padding: "4px 12px",
                      borderRadius: 12,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      alignSelf: "center",
                    }}
                  >
                    <Hand size={22} /> Enregistre tes gestes !
                  </h3>
                  <div
                    style={{
                      padding: "20px 24px",
                      fontSize: 20,
                      fontWeight: 700,
                      borderRadius: 16,
                      background: !isCamOn ? "#F3F4F6" : up === 3 ? "#D1FAE5" : "#FFF",
                      border: `3px solid ${!isCamOn ? "#E5E7EB" : up === 3 ? "#10B981" : "#E4DEC6"}`,
                      color: !isCamOn ? "#9CA3AF" : "#0E3A2E",
                      transition: "all 0.3s",
                      boxShadow: isCamOn && up < 3 ? "0 4px 0 #E4DEC6" : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      {!isCamOn ? (
                        <Lock size={18} />
                      ) : up === 3 ? (
                        <Check size={18} color="#10B981" />
                      ) : (
                        <Camera size={18} />
                      )}
                      <ThumbsUp size={20} /> Pouce levé
                    </span>
                    <span style={{ color: up === 3 ? "#10B981" : "#9CA3AF" }}>{dots(up)}</span>
                  </div>
                  <div
                    style={{
                      padding: "20px 24px",
                      fontSize: 20,
                      fontWeight: 700,
                      borderRadius: 16,
                      background: !isCamOn ? "#F3F4F6" : down === 3 ? "#D1FAE5" : "#FFF",
                      border: `3px solid ${!isCamOn ? "#E5E7EB" : down === 3 ? "#10B981" : "#E4DEC6"}`,
                      color: !isCamOn ? "#9CA3AF" : "#0E3A2E",
                      transition: "all 0.3s",
                      boxShadow: isCamOn && down < 3 ? "0 4px 0 #E4DEC6" : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      {!isCamOn ? (
                        <Lock size={18} />
                      ) : down === 3 ? (
                        <Check size={18} color="#10B981" />
                      ) : (
                        <Camera size={18} />
                      )}
                      <ThumbsDown size={20} /> Pouce baissé
                    </span>
                    <span style={{ color: down === 3 ? "#10B981" : "#9CA3AF" }}>{dots(down)}</span>
                  </div>
                  <p
                    className="camera-status"
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: done ? "#10B981" : "#D97706",
                      marginTop: 10,
                      marginBottom: 0,
                      textAlign: "center",
                    }}
                  >
                    {done ? "Bravo, Palou a bien appris tes gestes !" : status}
                  </p>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: 40,
                  background: "#FEE2E2",
                  borderRadius: 24,
                  border: "4px solid #EF4444",
                  maxWidth: 600,
                  margin: "0 auto 40px",
                }}
              >
                <h3 style={{ fontSize: 28, color: "#991B1B", margin: "0 0 20px 0" }}>Pas de caméra disponible</h3>
                <p style={{ fontSize: 20, color: "#7F1D1D", margin: "0 0 30px 0" }}>
                  Pour ce jeu, Palou a besoin de te voir pour apprendre tes gestes. Demande à un adulte de vérifier les
                  permissions ou d'utiliser un appareil avec caméra.
                </p>
                <button
                  onClick={test}
                  style={{
                    padding: "16px 32px",
                    fontSize: 22,
                    fontWeight: 700,
                    background: "#FFF",
                    border: "4px solid #EF4444",
                    color: "#EF4444",
                    borderRadius: 16,
                    cursor: "pointer",
                  }}
                >
                  Passer ce niveau pour l'instant
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
