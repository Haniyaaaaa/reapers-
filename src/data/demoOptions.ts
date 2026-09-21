/** Shared by DemoUploadScreen and the demo edit form so both offer exactly the same choices. */
export const DEMO_GENRES = ['Tactics', 'Action RPG', 'FPS', 'Platformer', 'Strategy', 'Puzzle', 'RPG', 'Simulation', 'Horror', 'Adventure'];
export const DEMO_ENGINES = ['Unity', 'Unreal Engine', 'Godot', 'Custom Engine', 'WebAssembly'];
export const DEMO_PLATFORMS = ['PC', 'ANDROID', 'IOS', 'MAC', 'CONSOLE', 'WEBGL'];
export const DEMO_TAGS = ['TACTICS', 'SCI-FI', 'TURN-BASED', 'ROGUELIKE', 'CO-OP', 'UNITY'];

/** demos.genre stores "Genre · Engine" in one string (see DemoUploadScreen). */
export function splitGenreEngine(value: string): { genre: string; engine: string } {
  const [genre, ...rest] = value.split(' · ');
  return { genre: genre ?? '', engine: rest.join(' · ') };
}
