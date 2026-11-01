import os
from PIL import Image

def remove_checkerboard(input_path, output_path, tolerance=15):
    img = Image.open(input_path).convert("RGBA")
    pixels = img.load()
    width, height = img.size
    
    # Identify background colors from corners
    stack = [(0, 0), (width-1, 0), (0, height-1), (width-1, height-1)]
    visited = set(stack)
    
    def color_dist(c1, c2):
        return sum(abs(a - b) for a, b in zip(c1[:3], c2[:3]))
        
    bg_colors = [pixels[x, y] for x, y in stack]
    
    while stack:
        x, y = stack.pop()
        current_color = pixels[x, y]
        
        # Check if color is part of the checkerboard background
        is_bg = False
        # Condition 1: Greyish/White color
        if abs(current_color[0] - current_color[1]) < 20 and abs(current_color[1] - current_color[2]) < 20 and current_color[0] > 180:
            is_bg = True
        
        # Condition 2: Similar to corner colors
        if not is_bg:
            for bg_c in bg_colors:
                if color_dist(current_color, bg_c) < tolerance * 3:
                    is_bg = True
                    break
                
        if is_bg:
            pixels[x, y] = (0, 0, 0, 0)
            
            for dx, dy in [(0, 1), (1, 0), (0, -1), (-1, 0)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in visited:
                    visited.add((nx, ny))
                    stack.append((nx, ny))
                    
    img.save(output_path, "PNG")

if __name__ == "__main__":
    input_dir = r"C:\Users\HP\Documents\Institut_Supérieur_d_enseignement_professionnelle_ISEP\KerIA\public\images\palou"
    output_dir = input_dir
    
    for filename in os.listdir(input_dir):
        if filename.endswith(".jpg"):
            in_path = os.path.join(input_dir, filename)
            out_path = os.path.join(output_dir, filename.replace('.jpg', '.png'))
            print(f"Cleaning {filename} -> {out_path}")
            try:
                remove_checkerboard(in_path, out_path)
            except Exception as e:
                print(f"Failed to process {filename}: {e}")
