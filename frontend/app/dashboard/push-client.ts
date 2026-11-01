"use client";

/** Abonnement du navigateur aux alertes push (Web Push). Chaque fonction renvoie un message d'erreur lisible ou null. */

function toUint8Array(base64Url: string) {
  const padded = base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function enablePush(): Promise<string | null> {
  if (!pushSupported()) return "Ce navigateur ne gère pas les alertes push.";
  const keyRes = await fetch("/api/push/public-key", { credentials: "include" });
  const key = await keyRes.json().catch(() => ({}));
  if (!keyRes.ok || !key.available || !key.publicKey) return "Les alertes push ne sont pas encore activées sur ce serveur.";

  if ((await Notification.requestPermission()) !== "granted") return "Autorisez les notifications dans votre navigateur pour les recevoir.";

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8Array(key.publicKey) }));

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(subscription.toJSON()),
  });
  return res.ok ? null : "Impossible d'enregistrer cet appareil.";
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  await subscription.unsubscribe();
}
