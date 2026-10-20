const range = (from, names) => names.map((n, i) => [from + i, n]);

const LETTERS = range(0x04, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));
const DIGITS = range(0x1e, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']);
const SYMBOLS = [
  [0x2d, '-'], [0x2e, '='], [0x2f, '['], [0x30, ']'], [0x31, '\\'], [0x33, ';'], [0x34, "'"], [0x35, '`'],
  [0x36, ','], [0x37, '.'], [0x38, '/'],
];
const FUNCTION = range(0x3a, ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'])
  .concat(range(0x68, ['F13', 'F14', 'F15', 'F16', 'F17', 'F18', 'F19', 'F20', 'F21', 'F22', 'F23', 'F24']));
const EDITING = [
  [0x28, { pl: 'Enter', en: 'Enter' }], [0x29, 'Esc'], [0x2a, { pl: 'Backspace', en: 'Backspace' }], [0x2b, 'Tab'],
  [0x2c, { pl: 'Spacja', en: 'Space' }], [0x39, 'Caps Lock'], [0x46, 'PrtSc'], [0x47, 'Scroll Lock'], [0x48, 'Pause'],
  [0x49, 'Insert'], [0x4c, 'Delete'], [0x65, { pl: 'Menu', en: 'Menu' }], [0x53, 'Num Lock'],
];
const NAVIGATION = [
  [0x52, '↑'], [0x51, '↓'], [0x50, '←'], [0x4f, '→'], [0x4a, 'Home'], [0x4d, 'End'], [0x4b, 'PgUp'], [0x4e, 'PgDn'],
];
const MODIFIERS = [
  [0xe0, { pl: 'Ctrl lewy', en: 'Left Ctrl' }], [0xe1, { pl: 'Shift lewy', en: 'Left Shift' }],
  [0xe2, { pl: 'Alt lewy', en: 'Left Alt' }], [0xe3, { pl: 'Win / Cmd lewy', en: 'Left Win / Cmd' }],
  [0xe4, { pl: 'Ctrl prawy', en: 'Right Ctrl' }], [0xe5, { pl: 'Shift prawy', en: 'Right Shift' }],
  [0xe6, { pl: 'Alt prawy', en: 'Right Alt' }], [0xe7, { pl: 'Win / Cmd prawy', en: 'Right Win / Cmd' }],
];
const MEDIA = [
  [0xae, { pl: 'Odtwórz / pauza', en: 'Play / pause' }], [0xab, { pl: 'Następny utwór', en: 'Next track' }],
  [0xac, { pl: 'Poprzedni utwór', en: 'Previous track' }], [0xad, { pl: 'Stop', en: 'Stop' }],
  [0xa8, { pl: 'Wycisz', en: 'Mute' }], [0xa9, { pl: 'Głośniej', en: 'Volume up' }], [0xaa, { pl: 'Ciszej', en: 'Volume down' }],
  [0xbd, { pl: 'Jaśniej ekran', en: 'Screen brighter' }], [0xbe, { pl: 'Ciemniej ekran', en: 'Screen dimmer' }],
  [0xb2, { pl: 'Kalkulator', en: 'Calculator' }], [0xb1, { pl: 'Poczta', en: 'Mail' }], [0xb3, { pl: 'Mój komputer', en: 'My computer' }],
  [0xb4, { pl: 'Szukaj', en: 'Search' }], [0xb5, { pl: 'Strona główna', en: 'Browser home' }],
  [0xb6, { pl: 'Wstecz', en: 'Back' }], [0xb7, { pl: 'Dalej', en: 'Forward' }], [0xb9, { pl: 'Odśwież', en: 'Refresh' }],
];
const LIGHT_KEYS = [
  [0x7e12, { pl: 'Pasek: następny tryb', en: 'Edge light: next mode' }],
  [0x7e14, { pl: 'Pasek: następny kolor', en: 'Edge light: next colour' }],
  [0x7e10, { pl: 'Pasek: jaśniej', en: 'Edge light: brighter' }],
  [0x7e11, { pl: 'Pasek: ciemniej', en: 'Edge light: dimmer' }],
  [0x7e15, { pl: 'Pasek: szybciej', en: 'Edge light: faster' }],
  [0x7e16, { pl: 'Pasek: wolniej', en: 'Edge light: slower' }],
  [0x7e13, { pl: 'Pasek: które boki', en: 'Edge light: sides' }],
  [0x7821, { pl: 'Klawisze: następny efekt', en: 'Keys: next effect' }],
  [0x7823, { pl: 'Klawisze: następny kolor', en: 'Keys: next colour' }],
  [0x7827, { pl: 'Klawisze: jaśniej', en: 'Keys: brighter' }],
  [0x7828, { pl: 'Klawisze: ciemniej', en: 'Keys: dimmer' }],
  [0x7829, { pl: 'Klawisze: szybciej', en: 'Keys: faster' }],
  [0x782a, { pl: 'Klawisze: wolniej', en: 'Keys: slower' }],
  [0x7e0f, { pl: 'Pokaż baterię', en: 'Show battery' }],
];

const SPECIAL = [
  [0x0000, { pl: 'Nic', en: 'Nothing' }], [0x0001, { pl: 'Jak warstwa niżej', en: 'Transparent' }],
];

export const KEYCODE_GROUPS = [
  { id: 'letters', items: LETTERS },
  { id: 'digits', items: [...DIGITS, ...SYMBOLS] },
  { id: 'function', items: FUNCTION },
  { id: 'editing', items: [...EDITING, ...NAVIGATION] },
  { id: 'modifiers', items: MODIFIERS },
  { id: 'media', items: MEDIA },
  { id: 'lighting', items: LIGHT_KEYS },
  { id: 'special', items: SPECIAL },
];

const NAMES = new Map(KEYCODE_GROUPS.flatMap(g => g.items));

const SHORT = new Map([
  [0x28, 'Enter'], [0x2a, 'Bksp'], [0x2c, 'Space'], [0x39, 'Caps'], [0x47, 'ScrLk'], [0x49, 'Ins'], [0x4c, 'Del'],
  [0x53, 'NumLk'], [0x65, 'Menu'], [0xe0, 'Ctrl'], [0xe1, 'Shift'], [0xe2, 'Alt'], [0xe3, 'Win'], [0xe4, 'Ctrl'],
  [0xe5, 'Shift'], [0xe6, 'Alt'], [0xe7, 'Win'], [0xae, 'Play'], [0xab, 'Next'], [0xac, 'Prev'], [0xad, 'Stop'], [0xa8, 'Mute'],
  [0xa9, 'Vol+'], [0xaa, 'Vol−'], [0xbd, 'Bri+'], [0xbe, 'Bri−'], [0xb2, 'Calc'], [0xb1, 'Mail'], [0xb3, 'PC'],
  [0xb4, 'Find'], [0xb5, 'WWW'], [0xb6, 'Back'], [0xb7, 'Fwd'], [0xb9, 'Rfsh'], [0x0000, '✕'], [0x0001, '▽'],
]);

const LIGHTING = new Map([
  [0x7820, 'RGB'], [0x7821, 'RGB ▶'], [0x7822, 'RGB ◀'], [0x7823, 'Hue+'], [0x7824, 'Hue−'], [0x7825, 'Sat+'],
  [0x7826, 'Sat−'], [0x7827, 'Bri+'], [0x7828, 'Bri−'], [0x7829, 'Spd+'], [0x782a, 'Spd−'],
]);

const NUPHY = new Map([
  [0x7e00, 'RF DFU'], [0x7e01, 'USB'], [0x7e02, '2.4G'], [0x7e03, 'BT1'], [0x7e04, 'BT2'], [0x7e05, 'BT3'],
  [0x7e06, 'Task'], [0x7e07, 'Find'], [0x7e08, 'Siri'], [0x7e09, 'Cons'], [0x7e0a, 'DND'], [0x7e0b, 'Print'],
  [0x7e0c, 'Shot'], [0x7e0d, 'Reset'], [0x7e0e, 'Sleep'], [0x7e0f, 'Bat'], [0x7e10, 'Bar+'], [0x7e11, 'Bar−'],
  [0x7e12, 'Bar ▶'], [0x7e13, 'Bar ◆'], [0x7e14, 'Bar ●'], [0x7e15, 'Bar »'], [0x7e16, 'Bar «'],
]);

const text = (v, lang) => (typeof v === 'string' ? v : v[lang]);

export function keycodeName(code, lang) {
  if (NAMES.has(code)) return text(NAMES.get(code), lang);
  return keycodeLabel(code);
}

export function keycodeLabel(code) {
  if (SHORT.has(code)) return SHORT.get(code);
  if (LIGHTING.has(code)) return LIGHTING.get(code);
  if (NUPHY.has(code)) return NUPHY.get(code);
  if (NAMES.has(code)) {
    const v = NAMES.get(code);
    return typeof v === 'string' ? v : v.en;
  }
  if (code >= 0x5220 && code <= 0x523f) return 'Fn';
  return `0x${code.toString(16).padStart(4, '0')}`;
}

export const isLayerKey = code => code >= 0x5200 && code <= 0x52ff;
