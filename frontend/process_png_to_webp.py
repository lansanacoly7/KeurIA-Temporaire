import os
from PIL import Image, ImageFilter
import numpy as np
from collections import deque

ILE1_DIR = r"c:\Users\HP\Documents\Institut_Supérieur_d_enseignement_professionnelle_ISEP\KerIA\frontend\public\images\parcours79\voyage\ile1"

def extract_alpha_mask_bfs(img_rgb, white_thresh=238, diff_thresh=15, flood_from_all_borders=True, max_flood_y_ratio=1.0):
    w, h = img_rgb.size
    arr = np.array(img_rgb, dtype=np.uint8)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    is_white = (min_c >= white_thresh) & ((max_c.astype(int) - min_c.astype(int)) <= diff_thresh)
    
    mask = np.zeros((h, w), dtype=bool)
    visited = np.zeros((h, w), dtype=bool)
    queue = deque()
    
    # Top border
    for x in range(w):
        if is_white[0, x]: queue.append((0, x)); visited[0, x] = True
        
    if flood_from_all_borders:
        for x in range(w):
            if is_white[h-1, x] and not visited[h-1, x]: queue.append((h-1, x)); visited[h-1, x] = True
        for y in range(h):
            if is_white[y, 0] and not visited[y, 0]: queue.append((y, 0)); visited[y, 0] = True
            if is_white[y, w-1] and not visited[y, w-1]: queue.append((y, w-1)); visited[y, w-1] = True
    else:
        # Seulement côtés latéraux jusqu'à max_flood_y_ratio
        for y in range(int(h * max_flood_y_ratio)):
            for x in [0, w - 1]:
                if is_white[y, x] and not visited[y, x]:
                    queue.append((y, x)); visited[y, x] = True
                    
    max_y = int(h * max_flood_y_ratio)
    while queue:
        cy, cx = queue.popleft()
        mask[cy, cx] = True
        for ny, nx in [(cy-1, cx), (cy+1, cx), (cy, cx-1), (cy, cx+1)]:
            if 0 <= ny < max_y and 0 <= nx < w:
                if not visited[ny, nx] and is_white[ny, nx]:
                    visited[ny, nx] = True
                    queue.append((ny, nx))
                    
    alpha = np.ones((h, w), dtype=np.uint8) * 255
    alpha[mask] = 0
    return alpha, mask

def process_character(png_name):
    src_path = os.path.join(ILE1_DIR, png_name)
    base_name = os.path.splitext(png_name)[0]
    dest_path = os.path.join(ILE1_DIR, base_name + ".webp")
    
    img = Image.open(src_path).convert("RGB")
    w, h = img.size
    
    # Alpha avec BFS depuis tous les bords
    alpha, mask = extract_alpha_mask_bfs(img, white_thresh=235, diff_thresh=18, flood_from_all_borders=True)
    
    # Détection de la bounding box du personnage
    fg_y, fg_x = np.where(~mask)
    if len(fg_y) == 0:
        print(f"[ERREUR] Aucun avant-plan détecté pour {png_name}")
        return
        
    pad = 8
    min_x = max(0, int(fg_x.min()) - pad)
    max_x = min(w, int(fg_x.max()) + pad)
    min_y = max(0, int(fg_y.min()) - pad)
    max_y = min(h, int(fg_y.max()) + pad)
    
    # Adoucissement fin pour anti-aliasing
    alpha_img = Image.fromarray(alpha, mode='L').filter(ImageFilter.GaussianBlur(0.7))
    
    rgba = Image.new("RGBA", (w, h))
    rgba.paste(img, (0, 0))
    rgba.putalpha(alpha_img)
    
    cropped = rgba.crop((min_x, min_y, max_x, max_y))
    cw, ch = cropped.size
    
    # Normalisation à environ 900px de hauteur (comme spécifié dans PROMPTS_ILE1_PILOTE)
    target_h = 900
    target_w = int(round(cw * (target_h / float(ch))))
    
    resized = cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
    resized.save(dest_path, "WEBP", quality=90, method=6)
    size_kb = os.path.getsize(dest_path) / 1024.0
    print(f"[OK] {base_name}.webp ({resized.size[0]}x{resized.size[1]}, {size_kb:.1f} Ko)")

def process_s4_lointain():
    src_path = os.path.join(ILE1_DIR, "s4-lointain.png")
    dest_path = os.path.join(ILE1_DIR, "s4-lointain.webp")
    img = Image.open(src_path).convert("RGB")
    w, h = img.size
    arr = np.array(img, dtype=np.float32)
    
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    brightness = (r + g + b) / 3.0
    color_diff = np.maximum(np.maximum(np.abs(r - g), np.abs(r - b)), np.abs(g - b))
    
    alpha = np.zeros((h, w), dtype=np.uint8)
    for y in range(int(h * 0.25), int(h * 0.65)):
        for x in range(w):
            br = brightness[y, x]
            cd = color_diff[y, x]
            if br < 248 or cd > 6:
                a = int(np.clip((255 - br + cd * 2.0) / 20.0 * 255, 0, 255))
                alpha[y, x] = a
                
    alpha_img = Image.fromarray(alpha, mode='L').filter(ImageFilter.GaussianBlur(0.6))
    rgba = Image.new("RGBA", (w, h))
    rgba.paste(img, (0, 0))
    rgba.putalpha(alpha_img)
    out = rgba.resize((1920, 1080), Image.Resampling.LANCZOS)
    out.save(dest_path, "WEBP", quality=90, method=6)
    print(f"[OK] s4-lointain.webp ({out.size}, {os.path.getsize(dest_path)/1024:.1f} Ko)")

def process_s4_decor():
    src_path = os.path.join(ILE1_DIR, "s4-decor.png")
    dest_path = os.path.join(ILE1_DIR, "s4-decor.webp")
    img = Image.open(src_path).convert("RGB")
    w, h = img.size
    
    alpha, mask = extract_alpha_mask_bfs(img, white_thresh=238, diff_thresh=16, flood_from_all_borders=False, max_flood_y_ratio=0.72)
    alpha_img = Image.fromarray(alpha, mode='L').filter(ImageFilter.GaussianBlur(0.6))
    
    rgba = Image.new("RGBA", (w, h))
    rgba.paste(img, (0, 0))
    rgba.putalpha(alpha_img)
    out = rgba.resize((1920, 1080), Image.Resampling.LANCZOS)
    out.save(dest_path, "WEBP", quality=90, method=6)
    print(f"[OK] s4-decor.webp ({out.size}, {os.path.getsize(dest_path)/1024:.1f} Ko)")

def process_s4_scene():
    src_path = os.path.join(ILE1_DIR, "s4-scene.png")
    dest_path = os.path.join(ILE1_DIR, "s4-scene.webp")
    img = Image.open(src_path).convert("RGB")
    w, h = img.size
    
    alpha, mask = extract_alpha_mask_bfs(img, white_thresh=238, diff_thresh=16, flood_from_all_borders=False, max_flood_y_ratio=0.70)
    alpha_img = Image.fromarray(alpha, mode='L').filter(ImageFilter.GaussianBlur(0.6))
    
    rgba = Image.new("RGBA", (w, h))
    rgba.paste(img, (0, 0))
    rgba.putalpha(alpha_img)
    out = rgba.resize((1920, 1080), Image.Resampling.LANCZOS)
    out.save(dest_path, "WEBP", quality=90, method=6)
    print(f"[OK] s4-scene.webp ({out.size}, {os.path.getsize(dest_path)/1024:.1f} Ko)")

def process_s4_avant():
    src_path = os.path.join(ILE1_DIR, "s4-avant.png")
    dest_path = os.path.join(ILE1_DIR, "s4-avant.webp")
    img = Image.open(src_path).convert("RGB")
    w, h = img.size
    arr = np.array(img, dtype=np.uint8)
    
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    is_white = (min_c >= 238) & ((max_c.astype(int) - min_c.astype(int)) <= 15)
    
    alpha = np.zeros((h, w), dtype=np.uint8)
    for y in range(int(h * 0.85), h):
        for x in range(w):
            if not is_white[y, x]:
                alpha[y, x] = 255
                
    alpha_img = Image.fromarray(alpha, mode='L').filter(ImageFilter.GaussianBlur(0.8))
    rgba = Image.new("RGBA", (w, h))
    rgba.paste(img, (0, 0))
    rgba.putalpha(alpha_img)
    out = rgba.resize((1920, 1080), Image.Resampling.LANCZOS)
    out.save(dest_path, "WEBP", quality=90, method=6)
    print(f"[OK] s4-avant.webp ({out.size}, {os.path.getsize(dest_path)/1024:.1f} Ko)")

if __name__ == "__main__":
    print("--- 1. PLANS DE LA SCÈNE 4 ---")
    process_s4_lointain()
    process_s4_decor()
    process_s4_scene()
    process_s4_avant()

    print("\n--- 2. LES 12 PERSONNAGES ---")
    perso_files = [f"perso-{i}-{suffix}.png" for i, suffix in [
        (1, "ecoliere"), (2, "ecolier"), (3, "maitresse"),
        (4, "ecolieres-jeu"), (5, "ecolier-ballon"), (6, "ecoliers-lecture"),
        (7, "directeur"), (8, "jardinier"), (9, "cuisiniere"),
        (10, "curieux"), (11, "detective"), (12, "livreur")
    ]]
    for pf in perso_files:
        process_character(pf)

    print("\n--- 3. NETTOYAGE DES FICHIERS SOURCE PNG ---")
    pngs_to_remove = [f for f in os.listdir(ILE1_DIR) if f.endswith(".png")]
    for png in pngs_to_remove:
        full_path = os.path.join(ILE1_DIR, png)
        os.remove(full_path)
        print(f"[SUPPRIMÉ] {png}")

    print("\nTOUS LES ASSETS SONT DÉSORMAIS EN WEBP PURS SANS PNG !")
