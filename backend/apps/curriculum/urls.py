from django.urls import path
from .views import (
    AgeTrackListView,
    CurriculumOverviewView,
    AgeTrackDetailView,
    ModuleDetailView,
    LessonDetailView,
    GlossaryView,
    Content79ListView,
    Content79View,
    CharacterListView,
    LessonFicheView,
    media_view,
)

app_name = 'curriculum'

urlpatterns = [
    path('curriculum/tracks/', AgeTrackListView.as_view(), name='track-list'),
    path('curriculum/overview/', CurriculumOverviewView.as_view(), name='curriculum-overview'),
    path('curriculum/tracks/<str:key>/', AgeTrackDetailView.as_view(), name='track-detail'),
    path('curriculum/modules/<str:world_id>/', ModuleDetailView.as_view(), name='module-detail'),
    path('curriculum/glossary/', GlossaryView.as_view(), name='glossary'),
    path('curriculum/lessons/<str:lesson_id>/', LessonDetailView.as_view(), name='lesson-detail'),
    path('curriculum/fiche/<str:lesson_id>/', LessonFicheView.as_view(), name='lesson-fiche'),
    path('curriculum/content79/', Content79ListView.as_view(), name='content79-list'),
    path('curriculum/content79/<str:lesson_id>/', Content79View.as_view(), name='content79-detail'),
    path('curriculum/characters/', CharacterListView.as_view(), name='character-list'),
    path('media/<int:asset_id>/<str:stamp>', media_view, name='media'),
]
