import type Ionicons from '@expo/vector-icons/Ionicons';

export type TourTarget =
  | { kind: 'tab'; tab: 'CommunitiesTab' | 'EventsTab' | 'HomeTab' | 'DemosTab' | 'ExpertsTab'; slot: number }
  | { kind: 'screen'; screen: 'ChatDirectory' | 'Network' | 'Profile' };

export type TourStep = {
  key: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  /** Small label above the title, e.g. "HOME". */
  kicker: string;
  title: string;
  body: string;
  /** Where the app should be while this step is showing. */
  target: TourTarget;
};

// Tab slots match the tab bar's fixed left-to-right order (Communities, Events, Home, Demos, Experts).
export const TOUR_STEPS: TourStep[] = [
  {
    key: 'welcome',
    icon: 'rocket-outline',
    kicker: 'WELCOME',
    title: 'Welcome to Reapers',
    body: "The home for game developers, players and experts. Here's a quick look around.",
    target: { kind: 'tab', tab: 'HomeTab', slot: 2 },
  },
  {
    key: 'home',
    icon: 'home-outline',
    kicker: 'HOME',
    title: 'Your command center',
    body: "Events, demos, teams and the feed in one place. Search everything from the top bar.",
    target: { kind: 'tab', tab: 'HomeTab', slot: 2 },
  },
  {
    key: 'communities',
    icon: 'people-outline',
    kicker: 'COMMUNITIES',
    title: 'Find your guild',
    body: "Join studios, engine circles and indie crews — each has its own chat room.",
    target: { kind: 'tab', tab: 'CommunitiesTab', slot: 0 },
  },
  {
    key: 'events',
    icon: 'calendar-outline',
    kicker: 'EVENTS',
    title: 'Never miss a meetup',
    body: "Watch parties, game jams and tournaments. RSVP in one tap, or host your own.",
    target: { kind: 'tab', tab: 'EventsTab', slot: 1 },
  },
  {
    key: 'demos',
    icon: 'game-controller-outline',
    kicker: 'DEMOS',
    title: 'Play and get feedback',
    body: "Try trending indie demos and rate them. Upload yours to collect feedback.",
    target: { kind: 'tab', tab: 'DemosTab', slot: 3 },
  },
  {
    key: 'experts',
    icon: 'shield-checkmark-outline',
    kicker: 'EXPERTS',
    title: 'Book an expert',
    body: "Book a 15-minute session with a verified pro, then leave a review.",
    target: { kind: 'tab', tab: 'ExpertsTab', slot: 4 },
  },
  {
    key: 'chat',
    icon: 'chatbubbles-outline',
    kicker: 'CHAT',
    title: 'Talk in real time',
    body: "Rooms and DMs with GIFs, voice notes and reactions. Open it from Home's chat icon.",
    target: { kind: 'screen', screen: 'ChatDirectory' },
  },
  {
    key: 'network',
    icon: 'git-network-outline',
    kicker: 'FIND TEAMMATES',
    title: 'Build your team',
    body: "Post what you're building, apply to open roles and connect with matching devs.",
    target: { kind: 'screen', screen: 'Network' },
  },
  {
    key: 'profile',
    icon: 'person-circle-outline',
    kicker: 'PROFILE',
    title: 'Make it yours',
    body: "Show your work, skills and credibility. Manage your details in Settings.",
    target: { kind: 'screen', screen: 'Profile' },
  },
  {
    key: 'done',
    icon: 'sparkles-outline',
    kicker: 'ALL SET',
    title: "You're ready to play",
    body: "Explore at your own pace. Replay this tour any time from Settings.",
    target: { kind: 'tab', tab: 'HomeTab', slot: 2 },
  },
];
