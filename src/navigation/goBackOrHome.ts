type BackCapable = {
  canGoBack: () => boolean;
  goBack: () => void;
  navigate: (screen: string, params?: Record<string, unknown>) => void;
};

/** Back button handler for screens that can be the first screen in the stack (deep links,
 * push-notification opens, dev reloads) — falls back to Home instead of a dead GO_BACK. */
export function goBackOrHome(nav: BackCapable) {
  if (nav.canGoBack()) nav.goBack();
  else nav.navigate('Tabs');
}
