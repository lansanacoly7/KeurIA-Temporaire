"""Déblocage du dictionnaire : chaque mot apparaît quand l'enfant a terminé l'une des leçons listées.

Les 36 mots du parcours 7-9 viennent des écrans « Je découvre » des leçons (frontend/content/parcours79/mXX.json) : même texte
que dans la leçon, pour que le dictionnaire répète ce que l'enfant a appris. Les 12 mots du catalogue général sont reliés à une
leçon de chaque parcours.
"""

# Mots propres au parcours 7-9 (créés à la migration).
LESSON_TERMS_79 = [
    {
        "word": "Exemple",
        "definition": "Une image ou une information qu’on montre pour apprendre.",
        "example": "Pour apprendre, une IA regarde beaucoup d’exemples. Plus il y en a, mieux elle apprend.",
        "icon": "🤖",
        "color": "#a1c4fd",
        "background": "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
        "lessons": [
            "p1-2"
        ]
    },
    {
        "word": "Indice",
        "definition": "Ce qui aide à trouver la réponse.",
        "example": "Une IA reconnaît, devine ou propose quelque chose. Un objet qui s’allume, ça ne suffit pas.",
        "icon": "🤖",
        "color": "#a18cd1",
        "background": "linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)",
        "lessons": [
            "p1-3"
        ]
    },
    {
        "word": "Vie privée",
        "definition": "Ce qui te concerne, toi et ta famille, et qu’on ne montre pas à tout le monde.",
        "example": "Pendant une enquête, on note à quoi sert un outil. On ne prend jamais les secrets des gens.",
        "icon": "🛡️",
        "color": "#f6d365",
        "background": "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)",
        "lessons": [
            "p1-4"
        ]
    },
    {
        "word": "Assistant vocal",
        "definition": "Une IA qui comprend ta voix et te répond.",
        "example": "Un assistant vocal est une IA. Il comprend ta voix et te répond.",
        "icon": "👀",
        "color": "#84fab0",
        "background": "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
        "lessons": [
            "p2-1"
        ]
    },
    {
        "word": "Suggestion",
        "definition": "Un choix que l’IA te propose selon ce que tu aimes.",
        "example": "Une suggestion est un choix proposé par l’IA. Elle devine ce que tu pourrais aimer.",
        "icon": "👀",
        "color": "#ff9a9e",
        "background": "linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)",
        "lessons": [
            "p2-2"
        ]
    },
    {
        "word": "Prédire",
        "definition": "Deviner à l’avance ce qui va arriver.",
        "example": "L’appli prédit l’heure d’arrivée. Elle compare avec beaucoup de trajets déjà faits.",
        "icon": "👀",
        "color": "#a8edea",
        "background": "linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)",
        "lessons": [
            "p2-3"
        ]
    },
    {
        "word": "Outil",
        "definition": "Un objet ou une appli qui aide à faire un travail.",
        "example": "Une IA est un outil : elle aide à faire un travail. Cherche ce qu’elle reconnaît, devine ou propose.",
        "icon": "👀",
        "color": "#a78bfa",
        "background": "linear-gradient(135deg, #ede7f6 0%, #d1c4e9 100%)",
        "lessons": [
            "p2-4"
        ]
    },
    {
        "word": "Catégorie",
        "definition": "Un groupe d’objets qui se ressemblent.",
        "example": "Une catégorie est un groupe d’objets qui se ressemblent. Trier, c’est ranger par catégorie.",
        "icon": "🧺",
        "color": "#fdcbf1",
        "background": "linear-gradient(135deg, #fffde7 0%, #fff9c4 100%)",
        "lessons": [
            "p3-2"
        ]
    },
    {
        "word": "Intrus",
        "definition": "Ce qui ne ressemble pas aux autres d’un groupe.",
        "example": "L’intrus est ce qui ne ressemble pas aux autres. Pour le trouver, cherche ce qui les réunit.",
        "icon": "🧺",
        "color": "#60a5fa",
        "background": "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
        "lessons": [
            "p3-3"
        ]
    },
    {
        "word": "Critère",
        "definition": "Ce qu’on regarde pour classer : la couleur, la taille, le sujet.",
        "example": "Un critère est ce qu’on regarde pour classer. Changer de critère change le classement.",
        "icon": "🧺",
        "color": "#cfd9df",
        "background": "linear-gradient(135deg, #f1f8e9 0%, #dcedc8 100%)",
        "lessons": [
            "p3-4"
        ]
    },
    {
        "word": "Entraînement",
        "definition": "Montrer beaucoup d’exemples à une IA pour qu’elle apprenne.",
        "example": "Pour apprendre, Palou a besoin d’un entraînement. On lui montre beaucoup d’exemples.",
        "icon": "🐾",
        "color": "#a1c4fd",
        "background": "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
        "lessons": [
            "p4-1"
        ]
    },
    {
        "word": "Étiquette",
        "definition": "Le nom qu’on associe à un exemple.",
        "example": "Chaque photo reçoit une étiquette : « chat » ou « chien ». Palou apprend avec elles.",
        "icon": "🐾",
        "color": "#a18cd1",
        "background": "linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)",
        "lessons": [
            "p4-2"
        ]
    },
    {
        "word": "Flou",
        "definition": "Une image pas assez nette : on ne voit pas bien les détails.",
        "example": "Une photo floue cache les détails. Palou peut alors se tromper.",
        "icon": "🐾",
        "color": "#f6d365",
        "background": "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)",
        "lessons": [
            "p4-3"
        ]
    },
    {
        "word": "Caractéristique",
        "definition": "Une chose qu’on remarque : la couleur, la forme, la taille.",
        "example": "Une caractéristique est ce qu’on remarque sur un objet. Une IA les compare.",
        "icon": "🔍",
        "color": "#84fab0",
        "background": "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
        "lessons": [
            "p5-2"
        ]
    },
    {
        "word": "Contre-jour",
        "definition": "Quand la lumière vient de derrière, l’objet paraît tout noir.",
        "example": "Face au soleil, tout devient sombre : c’est le contre-jour. On ne voit plus les détails.",
        "icon": "🔍",
        "color": "#ff9a9e",
        "background": "linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)",
        "lessons": [
            "p5-3"
        ]
    },
    {
        "word": "Tester",
        "definition": "Vérifier si l’IA reconnaît bien, avec des photos nouvelles.",
        "example": "Tester, c’est vérifier avec des photos nouvelles. Plusieurs photos donnent une réponse plus sûre.",
        "icon": "🔍",
        "color": "#a8edea",
        "background": "linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)",
        "lessons": [
            "p5-4"
        ]
    },
    {
        "word": "Reconnaissance vocale",
        "definition": "Quand une machine transforme une voix en mots écrits.",
        "example": "La reconnaissance vocale transforme une voix en mots écrits. Palou en a besoin pour comprendre.",
        "icon": "🎤",
        "color": "#a78bfa",
        "background": "linear-gradient(135deg, #ede7f6 0%, #d1c4e9 100%)",
        "lessons": [
            "p6-1"
        ]
    },
    {
        "word": "Mot-clé",
        "definition": "Un mot important que l’IA cherche pour comprendre une phrase.",
        "example": "Un mot-clé est un mot important. L’IA le cherche dans ta phrase pour répondre.",
        "icon": "🎤",
        "color": "#fdcbf1",
        "background": "linear-gradient(135deg, #fffde7 0%, #fff9c4 100%)",
        "lessons": [
            "p6-2"
        ]
    },
    {
        "word": "Question claire",
        "definition": "Une question avec un sujet précis, sans mots vagues.",
        "example": "Une question claire dit de quoi on parle. Elle évite les mots vagues comme « truc ».",
        "icon": "🎤",
        "color": "#60a5fa",
        "background": "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
        "lessons": [
            "p6-3"
        ]
    },
    {
        "word": "Dialogue",
        "definition": "Une conversation où chacun parle à son tour.",
        "example": "Un dialogue, c’est parler chacun son tour. Si on ne comprend pas, on peut demander de répéter.",
        "icon": "🎤",
        "color": "#cfd9df",
        "background": "linear-gradient(135deg, #f1f8e9 0%, #dcedc8 100%)",
        "lessons": [
            "p6-4"
        ]
    },
    {
        "word": "IA générative",
        "definition": "Une IA qui fabrique du nouveau : un texte, une image ou un son.",
        "example": "Une IA générative fabrique du nouveau : texte, image ou son.",
        "icon": "🎨",
        "color": "#a1c4fd",
        "background": "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
        "lessons": [
            "p7-1"
        ]
    },
    {
        "word": "Consigne",
        "definition": "Les mots qu’on donne à l’IA pour lui dire quoi créer.",
        "example": "La consigne, ce sont les mots qu’on donne à l’IA. Plus elle est précise, mieux c’est.",
        "icon": "🎨",
        "color": "#a18cd1",
        "background": "linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)",
        "lessons": [
            "p7-2"
        ]
    },
    {
        "word": "Auteur",
        "definition": "La personne qui décide de son travail et le signe.",
        "example": "L’auteur décide de l’histoire et la signe. L’IA l’aide, mais ne signe pas à sa place.",
        "icon": "🎨",
        "color": "#f6d365",
        "background": "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)",
        "lessons": [
            "p7-3"
        ]
    },
    {
        "word": "Transparent",
        "definition": "Dire clairement quand l’IA a aidé.",
        "example": "Être transparent, c’est dire quand l’IA a aidé. On écrit : « fait avec l’aide de l’IA ».",
        "icon": "🎨",
        "color": "#84fab0",
        "background": "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
        "lessons": [
            "p7-4"
        ]
    },
    {
        "word": "Donnée personnelle",
        "definition": "Une information qui permet de reconnaître une personne.",
        "example": "Une donnée personnelle te reconnaît : ton nom complet, ton adresse, ton numéro.",
        "icon": "🛡️",
        "color": "#ff9a9e",
        "background": "linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)",
        "lessons": [
            "p8-1"
        ]
    },
    {
        "word": "Droit à l’image",
        "definition": "Le droit de décider si ta photo est montrée.",
        "example": "Le droit à l’image, c’est décider si ta photo est montrée. On demande avant de publier.",
        "icon": "🛡️",
        "color": "#a8edea",
        "background": "linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)",
        "lessons": [
            "p8-2"
        ]
    },
    {
        "word": "Adulte de confiance",
        "definition": "Un adulte qu’on connaît bien et qui nous protège.",
        "example": "Un adulte de confiance, tu le connais bien. Il te protège et il t’écoute.",
        "icon": "🛡️",
        "color": "#a78bfa",
        "background": "linear-gradient(135deg, #ede7f6 0%, #d1c4e9 100%)",
        "lessons": [
            "p8-3"
        ]
    },
    {
        "word": "Bouclier numérique",
        "definition": "Les bons réflexes qui protègent tes informations.",
        "example": "Le bouclier numérique, ce sont les bons réflexes. Ils protègent tes secrets en ligne.",
        "icon": "🛡️",
        "color": "#fdcbf1",
        "background": "linear-gradient(135deg, #fffde7 0%, #fff9c4 100%)",
        "lessons": [
            "p8-4"
        ]
    },
    {
        "word": "Fausse information",
        "definition": "Une information qui semble vraie, mais qui ne l’est pas.",
        "example": "Une fausse information semble vraie, mais elle ne l’est pas. Même une IA peut en donner.",
        "icon": "🕵️",
        "color": "#60a5fa",
        "background": "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
        "lessons": [
            "p9-1"
        ]
    },
    {
        "word": "Source",
        "definition": "L’endroit ou la personne d’où vient une information.",
        "example": "La source, c’est d’où vient l’information. Une bonne source est connue et sérieuse.",
        "icon": "🕵️",
        "color": "#cfd9df",
        "background": "linear-gradient(135deg, #f1f8e9 0%, #dcedc8 100%)",
        "lessons": [
            "p9-2"
        ]
    },
    {
        "word": "Image truquée",
        "definition": "Une image changée ou fabriquée pour faire croire une chose fausse.",
        "example": "Une image truquée est changée ou fabriquée. Elle veut faire croire quelque chose de faux.",
        "icon": "🕵️",
        "color": "#a1c4fd",
        "background": "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
        "lessons": [
            "p9-3"
        ]
    },
    {
        "word": "Preuve",
        "definition": "Ce qui montre qu’une information est vraie.",
        "example": "Une preuve montre qu’une information est vraie. Sans preuve, on reste prudent.",
        "icon": "🕵️",
        "color": "#a18cd1",
        "background": "linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)",
        "lessons": [
            "p9-4"
        ]
    },
    {
        "word": "Besoin",
        "definition": "Ce qu’il manque vraiment aux gens.",
        "example": "Un besoin, c’est ce qui manque vraiment aux gens. On l’écoute avant de chercher une idée.",
        "icon": "🚀",
        "color": "#f6d365",
        "background": "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)",
        "lessons": [
            "p10-1"
        ]
    },
    {
        "word": "Faisable",
        "definition": "Une idée qu’on peut vraiment réaliser avec les moyens qu’on a.",
        "example": "Une idée faisable peut vraiment se réaliser. Il faut penser aux moyens et aux données.",
        "icon": "🚀",
        "color": "#84fab0",
        "background": "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
        "lessons": [
            "p10-2"
        ]
    },
    {
        "word": "Prototype",
        "definition": "Un premier modèle simple, fait pour tester une idée.",
        "example": "Un prototype est un premier modèle simple. Il sert à tester l’idée avant de la construire.",
        "icon": "🚀",
        "color": "#ff9a9e",
        "background": "linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)",
        "lessons": [
            "p10-3"
        ]
    },
    {
        "word": "Projet",
        "definition": "Une idée préparée pas à pas, de l’idée jusqu’au test.",
        "example": "Un projet suit des étapes : besoin, prototype, test, puis présentation.",
        "icon": "🚀",
        "color": "#a8edea",
        "background": "linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)",
        "lessons": [
            "p10-4"
        ]
    }
]

# Mots du catalogue général déjà en base : leçons qui les débloquent (parcours 7-9, puis 10-12 et 13-15).
GENERAL_UNLOCKS = {
    "IA (Intelligence Artificielle)": [
        "p1-1",
        "a1-1",
        "c1-1"
    ],
    "Donnée": [
        "p3-1",
        "a1-2",
        "c1-2"
    ],
    "Algorithme": [
        "p10-3",
        "a1-3",
        "c1-3"
    ],
    "Modèle": [
        "p4-4",
        "a1-4",
        "c1-4"
    ],
    "Application": [
        "p2-1",
        "a2-1",
        "c2-1"
    ],
    "Chatbot": [
        "p6-4",
        "a2-2",
        "c2-2"
    ],
    "Prompt": [
        "p7-2",
        "a2-3",
        "c2-3"
    ],
    "Programme": [
        "p10-4",
        "a2-4",
        "c2-4"
    ],
    "Technologie": [
        "p2-4",
        "a3-1",
        "c3-1"
    ],
    "Pixel": [
        "p5-1",
        "a3-2",
        "c3-2"
    ],
    "Biais": [
        "p9-2",
        "a3-3",
        "c3-3"
    ],
    "Deepfake": [
        "p9-3",
        "a3-4",
        "c3-4"
    ]
}
