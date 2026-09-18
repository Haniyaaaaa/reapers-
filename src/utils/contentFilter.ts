// Local, offline word-list check for abusive/profane language — not an ML/API-based filter.
// Deliberately conservative (whole-word match only) to avoid false positives on legitimate
// words that merely contain a banned substring (e.g. "Scunthorpe problem").
const BANNED_TERMS = [
  'fuck',
  'fucker',
  'fucking',
  'motherfucker',
  'shit',
  'bullshit',
  'bitch',
  'asshole',
  'bastard',
  'dick',
  'piss',
  'cunt',
  'whore',
  'slut',
  'retard',
  'retarded',
  'faggot',
  'fag',
  'nigger',
  'nigga',
  'chink',
  'spic',
  'kike',
  'tranny',
  'rape',
  'rapist',
  // Common abbreviated/short forms — the full-word list above alone misses these since
  // they're their own standalone tokens, not substrings of a longer banned word.
  'fk',
  'fck',
  'stfu',
  'gtfo',
  'wtf',
  'ffs',
  'kys',
];

// Multi-word abusive phrases, checked separately since BANNED_TERMS only matches single
// tokens — "kill yourself" doesn't contain a banned single word on its own.
const BANNED_PHRASES = ['kill yourself', 'kill urself', 'kill ur self'];

const LEET_MAP: Record<string, string> = {
  '@': 'a',
  '4': 'a',
  '8': 'b',
  '3': 'e',
  '1': 'i',
  '!': 'i',
  '0': 'o',
  '$': 's',
  '5': 's',
  '7': 't',
};

function normalize(text: string): string {
  const folded = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split('')
    .map((ch) => LEET_MAP[ch] ?? ch)
    .join('');
  // Collapse runs of 3+ repeated letters down to 1 (e.g. "fuuuuck" -> "fuck") so stretched-out
  // evasions still match, without merging intentional doubles like "ass" or "bitch".
  return folded.replace(/([a-z])\1{2,}/g, '$1');
}

export function checkContent(text: string): { flagged: boolean; matches: string[] } {
  const normalized = normalize(text);
  const wordMatches = BANNED_TERMS.filter((term) => new RegExp(`\\b${term}\\b`, 'i').test(normalized));
  const phraseMatches = BANNED_PHRASES.filter((phrase) =>
    new RegExp(`\\b${phrase.replace(/ /g, '\\s+')}\\b`, 'i').test(normalized),
  );
  const matches = [...wordMatches, ...phraseMatches];
  return { flagged: matches.length > 0, matches };
}
