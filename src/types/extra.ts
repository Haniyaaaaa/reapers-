export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  target:
    | { screen: 'ChatDetail'; id: string }
    | { screen: 'EventDetail'; id: string }
    | { screen: 'DemoDetail'; id: string }
    | { screen: 'ExpertProfile'; id: string }
    | { screen: 'Network' }
    | { screen: 'Profile'; id?: string };
};

export type Review = {
  id: string;
  demoId: string;
  reviewer: string;
  scores: { gameplay: number; art: number; concept: number; polish: number };
  comment: string;
  createdAt: string;
};

export type DemoComment = {
  id: string;
  demoId: string;
  userId: string;
  userName: string;
  avatarId?: string;
  text: string;
  createdAt: string;
  likes: number;
};

export type TeamRequest = {
  id: string;
  project: string;
  roles: string[];
  excerpt: string;
};

export type PersonCard = {
  id: string;
  displayName: string;
  roles: string[];
  skills: string[];
  connect: 'connect' | 'pending' | 'connected';
};

export type ExpertSlot = {
  day: string;
  time: string;
  available: boolean;
};
