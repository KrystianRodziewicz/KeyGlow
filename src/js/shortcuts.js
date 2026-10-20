export const DEFAULT_FN = {
  1: { 1: 0x003a, 2: 0x003b, 3: 0x003c, 4: 0x003d, 5: 0x003e, 6: 0x003f, 7: 0x0040, 8: 0x0041, 9: 0x0042, 10: 0x0043, 11: 0x0044, 12: 0x0045, 13: 0x7e0b, 17: 0x7e03, 18: 0x7e04, 19: 0x7e05, 20: 0x7e02, 42: 0x7e0d, 43: 0x7e0e, 44: 0x7e0f, 68: 0x782a, 69: 0x7829, 72: 0x7827, 80: 0x7821, 81: 0x7828, 82: 0x7823 },
  3: { 1: 0x00be, 2: 0x00bd, 3: 0x003c, 4: 0x003d, 5: 0x003e, 6: 0x003f, 7: 0x00ac, 8: 0x00ae, 9: 0x00ab, 10: 0x00a8, 11: 0x00aa, 12: 0x00a9, 13: 0x0046, 17: 0x7e03, 18: 0x7e04, 19: 0x7e05, 20: 0x7e02, 42: 0x7e0d, 43: 0x7e0e, 44: 0x7e0f, 47: 0x7c7b, 48: 0x7c7c, 49: 0x7c7d, 68: 0x782a, 69: 0x7829, 72: 0x7827, 80: 0x7821, 81: 0x7828, 82: 0x7823 },
  4: { 68: 0x7e16, 69: 0x7e15, 70: 0x7e13, 72: 0x7e10, 80: 0x7e12, 81: 0x7e11, 82: 0x7e14 },
};

export const FN_LAYERS = { win: { fn: 3, base: 2 }, mac: { fn: 1, base: 0 } };
export const SIDE_LAYER = 4;

export const HOLD = new Map([
  [0x7e02, { pl: 'przytrzymaj 3 s: parowanie', en: 'hold 3 s: pairing' }],
  [0x7e03, { pl: 'przytrzymaj 3 s: parowanie', en: 'hold 3 s: pairing' }],
  [0x7e04, { pl: 'przytrzymaj 3 s: parowanie', en: 'hold 3 s: pairing' }],
  [0x7e05, { pl: 'przytrzymaj 3 s: parowanie', en: 'hold 3 s: pairing' }],
  [0x7e0d, { pl: 'przytrzymaj 3 s', en: 'hold 3 s' }],
]);

export const NAMES = new Map([
  [0x7e00, { pl: 'Aktualizacja modułu radiowego', en: 'Wireless module update' }],
  [0x7e01, { pl: 'Połączenie kablem', en: 'Wired connection' }],
  [0x7e02, { pl: 'Odbiornik 2.4 GHz', en: '2.4 GHz receiver' }],
  [0x7e03, { pl: 'Bluetooth 1', en: 'Bluetooth 1' }],
  [0x7e04, { pl: 'Bluetooth 2', en: 'Bluetooth 2' }],
  [0x7e05, { pl: 'Bluetooth 3', en: 'Bluetooth 3' }],
  [0x7e06, { pl: 'Mission Control', en: 'Mission Control' }],
  [0x7e07, { pl: 'Spotlight', en: 'Spotlight' }],
  [0x7e08, { pl: 'Dyktowanie', en: 'Dictation' }],
  [0x7e0a, { pl: 'Nie przeszkadzać', en: 'Do not disturb' }],
  [0x7e0b, { pl: 'Zrzut ekranu', en: 'Screenshot' }],
  [0x7e0c, { pl: 'Zrzut fragmentu ekranu', en: 'Screenshot of an area' }],
  [0x7e0d, { pl: 'Reset do ustawień fabrycznych', en: 'Factory reset' }],
  [0x7e0e, { pl: 'Usypianie: włącz / wyłącz', en: 'Sleep: on / off' }],
  [0x7e0f, { pl: 'Poziom baterii na pasku: włącz / wyłącz', en: 'Battery level on the edge light: on / off' }],
  [0x7e10, { pl: 'Pasek: jaśniej', en: 'Edge light: brighter' }],
  [0x7e11, { pl: 'Pasek: ciemniej', en: 'Edge light: dimmer' }],
  [0x7e12, { pl: 'Pasek: następny tryb', en: 'Edge light: next mode' }],
  [0x7e13, { pl: 'Pasek: które boki świecą', en: 'Edge light: which sides' }],
  [0x7e14, { pl: 'Pasek: następny kolor', en: 'Edge light: next colour' }],
  [0x7e15, { pl: 'Pasek: szybciej', en: 'Edge light: faster' }],
  [0x7e16, { pl: 'Pasek: wolniej', en: 'Edge light: slower' }],
  [0x7820, { pl: 'Podświetlenie klawiszy: włącz / wyłącz', en: 'Key lighting: on / off' }],
  [0x7821, { pl: 'Klawisze: następny efekt', en: 'Keys: next effect' }],
  [0x7822, { pl: 'Klawisze: poprzedni efekt', en: 'Keys: previous effect' }],
  [0x7823, { pl: 'Klawisze: następny kolor', en: 'Keys: next colour' }],
  [0x7824, { pl: 'Klawisze: poprzedni kolor', en: 'Keys: previous colour' }],
  [0x7825, { pl: 'Klawisze: mocniejszy kolor', en: 'Keys: more saturation' }],
  [0x7826, { pl: 'Klawisze: bledszy kolor', en: 'Keys: less saturation' }],
  [0x7827, { pl: 'Klawisze: jaśniej', en: 'Keys: brighter' }],
  [0x7828, { pl: 'Klawisze: ciemniej', en: 'Keys: dimmer' }],
  [0x7829, { pl: 'Klawisze: szybciej', en: 'Keys: faster' }],
  [0x782a, { pl: 'Klawisze: wolniej', en: 'Keys: slower' }],
  [0x7c7b, { pl: 'Anulowanie przeciwnych klawiszy: włącz', en: 'Key cancellation: on' }],
  [0x7c7c, { pl: 'Anulowanie przeciwnych klawiszy: wyłącz', en: 'Key cancellation: off' }],
  [0x7c7d, { pl: 'Anulowanie przeciwnych klawiszy: przełącz', en: 'Key cancellation: toggle' }],
  [0x46, { pl: 'Print Screen', en: 'Print Screen' }],
  [0xbd, { pl: 'Ekran: jaśniej', en: 'Screen: brighter' }],
  [0xbe, { pl: 'Ekran: ciemniej', en: 'Screen: dimmer' }],
]);

export const SHORT = new Map([
  [0x7e12, { pl: 'tryb', en: 'mode' }],
  [0x7e14, { pl: 'kolor', en: 'colour' }],
  [0x7e10, { pl: 'jaśniej', en: 'brighter' }],
  [0x7e11, { pl: 'ciemniej', en: 'dimmer' }],
  [0x7e15, { pl: 'szybciej', en: 'faster' }],
  [0x7e16, { pl: 'wolniej', en: 'slower' }],
  [0x7e13, { pl: 'boki', en: 'sides' }],
]);

export const EXTRA = [
  { keys: ['Esc'], pl: 'Przytrzymaj przy podłączaniu kabla: tryb wgrywania firmware', en: 'Hold while plugging in the cable: firmware update mode' },
  { keys: ['⇄'], pl: 'Przełącznik trybu: kabel albo bezprzewodowo', en: 'Mode switch: wired or wireless' },
  { keys: ['⌘ / ⊞'], pl: 'Przełącznik systemu: Mac albo Windows', en: 'System switch: Mac or Windows' },
];
