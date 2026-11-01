from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from . import health, monitoring

urlpatterns = [
    # Documentation OpenAPI 3.0 / Swagger UI interactif
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Sondes de santé (sans authentification) pour l'orchestrateur et la supervision.
    path('api/health/live', health.live, name='health-live'),
    path('api/health/ready', health.ready, name='health-ready'),
    # Erreurs JavaScript des navigateurs (sans cookie, sans donnée personnelle) : elles arrivent dans les journaux et dans Sentry.
    path('api/monitoring/client-error', monitoring.ClientErrorView.as_view(), name='client-error'),
    # Intégration du module accounts sous /api/
    path('api/', include('apps.accounts.urls')),
    path('api/', include('apps.schools.urls')),
    path('api/', include('apps.learners.urls')),
    path('api/', include('apps.progress.urls')),
    path('api/', include('apps.curriculum.urls')),
    path('api/', include('apps.scolaire.urls')),
    path('api/', include('apps.superadmin.urls')),
    path('api/', include('apps.famille.urls')),
]

if settings.ADMIN_ENABLED:
    urlpatterns.insert(0, path(settings.ADMIN_URL, admin.site.urls))

if settings.SERVE_MEDIA:
    urlpatterns.append(re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}))

