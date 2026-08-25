export const endpoints = {
  auth: {
    login: '/auth/login',
    signup: '/auth/signup',
    reset: '/auth/reset',
    session: '/auth/session',
  },
  profile: '/profile',
  feed: '/home/feed',
  chatrooms: '/chatrooms',
  events: '/events',
  demos: '/demos',
  experts: '/experts',
  bookings: '/bookings',
  network: '/network',
  notifications: '/notifications',
} as const;
