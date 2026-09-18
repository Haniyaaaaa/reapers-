// Generates short synthesized UI sound effects as real 16-bit PCM WAV files — no external
// audio assets, no internet fetch, just math. Pure sine tones sound flat, so each tone layers
// a quiet 2nd harmonic (bell-like timbre) and uses an attack/decay envelope with a short
// fade-out to avoid clicks. Run once with `node scripts/generate-sounds.js`; output lands in
// assets/sounds/ and is committed like any other asset (not regenerated at build time).
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;

function writeWav(filePath, samples) {
  const numSamples = samples.length;
  const byteRate = SAMPLE_RATE * 2;
  const blockAlign = 2;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  fs.writeFileSync(filePath, buffer);
}

// One tone: attack/decay envelope, fundamental + quiet 2nd harmonic for a soft bell timbre,
// optional pitch sweep (startFreq -> endFreq) for an energetic "rising" feel.
function tone({ startFreq, endFreq = startFreq, durationMs, gain = 0.5, attackMs = 4 }) {
  const n = Math.round((durationMs / 1000) * SAMPLE_RATE);
  const attackN = Math.round((attackMs / 1000) * SAMPLE_RATE);
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const progress = i / n;
    const freq = startFreq + (endFreq - startFreq) * progress;
    const phase = 2 * Math.PI * freq * t;
    const fundamental = Math.sin(phase);
    const harmonic = 0.25 * Math.sin(phase * 2);
    const envelope =
      i < attackN
        ? i / attackN
        : Math.exp(-3 * ((i - attackN) / (n - attackN || 1)));
    out[i] = gain * envelope * (fundamental + harmonic);
  }
  return out;
}

function concat(...chunks) {
  return chunks.flat();
}

function silence(ms) {
  return new Array(Math.round((ms / 1000) * SAMPLE_RATE)).fill(0);
}

function mix(a, b) {
  const len = Math.max(a.length, b.length);
  const out = new Array(len);
  for (let i = 0; i < len; i++) out[i] = (a[i] ?? 0) + (b[i] ?? 0);
  return out;
}

const outDir = path.join(__dirname, '..', 'assets', 'sounds');
fs.mkdirSync(outDir, { recursive: true });

// success.wav — post created: a quick two-note ascending chime (A5 -> E6), bright and short.
writeWav(
  path.join(outDir, 'success.wav'),
  concat(tone({ startFreq: 880, durationMs: 90, gain: 0.5 }), silence(12), tone({ startFreq: 1318.5, durationMs: 140, gain: 0.55 })),
);

// connect.wav — connection made: a soft rising blip, one tone sweeping up in pitch.
writeWav(
  path.join(outDir, 'connect.wav'),
  tone({ startFreq: 660, endFreq: 990, durationMs: 160, gain: 0.5, attackMs: 6 }),
);

// approve.wav — something approved: a brighter three-note ascending arpeggio (C6-E6-G6),
// each note mixed with a touch of the next for smoothness rather than a hard gap.
writeWav(
  path.join(outDir, 'approve.wav'),
  concat(
    tone({ startFreq: 1046.5, durationMs: 90, gain: 0.45 }),
    silence(8),
    tone({ startFreq: 1318.5, durationMs: 90, gain: 0.5 }),
    silence(8),
    tone({ startFreq: 1568, durationMs: 170, gain: 0.55 }),
  ),
);

// like.wav — reacting to a post: a tiny, quick pop, snappier and shorter than the others so
// it doesn't compete with rapid taps across multiple posts.
writeWav(
  path.join(outDir, 'like.wav'),
  tone({ startFreq: 1200, endFreq: 900, durationMs: 70, gain: 0.45, attackMs: 2 }),
);

console.log('Generated success.wav, connect.wav, approve.wav, like.wav in', outDir);
