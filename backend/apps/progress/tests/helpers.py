from apps.curriculum.models import AgeTrack, Lesson, Module


def make_lesson(lesson_id="p1-1", xp=20, title=None):
    """Leçon du parcours (catalogue serveur) ; le module et le parcours sont créés au besoin."""
    track, _ = AgeTrack.objects.get_or_create(key="7-9", defaults={"label": "7–9 ans", "name": "Petits Explorateurs"})
    module, _ = Module.objects.get_or_create(
        world_id=lesson_id.split("-")[0], defaults={"track": track, "title": f"Module {lesson_id.split('-')[0]}", "description": "d"},
    )
    lesson, _ = Lesson.objects.get_or_create(
        lesson_id=lesson_id, defaults={"module": module, "title": title or f"Leçon {lesson_id}", "xp": xp},
    )
    return lesson
