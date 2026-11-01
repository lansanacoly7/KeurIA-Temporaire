"""
Énigmes du jour du parcours 7-9 : deux par leçon (40 leçons, 80 énigmes).

Règle d'or : une énigme ne porte QUE sur ce que sa leçon a enseigné (le « je retiens », les mots nouveaux et les
phrases « Et l'IA ? » de frontend/content/parcours79). Le serveur ne propose une énigme que si l'enfant a terminé sa
leçon : jamais de question sur quelque chose qu'il n'a pas encore vu.

Chaque entrée : (leçon, question, bonne réponse, [deux mauvaises réponses], explication).
L'explication est montrée après la réponse, juste ou fausse : elle dit pourquoi, avec des mots simples.
La place de la bonne réponse tourne (A, B, C) d'une énigme à l'autre : voir `build()`.
"""

RIDDLES = [
    # ───── p1 · Bonjour, l'IA ! ─────
    ("p1-1", "Qui a fabriqué les IA ?", "Des humains", ["Elles sont nées toutes seules", "Les animaux de la savane"],
     "Une IA est un outil fabriqué par des humains. Elle n'apparaît pas toute seule."),
    ("p1-1", "Palou dit : « Une IA ne se trompe jamais ! » Est-ce vrai ?", "Non, une IA peut se tromper", ["Oui, jamais", "Oui, car elle est plus forte que les humains"],
     "Une IA aide, mais elle peut se tromper. C'est pour ça qu'on vérifie."),
    ("p1-2", "Une IA a vu un seul chat, un chat blanc. Que peut-il arriver ?", "Elle risque de se tromper avec un chat noir", ["Elle reconnaît tous les chats à coup sûr", "Elle devient un chat"],
     "Avec peu d'exemples, une IA se trompe plus. Il lui faut des exemples variés : des chats de toutes les couleurs."),
    ("p1-2", "Comment une IA apprend-elle ?", "Avec des exemples", ["En dormant", "En lisant dans nos pensées"],
     "Une IA apprend avec des exemples, comme toi quand on te montre plusieurs fois. Plus ils sont variés, mieux elle apprend."),
    ("p1-3", "Une lampe s'allume quand on appuie sur l'interrupteur. Est-ce une IA ?", "Non, elle ne reconnaît rien et ne devine rien", ["Oui, parce qu'elle s'allume", "Oui, parce qu'elle est branchée"],
     "Un objet qui s'allume n'est pas forcément une IA. Une IA reconnaît, devine ou propose quelque chose."),
    ("p1-3", "Un téléphone reconnaît ton visage pour se débloquer. Est-ce une IA ?", "Oui, il reconnaît ton visage", ["Non, c'est comme une lampe", "Non, parce qu'il a un écran"],
     "Reconnaître un visage, c'est un indice : le téléphone utilise une IA. Une IA reconnaît, devine ou propose."),
    ("p1-4", "Fatou cherche des IA autour d'elle. Que doit-elle regarder ?", "Ce que fait l'outil", ["Les secrets de la famille des gens", "Les photos des voisins"],
     "Une enquête responsable regarde ce que fait l'outil, pas la vie privée des gens."),
    ("p1-4", "La vie privée, c'est…", "Ce qui te concerne, toi et ta famille, et qu'on ne montre pas à tout le monde", ["Ce qu'on montre à tout le monde", "Le nom de ton école affiché sur un mur"],
     "La vie privée, c'est ce qui te concerne, toi et ta famille. On ne le montre pas à tout le monde."),

    # ───── p2 · L'IA autour de moi ─────
    ("p2-1", "Moussa dit « Allume la musique » à son téléphone, et ça marche. Comment le téléphone a-t-il compris ?", "C'est un assistant vocal : il comprend la voix", ["Il lit dans la tête de Moussa", "Quelqu'un est caché dedans"],
     "Un assistant vocal est une IA qui comprend ta voix et te répond. Il a écouté beaucoup de voix pour apprendre."),
    ("p2-1", "L'assistant vocal a mal compris Moussa. Que faire ?", "Vérifier, car il peut se tromper", ["Se fâcher : il n'a jamais tort", "Jeter le téléphone"],
     "Un assistant vocal peut se tromper, même s'il a beaucoup appris. Alors on vérifie."),
    ("p2-2", "L'application propose un livre à Fatou. Qui décide de le lire ?", "Fatou : c'est elle qui décide", ["L'application, obligatoirement", "Personne"],
     "Une suggestion est un choix proposé par une IA. C'est toi qui décides."),
    ("p2-2", "Une suggestion, c'est…", "Un choix que l'IA te propose selon ce que tu aimes", ["Un ordre qu'on doit suivre", "Un secret de l'école"],
     "Une suggestion, c'est un choix que l'IA te propose selon ce que tu aimes. Tu peux dire oui ou non."),
    ("p2-3", "Comment l'appli de trajet devine l'heure d'arrivée ?", "Avec des trajets déjà faits", ["Avec une boule de cristal", "En demandant aux nuages"],
     "Une appli de trajet prédit l'heure d'arrivée avec des trajets déjà faits. Prédire, c'est deviner à l'avance."),
    ("p2-3", "L'appli disait « Arrivée dans 10 minutes », mais la route est bloquée. Que s'est-il passé ?", "La route a changé : l'appli s'est trompée", ["L'appli ment toujours", "Les minutes sont plus longues aujourd'hui"],
     "L'appli peut se tromper si la route change soudain. C'est pour ça que Papa Ibou garde les yeux sur la route."),
    ("p2-4", "Où peut-on trouver de l'IA ?", "Dans le téléphone, à l'école et sur la route", ["Seulement dans les films", "Seulement chez les scientifiques"],
     "L'IA est partout : dans le téléphone, à l'école et sur la route. Tu sais maintenant la repérer."),
    ("p2-4", "Un outil, c'est…", "Un objet ou une appli qui aide à faire un travail", ["Un animal qui aide à la ferme", "Un jeu qui ne sert à rien"],
     "Un outil est un objet ou une appli qui aide à faire un travail. Une IA est un outil."),

    # ───── p3 · La grande famille des données ─────
    ("p3-1", "Une donnée, c'est…", "Une information qu'on note, comme un nombre ou un nom", ["Un gros ordinateur", "Un jouet électrique"],
     "Une donnée est une information qu'on note, comme un nombre ou un nom. Les IA apprennent avec des données."),
    ("p3-1", "Pour bien apprendre, quelles données faut-il donner à l'IA ?", "Des données justes", ["Des données fausses", "Aucune donnée"],
     "Une IA apprend avec beaucoup de données. Plus elles sont justes, mieux elle apprend."),
    ("p3-2", "Mangue, orange, banane : dans quelle catégorie les ranger ?", "Les fruits", ["Les animaux", "Les outils"],
     "Une catégorie réunit des choses qui se ressemblent. Mangue, orange et banane vont ensemble : ce sont des fruits."),
    ("p3-2", "Une IA range les photos de chats d'un côté et les photos de chiens de l'autre. Que fait-elle ?", "Elle trie par catégorie", ["Elle dessine", "Elle compte les nuages"],
     "Trier, c'est ranger par catégorie. Une IA trie aussi : elle range les photos ou les messages par catégorie."),
    ("p3-3", "Pomme, mangue, banane, marteau : qui est l'intrus ?", "Le marteau", ["La mangue", "La banane"],
     "L'intrus ne ressemble pas aux autres. Ici, les trois autres sont des fruits, mais pas le marteau."),
    ("p3-3", "Pourquoi retire-t-on l'intrus d'une liste de données ?", "Pour garder des données justes", ["Parce qu'il est méchant", "Pour faire du bruit"],
     "Retirer l'intrus aide à garder des données justes. Une IA apprend mieux avec des données justes."),
    ("p3-4", "Fatou range ses billes par couleur. Quel est son critère ?", "La couleur", ["Le prix", "Le bruit"],
     "Un critère, c'est ce qu'on regarde pour classer : la couleur, la taille, le sujet. Fatou regarde la couleur."),
    ("p3-4", "Tu ranges des photos de la plage et des photos de l'école. Quel critère utilises-tu ?", "Le sujet de la photo", ["Le nom de l'appareil photo", "Le goût de la photo"],
     "Pour ranger des photos, on peut regarder leur sujet : la plage ou l'école. Le sujet est un critère."),

    # ───── p4 · Apprendre avec des exemples ─────
    ("p4-1", "Entraîner une IA, c'est…", "Lui montrer beaucoup d'exemples", ["L'emmener courir", "Lui donner à manger"],
     "L'entraînement, c'est montrer beaucoup d'exemples à une IA pour qu'elle apprenne."),
    ("p4-1", "Pour apprendre à reconnaître un chien, l'IA a besoin d'exemples qui ont…", "Un nom : « chien »", ["Une odeur", "Une couleur rose"],
     "Une IA apprend avec des exemples qui ont un nom. Chaque exemple a un nom."),
    ("p4-2", "Sur une photo de chien, quelqu'un a écrit « chat ». Que va apprendre l'IA ?", "Une erreur", ["Rien du tout", "La bonne réponse"],
     "Une étiquette fausse apprend une erreur à l'IA. Elle a besoin d'étiquettes justes."),
    ("p4-2", "Une étiquette, c'est…", "Le nom qu'on associe à un exemple", ["Un petit papier sans nom", "Un autocollant magique"],
     "Une étiquette est le nom qu'on associe à un exemple, par exemple « chat » sur une photo de chat."),
    ("p4-3", "Une photo est floue. Que peut-il arriver à l'IA ?", "Elle peut se tromper", ["Elle voit mieux que toi", "Elle sait toujours la réponse"],
     "Une image floue n'est pas assez nette : on ne voit pas bien les détails. Elle peut tromper une IA."),
    ("p4-3", "L'IA s'est trompée. Comment l'aider ?", "En lui montrant de meilleurs exemples", ["En la punissant", "En l'éteignant pour toujours"],
     "Quand une IA se trompe, ce n'est pas grave. On lui montre de meilleurs exemples."),
    ("p4-4", "Dans quel ordre fabrique-t-on une IA ?", "Entraîner, tester, corriger", ["Corriger, dormir, jouer", "Tester, oublier, jeter"],
     "Entraîner, tester, corriger : c'est ainsi qu'on fabrique une IA."),
    ("p4-4", "Le modèle, c'est…", "Ce que l'IA a retenu à la fin de son entraînement", ["Un mannequin", "Un jouet en bois"],
     "Le modèle, c'est ce que l'IA a retenu à la fin de son entraînement."),

    # ───── p5 · L'IA qui regarde ─────
    ("p5-1", "Une photo est faite de…", "Beaucoup de pixels", ["Gouttes d'eau", "Petits sons"],
     "Un pixel est un tout petit carré de couleur. Beaucoup de pixels font une image."),
    ("p5-1", "Comment une IA regarde-t-elle une image ?", "Comme un grand tableau de pixels", ["Comme un film en couleurs", "Avec des yeux de lion"],
     "Une IA regarde une image comme un grand tableau de pixels : ces petits carrés de couleur."),
    ("p5-2", "Pour reconnaître une mangue, une IA remarque sa forme et sa couleur. Ce sont des…", "Caractéristiques", ["Secrets", "Étiquettes"],
     "Une caractéristique est une chose qu'on remarque : la couleur, la forme, la taille."),
    ("p5-2", "Que fait l'IA avec les formes et les couleurs qu'elle repère ?", "Elle les compare avec ses exemples", ["Elle les efface", "Elle les mange"],
     "Une IA compare des caractéristiques, comme la forme et la couleur, avec ses exemples."),
    ("p5-3", "Sur une photo prise à contre-jour, l'objet paraît…", "Tout noir", ["Tout rose", "Plus gros"],
     "Quand la lumière vient de derrière, l'objet paraît tout noir. On appelle ça le contre-jour."),
    ("p5-3", "L'IA ne voit pas bien une photo sombre. Que peut-elle dire de plus honnête ?", "« Je ne suis pas sûre »", ["« C'est sûrement un lion »", "« Je sais tout »"],
     "Une photo sombre cache les détails. Une IA peut dire « je ne suis pas sûre » : c'est plus honnête que de deviner."),
    ("p5-4", "Pour savoir si une IA reconnaît bien, on la…", "Teste avec des photos nouvelles", ["Laisse dormir", "Gronde"],
     "Tester, c'est vérifier si l'IA reconnaît bien, avec des photos nouvelles."),
    ("p5-4", "Un résultat très important de l'IA : qui le vérifie ?", "Un adulte", ["Personne", "Le chat"],
     "On teste une IA souvent. Un adulte vérifie toujours les résultats importants."),

    # ───── p6 · L'IA qui parle ─────
    ("p6-1", "La reconnaissance vocale, c'est quand une machine transforme…", "Une voix en mots écrits", ["Un mot en musique", "Un dessin en voix"],
     "La reconnaissance vocale, c'est quand une machine transforme une voix en mots écrits."),
    ("p6-1", "Pourquoi une IA comprend-elle moins bien le diola ?", "Elle l'a très peu entendu", ["Le diola est interdit", "Elle est fâchée"],
     "Une IA comprend mieux les langues qu'elle a beaucoup entendues. Le diola, elle l'a peu entendu."),
    ("p6-2", "Un mot-clé, c'est…", "Un mot important que l'IA cherche pour comprendre", ["Une clé en métal", "Un mot interdit"],
     "Un mot-clé est un mot important. Une IA le cherche pour comprendre ta phrase."),
    ("p6-2", "Comment l'IA comprend-elle ta phrase ?", "Elle cherche des mots qu'elle connaît", ["Par magie", "En devinant tes rêves"],
     "Il n'y a pas de magie : l'IA cherche des mots qu'elle connaît."),
    ("p6-3", "Quelle question aide le mieux l'IA ?", "« Comment faire pousser des tomates ? »", ["« Parle-moi de trucs »", "« Et alors, ça ? »"],
     "Une question claire a un sujet précis et des mots simples. Elle aide l'IA à mieux répondre."),
    ("p6-3", "Pour que l'IA t'aide mieux, ta question doit avoir…", "Un sujet précis et des mots simples", ["Des mots très compliqués", "Aucun sujet"],
     "Plus ta question est claire, mieux l'IA peut t'aider. Elle peut quand même se tromper."),
    ("p6-4", "Un dialogue, c'est une conversation où…", "Chacun parle à son tour", ["Tout le monde crie en même temps", "Une seule personne parle"],
     "Un dialogue est une conversation où chacun parle à son tour."),
    ("p6-4", "L'IA répond bizarrement dans une langue qu'elle connaît peu. Que fais-tu ?", "Je vérifie avec une personne", ["Je la crois tout de suite", "Je me moque d'elle"],
     "Une IA peut se tromper dans une langue qu'elle connaît peu. On vérifie toujours avec une personne."),

    # ───── p7 · Créer avec l'IA ─────
    ("p7-1", "Une IA générative…", "Fabrique du nouveau : un texte, une image ou un son", ["Range les chaussures", "Éteint les lumières"],
     "Une IA générative fabrique du nouveau : un texte, une image ou un son."),
    ("p7-1", "L'IA te propose trois idées de dessin. Qui choisit ?", "C'est toi, le créateur", ["L'IA, toute seule", "Le voisin"],
     "Une IA générative propose des idées. C'est toi qui choisis."),
    ("p7-2", "Une consigne, c'est…", "Les mots qu'on donne à l'IA pour lui dire quoi créer", ["Un bonbon", "Une punition"],
     "Une consigne, ce sont les mots qu'on donne à l'IA pour lui dire quoi créer."),
    ("p7-2", "Quelle consigne donnera le meilleur dessin ?", "« Un lion jaune qui joue au ballon sur la plage »", ["« Un dessin »", "« Fais un truc »"],
     "Une consigne précise aide l'IA à créer ce que tu imagines. L'IA ne lit pas dans tes pensées : elle crée ce que tu décris."),
    ("p7-3", "L'IA a écrit une histoire avec une chose fausse. Que fais-tu ?", "Je relis et je corrige", ["Je ne change rien", "Je jette tout sans lire"],
     "Une IA peut inventer des choses fausses. Il faut toujours relire et corriger."),
    ("p7-3", "L'auteur d'une histoire, c'est…", "La personne qui décide de son travail et le signe", ["L'ordinateur", "Le voisin"],
     "L'auteur décide de son histoire et la signe. Une IA peut aider, mais l'auteur, c'est toi."),
    ("p7-4", "L'IA t'a aidé pour ton affiche. Que fais-tu ?", "Je dis clairement qu'elle a aidé", ["Je fais croire que je l'ai faite seul", "Je cache l'affiche"],
     "Être transparent, c'est dire clairement quand l'IA a aidé."),
    ("p7-4", "Une IA qui t'aide…", "Ne remplace pas ton idée : tu restes l'auteur", ["Devient l'auteur à ta place", "Efface ton idée"],
     "Une IA qui aide ne remplace pas ton idée. Tu restes l'auteur de ton travail."),

    # ───── p8 · Mon bouclier numérique ─────
    ("p8-1", "Une donnée personnelle permet de…", "Te reconnaître", ["Gagner un jeu", "Dessiner un lion"],
     "Une donnée personnelle est une information qui permet de reconnaître une personne. On la garde secrète."),
    ("p8-1", "Une IA te demande ton nom complet et ton adresse. Que fais-tu ?", "Je ne les donne pas : ce sont mes secrets", ["Je donne tout", "Je donne seulement l'adresse"],
     "Une IA peut garder ce qu'on lui écrit. Ne lui donne jamais de secret."),
    ("p8-2", "Avant de publier la photo d'un ami, tu…", "Demandes son accord", ["Publies vite", "Demandes à l'IA"],
     "Le droit à l'image, c'est le droit de décider si ta photo est montrée. Je demande l'accord de chacun avant de publier."),
    ("p8-2", "Ton ami dit non pour la photo. Que fais-tu ?", "Je respecte son non", ["Je publie quand même", "Je la montre en cachette"],
     "Un non est toujours respecté. Une photo publiée peut être copiée : on réfléchit avant de l'envoyer."),
    ("p8-3", "Quelque chose te gêne sur l'écran. À qui en parles-tu ?", "À un adulte de confiance", ["À l'IA seulement", "À personne"],
     "Une IA n'est pas un adulte de confiance. Si quelque chose te gêne, parle à une vraie personne."),
    ("p8-3", "Un adulte de confiance, c'est un adulte…", "Qu'on connaît bien et qui nous protège", ["Qu'on vient de rencontrer en ligne", "Qui est très riche"],
     "Un adulte de confiance est un adulte qu'on connaît bien et qui nous protège. Il nous écoute."),
    ("p8-4", "Quel est un bon réflexe du bouclier numérique ?", "Protéger mes secrets", ["Donner mon mot de passe à un copain", "Publier toutes mes photos"],
     "Mon bouclier numérique : je protège mes secrets, je demande l'accord et je parle à un adulte de confiance."),
    ("p8-4", "Le bouclier numérique, ce sont…", "Les bons réflexes qui protègent tes informations", ["Un vrai bouclier en fer", "Un jeu vidéo"],
     "Le bouclier numérique, ce sont les bons réflexes qui protègent tes informations."),

    # ───── p9 · Vrai, faux… vérifions ! ─────
    ("p9-1", "L'IA répond avec beaucoup d'assurance. A-t-elle forcément raison ?", "Non, elle peut se tromper même avec assurance", ["Oui, forcément", "Oui, si elle répond vite"],
     "Une IA peut se tromper en parlant avec assurance. Je vérifie avant de croire."),
    ("p9-1", "Une fausse information, c'est…", "Une information qui semble vraie, mais qui ne l'est pas", ["Une information très courte", "Une information drôle"],
     "Une fausse information semble vraie, mais elle ne l'est pas. C'est pour ça qu'on vérifie."),
    ("p9-2", "La source d'une information, c'est…", "L'endroit ou la personne d'où elle vient", ["Une rivière", "Le titre de l'information"],
     "La source, c'est l'endroit ou la personne d'où vient une information."),
    ("p9-2", "Avant de partager une information, tu cherches…", "La source et la date", ["Le plus joli dessin", "Le plus de likes"],
     "Avant de croire ou de partager, je cherche la source et la date."),
    ("p9-3", "Une image truquée, c'est une image…", "Changée ou fabriquée pour faire croire une chose fausse", ["Très belle", "Très petite"],
     "Une image truquée a été changée ou fabriquée pour faire croire une chose fausse. Une IA peut fabriquer de fausses images très réalistes."),
    ("p9-3", "Tu vois une image étonnante. Que fais-tu avant de la croire ?", "Je cherche des indices, la date et l'auteur", ["Je la partage tout de suite", "Je la crois parce qu'elle est jolie"],
     "Une image peut être truquée. Je cherche les indices, la date et l'auteur avant de la croire."),
    ("p9-4", "Une preuve, c'est…", "Ce qui montre qu'une information est vraie", ["Un cri très fort", "Une couleur"],
     "Une preuve est ce qui montre qu'une information est vraie."),
    ("p9-4", "Pour vérifier une info, tu demandes : qui l'a dit, quand, et…", "Avec quelle preuve", ["Avec quelle couleur", "Avec quel chapeau"],
     "Avant de croire ou de partager, je vérifie : qui l'a dit, quand, et avec quelle preuve."),

    # ───── p10 · Une IA pour mon quartier ─────
    ("p10-1", "Un besoin, c'est…", "Ce qui manque vraiment aux gens", ["Ce qu'on a envie d'acheter", "Un nouveau jouet"],
     "Un besoin, c'est ce qui manque vraiment aux gens. On l'écoute avant de chercher une idée."),
    ("p10-1", "Qui dit quels sont les besoins du quartier ?", "Les gens du quartier", ["L'IA, toute seule", "Un robot"],
     "Une IA ne choisit pas le problème. Ce sont les gens qui disent leurs besoins."),
    ("p10-2", "Une idée faisable, c'est une idée qu'on peut…", "Vraiment réaliser avec les moyens qu'on a", ["Seulement rêver", "Faire avec un million de robots"],
     "Une idée faisable est une idée qu'on peut vraiment réaliser avec les moyens qu'on a."),
    ("p10-2", "Une bonne idée d'IA pour le quartier est…", "Utile, faisable et pensée pour les gens", ["Très chère et compliquée", "Faite sans parler aux gens"],
     "Une bonne idée d'IA est utile, faisable et pensée pour les gens du quartier. Ce sont les gens qui décident et qui agissent."),
    ("p10-3", "Un prototype, c'est…", "Un premier modèle simple pour tester une idée", ["Le dernier modèle, parfait", "Un secret"],
     "Un prototype est un premier modèle simple, fait pour tester une idée avant de la construire."),
    ("p10-3", "Un prototype peut être…", "Un simple dessin", ["Obligatoirement une machine géante", "Impossible à dessiner"],
     "Un prototype peut être un simple dessin. L'important, c'est de tester l'idée."),
    ("p10-4", "Une IA pour le quartier part d'abord…", "D'un vrai besoin", ["D'une machine déjà faite", "D'un mot de passe"],
     "Une IA pour mon quartier part d'un vrai besoin, se teste avec un prototype et protège les données des gens."),
    ("p10-4", "Une bonne IA de quartier doit aussi…", "Protéger les données des gens", ["Garder les secrets pour les vendre", "Ignorer les gens"],
     "Une bonne IA de quartier écoute les gens et protège leurs données."),
]


def build():
    """Les énigmes prêtes à enregistrer. La bonne réponse change de place (A, B, C) d'une énigme à l'autre."""
    out = []
    for n, (lesson_id, question, right, wrong, why) in enumerate(RIDDLES):
        position = n % 3
        options = list(wrong)
        options.insert(position, right)
        out.append({
            "lesson_id": lesson_id,
            "question": question,
            "options": options,
            "correct_index": position,
            "explanation": why,
        })
    return out
