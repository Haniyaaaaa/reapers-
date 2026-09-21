import { Alert, Linking } from 'react-native';
import { normalizeUrl } from './validation';

/** Opens a user-entered link. Links are typed by people ("salvage.tech/in"), so the scheme is
 * added when missing — without one the OS resolves it as a local file path and throws
 * "Unable to open URL: file:///…". Never throws: a bad link shows an alert instead of an
 * unhandled promise rejection. */
export async function openExternalUrl(raw: string | undefined | null): Promise<void> {
  const url = normalizeUrl(raw ?? '');
  if (!url) return;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Could not open link', url);
  }
}
