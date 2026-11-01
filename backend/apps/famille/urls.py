from django.urls import path

from .views import FamilyMessagesView

urlpatterns = [
    path('famille/messages', FamilyMessagesView.as_view(), name='family-messages'),
    path('famille/messages/', FamilyMessagesView.as_view(), name='family-messages-slash'),
]
