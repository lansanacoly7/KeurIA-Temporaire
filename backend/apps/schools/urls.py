from django.urls import path

from .views import PublicSchoolView

urlpatterns = [
    path('schools/<slug:slug>', PublicSchoolView.as_view(), name='public-school'),
    path('schools/<slug:slug>/', PublicSchoolView.as_view(), name='public-school-slash'),
]
