import { useEffect } from 'react';
import * as Network from 'expo-network';
import { useCommunityStore } from '../store/communityStore';
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
      if (online) useCommunityStore.getState().retryFailedMessages();
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
}
