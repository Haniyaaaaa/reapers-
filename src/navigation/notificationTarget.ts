import type { NotificationItem } from '../types/extra';

/** Minimal structural shape both NotificationsScreen's plain stack nav prop and HomeScreen's
 * composite tab+stack nav prop satisfy — React Navigation's specific nav prop types are
 * branded/nominal and don't structurally assign to each other, so a narrow interface (just
 * the `navigate` call this function actually makes) is used instead of importing either. */
type NavigateCapable = { navigate: (screen: string, params?: Record<string, unknown>) => void };

/** Shared by NotificationsScreen's in-app tap handler and the push-notification-tap listener
 * (src/features/home/screens/HomeScreen.tsx) so the two routing paths — tapping a
 * notification row in the app vs. tapping a device push — never drift apart. */
export function navigateToNotificationTarget(nav: NavigateCapable, target: NotificationItem['target']) {
  switch (target.screen) {
    case 'Network':
      nav.navigate('Network');
      break;
    case 'Profile':
      nav.navigate('Profile', { id: target.id });
      break;
    case 'ChatDetail':
      nav.navigate('ChatDetail', { id: target.id });
      break;
    case 'EventDetail':
      nav.navigate('EventDetail', { id: target.id });
      break;
    case 'CommunityDetail':
      nav.navigate('CommunityDetail', { id: target.id });
      break;
    case 'DemoDetail':
      nav.navigate('DemoDetail', { id: target.id });
      break;
    case 'ExpertProfile':
      nav.navigate('ExpertProfile', { id: target.id });
      break;
    case 'SupportTicketDetail':
      nav.navigate('SupportTicketDetail', { id: target.id });
      break;
    case 'RoomInvites':
      nav.navigate('RoomInvites');
      break;
    case 'RoomJoinRequests':
      nav.navigate('RoomJoinRequests', { roomId: target.id });
      break;
    case 'EventHub':
      nav.navigate('EventHub');
      break;
    case 'EventApplications':
      nav.navigate('EventApplications', { eventId: target.id });
      break;
    case 'ExpertAvailability':
      nav.navigate('ExpertAvailability');
      break;
    case 'BecomeExpert':
      nav.navigate('BecomeExpert');
      break;
    case 'MyBookings':
      nav.navigate('MyBookings');
      break;
    case 'TeamRequestApplicants':
      nav.navigate('TeamRequestApplicants', { teamRequestId: target.id });
      break;
  }
}
