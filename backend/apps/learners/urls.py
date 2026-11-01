from django.urls import path
from .views import ProfilesView

urlpatterns = [
    path('profiles', ProfilesView.as_view(), name='profiles'),
    path('profiles/', ProfilesView.as_view(), name='profiles-slash'),
]
