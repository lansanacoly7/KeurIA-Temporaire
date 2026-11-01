"use client";

/**
 * Proxy de rétrocompatibilité pour les composants de jeux avancés.
 * Les implémentations ont été découpées et modularisées dans le dossier `./games/`
 * pour isoler le moteur MediaPipe Tasks Vision, éviter les fuites de mémoire (WebCam / rAF)
 * et faciliter les tests unitaires.
 */
export {
  ImageTrainingGame,
  GestureCameraGame,
  DrawingGuessGame,
  TrainYourModelGame,
  ChatbotBuilderGame,
  EscapeAIGame,
  CreativeStudioGame,
  DefiGame,
  VoiceAssistantGame,
  playFeedbackSound,
} from "./games";
