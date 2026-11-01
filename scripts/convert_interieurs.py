"""Script pour convertir et détourer les images générées pour l'intérieur des îles.
Placez vos images téléchargées dans frontend/public/images/parcours79/voyage/
puis lancez : .\\venv\\Scripts\\python.exe scripts/convert_interieurs.py
"""
import os
import glob
from PIL import Image, ImageFilter
import numpy as np
from collections import deque

VOYAGE_DIR = os.path.join("frontend", "public", "images", "parcours79", "voyage")

def remove_outer_white(img, threshold=242):
    img = img.convert("RGBA")
    arr = np.array(img)
    h, w, _ = arr.shape
    rgb = arr[:, :, :3]
    is_white = np.all(rgb >= threshold, axis=2) & ((np.max(rgb.astype(int), axis=2) - np.min(rgb.astype(int), axis=2)) < 16)
    
    mask = np.zeros((h, w), dtype=bool)
    queue = deque()
    
    for x in range(w):
        if is_white[0, x]: queue.append((0, x)); mask[0, x] = True
    for y in range(h):
        if is_white[y, 0]: queue.append((y, 0)); mask[y, 0] = True
        if is_white[y, w-1]: queue.append((y, w-1)); mask[y, w-1] = True
        
    while queue:
        cy, cx = queue.popleft()
        for dy, dx in [(-1,0), (1,0), (0,-1), (0,1)]:
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not mask[ny, nx] and is_white[ny, nx]:
                mask[ny, nx] = True
                queue.append((ny, nx))
                
    alpha = np.where(mask, 0, 255).astype(np.uint8)
    alpha_img = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(radius=0.8))
    img.putalpha(alpha_img)
    return img

def main():
    if not os.path.exists(VOYAGE_DIR):
        print(f"Dossier {VOYAGE_DIR} introuvable.")
        return

    print("Traitement des images d'intérieur...")
    
    # 1. Traitement des fichiers PNG ou JPG d'intérieur
    for ext in ["*.png", "*.jpg", "*.jpeg"]:
        for file_path in glob.glob(os.path.join(VOYAGE_DIR, ext)):
            base = os.path.basename(file_path)
            # Ne traiter que les fichiers interieur-*, vie-* ou panneau-*
            if not (base.startswith("interieur-") or base.startswith("vie-") or base.startswith("panneau-")):
                continue
                
            clean_name = base.split(".")[0]
            dst_webp = os.path.join(VOYAGE_DIR, f"{clean_name}.webp")
            
            print(f"Conversion de {base} -> {clean_name}.webp ...")
            img = Image.open(file_path)
            
            # Si c'est une couche milieu, avant, un élément de vie ou un panneau, détourer le blanc si besoin
            if any(k in clean_name for k in ["milieu", "avant", "vie-", "nuage", "oiseau", "panneau-"]):
                if img.mode != "RGBA" or np.array(img)[:, :, 3].min() == 255:
                    img = remove_outer_white(img)
            
            img.save(dst_webp, "WEBP", quality=85)
            # Supprimer la copie originale jpg/png pour respecter la règle "WebP uniquement"
            try:
                os.remove(file_path)
                print(f"  OK ! Nettoyage de l'original {base}")
            except Exception as e:
                print(f"  Note : impossible de supprimer {base}: {e}")

    print("Terminé !")

if __name__ == "__main__":
    main()
