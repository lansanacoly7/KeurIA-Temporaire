"""
Script de découpe et calibration des éléments graphiques 10-12
kEur IA - Les vacances à Dakar
Génère les PNG RGBA transparents, manifest.json, echelle-decors.json et planche-controle.png.
"""

import os
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import label, binary_erosion, gaussian_filter

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public", "images", "parcours1012"))
REF_DIR = os.path.join(BASE_DIR, "references")
DECORS_DIR = os.path.join(BASE_DIR, "decors")
OUTPUT_DIR = os.path.join(BASE_DIR, "decoupes")

os.makedirs(OUTPUT_DIR, exist_ok=True)

def cutout_element(img_crop, padding=12):
    """
    Détoure une image sur fond blanc en préservant les blancs internes
    (yeux, dents, losange, détails de toit, motifs).
    Applique:
    1. Padding
    2. Remplissage par les 4 bords (floodfill)
    3. Seuil fond >= 185 et saturation < 35 (ombre grise incluse)
    4. Érosion 1 px et flou gaussien 0.7 px
    5. Décontamination des bords (élimination du halo blanc)
    """
    # 1. Padding avec du blanc pur
    w, h = img_crop.size
    padded = Image.new("RGBA", (w + 2 * padding, h + 2 * padding), (255, 255, 255, 255))
    padded.paste(img_crop.convert("RGBA"), (padding, padding))
    
    arr = np.array(padded)
    rgb = arr[:, :, :3].astype(float)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    sat = max_c - min_c
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    
    # Fond candidat : clair et désaturé (y compris ombres douces)
    is_bg_candidate = (lum >= 185) & (sat < 35)
    
    # Remplissage par propagation depuis les bords uniquement
    pw, ph = padded.size
    lbl, n_components = label(is_bg_candidate)
    
    border_mask = np.zeros((ph, pw), dtype=bool)
    border_mask[0, :] = True
    border_mask[-1, :] = True
    border_mask[:, 0] = True
    border_mask[:, -1] = True
    
    bg_labels = np.unique(lbl[border_mask & is_bg_candidate])
    true_bg = np.isin(lbl, bg_labels)
    
    # Masque du premier plan
    fg_mask = ~true_bg
    
    # Érosion 1 px du fond (dilatation 1 px du premier plan pour capturer les contours #381204)
    fg_eroded_bg = ~binary_erosion(true_bg, structure=np.ones((3, 3)), iterations=1)
    
    # Flou 0.7 px sur le canal alpha pour l'anticrénelage
    alpha_smooth = gaussian_filter(fg_eroded_bg.astype(float), sigma=0.7)
    alpha_uint8 = np.clip(alpha_smooth * 255, 0, 255).astype(np.uint8)
    
    # Décontamination des halos blancs sur les pixels semi-transparents
    res = arr.copy()
    res[:, :, 3] = alpha_uint8
    
    # Sur les bords semi-transparents (0 < alpha < 255), corriger la luminance blanche
    semi = (alpha_uint8 > 0) & (alpha_uint8 < 250)
    for c in range(3):
        # Ajustement des franges vers la couleur du trait
        res_c = res[:, :, c].astype(float)
        res_c[semi] = np.clip(res_c[semi] * (alpha_uint8[semi] / 255.0) + 0x38 * (1.0 - alpha_uint8[semi] / 255.0), 0, 255)
        res[:, :, c] = res_c.astype(np.uint8)
        
    out_img = Image.fromarray(res)
    
    # Recadrage automatique serré (bounding box alpha)
    bbox = out_img.getbbox()
    if bbox:
        out_img = out_img.crop(bbox)
        
    return out_img

# Définition des éléments à extraire depuis chaque planche
ELEMENTS_SPEC = {
    "01_palou-1012_reference.png": [
        ("palou-face.png", (118, 7, 479, 545), "Palou jeune lion debout de face", 1.0, "pieds"),
        ("palou-profil.png", (552, 11, 870, 549), "Palou debout de profil", 1.0, "pieds"),
        ("palou-tete-souriant.png", (5, 571, 342, 958), "Tête Palou souriant", 0.45, "centre"),
        ("palou-tete-surpris.png", (346, 571, 675, 958), "Tête Palou surpris", 0.45, "centre"),
        ("palou-tete-pensif.png", (679, 570, 1019, 964), "Tête Palou pensif", 0.45, "centre"),
    ],
    "02_fatou-11_reference.png": [
        ("fatou-face.png", (67, 11, 396, 1001), "Fatou 11 ans debout de face", 1.38, "pieds"),
        ("fatou-profil.png", (401, 17, 675, 998), "Fatou debout de profil", 1.38, "pieds"),
        ("fatou-tete-souriant.png", (722, 13, 1006, 296), "Tête Fatou souriante", 0.38, "centre"),
        ("fatou-tete-surpris.png", (730, 319, 1010, 602), "Tête Fatou surprise", 0.38, "centre"),
        ("fatou-tete-pensif.png", (729, 617, 1015, 1007), "Tête Fatou pensive", 0.38, "centre"),
    ],
    "02_moussa-11_reference.png": [
        ("moussa-face.png", (32, 16, 415, 984), "Moussa 11 ans debout de face", 1.40, "pieds"),
        ("moussa-profil.png", (416, 22, 675, 989), "Moussa debout de profil", 1.40, "pieds"),
        ("moussa-tete-souriant.png", (726, 21, 996, 276), "Tête Moussa souriant", 0.38, "centre"),
        ("moussa-tete-surpris.png", (730, 302, 996, 559), "Tête Moussa surpris", 0.38, "centre"),
        ("moussa-tete-pensif.png", (730, 597, 1002, 993), "Tête Moussa pensif", 0.38, "centre"),
    ],
    "02_papa-ibou_reference.png": [
        ("papa-ibou-face.png", (133, 36, 505, 991), "Papa Ibou chauffeur en pied de face", 1.75, "pieds"),
        ("papa-ibou-tete-souriant.png", (622, 53, 930, 342), "Tête Papa Ibou souriant", 0.42, "centre"),
        ("papa-ibou-tete-surpris.png", (619, 357, 933, 641), "Tête Papa Ibou surpris", 0.42, "centre"),
        ("papa-ibou-buste-signe.png", (572, 661, 933, 992), "Papa Ibou buste faisant signe de la main", 0.85, "centre"),
    ],
    "03_car-rapide_reference.png": [
        ("car-rapide-profil.png", (19, 4, 997, 492), "Car rapide vue de profil complet", 2.70, "roues"),
        ("car-rapide-face.png", (1075, 12, 1497, 490), "Car rapide vue de face", 2.70, "roues"),
        ("car-rapide-arriere-ouvert.png", (53, 496, 521, 998), "Car rapide vue arrière avec porte ouverte", 2.70, "roues"),
        ("car-rapide-trois-quarts.png", (640, 500, 1500, 1012), "Car rapide vue de trois-quarts", 2.70, "roues"),
    ]
}

def process_extractions():
    manifest = {
        "version": "1.0",
        "description": "Banque d'éléments découpés et calibrés pour les animations vidéo kEur IA (parcours 10-12)",
        "conventions": {
            "echelle_reelle_reference": "Hauteur réelle en mètres pour perspective cohérente",
            "point_ancrage": "Pieds ou bas des roues [x, y], ou centre pour les têtes"
        },
        "elements": {}
    }
    
    extracted_images = {}
    
    for ref_file, items in ELEMENTS_SPEC.items():
        ref_path = os.path.join(REF_DIR, ref_file)
        if not os.path.exists(ref_path):
            print(f"ATTENTION: {ref_file} introuvable dans {REF_DIR}")
            continue
            
        with Image.open(ref_path) as full_img:
            for filename, box, desc, hauteur_m, ancrage_type in items:
                crop = full_img.crop(box)
                cutout = cutout_element(crop)
                out_path = os.path.join(OUTPUT_DIR, filename)
                cutout.save(out_path, "PNG", optimize=True)
                extracted_images[filename] = cutout
                
                cw, ch = cutout.size
                if ancrage_type in ["pieds", "roues"]:
                    anchor = [cw // 2, ch]
                else:
                    anchor = [cw // 2, ch // 2]
                    
                manifest["elements"][filename] = {
                    "fichier": filename,
                    "description": desc,
                    "largeur_px": cw,
                    "hauteur_px": ch,
                    "point_ancrage": anchor,
                    "ancrage_type": ancrage_type,
                    "hauteur_reelle_m": hauteur_m,
                    "source_planche": ref_file
                }
                print(f"Découpé: {filename} ({cw}x{ch})")
                
    # Découpe spécifique : la porte ouverte seule du car rapide arrière
    if "car-rapide-arriere-ouvert.png" in extracted_images:
        arriere_img = extracted_images["car-rapide-arriere-ouvert.png"]
        # La porte ouverte est sur la gauche du car arrière
        # Largeur de la porte approx : 0 à 180px
        door_crop = arriere_img.crop((0, int(arriere_img.height * 0.22), int(arriere_img.width * 0.38), int(arriere_img.height * 0.90)))
        door_cutout = cutout_element(door_crop)
        door_filename = "car-rapide-porte-seule.png"
        door_path = os.path.join(OUTPUT_DIR, door_filename)
        door_cutout.save(door_path, "PNG", optimize=True)
        extracted_images[door_filename] = door_cutout
        
        manifest["elements"][door_filename] = {
            "fichier": door_filename,
            "description": "Porte battante arrière du car rapide isolée pour animation d'ouverture/fermeture",
            "largeur_px": door_cutout.width,
            "hauteur_px": door_cutout.height,
            "point_ancrage": [door_cutout.width, door_cutout.height // 2],
            "ancrage_type": "charniere_droite",
            "hauteur_reelle_m": 1.70,
            "source_planche": "03_car-rapide_reference.png"
        }
        print(f"Découpé: {door_filename} ({door_cutout.width}x{door_cutout.height})")
        
    # Écriture du manifest.json
    manifest_path = os.path.join(OUTPUT_DIR, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(f"Manifest généré: {manifest_path}")
    
    return extracted_images, manifest

def generate_echelle_decors():
    """
    Génère la table de calibration de perspective pour chacun des 28 décors de Dakar.
    Chaque décor est analysé : ligne de sol (y_sol), ligne d'horizon, zone de pose du car
    et des enfants (premier plan dégagé), direction de la lumière et taille relative du car.
    """
    decors_list = sorted([f for f in os.listdir(DECORS_DIR) if f.endswith(".png")])
    
    # Données calibrées selon les spécifications narratives et perspectives réelles
    # Format des décors : 1600 x 900 px
    # Un car rapide à échelle réaliste au premier plan fait environ 420 px de haut
    # Au second plan (distance moyenne), il fait environ 300-340 px.
    echelle = {
        "format_canvas": {"largeur": 1600, "hauteur": 900},
        "description": "Table de placement, perspective et échelle des 28 décors pour animation vidéo",
        "regles_composition": {
            "ratio_hauteur_enfants_vs_car": 0.52,  # 1.4m / 2.7m ≈ 0.52
            "ratio_hauteur_palou_vs_car": 0.37,    # 1.0m / 2.7m ≈ 0.37
            "ratio_hauteur_papa_ibou_vs_car": 0.65 # 1.75m / 2.7m ≈ 0.65
        },
        "decors": {}
    }
    
    # Table des paramètres individuels pour chaque décor
    PARAMS = {
        "village.png": {"y_sol": 830, "y_horizon": 460, "pose_car": [150, 850], "pose_enfants": [700, 1300], "lum": "gauche", "h_car": 410, "desc": "Cour sablonneuse ouverte, soleil matinal venant de gauche"},
        "route.png": {"y_sol": 840, "y_horizon": 510, "pose_car": [100, 1500], "pose_enfants": [600, 1100], "lum": "droite", "h_car": 380, "desc": "Route goudronnée plate au milieu des baobabs"},
        "arrivee-dakar.png": {"y_sol": 850, "y_horizon": 530, "pose_car": [100, 1500], "pose_enfants": [700, 1200], "lum": "droite", "h_car": 390, "desc": "Avenue goudronnée propre, colline des Mamelles au loin"},
        "monument-exterieur.png": {"y_sol": 870, "y_horizon": 600, "pose_car": [150, 750], "pose_enfants": [700, 1350], "lum": "gauche", "h_car": 430, "desc": "Esplanade pavée en contre-plongée devant le grand escalier"},
        "monument-hall.png": {"y_sol": 870, "y_horizon": 560, "pose_car": None, "pose_enfants": [300, 1300], "lum": "zenith", "h_car": None, "desc": "Intérieur hall, dalles en marbre, personnages seuls"},
        "monument-sommet.png": {"y_sol": 880, "y_horizon": 580, "pose_car": None, "pose_enfants": [300, 1300], "lum": "face", "h_car": None, "desc": "Intérieur sommet panoramique, personnages seuls"},
        "port-exterieur.png": {"y_sol": 850, "y_horizon": 500, "pose_car": [200, 800], "pose_enfants": [750, 1350], "lum": "droite", "h_car": 410, "desc": "Quai en béton du port, vue sur conteneurs et cargo"},
        "port-interieur.png": {"y_sol": 870, "y_horizon": 550, "pose_car": None, "pose_enfants": [300, 1300], "lum": "face", "h_car": None, "desc": "Salle de contrôle des conteneurs, personnages seuls"},
        "gare-ter-exterieur.png": {"y_sol": 860, "y_horizon": 520, "pose_car": [150, 750], "pose_enfants": [700, 1350], "lum": "gauche", "h_car": 410, "desc": "Parvis pavé de la gare TER, train à quai à droite"},
        "gare-ter-interieur.png": {"y_sol": 880, "y_horizon": 550, "pose_car": None, "pose_enfants": [250, 1350], "lum": "zenith", "h_car": None, "desc": "Quai intérieur moderne, personnages seuls"},
        "soumbedioune-exterieur.png": {"y_sol": 850, "y_horizon": 490, "pose_car": [150, 700], "pose_enfants": [650, 1300], "lum": "droite", "h_car": 400, "desc": "Plage de sable dorée et route côtière, pirogues tirées"},
        "soumbedioune-interieur.png": {"y_sol": 870, "y_horizon": 540, "pose_car": None, "pose_enfants": [300, 1300], "lum": "zenith", "h_car": None, "desc": "Marché aux poissons et étals, sol sableux"},
        "parc-hann-exterieur.png": {"y_sol": 850, "y_horizon": 520, "pose_car": [150, 750], "pose_enfants": [700, 1350], "lum": "gauche", "h_car": 420, "desc": "Chemin de terre devant le portail bleu du parc"},
        "parc-hann-interieur.png": {"y_sol": 870, "y_horizon": 550, "pose_car": None, "pose_enfants": [300, 1300], "lum": "zenith", "h_car": None, "desc": "Clairière ombragée sous les grands arbres avec caméra"},
        "labo-langues-exterieur.png": {"y_sol": 860, "y_horizon": 510, "pose_car": [150, 750], "pose_enfants": [700, 1350], "lum": "droite", "h_car": 410, "desc": "Allée universitaire sous les arbres de l'UCAD"},
        "labo-langues-interieur.png": {"y_sol": 880, "y_horizon": 560, "pose_car": None, "pose_enfants": [300, 1300], "lum": "zenith", "h_car": None, "desc": "Salle informatique phonétique, sol carrelé net"},
        "goree-exterieur.png": {"y_sol": 870, "y_horizon": 540, "pose_car": None, "pose_enfants": [400, 1200], "lum": "zenith", "h_car": None, "desc": "Cour de la Maison des Esclaves, escalier double volée"},
        "goree-interieur.png": {"y_sol": 880, "y_horizon": 570, "pose_car": None, "pose_enfants": [250, 1250], "lum": "droite", "h_car": None, "desc": "Atelier de peinture sous verre de Kiné, sol sablonneux"},
        "musee-exterieur.png": {"y_sol": 860, "y_horizon": 520, "pose_car": [150, 750], "pose_enfants": [700, 1350], "lum": "gauche", "h_car": 410, "desc": "Grande esplanade dallée devant la façade ronde"},
        "musee-interieur.png": {"y_sol": 880, "y_horizon": 560, "pose_car": None, "pose_enfants": [300, 1300], "lum": "zenith", "h_car": None, "desc": "Grande salle d'exposition aux masques, sol ciré sombre"},
        "dakar-arena-exterieur.png": {"y_sol": 860, "y_horizon": 520, "pose_car": [150, 750], "pose_enfants": [700, 1350], "lum": "droite", "h_car": 410, "desc": "Vaste esplanade en pavés modernes de l'arène"},
        "dakar-arena-interieur.png": {"y_sol": 880, "y_horizon": 550, "pose_car": None, "pose_enfants": [300, 1300], "lum": "zenith", "h_car": None, "desc": "Bord du terrain de basket, parquet ciré"},
        "phare-exterieur.png": {"y_sol": 850, "y_horizon": 480, "pose_car": [150, 700], "pose_enfants": [650, 1300], "lum": "gauche", "h_car": 390, "desc": "Route en lacet au pied de la colline du phare"},
        "phare-interieur.png": {"y_sol": 880, "y_horizon": 560, "pose_car": None, "pose_enfants": [300, 1300], "lum": "face", "h_car": None, "desc": "Salle de la lanterne Fresnel, vue mer à 360°"},
        "palais-exterieur.png": {"y_sol": 860, "y_horizon": 520, "pose_car": [150, 750], "pose_enfants": [700, 1350], "lum": "face", "h_car": 410, "desc": "Avenue Léopold-Sédar-Senghor goudronnée devant la grille"},
        "palais-interieur.png": {"y_sol": 870, "y_horizon": 550, "pose_car": None, "pose_enfants": [250, 1100], "lum": "gauche", "h_car": None, "desc": "Allée piétonne ombragée avec banc public"},
        "place-independance-exterieur.png": {"y_sol": 860, "y_horizon": 520, "pose_car": [150, 750], "pose_enfants": [700, 1350], "lum": "face", "h_car": 410, "desc": "Esplanade dallée devant la fontaine tricolore"},
        "place-independance-interieur.png": {"y_sol": 860, "y_horizon": 520, "pose_car": [150, 650], "pose_enfants": [650, 1400], "lum": "face", "h_car": 400, "desc": "Esplanade festive avec estrade et fanions colorés"}
    }
    
    for filename in decors_list:
        p = PARAMS.get(filename, {
            "y_sol": 860, "y_horizon": 520, "pose_car": [150, 750], "pose_enfants": [700, 1350],
            "lum": "zenith", "h_car": 410, "desc": "Décor générique"
        })
        echelle["decors"][filename] = {
            "fichier": filename,
            "description": p["desc"],
            "y_sol": p["y_sol"],
            "y_horizon": p["y_horizon"],
            "zone_pose_car_x": p["pose_car"],
            "zone_pose_enfants_x": p["pose_enfants"],
            "sens_lumiere": p["lum"],
            "hauteur_car_recommandee_px": p["h_car"],
            "hauteur_moussa_px": int(p["h_car"] * 0.52) if p["h_car"] else 220,
            "hauteur_fatou_px": int(p["h_car"] * 0.51) if p["h_car"] else 215,
            "hauteur_palou_px": int(p["h_car"] * 0.37) if p["h_car"] else 155,
            "hauteur_papa_ibou_px": int(p["h_car"] * 0.65) if p["h_car"] else 275
        }
        
    echelle_path = os.path.join(OUTPUT_DIR, "echelle-decors.json")
    with open(echelle_path, "w", encoding="utf-8") as f:
        json.dump(echelle, f, indent=2, ensure_ascii=False)
    print(f"Table échelle décors générée: {echelle_path}")
    return echelle

def generate_planche_controle(extracted_images, echelle):
    """
    Génère la planche de contrôle visuel 'planche-controle.png' :
    1. Test de détourage sans halo blanc sur 4 fonds colorés contrastés (sombre, vert, bleu, magenta).
    2. Test de composition et d'échelle réelle sur un décor de référence (village.png).
    """
    canvas_w = 1920
    canvas_h = 1080
    board = Image.new("RGBA", (canvas_w, canvas_h), (30, 30, 46, 255)) # Fond sombre Catppuccin Mocha
    
    # 1. Bande supérieure : Test anti-halo sur carrés de couleur
    colors = [
        ("Sombre #11111B", (17, 17, 27, 255)),
        ("Bleu nuit #1E3A8A", (30, 58, 138, 255)),
        ("Vert forêt #065F46", (6, 95, 70, 255)),
        ("Teal Gorée #00A6A6", (0, 166, 166, 255)),
        ("Terre cuite #9A3412", (154, 52, 18, 255))
    ]
    
    block_w = canvas_w // len(colors)
    top_h = 320
    
    draw = ImageDraw.Draw(board)
    for i, (name, col) in enumerate(colors):
        x0 = i * block_w
        x1 = x0 + block_w
        draw.rectangle([x0, 0, x1, top_h], fill=col)
        
    # Coller des éléments de test sur chaque couleur
    test_sprites = [
        ("car-rapide-profil.png", 0),
        ("moussa-face.png", 1),
        ("fatou-face.png", 2),
        ("palou-face.png", 3),
        ("papa-ibou-face.png", 4)
    ]
    
    for filename, col_idx in test_sprites:
        if filename in extracted_images:
            sp = extracted_images[filename]
            # Redimensionner pour tenir dans le bloc
            ratio = min((block_w - 40) / sp.width, (top_h - 40) / sp.height)
            tw = int(sp.width * ratio)
            th = int(sp.height * ratio)
            sp_res = sp.resize((tw, th), Image.Resampling.LANCZOS)
            
            x_pos = col_idx * block_w + (block_w - tw) // 2
            y_pos = (top_h - th) // 2
            board.paste(sp_res, (x_pos, y_pos), sp_res)
            
    # 2. Moitié inférieure : Test d'intégration d'échelle sur village.png
    village_path = os.path.join(DECORS_DIR, "village.png")
    if os.path.exists(village_path):
        decor = Image.open(village_path).convert("RGBA")
        # Redimensionner décor pour s'insérer dans la moitié inférieure (760 px de haut)
        dec_h = canvas_h - top_h
        dec_w = int(decor.width * (dec_h / decor.height))
        decor_scaled = decor.resize((dec_w, dec_h), Image.Resampling.LANCZOS)
        
        # Coller le décor centré en bas
        dec_x = (canvas_w - dec_w) // 2
        board.paste(decor_scaled, (dec_x, top_h))
        
        # Paramètres d'échelle pour village.png
        v_param = echelle["decors"]["village.png"]
        scale_f = dec_h / 900.0
        y_sol_board = top_h + int(v_param["y_sol"] * scale_f)
        
        # Placement du car rapide à gauche
        if "car-rapide-profil.png" in extracted_images:
            car = extracted_images["car-rapide-profil.png"]
            car_h_px = int(v_param["hauteur_car_recommandee_px"] * scale_f)
            car_w_px = int(car.width * (car_h_px / car.height))
            car_res = car.resize((car_w_px, car_h_px), Image.Resampling.LANCZOS)
            board.paste(car_res, (dec_x + int(120 * scale_f), y_sol_board - car_h_px), car_res)
            
        # Placement de Moussa, Fatou, Palou à droite du car
        chars = [
            ("moussa-face.png", v_param["hauteur_moussa_px"], 820),
            ("fatou-face.png", v_param["hauteur_fatou_px"], 950),
            ("palou-face.png", v_param["hauteur_palou_px"], 1080),
            ("papa-ibou-face.png", v_param["hauteur_papa_ibou_px"], 680)
        ]
        
        for ch_file, h_target, x_target in chars:
            if ch_file in extracted_images:
                ch = extracted_images[ch_file]
                ch_h_px = int(h_target * scale_f)
                ch_w_px = int(ch.width * (ch_h_px / ch.height))
                ch_res = ch.resize((ch_w_px, ch_h_px), Image.Resampling.LANCZOS)
                board.paste(ch_res, (dec_x + int(x_target * scale_f), y_sol_board - ch_h_px), ch_res)
                
    controle_path = os.path.join(OUTPUT_DIR, "planche-controle.png")
    board.save(controle_path, "PNG", optimize=True)
    print(f"Planche de contrôle générée: {controle_path}")
    return controle_path

if __name__ == "__main__":
    print("Démarrage de la découpe et de la calibration...")
    extracted, manifest = process_extractions()
    echelle = generate_echelle_decors()
    generate_planche_controle(extracted, echelle)
    print("Traitement terminé avec succès !")

