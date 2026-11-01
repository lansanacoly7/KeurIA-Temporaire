import os
from PIL import Image, ImageDraw, ImageFilter

PUBLIC_DIR = r"c:\Users\HP\Documents\Institut_Supérieur_d_enseignement_professionnelle_ISEP\KerIA\public\images\palou"

def remove_white_bg(image_path):
    # Open the image and convert to RGBA
    img = Image.open(image_path).convert("RGBA")
    
    # We create a mask for white pixels
    # Since it might not be pure white, we check distance to (255, 255, 255)
    r, g, b, a = img.split()
    
    # Simple thresholding: if r, g, b > 235, consider it background
    mask = img.point(lambda p: 255 if p < 245 else 0).convert("L")
    
    # To get just the background connected to edges, we can do a floodfill on the mask
    # Actually, a simpler way is just to floodfill the corners
    img_rgb = img.convert("RGB")
    ImageDraw.floodfill(img_rgb, (0, 0), (255, 0, 255), thresh=30)
    ImageDraw.floodfill(img_rgb, (img.width-1, 0), (255, 0, 255), thresh=30)
    ImageDraw.floodfill(img_rgb, (0, img.height-1), (255, 0, 255), thresh=30)
    ImageDraw.floodfill(img_rgb, (img.width-1, img.height-1), (255, 0, 255), thresh=30)
    
    # Create the alpha channel based on the floodfilled magenta color
    # and smooth it
    data = img.getdata()
    flood_data = img_rgb.getdata()
    
    new_data = []
    for i in range(len(data)):
        if flood_data[i] == (255, 0, 255):
            new_data.append((data[i][0], data[i][1], data[i][2], 0))
        else:
            new_data.append(data[i])
            
    img.putdata(new_data)
    
    # Save over the original file
    img.save(image_path, "PNG")
    print(f"Processed {os.path.basename(image_path)}")

# List of files we actually use
files = [
    "Palou_Content.png",
    "Palou reflexion.png",
    "Palou_Celebration.png",
    "Palou_Triste.png",
    "Palou_Calme.png",
    "Palou_Hero.png",
    "Palou_Question.png"
]

for f in files:
    path = os.path.join(PUBLIC_DIR, f)
    if os.path.exists(path):
        remove_white_bg(path)
    else:
        print(f"File not found: {f}")
