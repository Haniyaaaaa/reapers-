import { createAudioPlayer } from 'expo-audio';

const SOUND_SOURCES = {
  // Post published, comment/reaction sent — a quick bright chime.
  success: require('../../assets/sounds/success.wav'),
  // A connection request goes out or gets accepted — a soft rising blip.
  connect: require('../../assets/sounds/connect.wav'),
  // Something got approved (account, event application, booking) — a fuller ascending chime.
  approve: require('../../assets/sounds/approve.wav'),
  // Reacting to a post — a tiny, snappy pop, quiet enough for rapid repeat taps.
  like: require('../../assets/sounds/like.wav'),
} as const;

export type SoundEffect = keyof typeof SOUND_SOURCES;

/** Fire-and-forget UI sound effect. Each call makes a fresh short-lived player instead of
 * reusing one, since these fire from many unrelated places in quick succession (e.g. rapid
 * reactions) and a shared player would just interrupt itself; a few-hundred-ms WAV player is
 * cheap enough that this isn't worth the complexity of a pool. Never throws — a missing sound
 * or muted device must never block the real action that triggered it. */
export function playSound(effect: SoundEffect): void {
  try {
    const player = createAudioPlayer(SOUND_SOURCES[effect]);
    player.play();
    // Release once playback naturally ends — status polling here (not an event subscription)
    // keeps this a one-line fire-and-forget helper with no listener to remember to tear down.
    const check = setInterval(() => {
      if (!player.playing) {
        clearInterval(check);
        player.release();
      }
    }, 300);
  } catch {
    // Best-effort — audio failing (e.g. no output device) must never break the calling flow.
  }
}
