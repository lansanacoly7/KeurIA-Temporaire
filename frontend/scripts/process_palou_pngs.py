import os
from PIL import Image, ImageDraw

ARTIFACTS_DIR = r"C:\Users\HP\.gemini\antigravity-ide\brain\b1c351de-7290-40fa-ab5f-cc809996e3a1"
PUBLIC_DIR = r"c:\Users\HP\Documents\Institut_Supérieur_d_enseignement_professionnelle_ISEP\KerIA\public\images\palou"

os.makedirs(PUBLIC_DIR, exist_ok=True)

sources = {
    "joy": "palou_joy_1789587102293.jpg",
    "curious": "palou_curious_1789587122644.jpg",
    "surprise": "palou_surprise_1789587195100.jpg",
    "thinking": "palou_thinking_1789587143149.jpg",
    "bravo": "palou_bravo_1789587174604.jpg"
}

try:
    from rembg import remove
    USE_REMBG = True
except ImportError:
    USE_REMBG = False

def remove_white_bg_flood(img):
    img = img.convert("RGBA")
    w, h = img.size
    
    temp = img.convert("RGB")
    ImageDraw.floodfill(temp, (0, 0), (255, 0, 255), thresh=50)
    ImageDraw.floodfill(temp, (w-1, 0), (255, 0, 255), thresh=50)
    ImageDraw.floodfill(temp, (0, h-1), (255, 0, 255), thresh=50)
    ImageDraw.floodfill(temp, (w-1, h-1), (255, 0, 255), thresh=50)
    
    data = img.getdata()
    temp_data = temp.getdata()
    new_data = []
    for i in range(len(data)):
        if temp_data[i] == (255, 0, 255):
            new_data.append((data[i][0], data[i][1], data[i][2], 0))
        else:
            new_data.append(data[i])
            
    img.putdata(new_data)
    return img

for name, filename in sources.items():
    path = os.path.join(ARTIFACTS_DIR, filename)
    if not os.path.exists(path):
        print(f"File not found: {path}")
        continue
    
    img = Image.open(path)
    # Resize to something reasonable for web UI
    img.thumbnail((600, 600), Image.Resampling.LANCZOS)
    
    if USE_REMBG:
        print(f"Using rembg for {name}...")
        img = remove(img)
    else:
        print(f"Using floodfill for {name}...")
        img = remove_white_bg_flood(img)
        
    out_path = os.path.join(PUBLIC_DIR, f"{name}.png")
    img.save(out_path, format="PNG")
    print(f"Saved {out_path}")
