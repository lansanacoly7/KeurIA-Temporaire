import test from "node:test";
import assert from "node:assert/strict";

/**
 * Extraction testable de la logique de calcul de placement de PalouTutorial.
 */
function computeTutorialPlacement(viewport, targetRect, cardSize, preferredPos = "center") {
  const PAD = 16;
  const GAP = 20;

  if (!targetRect || preferredPos === "center") {
    return {
      left: Math.round(Math.max(PAD, (viewport.w - cardSize.w) / 2)),
      top: Math.round(Math.max(PAD, (viewport.h - cardSize.h) / 2)),
      pos: "center"
    };
  }

  const safeTarget = {
    x: targetRect.x - 8,
    y: targetRect.y - 8,
    width: targetRect.width + 16,
    height: targetRect.height + 16
  };

  const collidesWithTarget = (x, y, w, h) => {
    return !(
      x + w <= safeTarget.x ||
      x >= safeTarget.x + safeTarget.width ||
      y + h <= safeTarget.y ||
      y >= safeTarget.y + safeTarget.height
    );
  };

  const fitsInViewport = (x, y, w, h) => {
    return (
      x >= PAD &&
      x + w <= viewport.w - PAD &&
      y >= PAD &&
      y + h <= viewport.h - PAD
    );
  };

  const cardW = Math.min(cardSize.w, viewport.w - PAD * 2);
  const cardH = cardSize.h;

  const candidates = [];

  // 1a. TOP centré
  const topCenterX = Math.max(PAD, Math.min(viewport.w - cardW - PAD, targetRect.x + targetRect.width / 2 - cardW / 2));
  const topY = targetRect.y - cardH - GAP;
  candidates.push({
    name: "top-center",
    pos: "top",
    x: topCenterX,
    y: topY,
    prefScore: preferredPos === "top" ? 0 : 30
  });

  // 1b. TOP décalé vers la droite
  const rightShiftX = targetRect.x + targetRect.width + GAP;
  if (rightShiftX + cardW <= viewport.w - PAD) {
    candidates.push({
      name: "top-right",
      pos: "top",
      x: rightShiftX,
      y: Math.max(PAD, Math.min(viewport.h - cardH - PAD, targetRect.y - cardH / 2)),
      prefScore: preferredPos === "top" ? 5 : 35
    });
  }

  // 2a. BOTTOM centré
  const botCenterX = Math.max(PAD, Math.min(viewport.w - cardW - PAD, targetRect.x + targetRect.width / 2 - cardW / 2));
  const botY = targetRect.y + targetRect.height + GAP;
  candidates.push({
    name: "bottom-center",
    pos: "bottom",
    x: botCenterX,
    y: botY,
    prefScore: preferredPos === "bottom" ? 0 : 30
  });

  // 2b. BOTTOM décalé vers la droite
  if (rightShiftX + cardW <= viewport.w - PAD) {
    candidates.push({
      name: "bottom-right",
      pos: "bottom",
      x: rightShiftX,
      y: Math.max(PAD, Math.min(viewport.h - cardH - PAD, targetRect.y + targetRect.height / 2)),
      prefScore: preferredPos === "bottom" ? 5 : 35
    });
  }

  // 3a. RIGHT centré
  const rightY = Math.max(PAD, Math.min(viewport.h - cardH - PAD, targetRect.y + targetRect.height / 2 - cardH / 2));
  candidates.push({
    name: "right-center",
    pos: "right",
    x: rightShiftX,
    y: rightY,
    prefScore: preferredPos === "right" ? 0 : 20
  });

  // 3b. RIGHT aligné en haut de l'élément
  candidates.push({
    name: "right-top",
    pos: "right",
    x: rightShiftX,
    y: Math.max(PAD, Math.min(viewport.h - cardH - PAD, targetRect.y)),
    prefScore: preferredPos === "right" ? 2 : 25
  });

  // 4. LEFT centré
  const leftX = targetRect.x - cardW - GAP;
  const leftY = Math.max(PAD, Math.min(viewport.h - cardH - PAD, targetRect.y + targetRect.height / 2 - cardH / 2));
  candidates.push({
    name: "left-center",
    pos: "left",
    x: leftX,
    y: leftY,
    prefScore: preferredPos === "left" ? 0 : 20
  });

  const validCandidates = candidates.filter(
    (c) => fitsInViewport(c.x, c.y, cardW, cardH) && !collidesWithTarget(c.x, c.y, cardW, cardH)
  );

  if (validCandidates.length > 0) {
    validCandidates.sort((a, b) => a.prefScore - b.prefScore);
    const chosen = validCandidates[0];
    return {
      left: Math.round(chosen.x),
      top: Math.round(chosen.y),
      pos: chosen.pos
    };
  }

  const candidatesInVp = candidates.filter((c) => fitsInViewport(c.x, c.y, cardW, cardH));
  if (candidatesInVp.length > 0) {
    candidatesInVp.sort((a, b) => a.prefScore - b.prefScore);
    return {
      left: Math.round(candidatesInVp[0].x),
      top: Math.round(candidatesInVp[0].y),
      pos: candidatesInVp[0].pos
    };
  }

  return {
    left: Math.round(Math.max(PAD, (viewport.w - cardW) / 2)),
    top: Math.round(Math.max(PAD, (viewport.h - cardH) / 2)),
    pos: "center"
  };
}

function checkOverlap(cardBox, targetRect) {
  return !(
    cardBox.left + cardBox.width <= targetRect.x ||
    cardBox.left >= targetRect.x + targetRect.width ||
    cardBox.top + cardBox.height <= targetRect.y ||
    cardBox.top >= targetRect.y + targetRect.height
  );
}

test("Tutoriel étape 1 : centré quand aucun élément n'est ciblé", () => {
  const vp = { w: 1280, h: 800 };
  const card = { w: 480, h: 320 };
  const placement = computeTutorialPlacement(vp, null, card, "center");
  assert.equal(placement.pos, "center");
  assert.equal(placement.left, (1280 - 480) / 2);
  assert.equal(placement.top, (800 - 320) / 2);
});

test("Tutoriel étape 2 : les récompenses (.userline) ne sont JAMAIS chevauchées", () => {
  const vp = { w: 1280, h: 800 };
  const target = { x: 950, y: 15, width: 280, height: 46 };
  const card = { w: 480, h: 320 };
  const placement = computeTutorialPlacement(vp, target, card, "bottom");

  const cardBox = { left: placement.left, top: placement.top, width: card.w, height: card.h };
  assert.equal(checkOverlap(cardBox, target), false, "La carte ne doit pas toucher .userline");
  assert.ok(placement.top >= target.y + target.height, "La carte doit être positionnée sous .userline");
});

test("Tutoriel étape 3 : le menu principal (.lms-side nav) n'est JAMAIS chevauché", () => {
  const vp = { w: 1280, h: 800 };
  const target = { x: 0, y: 65, width: 220, height: 500 };
  const card = { w: 480, h: 320 };
  const placement = computeTutorialPlacement(vp, target, card, "right");

  const cardBox = { left: placement.left, top: placement.top, width: card.w, height: card.h };
  assert.equal(checkOverlap(cardBox, target), false, "La carte ne doit pas toucher le menu de navigation");
  assert.ok(placement.left >= target.x + target.width, "La carte doit être à droite du menu");
});

test("Tutoriel étape 4 : le lien des badges n'est JAMAIS chevauché", () => {
  const vp = { w: 1280, h: 800 };
  const target = { x: 0, y: 310, width: 220, height: 52 };
  const card = { w: 480, h: 320 };
  const placement = computeTutorialPlacement(vp, target, card, "right");

  const cardBox = { left: placement.left, top: placement.top, width: card.w, height: card.h };
  assert.equal(checkOverlap(cardBox, target), false, "La carte ne doit pas toucher le lien badges");
  assert.ok(placement.left >= target.x + target.width, "La carte doit être à droite");
});

test("Tutoriel étape 5 : la bannière de module (.track-hero) n'est JAMAIS chevauchée", () => {
  const vp = { w: 1440, h: 900 };
  const target = { x: 260, y: 30, width: 960, height: 280 };
  const card = { w: 480, h: 320 };
  const placement = computeTutorialPlacement(vp, target, card, "bottom");

  const cardBox = { left: placement.left, top: placement.top, width: card.w, height: card.h };
  assert.equal(checkOverlap(cardBox, target), false, "La carte ne doit pas toucher .track-hero");
  assert.ok(placement.top >= target.y + target.height, "La carte doit être en dessous");
});

test("Tutoriel étape 6 : le bouton Continuer (.track-hero button) n'est JAMAIS masqué par la carte", () => {
  // Scénario nominal (bouton défilé en bas d'écran avec block: 'end')
  const vp1 = { w: 1280, h: 720 };
  const targetBottom = { x: 280, y: 580, width: 310, height: 60 };
  const card = { w: 480, h: 320 };
  const p1 = computeTutorialPlacement(vp1, targetBottom, card, "top");

  const box1 = { left: p1.left, top: p1.top, width: card.w, height: card.h };
  assert.equal(checkOverlap(box1, targetBottom), false, "La carte ne doit pas toucher le bouton Continuer");
  assert.ok(p1.top + card.h <= targetBottom.y, "La carte doit être au-dessus du bouton");

  // Scénario écran plus court (bouton au centre)
  const targetCenter = { x: 280, y: 340, width: 310, height: 60 };
  const p2 = computeTutorialPlacement(vp1, targetCenter, card, "top");
  const box2 = { left: p2.left, top: p2.top, width: card.w, height: card.h };
  assert.equal(checkOverlap(box2, targetCenter), false, "En aucun cas la carte ne doit chevaucher le bouton");
});

test("Les 6 fichiers MP3 de voix du tutoriel existent et ont un contenu valide", async () => {
  const fs = await import("node:fs");
  for (let i = 1; i <= 6; i++) {
    const file = `public/audio/palou/ui/tuto-${i}.mp3`;
    assert.ok(fs.existsSync(file), `Fichier ${file} introuvable`);
    const stat = fs.statSync(file);
    assert.ok(stat.size > 10000, `Fichier ${file} trop petit (${stat.size} octets)`);
  }
});
