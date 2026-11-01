import os
from PIL import Image, ImageDraw

def remove_white_bg_flood(img_path):
    try:
        img = Image.open(img_path).convert("RGBA")
        w, h = img.size
        
        # Use floodfill to find white background pixels starting from corners
        temp = img.convert("RGB")
        # Define what we consider "white" background
        # Let's use a small threshold in case it's not perfectly white
        ImageDraw.floodfill(temp, (0, 0), (255, 0, 255), thresh=30)
        ImageDraw.floodfill(temp, (w-1, 0), (255, 0, 255), thresh=30)
        ImageDraw.floodfill(temp, (0, h-1), (255, 0, 255), thresh=30)
        ImageDraw.floodfill(temp, (w-1, h-1), (255, 0, 255), thresh=30)
        
        data = img.getdata()
        temp_data = temp.getdata()
        new_data = []
        
        changed = False
        for i in range(len(data)):
            if temp_data[i] == (255, 0, 255):
                new_data.append((data[i][0], data[i][1], data[i][2], 0))
                changed = True
            else:
                new_data.append(data[i])
                
        if changed:
            img.putdata(new_data)
            img.save(img_path, format="PNG")
            print(f"Processed: {os.path.basename(img_path)}")
        else:
            print(f"No background found/removed: {os.path.basename(img_path)}")
    except Exception as e:
        print(f"Error processing {os.path.basename(img_path)}: {e}")

folder = r"c:\Users\HP\Documents\Institut_Supérieur_d_enseignement_professionnelle_ISEP\KerIA\public\images\palou"

for f in os.listdir(folder):
    if f.endswith('.png'):
        remove_white_bg_flood(os.path.join(folder, f))
