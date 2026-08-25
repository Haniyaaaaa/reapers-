import { Platform, Share } from 'react-native';

export async function copyText(text: string) {
  try {
    const clip = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (clip?.writeText) {
      await clip.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  if (Platform.OS !== 'web') {
    await Share.share({ message: text });
    return true;
  }
  return false;
}
