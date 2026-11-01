import os
from rembg import remove
from PIL import Image

def process_images(input_dir, output_dir):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    for filename in os.listdir(input_dir):
        if filename.endswith(".jpg"):
            input_path = os.path.join(input_dir, filename)
            output_path = os.path.join(output_dir, filename.replace('.jpg', '.png'))
            
            print(f"Processing {filename}...")
            
            # Read input image
            with open(input_path, 'rb') as i:
                input_data = i.read()
                
            # Remove background (rembg uses U2Net which is good at distinguishing foreground characters from backgrounds like checkerboards)
            output_data = remove(input_data)
            
            # Save output image as PNG
            with open(output_path, 'wb') as o:
                o.write(output_data)
                
            print(f"Saved cleaned transparent PNG to {output_path}")

if __name__ == "__main__":
    input_directory = r"C:\Users\HP\Documents\Institut_Supérieur_d_enseignement_professionnelle_ISEP\KerIA\public\images\palou"
    output_directory = r"C:\Users\HP\Documents\Institut_Supérieur_d_enseignement_professionnelle_ISEP\KerIA\public\images\palou"
    process_images(input_directory, output_directory)
