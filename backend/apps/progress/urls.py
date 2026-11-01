from django.urls import path
from .challenge import CharterView, DailyChallengeView
from .riddle import DailyRiddleView
from .leaderboard import LeaderboardWeeklyView
from .palou import PalouChatView
from .push import PushPublicKeyView, PushSubscribeView, PushUnsubscribeView
from .parental import ParentalLimitsView, ParentalUnlockView
from .views import (
    ProgressView, DailyUsageView,
    ParentTrackingView, ParentNotificationsView,
    TutorialCompleteView,
    MarkEventSeenView, RecordActivityView
)

urlpatterns = [
    path('daily-challenge', DailyChallengeView.as_view(), name='daily-challenge'),
    path('daily-challenge/', DailyChallengeView.as_view(), name='daily-challenge-slash'),
    path('charter', CharterView.as_view(), name='charter'),
    path('charter/', CharterView.as_view(), name='charter-slash'),
    path('push/public-key', PushPublicKeyView.as_view(), name='push-public-key'),
    path('push/subscribe', PushSubscribeView.as_view(), name='push-subscribe'),
    path('push/unsubscribe', PushUnsubscribeView.as_view(), name='push-unsubscribe'),
    path('palou/chat', PalouChatView.as_view(), name='palou-chat'),
    path('palou/chat/', PalouChatView.as_view(), name='palou-chat-slash'),
    path('progress', ProgressView.as_view(), name='progress'),
    path('progress/', ProgressView.as_view(), name='progress-slash'),
    path('progress/tutorial-complete', TutorialCompleteView.as_view(), name='tutorial-complete'),
    path('progress/tutorial-complete/', TutorialCompleteView.as_view(), name='tutorial-complete-slash'),
    path('daily-riddle', DailyRiddleView.as_view(), name='daily-riddle'),
    path('daily-riddle/', DailyRiddleView.as_view(), name='daily-riddle-slash'),
    path('daily-usage', DailyUsageView.as_view(), name='daily-usage'),
    path('daily-usage/', DailyUsageView.as_view(), name='daily-usage-slash'),
    path('progress/leaderboard/weekly', LeaderboardWeeklyView.as_view(), name='weekly-leaderboard'),
    path('progress/leaderboard/weekly/', LeaderboardWeeklyView.as_view(), name='weekly-leaderboard-slash'),
    path('progress/tracking', ParentTrackingView.as_view(), name='parent-tracking'),
    path('progress/tracking/', ParentTrackingView.as_view(), name='parent-tracking-slash'),
    path('progress/notifications', ParentNotificationsView.as_view(), name='parent-notifications'),
    path('progress/notifications/', ParentNotificationsView.as_view(), name='parent-notifications-slash'),
    path('progress/parental-limits', ParentalLimitsView.as_view(), name='parental-limits'),
    path('progress/parental-limits/', ParentalLimitsView.as_view(), name='parental-limits-slash'),
    path('progress/parental-limits/unlock', ParentalUnlockView.as_view(), name='parental-limits-unlock'),
    path('progress/parental-limits/unlock/', ParentalUnlockView.as_view(), name='parental-limits-unlock-slash'),
    path('progress/mark-event-seen', MarkEventSeenView.as_view(), name='mark-event-seen'),
    path('progress/mark-event-seen/', MarkEventSeenView.as_view(), name='mark-event-seen-slash'),
    path('progress/record-activity', RecordActivityView.as_view(), name='record-activity'),
    path('progress/record-activity/', RecordActivityView.as_view(), name='record-activity-slash'),
]
