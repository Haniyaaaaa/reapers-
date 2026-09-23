import { useEffect } from 'react';
import * as Network from 'expo-network';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useUiStore } from '../store/uiStore';

export function useOffline() {
  return useUiStore((s) => s.offline);
}

const RECHECK_MS = 5000;

export function useConnectivity() {
  useEffect(() => {
    let mounted = true;
    let recheckTimer: ReturnType<typeof setInterval> | undefined;

    const applyState = (state: Network.NetworkState) => {
      if (!mounted) return;
      // expo-network's isConnected reflects the network interface, not real internet access.
      // isInternetReachable is the stronger signal when Android actually bothers to populate
      // it (it doesn't always) — treat it as authoritative when present, otherwise fall back to
      // isConnected alone rather than assuming offline from a field the OS just left null.
      const online = state.isInternetReachable ?? (state.isConnected !== false);
      const wasOffline = useUiStore.getState().offline;
      useUiStore.getState().setConnected(online);
      if (online && wasOffline) {
        const userId = useAuthStore.getState().session?.user.id;
        if (userId) useChatStore.getState().retryAllFailed(userId);
      }
    };

    const check = () => {
      Network.getNetworkStateAsync().then(applyState).catch(() => undefined);
    };

    check();
    const sub = Network.addNetworkStateListener(applyState);

    // A single flaky read (common on Android right after resume/cold start) can otherwise get
    // the app stuck showing "You're offline" indefinitely — nothing forces a re-check unless
    // the OS reports another real transition, which may never come if the connection itself
    // never actually changed. Re-polling while believed-offline self-heals within a few
    // seconds instead of requiring the user to toggle airplane mode to clear a wrong banner.
    recheckTimer = setInterval(() => {
      if (useUiStore.getState().offline) check();
    }, RECHECK_MS);

    return () => {
      mounted = false;
      sub.remove();
      if (recheckTimer) clearInterval(recheckTimer);
    };
  }, []);
}
