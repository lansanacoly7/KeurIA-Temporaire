import os
from PIL import Image, ImageFilter
import numpy as np
from collections import deque

BRAIN_DIR = r"C:\Users\HP\.gemini\antigravity-ide\brain\a8bf128d-93cb-4be1-9516-e006b868ecdf"
OUTPUT_DIR = r"c:\Users\HP\Documents\Institut_Supérieur_d_enseignement_professionnelle_ISEP\KerIA\frontend\public\images\parcours79\voyage\ile1"

os.makedirs(OUTPUT_DIR, exist_ok=True)

def process_fond(src_name, dest_name):
    src = os.path.join(BRAIN_DIR, src_name)
    img = Image.open(src).convert("RGB")
    w, h = img.size
    # Mesurer l'horizon dans l'image
    arr = np.array(img)
    diffs = np.linalg.norm(np.diff(arr[:, w//2, :].astype(float), axis=0), axis=1)
    horizon_src = 200 + np.argmax(diffs[200:500])
    
    # Target: 1920x1080, horizon à exactement 42% (y = 453.6 px)
    crop_h = min(horizon_src / 0.42, (h - horizon_src) / 0.58)
    crop_w = crop_h * (16.0 / 9.0)
    if crop_w > w:
        crop_w = w
        crop_h = crop_w * (9.0 / 16.0)
    y_top = max(0, horizon_src - 0.42 * crop_h)
    y_bottom = min(h, y_top + crop_h)
    x_left = (w - crop_w) / 2.0
    x_right = x_left + crop_w
    
    cropped = img.crop((int(x_left), int(y_top), int(x_right), int(y_bottom)))
    out = cropped.resize((1920, 1080), Image.Resampling.LANCZOS)
    dest = os.path.join(OUTPUT_DIR, dest_name)
    out.save(dest, "WEBP", quality=90, method=6)
    print(f"[OK] {dest_name} ({out.size}, {os.path.getsize(dest)} octets)")

def process_lointain(src_name, dest_name):
    src = os.path.join(BRAIN_DIR, src_name)
    img = Image.open(src).convert("RGB")
    w, h = img.size
    arr = np.array(img, dtype=np.float32)
    
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    brightness = (r + g + b) / 3.0
    color_diff = np.maximum(np.maximum(np.abs(r - g), np.abs(r - b)), np.abs(g - b))
    
    # Tout au-dessus de 25% et en-dessous de 65% est du fond blanc
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
    dest = os.path.join(OUTPUT_DIR, dest_name)
    out.save(dest, "WEBP", quality=90, method=6)
    print(f"[OK] {dest_name} ({out.size}, {os.path.getsize(dest)} octets)")

def process_decor_s2():
    # Décor scène 2 : salle de classe
    src = os.path.join(BRAIN_DIR, "s2_decor_1791744217653.jpg")
    img = Image.open(src).convert("RGB")
    w, h = img.size
    arr = np.array(img, dtype=np.uint8)
    
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    # Les zones blanches incluent le tour et l'intérieur des fenêtres
    is_white = (min_c >= 235) & ((max_c.astype(int) - min_c.astype(int)) <= 15)
    
    # Pour s2_decor, toutes les zones blanches (y compris à l'intérieur des fenêtres) doivent être transparentes
    alpha = np.ones((h, w), dtype=np.uint8) * 255
    alpha[is_white] = 0
    alpha_img = Image.fromarray(alpha, mode='L').filter(ImageFilter.GaussianBlur(0.6))
    
    rgba = Image.new("RGBA", (w, h))
    rgba.paste(img, (0, 0))
    rgba.putalpha(alpha_img)
    out = rgba.resize((1920, 1080), Image.Resampling.LANCZOS)
    dest = os.path.join(OUTPUT_DIR, "s2-decor.webp")
    out.save(dest, "WEBP", quality=90, method=6)
    print(f"[OK] s2-decor.webp ({out.size}, {os.path.getsize(dest)} octets)")

def process_floodfill(src_name, dest_name, max_y_ratio=0.70):
    src = os.path.join(BRAIN_DIR, src_name)
    img = Image.open(src).convert("RGB")
    w, h = img.size
    arr = np.array(img, dtype=np.uint8)
    
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    is_white = (min_c >= 238) & ((max_c.astype(int) - min_c.astype(int)) <= 15)
    
    mask = np.zeros((h, w), dtype=bool)
    visited = np.zeros((h, w), dtype=bool)
    queue = deque()
    
    for x in range(w):
        if is_white[0, x]: queue.append((0, x)); visited[0, x] = True
    for y in range(int(h * max_y_ratio)):
        for x in [0, w - 1]:
            if is_white[y, x] and not visited[y, x]:
                queue.append((y, x)); visited[y, x] = True
                
    while queue:
        cy, cx = queue.popleft()
        mask[cy, cx] = True
        for ny, nx in [(cy-1, cx), (cy+1, cx), (cy, cx-1), (cy, cx+1)]:
            if 0 <= ny < h and 0 <= nx < w:
                if not visited[ny, nx] and is_white[ny, nx]:
                    visited[ny, nx] = True
                    queue.append((ny, nx))
                    
    alpha = np.ones((h, w), dtype=np.uint8) * 255
    alpha[mask] = 0
    alpha_img = Image.fromarray(alpha, mode='L').filter(ImageFilter.GaussianBlur(0.6))
    
    rgba = Image.new("RGBA", (w, h))
    rgba.paste(img, (0, 0))
    rgba.putalpha(alpha_img)
    out = rgba.resize((1920, 1080), Image.Resampling.LANCZOS)
    dest = os.path.join(OUTPUT_DIR, dest_name)
    out.save(dest, "WEBP", quality=90, method=6)
    print(f"[OK] {dest_name} ({out.size}, {os.path.getsize(dest)} octets)")

def process_avant(src_name, dest_name):
    # L'avant-plan est strictement dans les 12% inférieurs (y >= 88%)
    src = os.path.join(BRAIN_DIR, src_name)
    img = Image.open(src).convert("RGB")
    w, h = img.size
    arr = np.array(img, dtype=np.uint8)
    
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    is_white = (min_c >= 238) & ((max_c.astype(int) - min_c.astype(int)) <= 15)
    
    # Au-dessus de 88%, tout est forcé transparent
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
    dest = os.path.join(OUTPUT_DIR, dest_name)
    out.save(dest, "WEBP", quality=90, method=6)
    print(f"[OK] {dest_name} ({out.size}, {os.path.getsize(dest)} octets)")

if __name__ == "__main__":
    print("--- TRAITEMENT SCENE 2 ---")
    process_fond("s2_fond_real_1791744176068.jpg", "s2-fond.webp")
    process_lointain("s2_lointain_1791744195117.jpg", "s2-lointain.webp")
    process_decor_s2()
    process_floodfill("s2_scene_1791744237336.jpg", "s2-scene.webp", max_y_ratio=0.70)
    process_avant("s2_avant_1791744254438.jpg", "s2-avant.webp")

    print("\n--- TRAITEMENT SCENE 3 ---")
    process_fond("s3_fond_1791744276832.jpg", "s3-fond.webp")
    process_lointain("s3_lointain_1791744294125.jpg", "s3-lointain.webp")
    process_floodfill("s3_decor_1791744321474.jpg", "s3-decor.webp", max_y_ratio=0.70)
    process_floodfill("s3_scene_clean_1791744367596.jpg", "s3-scene.webp", max_y_ratio=0.70)
    process_avant("s3_avant_1791744395060.jpg", "s3-avant.webp")

    print("\n--- TRAITEMENT SCENE 4 ---")
    process_fond("s4_fond_1791744418549.jpg", "s4-fond.webp")

    print("\nTOUS LES PLANS DISPONIBLES ONT ÉTÉ CONVERTIS AVEC SUCCÈS.")
