import { useEffect } from 'react';
import * as Network from 'expo-network';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useUiStore } from '../store/uiStore';

export function useOffline() {
  return useUiStore((s) => s.offline);
}

export function useConnectivity() {
  useEffect(() => {
    let mounted = true;
    Network.getNetworkStateAsync()
      .then((state) => {
        if (mounted) useUiStore.getState().setConnected(state.isConnected !== false);
      })
      .catch(() => undefined);
    const sub = Network.addNetworkStateListener((state) => {
      const online = state.isConnected !== false;
      useUiStore.getState().setConnected(online);
      const userId = useAuthStore.getState().session?.user.id;
      if (online && userId) useChatStore.getState().retryAllFailed(userId);
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
}
