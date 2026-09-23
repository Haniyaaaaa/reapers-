import { navigationRef } from '../navigation/navigationRef';

/** Every "tap a name/avatar" spot in the app (chat, comments, reviews, cards, team requests,
 * event applications, ...) calls `useProfilePreviewStore.getState().open(userId)` — always
 * imperatively, never as a rendered hook. This used to open a summary sheet with its own "View
 * full profile" link one tap deeper (ProfilePreviewSheet, now removed); `open()` now navigates
 * straight to the real Profile screen instead, so every one of those ~15 call sites got the
 * shorter path for free with no change needed at the call site itself. */
export const useProfilePreviewStore = {
  getState: () => ({
    open: (userId: string) => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('Main', { screen: 'Profile', params: { id: userId } });
      }
    },
  }),
};
