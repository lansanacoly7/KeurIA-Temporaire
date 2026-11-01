"""Questions des missions données en devoir, et leur correction.

Elles vivent ICI (et non dans le navigateur) : le navigateur ne reçoit que les questions et les libellés ; la bonne
réponse n'est révélée qu'après la première réponse de l'élève à chaque question, et le score est calculé par le serveur.
Une mission sans quiz propre (créée depuis l'espace Super Admin) utilise `DEFAULT_QUIZ`.

Chaque étape : {"question": str, "options": [{"label": str, "correct": bool, "explanation": str}, ...]}, avec exactement
une option correcte.
"""

MISSION_QUIZZES = {
    "m1": [
        {
            "question": "Regarde attentivement cette fausse image d'un élève avec son robot. Quel indice prouve qu'elle a été générée par une IA ?",
            "options": [
                {
                    "label": "La couleur bleue du cartable",
                    "correct": False,
                    "explanation": "Non, la couleur d'un cartable ne prouve rien."
                },
                {
                    "label": "L'élève a 6 doigts sur sa main gauche",
                    "correct": True,
                    "explanation": "Bravo ! Les IA génératrices d'images ont souvent du mal à dessiner correctement les mains et les doigts."
                },
                {
                    "label": "Le robot a des yeux verts",
                    "correct": False,
                    "explanation": "Ce n'est pas un indice d'image générée."
                }
            ]
        },
        {
            "question": "Pourquoi est-il important de vérifier une image avant de la partager ?",
            "options": [
                {
                    "label": "Pour éviter de diffuser de fausses informations (fake news)",
                    "correct": True,
                    "explanation": "Exactement ! Il faut toujours vérifier la source pour ne pas tromper les autres."
                },
                {
                    "label": "Parce que c'est interdit par le téléphone",
                    "correct": False,
                    "explanation": "Le téléphone n'interdit pas de partager, c'est notre responsabilité citoyenne."
                },
                {
                    "label": "Pour économiser de la batterie",
                    "correct": False,
                    "explanation": "Non, vérifier ne concerne pas la batterie."
                }
            ]
        }
    ],
    "m2": [
        {
            "question": "Parmi ces trois propositions, quel est le mot de passe le plus fort et sécurisé ?",
            "options": [
                {
                    "label": "123456",
                    "correct": False,
                    "explanation": "Trop simple et très dangereux : un robot le devine en moins d'une seconde !"
                },
                {
                    "label": "Dakar2026!Soleil",
                    "correct": True,
                    "explanation": "Excellent ! Il mélange majuscules, minuscules, chiffres et un symbole tout en étant assez long."
                },
                {
                    "label": "monprenom",
                    "correct": False,
                    "explanation": "Facile à trouver pour quelqu'un qui te connaît."
                }
            ]
        },
        {
            "question": "À qui as-tu le droit de donner ton mot de passe kEur IA ?",
            "options": [
                {
                    "label": "À mon meilleur ami dans la cour de récréation",
                    "correct": False,
                    "explanation": "Même aux amis, on ne donne jamais ses identifiants secrets."
                },
                {
                    "label": "À quelqu'un qui me le demande par message",
                    "correct": False,
                    "explanation": "Attention, c'est du hameçonnage (phishing) !"
                },
                {
                    "label": "À mes parents ou mon enseignant uniquement",
                    "correct": True,
                    "explanation": "C'est la règle d'or : ne donne jamais ton mot de passe à tes camarades ou sur Internet."
                }
            ]
        }
    ],
    "m3": [
        {
            "question": "Pour apprendre à une IA à trier les déchets d'école, de quoi a-t-elle besoin en premier ?",
            "options": [
                {
                    "label": "D'une batterie très puissante",
                    "correct": False,
                    "explanation": "Une batterie fait fonctionner l'appareil, mais n'entraîne pas le modèle."
                },
                {
                    "label": "De centaines d'exemples de photos étiquetées (bouteille plastique, papier, métal)",
                    "correct": True,
                    "explanation": "Très bien ! L'apprentissage supervisé nécessite de nombreuses données d'entraînement."
                },
                {
                    "label": "D'un mot de passe secret",
                    "correct": False,
                    "explanation": "Le mot de passe sert à la sécurité, pas à l'apprentissage de l'IA."
                }
            ]
        }
    ],
    "m4": [
        {
            "question": "Quel prompt permettra à une IA de t'aider le plus précisément sur un devoir d'histoire ?",
            "options": [
                {
                    "label": "Explique-moi la vie de Léopold Sédar Senghor en 3 paragraphes simples pour un élève de CM1",
                    "correct": True,
                    "explanation": "Parfait ! Ton prompt précise le sujet, le format (3 paragraphes) et le niveau adapté."
                },
                {
                    "label": "Parle-moi de quelqu'un",
                    "correct": False,
                    "explanation": "Trop vague ! L'IA ne peut pas deviner de qui tu veux parler."
                },
                {
                    "label": "Donne-moi tout sur le Sénégal",
                    "correct": False,
                    "explanation": "C'est trop large pour une réponse utile."
                }
            ]
        }
    ],
    "m5": [
        {
            "question": "Si Palou doit faire 4 pas en avant, quelle instruction est la plus efficace en programmation ?",
            "options": [
                {
                    "label": "Éteindre l'écran",
                    "correct": False,
                    "explanation": "Cela arrêtera le programme !"
                },
                {
                    "label": "Avancer de 1 pas, attendre 1 heure, puis avancer",
                    "correct": False,
                    "explanation": "Non, c'est inutilement lent."
                },
                {
                    "label": "Répéter 4 fois : [Avancer de 1 pas]",
                    "correct": True,
                    "explanation": "Super ! Utiliser une boucle 'Répéter' évite d'écrire la même ligne 4 fois."
                }
            ]
        }
    ],
    "m6": [
        {
            "question": "Quand tu utilises l'IA pour tes devoirs, quelle attitude est responsable ?",
            "options": [
                {
                    "label": "Copier-coller le texte sans le lire ni le comprendre",
                    "correct": False,
                    "explanation": "Non, cela ne te fait rien apprendre et c'est de la triche."
                },
                {
                    "label": "Lui demander de m'expliquer une notion difficile pour que je comprenne",
                    "correct": True,
                    "explanation": "Bravo ! L'IA est un tuteur qui t'aide à comprendre, pas un outil pour copier bêtement."
                },
                {
                    "label": "Dire que c'est moi qui ai tout inventé",
                    "correct": False,
                    "explanation": "Il faut toujours être honnête sur l'aide reçue."
                }
            ]
        }
    ]
}

DEFAULT_QUIZ = [
    {
        "question": "Cette mission demande de la réflexion et de la créativité. Es-tu prêt à relever le défi ?",
        "options": [
            {
                "label": "Je préfère attendre et relire ma leçon",
                "correct": False,
                "explanation": "Prends ton temps et relis la leçon avant de commencer."
            },
            {
                "label": "Oui, je suis prêt !",
                "correct": True,
                "explanation": "C'est parti pour réussir cette mission !"
            }
        ]
    }
]


def _normalize_steps(steps: list) -> list[dict]:
    normalized = []
    for s in steps:
        if not isinstance(s, dict):
            continue
        q_text = s.get('question') or s.get('prompt') or ''
        raw_opts = s.get('options', [])
        opts = []
        if raw_opts and isinstance(raw_opts[0], dict):
            opts = [{'label': str(o.get('label', '')), 'correct': bool(o.get('correct', False)), 'explanation': str(o.get('explanation', ''))} for o in raw_opts]
        elif raw_opts and isinstance(raw_opts[0], str):
            c_idx = int(s.get('correctIndex', 0))
            for idx, opt_label in enumerate(raw_opts):
                opts.append({
                    'label': str(opt_label),
                    'correct': idx == c_idx,
                    'explanation': str(s.get('explain', s.get('explanation', '')) if idx == c_idx else '')
                })
        if q_text and len(opts) >= 2:
            normalized.append({'question': q_text, 'options': opts})
    return normalized


def quiz_for(mission) -> list[dict]:
    """Questions d'un devoir. `mission` : la mission, ou son identifiant.

    Les devoirs du programme (une leçon, un bilan de module) lisent leurs questions dans le contenu des leçons ; les autres
    missions ont leur quiz ci-dessus, ou le quiz par défaut, ou la version personnalisée du Studio."""
    from .models import Mission
    from .services.programme import programme_quiz

    m_id = mission.id if hasattr(mission, 'id') else str(mission)
    try:
        from apps.curriculum.models import ContentVersion
        from apps.curriculum.versions import live_version
        live = live_version(ContentVersion.KIND_MISSION, str(m_id))
        if live and isinstance(live.content, dict) and live.content.get('questions'):
            custom = _normalize_steps(live.content['questions'])
            if custom:
                return custom
    except Exception:
        pass

    if isinstance(mission, str):
        mission = Mission.objects.filter(pk=mission).first() or mission
    if isinstance(mission, Mission):
        if mission.kind != Mission.KIND_LIBRE:
            steps = programme_quiz(mission)
            if steps:
                return steps
        return MISSION_QUIZZES.get(mission.id) or DEFAULT_QUIZ
    return MISSION_QUIZZES.get(mission) or DEFAULT_QUIZ


def _check() -> None:
    """Garde-fou de développement : chaque étape a au moins deux options et exactement une bonne réponse."""
    for steps in [*MISSION_QUIZZES.values(), DEFAULT_QUIZ]:
        for step in steps:
            assert len(step["options"]) >= 2 and sum(o["correct"] for o in step["options"]) == 1, step["question"]


_check()
