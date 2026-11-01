"""
Défis éclair du jour : des mots simples pour les 7-9 ans.

Les mots difficiles (biais, deepfake, algorithme, prompt, pixel, données…) ne sont plus dans les questions ni dans les réponses :
ils restent dans le dictionnaire, où l'enfant les découvre quand il le souhaite. « Prompt » et « Pixel » y sont ajoutés.
Les défis sont retrouvés par le début de leur ancienne question : si l'un d'eux a déjà été modifié à la main, il n'est pas touché.
"""
from django.db import migrations

CHALLENGES = [
    {
        "old": "Si tu montres à un robot uniquement des photos de chats noirs",
        "theme": "L'IA apprend",
        "question": "Un robot a vu seulement des photos de chats noirs. Va-t-il reconnaître un chat blanc ?",
        "options": ["Oui, il devine tout par magie !", "Non, il n'a pas vu assez de chats différents", "Il va croire que c'est une souris"],
        "correct_index": 1,
        "explanation": "Bravo ! Une IA ne connaît que les exemples qu'on lui montre. Pour bien apprendre, elle a besoin de chats de toutes les couleurs !",
    },
    {
        "old": "Quel mot de passe est le plus solide",
        "theme": "Mes secrets",
        "question": "Quel mot de passe est le plus solide pour protéger tes points et tes badges ?",
        "options": ["123456 ou le nom de mon animal", "Mon prénom et mon âge", "Une phrase secrète avec des lettres, des chiffres et des signes"],
        "correct_index": 2,
        "explanation": "Bravo ! Un mot de passe long et secret est très difficile à deviner. On ne le dit à personne, sauf à papa ou maman.",
    },
    {
        "old": "Comment appelle-t-on la consigne précise",
        "theme": "Parler à l'IA",
        "question": "Tu veux que l'IA dessine un lion qui joue au football. Que dois-tu faire ?",
        "options": ["Lui dire seulement « dessine »", "Lui expliquer bien ce que je veux", "Attendre : elle va deviner toute seule"],
        "correct_index": 1,
        "explanation": "Bravo ! Quand on explique bien ce qu'on veut à l'IA, elle comprend mieux. C'est comme une baguette magique !",
    },
    {
        "old": "Une vidéo spectaculaire montre un lion vert",
        "theme": "Vrai ou faux ?",
        "question": "Une vidéo montre un lion vert qui vole au-dessus de Dakar. Que fais-tu ?",
        "options": ["Je la montre tout de suite à tous mes amis", "Je demande à un adulte si c'est vrai", "Je la crois, parce que les images sont belles"],
        "correct_index": 1,
        "explanation": "Bravo, bon détective ! Une IA peut fabriquer de fausses vidéos qui ont l'air vraies. Demande toujours à un adulte !",
    },
]

NEW_WORDS = [
    {
        "word": "Prompt",
        "definition": "C'est ce que tu écris ou tu dis à une IA pour lui expliquer ce que tu veux. Plus tu expliques bien, mieux elle te répond.",
        "example": "Si tu dis seulement « dessine », l'IA hésite. Si tu dis « dessine un lion qui joue au football », elle sait quoi faire !",
        "icon": "🪄",
        "color": "#a78bfa",
        "background": "linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)",
    },
    {
        "word": "Pixel",
        "definition": "C'est un tout petit carré de couleur. Une image sur un écran est faite de milliers de pixels collés les uns aux autres.",
        "example": "Si tu regardes un écran de très près, tu vois de minuscules carrés : ce sont les pixels !",
        "icon": "🟦",
        "color": "#60a5fa",
        "background": "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
    },
]


def simplify(apps, schema_editor):
    DailyChallenge = apps.get_model("curriculum", "DailyChallenge")
    GlossaryTerm = apps.get_model("curriculum", "GlossaryTerm")
    for spec in CHALLENGES:
        for challenge in DailyChallenge.objects.filter(question__startswith=spec["old"]):
            challenge.theme = spec["theme"]
            challenge.question = spec["question"]
            challenge.options = spec["options"]
            challenge.correct_index = spec["correct_index"]
            challenge.explanation = spec["explanation"]
            challenge.save()
    for word in NEW_WORDS:
        GlossaryTerm.objects.get_or_create(word=word["word"], defaults={**word, "is_active": True})


class Migration(migrations.Migration):

    dependencies = [("curriculum", "0009_merge_0006_teacherguide_0008_seed_riddles")]

    # Pas de retour en arrière : les anciens textes difficiles ne sont pas conservés.
    operations = [migrations.RunPython(simplify, migrations.RunPython.noop)]
