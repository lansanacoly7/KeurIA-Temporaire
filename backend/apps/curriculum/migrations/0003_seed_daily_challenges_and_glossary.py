from django.db import migrations

DAILY_CHALLENGES = [
    {
        "theme": "Éthique & Données",
        "question": "Si tu montres à un robot uniquement des photos de chats noirs, saura-t-il reconnaître un chat blanc ?",
        "options": [
            "Oui, car un robot devine tout par magie !",
            "Non, ses données sont incomplètes (c'est un biais)",
            "Il pensera que tous les chats sont des souris",
        ],
        "correct_index": 1,
        "explanation": "Exactement ! Une IA ne connaît que les exemples qu'on lui montre : des données incomplètes créent un biais !",
    },
    {
        "theme": "Cybersécurité",
        "question": "Quel mot de passe est le plus solide pour protéger tes points et tes badges sur kEur IA ?",
        "options": [
            "123456 ou le nom de mon animal",
            "Mon prénom et mon âge",
            "Une phrase secrète avec lettres, chiffres et symboles (ex: Baobab#2026!)",
        ],
        "correct_index": 2,
        "explanation": "Bravo ! Une phrase de passe secrète et variée est impossible à deviner pour les robots malveillants !",
    },
    {
        "theme": "Créativité & Prompting",
        "question": "Comment appelle-t-on la consigne précise que l'on donne à une IA pour qu'elle dessine ou écrive une histoire ?",
        "options": ["Un Algorithme", "Un Prompt", "Un Pixel"],
        "correct_index": 1,
        "explanation": "Superbe ! Le 'Prompt' est la baguette magique qui donne des instructions précises à l'IA générative !",
    },
    {
        "theme": "Esprit Critique",
        "question": "Une vidéo spectaculaire montre un lion vert qui vole au-dessus de Dakar. Quel est ton premier réflexe ?",
        "options": [
            "La partager immédiatement sur tous les groupes",
            "Vérifier avec un adulte et chercher des sources fiables (c'est sans doute un deepfake !)",
            "Croire la vidéo parce que les images sont très nettes",
        ],
        "correct_index": 1,
        "explanation": "Formidable détective ! L'IA peut fabriquer des vidéos très réalistes mais fausses. Toujours vérifier la source !",
    },
]

GLOSSARY = [
    ("Algorithme", "C'est comme une recette de cuisine très détaillée que l'on donne à la machine pour qu'elle sache exactement quoi faire, étape par étape.",
     "Pour faire un gâteau, tu suis une recette. Pour faire un calcul, l'ordinateur suit un algorithme !",
     "📜", "#ff9a9e", "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)"),
    ("Application", "C'est un petit outil magique caché dans une tablette ou un téléphone, qui sert à jouer, dessiner ou apprendre des choses.",
     "Le jeu où tu attrapes des bonbons sur l'écran, c'est une application.",
     "📱", "#a18cd1", "linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)"),
    ("Biais", "C'est quand le robot se trompe ou est injuste, parce qu'on lui a montré de mauvais exemples quand il apprenait.",
     "Si tu montres au robot que des pommes rouges, il croira que les pommes vertes n'existent pas du tout !",
     "⚖️", "#f6d365", "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)"),
    ("Chatbot", "C'est un robot bavard qui vit dans l'ordinateur. Tu peux lui parler ou lui écrire, et il te répond.",
     "Palou est un chatbot très gentil qui t'aide à comprendre plein de nouvelles choses.",
     "🤖", "#84fab0", "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)"),
    ("Deepfake", "C'est un mensonge fabriqué par l'ordinateur. Ça ressemble à une vraie photo ou une vraie vidéo, mais c'est faux.",
     "C'est comme un masque très bien fait : on peut faire croire que tu as dit une phrase rigolote alors que ce n'est pas toi.",
     "🎭", "#cfd9df", "linear-gradient(135deg, #eceff1 0%, #cfd8dc 100%)"),
    ("Donnée", "C'est un petit morceau d'information. Ça peut être un mot, un chiffre, ou une photo qu'on donne à la machine.",
     "La photo de ton chat, ton âge ou ton prénom, ce sont des données que la machine peut lire.",
     "📊", "#a1c4fd", "linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)"),
    ("IA (Intelligence Artificielle)", "C'est quand on apprend à une machine à faire des choses intelligentes, comme reconnaître un dessin ou parler avec toi.",
     "L'IA, c'est ce qui permet à l'ordinateur de savoir si le bonhomme que tu as dessiné est joyeux ou triste.",
     "🧠", "#ffecd2", "linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)"),
    ("Modèle", "C'est le cerveau de l'ordinateur qui a grandi après avoir regardé beaucoup d'images ou lu beaucoup de mots.",
     "Après avoir regardé mille photos de chiens, le modèle sait enfin reconnaître un chien tout seul.",
     "🧩", "#cfd9df", "linear-gradient(135deg, #f1f8e9 0%, #dcedc8 100%)"),
    ("Programme", "C'est la liste des ordres qu'on donne à l'ordinateur pour qu'il fonctionne.",
     "C'est comme les règles d'un jeu de société : si on ne donne pas les règles à la machine, elle ne sait pas quoi faire.",
     "💻", "#a8edea", "linear-gradient(135deg, #ede7f6 0%, #d1c4e9 100%)"),
    ("Technologie", "Ce sont tous les objets et les outils malins inventés par les humains pour se faciliter la vie, comme les téléphones ou les tablettes.",
     "Ton cahier en papier est un outil normal, mais ta tablette qui s'allume et fait du son, c'est de la technologie !",
     "⚙️", "#fdcbf1", "linear-gradient(135deg, #fffde7 0%, #fff9c4 100%)"),
]


def seed(apps, schema_editor):
    DailyChallenge = apps.get_model('curriculum', 'DailyChallenge')
    GlossaryTerm = apps.get_model('curriculum', 'GlossaryTerm')
    for order, challenge in enumerate(DAILY_CHALLENGES, start=1):
        DailyChallenge.objects.get_or_create(question=challenge["question"], defaults={**challenge, "order": order})
    for word, definition, example, icon, color, background in GLOSSARY:
        GlossaryTerm.objects.get_or_create(word=word, defaults={
            "definition": definition, "example": example, "icon": icon, "color": color, "background": background,
        })


def unseed(apps, schema_editor):
    apps.get_model('curriculum', 'DailyChallenge').objects.filter(
        question__in=[c["question"] for c in DAILY_CHALLENGES]).delete()
    apps.get_model('curriculum', 'GlossaryTerm').objects.filter(word__in=[g[0] for g in GLOSSARY]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('curriculum', '0002_dailychallenge_glossaryterm'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
