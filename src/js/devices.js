export const VIA_USAGE_PAGE = 0xff60;
export const VIA_USAGE = 0x61;

const HALO75_V2_KEYS = [
  ["Esc", 0, 0, 1, 0, 0, 0, 0, "Escape"],
  ["F1", 1, 0, 1, 10, 0, 0, 1, "F1"],
  ["F2", 2, 0, 1, 20, 0, 0, 2, "F2"],
  ["F3", 3, 0, 1, 30, 0, 0, 3, "F3"],
  ["F4", 4, 0, 1, 40, 0, 0, 4, "F4"],
  ["F5", 5, 0, 1, 50, 0, 0, 5, "F5"],
  ["F6", 6, 0, 1, 60, 0, 0, 6, "F6"],
  ["F7", 7, 0, 1, 70, 0, 0, 7, "F7"],
  ["F8", 8, 0, 1, 80, 0, 0, 8, "F8"],
  ["F9", 9, 0, 1, 90, 0, 0, 9, "F9"],
  ["F10", 10, 0, 1, 100, 0, 0, 10, "F10"],
  ["F11", 11, 0, 1, 110, 0, 0, 11, "F11"],
  ["F12", 12, 0, 1, 120, 0, 0, 12, "F12"],
  ["PrtSc", 13, 0, 1, 130, 0, 0, 13, "PrintScreen"],
  ["Del", 14, 0, 1, 140, 0, 0, 15, "Delete"],
  ["Ins", 15, 0, 1, 150, 0, 0, 14, "Insert"],
  ["`", 0, 1, 1, 0, 10, 1, 0, "Backquote"],
  ["1", 1, 1, 1, 10, 10, 1, 1, "Digit1"],
  ["2", 2, 1, 1, 20, 10, 1, 2, "Digit2"],
  ["3", 3, 1, 1, 30, 10, 1, 3, "Digit3"],
  ["4", 4, 1, 1, 40, 10, 1, 4, "Digit4"],
  ["5", 5, 1, 1, 50, 10, 1, 5, "Digit5"],
  ["6", 6, 1, 1, 60, 10, 1, 6, "Digit6"],
  ["7", 7, 1, 1, 70, 10, 1, 7, "Digit7"],
  ["8", 8, 1, 1, 80, 10, 1, 8, "Digit8"],
  ["9", 9, 1, 1, 90, 10, 1, 9, "Digit9"],
  ["0", 10, 1, 1, 100, 10, 1, 10, "Digit0"],
  ["-", 11, 1, 1, 110, 10, 1, 11, "Minus"],
  ["=", 12, 1, 1, 120, 10, 1, 12, "Equal"],
  ["Backspace", 13, 1, 2, 130, 10, 1, 13, "Backspace"],
  ["Home", 15, 1, 1, 150, 10, 1, 15, "Home"],
  ["Tab", 0, 2, 1.5, 0, 20, 2, 0, "Tab"],
  ["Q", 1.5, 2, 1, 15, 20, 2, 1, "KeyQ"],
  ["W", 2.5, 2, 1, 25, 20, 2, 2, "KeyW"],
  ["E", 3.5, 2, 1, 35, 20, 2, 3, "KeyE"],
  ["R", 4.5, 2, 1, 45, 20, 2, 4, "KeyR"],
  ["T", 5.5, 2, 1, 55, 20, 2, 5, "KeyT"],
  ["Y", 6.5, 2, 1, 65, 20, 2, 6, "KeyY"],
  ["U", 7.5, 2, 1, 75, 20, 2, 7, "KeyU"],
  ["I", 8.5, 2, 1, 85, 20, 2, 8, "KeyI"],
  ["O", 9.5, 2, 1, 95, 20, 2, 9, "KeyO"],
  ["P", 10.5, 2, 1, 105, 20, 2, 10, "KeyP"],
  ["[", 11.5, 2, 1, 115, 20, 2, 11, "BracketLeft"],
  ["]", 12.5, 2, 1, 125, 20, 2, 12, "BracketRight"],
  ["\\", 13.5, 2, 1.5, 135, 20, 2, 13, "Backslash"],
  ["End", 15, 2, 1, 150, 20, 2, 15, "End"],
  ["Caps", 0, 3, 1.75, 0, 30, 3, 0, "CapsLock"],
  ["A", 1.75, 3, 1, 17.5, 30, 3, 1, "KeyA"],
  ["S", 2.75, 3, 1, 27.5, 30, 3, 2, "KeyS"],
  ["D", 3.75, 3, 1, 37.5, 30, 3, 3, "KeyD"],
  ["F", 4.75, 3, 1, 47.5, 30, 3, 4, "KeyF"],
  ["G", 5.75, 3, 1, 57.5, 30, 3, 5, "KeyG"],
  ["H", 6.75, 3, 1, 67.5, 30, 3, 6, "KeyH"],
  ["J", 7.75, 3, 1, 77.5, 30, 3, 7, "KeyJ"],
  ["K", 8.75, 3, 1, 87.5, 30, 3, 8, "KeyK"],
  ["L", 9.75, 3, 1, 97.5, 30, 3, 9, "KeyL"],
  [";", 10.75, 3, 1, 107.5, 30, 3, 10, "Semicolon"],
  ["'", 11.75, 3, 1, 117.5, 30, 3, 11, "Quote"],
  ["Enter", 12.75, 3, 2.25, 127.5, 30, 3, 13, "Enter"],
  ["PgUp", 15, 3, 1, 150, 30, 3, 15, "PageUp"],
  ["Shift", 0, 4, 2.25, 0, 40, 4, 0, "ShiftLeft"],
  ["Z", 2.25, 4, 1, 22.5, 40, 4, 2, "KeyZ"],
  ["X", 3.25, 4, 1, 32.5, 40, 4, 3, "KeyX"],
  ["C", 4.25, 4, 1, 42.5, 40, 4, 4, "KeyC"],
  ["V", 5.25, 4, 1, 52.5, 40, 4, 5, "KeyV"],
  ["B", 6.25, 4, 1, 62.5, 40, 4, 6, "KeyB"],
  ["N", 7.25, 4, 1, 72.5, 40, 4, 7, "KeyN"],
  ["M", 8.25, 4, 1, 82.5, 40, 4, 8, "KeyM"],
  [",", 9.25, 4, 1, 92.5, 40, 4, 9, "Comma"],
  [".", 10.25, 4, 1, 102.5, 40, 4, 10, "Period"],
  ["/", 11.25, 4, 1, 112.5, 40, 4, 11, "Slash"],
  ["Shift", 12.25, 4, 1.75, 122.5, 40, 4, 13, "ShiftRight"],
  ["↑", 14, 4, 1, 140, 40, 4, 14, "ArrowUp"],
  ["PgDn", 15, 4, 1, 150, 40, 4, 15, "PageDown"],
  ["Ctrl", 0, 5, 1.25, 0, 50, 5, 0, "ControlLeft"],
  ["Win", 1.25, 5, 1.25, 12.5, 50, 5, 1, "MetaLeft"],
  ["Alt", 2.5, 5, 1.25, 25, 50, 5, 2, "AltLeft"],
  ["", 3.75, 5, 6.25, 37.5, 50, 5, 6, "Space"],
  ["Alt", 10, 5, 1.25, 100, 50, 5, 9, "AltRight"],
  ["Fn", 11.25, 5, 1.25, 112.5, 50, 5, 10, ""],
  ["←", 13, 5, 1, 130, 50, 5, 13, "ArrowLeft"],
  ["↓", 14, 5, 1, 140, 50, 5, 14, "ArrowDown"],
  ["→", 15, 5, 1, 150, 50, 5, 15, "ArrowRight"],
];

const HALO75_V2_EFFECTS = [
  'none', 'solid_color',
  'gradient_up_down', 'gradient_left_right', 'breathing',
  'band_sat', 'band_val', 'band_pinwheel_sat', 'band_pinwheel_val', 'band_spiral_sat', 'band_spiral_val',
  'cycle_all', 'cycle_left_right', 'cycle_up_down', 'rainbow_moving_chevron',
  'cycle_out_in', 'cycle_out_in_dual', 'cycle_pinwheel', 'cycle_spiral',
  'dual_beacon', 'rainbow_beacon', 'rainbow_pinwheels',
  'raindrops', 'jellybean_raindrops',
  'hue_breathing', 'hue_pendulum', 'hue_wave',
  'typing_heatmap', 'digital_rain',
  'solid_reactive_simple', 'solid_reactive', 'solid_reactive_wide', 'solid_reactive_multiwide',
  'solid_reactive_cross', 'solid_reactive_multicross', 'solid_reactive_nexus', 'solid_reactive_multinexus',
  'splash', 'multisplash', 'solid_splash', 'solid_multisplash',

  'game_mode', 'position_mode',
];

const toKeys = rows => rows.map(([label, x, y, w, lx, ly, row, col, code], i) => ({ i, label, x, y, w, lx, ly, row, col, code }));

export const DEVICES = [
  {
    id: 'nuphy-halo75-v2',
    name: 'NuPhy Halo75 V2',
    vendorId: 0x19f5,
    productId: 0x32f5,
    center: { x: 70, y: 20 },
    ledCount: 128,
    matrix: { rows: 6, cols: 17 },
    size: { w: 16, h: 6 },
    keys: toKeys(HALO75_V2_KEYS),
    effects: HALO75_V2_EFFECTS,
    customEffects: 2,
    maxEffect: 45,
    knownMaxEffect: { '0.22.14.1.0.5': 45 },
    defaults: { effect: 'position_mode', hue: 168, sat: 255, brightness: 127, speed: 127 },
    effectResetsSide: true,
    extras: {
      43: [{ key: 'signalrgb', hidden: true }],
      45: [{ key: 'game_mode', hidden: true }, { key: 'position_mode', hidden: true }, { key: 'signalrgb', hidden: true }],
    },
    sideLight: true,
  },
];

export const DONGLES = [{ vendorId: 0x19f5, productId: 0x3247, name: 'NuPhy 2.4G' }];

export const isDongle = hid => DONGLES.some(d => d.vendorId === hid.vendorId && d.productId === hid.productId);

export const HID_FILTERS = DEVICES.map(d => ({ vendorId: d.vendorId, productId: d.productId, usagePage: VIA_USAGE_PAGE, usage: VIA_USAGE }));

export const findDevice = (vendorId, productId) => DEVICES.find(d => d.vendorId === vendorId && d.productId === productId);

export const isViaInterface = hid => hid.collections.some(c => c.usagePage === VIA_USAGE_PAGE && c.usage === VIA_USAGE);

export function resolveEffects(def, maxIndex) {
  const named = def.effects.map((key, id) => ({ id, key }));
  if (maxIndex == null || maxIndex === named.length - 1) return named;
  if (maxIndex < named.length - 1) return named.filter(e => e.id <= maxIndex);
  const core = named.slice(0, named.length - def.customEffects);
  const custom = named.slice(named.length - def.customEffects);
  const firstCustom = maxIndex - custom.length + 1;
  const known = def.extras?.[maxIndex] ?? [];
  const extra = [];
  for (let id = core.length; id < firstCustom; id++) {
    const n = extra.length;
    extra.push(known[n] ? { id, ...known[n] } : { id, key: 'unknown', n: n + 1 });
  }
  return [...core, ...extra, ...custom.map((e, j) => ({ ...e, id: firstCustom + j }))];
}
