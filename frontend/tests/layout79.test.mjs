import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function load(url, requireFn) {
  const { outputText } = ts.transpileModule(readFileSync(url, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const m = { exports: {} };
  new Function("module", "exports", "require", outputText)(m, m.exports, requireFn);
  return m;
}

const randomModule = load(new URL("../app/utils/random.ts", import.meta.url));
const mod = load(new URL("../app/dashboard/parcours79/logic.ts", import.meta.url), id => {
  if (id === "../../utils/random") return randomModule.exports;
  throw new Error(`import inattendu dans logic.ts : ${id}`);
});
const {
  layoutClasses,
  screenLayoutClasses,
  foldLayoutForSmallScreen,
  updateScreenLayout,
  resetScreenLayout,
} = mod.exports;

test("layoutClasses : absence de layout ou layout vide produit un tableau vide", () => {
  assert.deepEqual(layoutClasses(), []);
  assert.deepEqual(layoutClasses(null), []);
  assert.deepEqual(layoutClasses(undefined), []);
  assert.deepEqual(layoutClasses({}), []);
});

test("layoutClasses : les valeurs par défaut ne produisent aucune classe", () => {
  assert.deepEqual(
    layoutClasses({
      image: "right",
      imageSize: "m",
      textSize: "md",
      align: "left",
    }),
    []
  );
});

test("layoutClasses : position de l'image (left, top, bottom)", () => {
  assert.deepEqual(layoutClasses({ image: "left" }), ["p79-img-left"]);
  assert.deepEqual(layoutClasses({ image: "top" }), ["p79-img-top"]);
  assert.deepEqual(layoutClasses({ image: "bottom" }), ["p79-img-bottom"]);
  assert.deepEqual(layoutClasses({ image: "right" }), []);
});

test("layoutClasses : taille de l'image (s, l)", () => {
  assert.deepEqual(layoutClasses({ imageSize: "s" }), ["p79-img-s"]);
  assert.deepEqual(layoutClasses({ imageSize: "l" }), ["p79-img-l"]);
  assert.deepEqual(layoutClasses({ imageSize: "m" }), []);
});

test("layoutClasses : taille du texte (sm, lg, xl)", () => {
  assert.deepEqual(layoutClasses({ textSize: "sm" }), ["p79-ts-sm"]);
  assert.deepEqual(layoutClasses({ textSize: "lg" }), ["p79-ts-lg"]);
  assert.deepEqual(layoutClasses({ textSize: "xl" }), ["p79-ts-xl"]);
  assert.deepEqual(layoutClasses({ textSize: "md" }), []);
});

test("layoutClasses : alignement du texte (center)", () => {
  assert.deepEqual(layoutClasses({ align: "center" }), ["p79-al-center"]);
  assert.deepEqual(layoutClasses({ align: "left" }), []);
});

test("layoutClasses : combinaisons multiples", () => {
  assert.deepEqual(
    layoutClasses({
      image: "left",
      imageSize: "l",
      textSize: "xl",
      align: "center",
    }),
    ["p79-img-left", "p79-img-l", "p79-ts-xl", "p79-al-center"]
  );

  assert.deepEqual(
    layoutClasses({
      image: "top",
      textSize: "sm",
    }),
    ["p79-img-top", "p79-ts-sm"]
  );
});

test("layoutClasses : valeurs inconnues ou invalides ignorées sans erreur", () => {
  assert.deepEqual(
    layoutClasses({
      image: "diagonal",
      imageSize: "xxl",
      textSize: "huge",
      align: "justify",
      extraKey: 42,
    }),
    []
  );

  assert.deepEqual(
    layoutClasses({
      image: "left",
      textSize: "giant",
    }),
    ["p79-img-left"]
  );
});

test("screenLayoutClasses : les écrans sans image ignorent image et imageSize", () => {
  const fullLayout = {
    image: "left",
    imageSize: "l",
    textSize: "xl",
    align: "center",
  };

  // Avec image : toutes les classes sont présentes
  assert.deepEqual(screenLayoutClasses(fullLayout, true), [
    "p79-img-left",
    "p79-img-l",
    "p79-ts-xl",
    "p79-al-center",
  ]);

  // Sans image : seules les classes de texte et alignement sont conservées
  assert.deepEqual(screenLayoutClasses(fullLayout, false), [
    "p79-ts-xl",
    "p79-al-center",
  ]);
});

test("compatibilité : un écran sans layout produit strictement un tableau vide (mêmes classes qu'avant)", () => {
  const existingScreen = {
    kind: "story",
    text: "Une caisse arrive.",
    image: "caisse.webp",
  };
  assert.deepEqual(screenLayoutClasses(existingScreen.layout, true), []);
  assert.deepEqual(screenLayoutClasses(existingScreen.layout, false), []);
});

test("repli des petits écrans : left et right se replient en top, bottom reste bottom", () => {
  // foldLayoutForSmallScreen
  assert.equal(foldLayoutForSmallScreen(undefined), undefined);
  assert.deepEqual(foldLayoutForSmallScreen({ image: "left" }), { image: "top" });
  assert.deepEqual(foldLayoutForSmallScreen({ image: "right" }), { image: "top" });
  assert.deepEqual(foldLayoutForSmallScreen({ image: "bottom" }), { image: "bottom" });
  assert.deepEqual(foldLayoutForSmallScreen({ image: "top" }), { image: "top" });

  // layoutClasses avec smallScreen: true
  assert.deepEqual(layoutClasses({ image: "left" }, { smallScreen: true }), ["p79-img-top"]);
  assert.deepEqual(layoutClasses({ image: "right" }, { smallScreen: true }), ["p79-img-top"]);
  assert.deepEqual(layoutClasses({ image: "bottom" }, { smallScreen: true }), ["p79-img-bottom"]);
  assert.deepEqual(layoutClasses({ image: "top" }, { smallScreen: true }), ["p79-img-top"]);
  assert.deepEqual(layoutClasses(undefined, { smallScreen: true }), []);
});

test("studio : updateScreenLayout applique les modifications et n'écrit rien pour les valeurs par défaut", () => {
  // Nouveau choix non par défaut
  let layout = updateScreenLayout(undefined, { image: "left" });
  assert.deepEqual(layout, { image: "left" });

  // Choix d'une taille de texte
  layout = updateScreenLayout(layout, { textSize: "xl" });
  assert.deepEqual(layout, { image: "left", textSize: "xl" });

  // Revenir à la valeur par défaut pour image ("right") supprime la clé image
  layout = updateScreenLayout(layout, { image: "right" });
  assert.deepEqual(layout, { textSize: "xl" });

  // Revenir à la valeur par défaut pour textSize ("md") vide l'objet et renvoie undefined
  layout = updateScreenLayout(layout, { textSize: "md" });
  assert.equal(layout, undefined);
});

test("studio : resetScreenLayout supprime complètement layout", () => {
  assert.equal(resetScreenLayout(), undefined);
});


