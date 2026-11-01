import os, sys
from PIL import Image
import numpy as np
import cv2

ILE1_DIR = r"c:\Users\HP\Documents\Institut_Supérieur_d_enseignement_professionnelle_ISEP\KerIA\frontend\public\images\parcours79\voyage\ile1"

def clean_file(filename):
    if "-fond" in filename:
        return
        
    p = os.path.join(ILE1_DIR, filename)
    if os.path.getsize(p) == 0:
        print(f"[SKIP 0-byte] {filename}", flush=True)
        return
        
    try:
        img = Image.open(p).convert("RGBA")
    except Exception as e:
        print(f"[ERREUR lecture] {filename}: {e}", flush=True)
        return

    arr = np.array(img, dtype=np.float32)
    rgb = arr[:, :, :3]
    alpha = arr[:, :, 3]
    
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    min_c = np.minimum(np.minimum(r, g), b)
    max_c = np.maximum(np.maximum(r, g), b)
    diff_c = max_c - min_c
    brightness = (r + g + b) / 3.0
    
    # Signature studio background (neutre et très lumineux)
    is_pure_bg = (min_c >= 246) & (diff_c <= 5)
    is_fringe = (min_c >= 235) & (diff_c <= 12)
    
    candidate_mask = (is_pure_bg | is_fringe) & (alpha > 0)
    
    if not np.any(candidate_mask):
        print(f"[DÉJÀ PROPRE] {filename:25}", flush=True)
        return
        
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(candidate_mask.astype(np.uint8))
    new_alpha = alpha.copy()
    cleaned_pixels = 0
    
    for i in range(1, num_labels):
        mask_i = (labels == i)
        area = stats[i, cv2.CC_STAT_AREA]
        
        has_pure_bg = np.any(is_pure_bg[mask_i])
        mean_bright = brightness[mask_i].mean()
        
        if has_pure_bg and mean_bright >= 242:
            feather = np.clip((255.0 - brightness[mask_i]) / 18.0 * 255.0, 0, 255)
            new_alpha[mask_i] = np.minimum(new_alpha[mask_i], feather)
            cleaned_pixels += area
            
    # Halo matting fin
    fringe_halo = (new_alpha > 0) & (new_alpha < 240) & (min_c >= 235) & (diff_c <= 8)
    if np.any(fringe_halo):
        new_alpha[fringe_halo] = np.clip(new_alpha[fringe_halo] * ((255.0 - brightness[fringe_halo]) / 20.0), 0, 255)
        
    arr[:, :, 3] = new_alpha
    out_img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), mode="RGBA")
    
    temp_p = p + ".tmp.webp"
    out_img.save(temp_p, "WEBP", quality=90, method=4)
    if os.path.exists(temp_p) and os.path.getsize(temp_p) > 0:
        os.replace(temp_p, p)
        size_kb = os.path.getsize(p) / 1024.0
        print(f"[NETTOYÉ] {filename:25}: {cleaned_pixels:6d} px -> {size_kb:5.1f} Ko", flush=True)

if __name__ == "__main__":
    print("--- DÉMARRAGE DU NETTOYAGE PROPRE ---", flush=True)
    files = sorted([f for f in os.listdir(ILE1_DIR) if f.endswith(".webp")])
    for f in files:
        clean_file(f)
    print("--- FIN DU NETTOYAGE ---", flush=True)
