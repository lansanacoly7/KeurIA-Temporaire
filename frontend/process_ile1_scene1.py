import os
from PIL import Image, ImageFilter
import numpy as np

BRAIN_DIR = r"C:\Users\HP\.gemini\antigravity-ide\brain\a8bf128d-93cb-4be1-9516-e006b868ecdf"
OUTPUT_DIR = r"c:\Users\HP\Documents\Institut_Supérieur_d_enseignement_professionnelle_ISEP\KerIA\frontend\public\images\parcours79\voyage\ile1"
VOYAGE_DIR = r"c:\Users\HP\Documents\Institut_Supérieur_d_enseignement_professionnelle_ISEP\KerIA\frontend\public\images\parcours79\voyage"

os.makedirs(OUTPUT_DIR, exist_ok=True)

def process_s1_fond():
    src = os.path.join(BRAIN_DIR, "s1_fond_1791743540204.jpg")
    img = Image.open(src).convert("RGB")
    w, h = img.size
    # Mesurer l'horizon dans l'image générée
    arr = np.array(img)
    diffs = np.linalg.norm(np.diff(arr[:, w//2, :].astype(float), axis=0), axis=1)
    horizon_src = 200 + np.argmax(diffs[200:450])
    
    # Target: 1920x1080, horizon à exactement 42% (y = 453.6 px)
    crop_h = min(horizon_src / 0.42, (h - horizon_src) / 0.58)
    crop_w = crop_h * (16.0 / 9.0)
    if crop_w > w:
        crop_w = w
        crop_h = crop_w * (9.0 / 16.0)
    y_top = horizon_src - 0.42 * crop_h
    y_bottom = y_top + crop_h
    x_left = (w - crop_w) / 2.0
    x_right = x_left + crop_w
    
    cropped = img.crop((int(x_left), int(y_top), int(x_right), int(y_bottom)))
    out = cropped.resize((1920, 1080), Image.Resampling.LANCZOS)
    dest = os.path.join(OUTPUT_DIR, "s1-fond.webp")
    out.save(dest, "WEBP", quality=90, method=6)
    print(f"[OK] s1-fond.webp ({out.size}, {os.path.getsize(dest)} octets)")

def process_s1_lointain():
    src = os.path.join(BRAIN_DIR, "s1_lointain_1791743557735.jpg")
    img = Image.open(src).convert("RGB")
    w, h = img.size
    arr = np.array(img, dtype=np.float32)
    
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    brightness = (r + g + b) / 3.0
    color_diff = np.maximum(np.maximum(np.abs(r - g), np.abs(r - b)), np.abs(g - b))
    
    # Tout au-dessus de 30% et en-dessous de 65% est du fond blanc
    alpha = np.zeros((h, w), dtype=np.uint8)
    for y in range(int(h * 0.28), int(h * 0.65)):
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
    dest = os.path.join(OUTPUT_DIR, "s1-lointain.webp")
    out.save(dest, "WEBP", quality=90, method=6)
    print(f"[OK] s1-lointain.webp ({out.size}, {os.path.getsize(dest)} octets)")

def process_s1_decor():
    src = os.path.join(BRAIN_DIR, "s1_decor_1791743576909.jpg")
    img = Image.open(src).convert("RGB")
    w, h = img.size
    arr = np.array(img, dtype=np.uint8)
    
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    is_white = (min_c >= 238) & ((max_c.astype(int) - min_c.astype(int)) <= 15)
    
    from collections import deque
    mask = np.zeros((h, w), dtype=bool)
    visited = np.zeros((h, w), dtype=bool)
    queue = deque()
    
    for x in range(w):
        if is_white[0, x]: queue.append((0, x)); visited[0, x] = True
    for y in range(int(h * 0.65)):
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
    dest = os.path.join(OUTPUT_DIR, "s1-decor.webp")
    out.save(dest, "WEBP", quality=90, method=6)
    print(f"[OK] s1-decor.webp ({out.size}, {os.path.getsize(dest)} octets)")

def process_s1_scene():
    src = os.path.join(BRAIN_DIR, "s1_scene_1791743597281.jpg")
    img = Image.open(src).convert("RGB")
    w, h = img.size
    arr = np.array(img, dtype=np.uint8)
    
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    is_white = (min_c >= 240) & ((max_c.astype(int) - min_c.astype(int)) <= 15)
    
    from collections import deque
    mask = np.zeros((h, w), dtype=bool)
    visited = np.zeros((h, w), dtype=bool)
    queue = deque()
    
    for x in range(w):
        if is_white[0, x]: queue.append((0, x)); visited[0, x] = True
    for y in range(int(h * 0.70)):
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
    dest = os.path.join(OUTPUT_DIR, "s1-scene.webp")
    out.save(dest, "WEBP", quality=90, method=6)
    print(f"[OK] s1-scene.webp ({out.size}, {os.path.getsize(dest)} octets)")

def process_s1_avant():
    # Utiliser la couche d'avant-plan de premier ordre déjà calibrée
    src = os.path.join(VOYAGE_DIR, "interieur-01-avant.webp")
    img = Image.open(src).convert("RGBA")
    out = img.resize((1920, 1080), Image.Resampling.LANCZOS)
    dest = os.path.join(OUTPUT_DIR, "s1-avant.webp")
    out.save(dest, "WEBP", quality=90, method=6)
    print(f"[OK] s1-avant.webp ({out.size}, {os.path.getsize(dest)} octets)")

if __name__ == "__main__":
    process_s1_fond()
    process_s1_lointain()
    process_s1_decor()
    process_s1_scene()
    process_s1_avant()
    print("SCENE 1 PILOTE TERMINEE.")
