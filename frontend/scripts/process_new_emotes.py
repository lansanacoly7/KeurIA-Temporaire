import os
from PIL import Image, ImageDraw

def remove_white_bg_flood(img_path, out_path):
    try:
        img = Image.open(img_path).convert("RGBA")
        w, h = img.size
        
        temp = img.convert("RGB")
        ImageDraw.floodfill(temp, (0, 0), (255, 0, 255), thresh=40)
        ImageDraw.floodfill(temp, (w-1, 0), (255, 0, 255), thresh=40)
        ImageDraw.floodfill(temp, (0, h-1), (255, 0, 255), thresh=40)
        ImageDraw.floodfill(temp, (w-1, h-1), (255, 0, 255), thresh=40)
        
        data = list(img.getdata())
        temp_data = list(temp.getdata())
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
            img.save(out_path, format="PNG")
            print(f"Processed: {os.path.basename(img_path)} -> {os.path.basename(out_path)}")
        else:
            img.save(out_path, format="PNG")
            print(f"No background removed, just converted: {os.path.basename(img_path)}")
    except Exception as e:
        print(f"Error processing {os.path.basename(img_path)}: {e}")

folder = r"c:\Users\HP\Documents\Institut_Supérieur_d_enseignement_professionnelle_ISEP\KerIA\public\images\palou"

enc_jpg = os.path.join(folder, "Palou_Encouragement.jpg")
enc_png = os.path.join(folder, "Palou_Encouragement.png")
gentil_png = os.path.join(folder, "Palou_Gentil.png")

if os.path.exists(enc_jpg):
    print("Processing Palou_Encouragement.jpg...")
    remove_white_bg_flood(enc_jpg, enc_png)
    
if os.path.exists(gentil_png):
    print("Processing Palou_Gentil.png...")
    remove_white_bg_flood(gentil_png, gentil_png)

intel_jpg = os.path.join(folder, "Palou_Intelligent.jpg")
intel_png = os.path.join(folder, "Palou_Intelligent.png")
if os.path.exists(intel_jpg):
    print("Processing Palou_Intelligent.jpg...")
    remove_white_bg_flood(intel_jpg, intel_png)
