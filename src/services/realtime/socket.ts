/** Placeholder for chat / typing realtime (M3). Wire Socket.IO or similar later. */
export function connectRealtime(_token: string) {
  return {
    disconnect() {},
    on(_event: string, _cb: (...args: unknown[]) => void) {},
    emit(_event: string, _payload?: unknown) {},
  };
}
