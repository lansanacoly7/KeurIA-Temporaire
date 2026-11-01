import os
import math
from PIL import Image, ImageDraw, ImageFilter

def create_banner(
    bg_gradient,
    palou_filename,
    palou_pos,        # (x, y, target_height)
    palou_flip=False,
    decor_type=None,
    output_filename="banner.png"
):
    W, H = 720, 288
    # 1. Base gradient
    base = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(base)
    
    c_start, c_end = bg_gradient
    for x in range(W):
        ratio = x / W
        r = int(c_start[0] * (1 - ratio) + c_end[0] * ratio)
        g = int(c_start[1] * (1 - ratio) + c_end[1] * ratio)
        b = int(c_start[2] * (1 - ratio) + c_end[2] * ratio)
        draw.line([(x, 0), (x, H)], fill=(r, g, b, 255))
        
    # Subtle soft circular background glow behind character/elements
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    
    # Decorative soft circles in background
    glow_draw.ellipse([W//2 - 180, -60, W//2 + 240, H + 80], fill=(255, 255, 255, 60))
    glow_draw.ellipse([80, H - 120, 360, H + 120], fill=(255, 255, 255, 45))
    glow_draw.ellipse([W - 240, -40, W + 60, 220], fill=(255, 255, 255, 40))
    
    # 2. Draw thematic decor behind/around character
    decor = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d_draw = ImageDraw.Draw(decor)
    
    if decor_type == "welcome":
        # Warm sparkling digital stars and welcoming sparkles
        def draw_sparkle(x, y, size, color):
            d_draw.line([(x - size, y), (x + size, y)], fill=color, width=3)
            d_draw.line([(x, y - size), (x, y + size)], fill=color, width=3)
            d_draw.ellipse([x - 2, y - 2, x + 2, y + 2], fill=(255, 255, 255, 255))
            
        draw_sparkle(480, 80, 18, (245, 180, 40, 220))
        draw_sparkle(570, 150, 14, (15, 140, 110, 200))
        draw_sparkle(420, 180, 12, (245, 180, 40, 180))
        draw_sparkle(630, 90, 16, (70, 150, 240, 200))
        draw_sparkle(360, 90, 10, (245, 180, 40, 170))
        
        # Friendly lightbulb / idea bubble
        d_draw.ellipse([500, 110, 580, 190], fill=(255, 245, 210, 230), outline=(245, 180, 40, 240), width=4)
        # Filament
        d_draw.arc([525, 130, 555, 165], 0, 180, fill=(230, 150, 20, 255), width=4)
        d_draw.rectangle([530, 170, 550, 185], fill=(200, 140, 20, 255))
        
        # Soft tech ring
        d_draw.arc([430, 60, 650, 240], 30, 310, fill=(15, 140, 110, 80), width=3)

    elif decor_type == "daily":
        # GPS Map route & daily tech symbols
        # Route card background
        d_draw.rounded_rectangle([430, 65, 640, 220], radius=16, fill=(255, 255, 255, 220), outline=(220, 235, 230, 255), width=2)
        # GPS Route line
        points = [(460, 180), (490, 130), (530, 160), (580, 100), (610, 110)]
        d_draw.line(points, fill=(15, 140, 110, 255), width=6)
        # Pin destination
        d_draw.ellipse([600, 88, 622, 110], fill=(235, 75, 60, 255))
        d_draw.ellipse([606, 94, 616, 104], fill=(255, 255, 255, 255))
        # Start dot
        d_draw.ellipse([454, 174, 466, 186], fill=(40, 120, 230, 255))
        
        # Floating music notes
        d_draw.ellipse([370, 95, 386, 110], fill=(245, 160, 40, 230))
        d_draw.line([(384, 100), (384, 75)], fill=(245, 160, 40, 230), width=3)
        d_draw.line([(384, 75), (396, 80)], fill=(245, 160, 40, 230), width=3)
        
        # Wi-Fi symbol
        d_draw.arc([360, 140, 400, 180], 210, 330, fill=(15, 140, 110, 200), width=4)
        d_draw.arc([370, 150, 390, 170], 210, 330, fill=(15, 140, 110, 200), width=4)
        d_draw.ellipse([378, 168, 382, 172], fill=(15, 140, 110, 255))

    elif decor_type == "machine_learning":
        # 3 Sorting Baskets / Pods with colorful shapes
        # Pod 1 (Cyan cubes)
        d_draw.rounded_rectangle([410, 145, 475, 225], radius=12, fill=(225, 245, 255, 240), outline=(50, 160, 230, 255), width=3)
        d_draw.rectangle([428, 115, 458, 145], fill=(50, 160, 230, 255)) # Cube
        d_draw.line([(442, 148), (442, 165)], fill=(50, 160, 230, 255), width=4)
        
        # Pod 2 (Gold spheres)
        d_draw.rounded_rectangle([495, 145, 560, 225], radius=12, fill=(255, 250, 225, 240), outline=(245, 175, 35, 255), width=3)
        d_draw.ellipse([512, 115, 542, 145], fill=(245, 175, 35, 255)) # Sphere
        d_draw.line([(527, 148), (527, 165)], fill=(245, 175, 35, 255), width=4)

        # Pod 3 (Emerald pyramids)
        d_draw.rounded_rectangle([580, 145, 645, 225], radius=12, fill=(230, 250, 240, 240), outline=(20, 155, 115, 255), width=3)
        d_draw.polygon([(612, 115), (598, 145), (626, 145)], fill=(20, 155, 115, 255)) # Triangle
        d_draw.line([(612, 148), (612, 165)], fill=(20, 155, 115, 255), width=4)
        
        # Sorting arrows
        d_draw.arc([440, 60, 620, 120], 190, 350, fill=(15, 140, 110, 160), width=3)

    elif decor_type == "prompts":
        # Prompt bubble & creative magical icons emerging
        d_draw.rounded_rectangle([400, 75, 645, 195], radius=20, fill=(255, 255, 255, 235), outline=(130, 95, 220, 180), width=3)
        # Small speech triangle pointing to Palou
        d_draw.polygon([(400, 140), (370, 155), (400, 160)], fill=(255, 255, 255, 235))
        d_draw.line([(400, 140), (370, 155)], fill=(130, 95, 220, 180), width=3)
        d_draw.line([(370, 155), (400, 160)], fill=(130, 95, 220, 180), width=3)
        
        # Glowing prompt text bar mockup
        d_draw.rounded_rectangle([420, 95, 625, 125], radius=8, fill=(245, 240, 255, 255))
        d_draw.line([(435, 110), (510, 110)], fill=(120, 85, 210, 255), width=4)
        d_draw.line([(518, 104), (518, 116)], fill=(120, 85, 210, 255), width=3) # Cursor
        
        # Generated icons emerging (Star, Bird, Crystal)
        d_draw.ellipse([435, 140, 475, 180], fill=(255, 235, 200, 255), outline=(240, 160, 30, 255), width=2)
        d_draw.ellipse([495, 140, 535, 180], fill=(225, 245, 255, 255), outline=(50, 150, 230, 255), width=2)
        d_draw.ellipse([555, 140, 595, 180], fill=(230, 250, 235, 255), outline=(25, 160, 115, 255), width=2)

    elif decor_type == "cybersecurity":
        # Protective glowing shield & padlock
        # Shield shape
        shield_pts = [(530, 55), (630, 55), (645, 130), (580, 215), (515, 130)]
        d_draw.polygon(shield_pts, fill=(235, 250, 245, 240), outline=(15, 140, 110, 255))
        # Inner shield
        shield_pts_inner = [(540, 70), (620, 70), (632, 132), (580, 200), (528, 132)]
        d_draw.polygon(shield_pts_inner, fill=(15, 140, 110, 220))
        
        # Golden lock
        d_draw.rounded_rectangle([565, 125, 595, 165], radius=6, fill=(250, 190, 45, 255))
        d_draw.arc([570, 105, 590, 135], 180, 360, fill=(250, 190, 45, 255), width=5)
        d_draw.ellipse([577, 138, 583, 146], fill=(120, 70, 10, 255))
        d_draw.line([(580, 145), (580, 155)], fill=(120, 70, 10, 255), width=3)
        
        # Protective checkmarks & sparkles around
        d_draw.line([(440, 140), (455, 155), (480, 125)], fill=(15, 140, 110, 255), width=6)

    elif decor_type == "scratch":
        # Colorful Scratch 3.0 blocks (Events yellow, Motion blue, Looks purple)
        # Block 1 : When Flag Clicked (Yellow-orange)
        d_draw.rounded_rectangle([420, 65, 620, 110], radius=8, fill=(255, 171, 25, 255), outline=(215, 135, 10, 255), width=2)
        # Green flag icon
        d_draw.polygon([(440, 80), (460, 90), (440, 100)], fill=(15, 160, 90, 255))
        d_draw.line([(440, 78), (440, 102)], fill=(40, 40, 40, 255), width=3)
        # Mock text line
        d_draw.line([(475, 88), (590, 88)], fill=(255, 255, 255, 255), width=5)
        
        # Block 2 : Move 10 steps (Blue)
        d_draw.rounded_rectangle([435, 115, 635, 160], radius=8, fill=(76, 151, 255, 255), outline=(45, 115, 215, 255), width=2)
        d_draw.line([(455, 138), (540, 138)], fill=(255, 255, 255, 255), width=5)
        d_draw.rounded_rectangle([555, 126, 595, 150], radius=6, fill=(255, 255, 255, 255))
        d_draw.line([(570, 138), (580, 138)], fill=(76, 151, 255, 255), width=3)
        
        # Block 3 : Play sound (Purple)
        d_draw.rounded_rectangle([435, 165, 620, 210], radius=8, fill=(207, 99, 207, 255), outline=(165, 65, 165, 255), width=2)
        d_draw.line([(455, 188), (575, 188)], fill=(255, 255, 255, 255), width=5)

    # 3. Load and place Palou
    palou_path = os.path.join(r"c:\Users\pc\Documents\PERSO\SIRIBRA\keuria-v2\frontend\public\images\palou", palou_filename)
    palou = Image.open(palou_path).convert("RGBA")
    
    if palou_flip:
        palou = palou.transpose(Image.FLIP_LEFT_RIGHT)
        
    px, py, target_h = palou_pos
    ratio = target_h / palou.height
    target_w = int(palou.width * ratio)
    palou_resized = palou.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    # Soft drop shadow under Palou
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow)
    foot_x = px + target_w // 2
    foot_y = py + target_h - 10
    s_draw.ellipse([foot_x - target_w//3, foot_y - 8, foot_x + target_w//3, foot_y + 12], fill=(20, 50, 40, 45))
    shadow = shadow.filter(ImageFilter.GaussianBlur(5))
    
    # Composite all layers
    final = Image.alpha_composite(base, glow)
    final = Image.alpha_composite(final, shadow)
    final = Image.alpha_composite(final, decor)
    final.paste(palou_resized, (px, py), palou_resized)
    
    # Save image
    out_path = os.path.join(r"c:\Users\pc\Documents\PERSO\SIRIBRA\keuria-v2\frontend\public\images\modules", output_filename)
    final.convert("RGB").save(out_path, quality=95)
    print(f"Created: {output_filename}")

# Generate all 6 module banners
os.makedirs(r"c:\Users\pc\Documents\PERSO\SIRIBRA\keuria-v2\frontend\public\images\modules", exist_ok=True)

# 01 : Bienvenue dans l'IA (Palou officiel debout accueillant)
create_banner(
    bg_gradient=((234, 247, 240), (252, 250, 243)),
    palou_filename="palou-officiel-stand.png",
    palou_pos=(80, 20, 250),
    decor_type="welcome",
    output_filename="p1.png"
)

# 02 : L'IA autour de nous (Palou curieux avec point d'interrogation)
create_banner(
    bg_gradient=((232, 245, 252), (252, 249, 242)),
    palou_filename="Palou_Question.png",
    palou_pos=(75, 18, 252),
    decor_type="daily",
    output_filename="p2.png"
)

# 03 : Comment apprend une IA ? (Palou réflexion avec tri de formes)
create_banner(
    bg_gradient=((254, 249, 235), (238, 247, 242)),
    palou_filename="Palou_Reflexion.png",
    palou_pos=(75, 18, 252),
    decor_type="machine_learning",
    output_filename="p3.png"
)

# 04 : Le royaume des prompts (Palou studieux avec ordinateur et lunettes)
create_banner(
    bg_gradient=((243, 239, 252), (246, 250, 247)),
    palou_filename="Palou_Intelligent.png",
    palou_pos=(65, 30, 238),
    decor_type="prompts",
    output_filename="p4.png"
)

# 05 : Super-héros du numérique (Palou déterminé et protecteur)
create_banner(
    bg_gradient=((230, 246, 238), (250, 252, 251)),
    palou_filename="Palou_Determine.png",
    palou_pos=(75, 20, 248),
    decor_type="cybersecurity",
    output_filename="p5.png"
)

# 06 : Je deviens créateur (Palou célébrant avec blocs Scratch)
create_banner(
    bg_gradient=((255, 241, 230), (254, 250, 246)),
    palou_filename="palou-officiel-cheer.png",
    palou_pos=(60, 22, 248),
    decor_type="scratch",
    output_filename="p6.png"
)

print("All 6 official Palou banners generated successfully!")
