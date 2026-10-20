import { DEVICES, HID_FILTERS, findDevice, isDongle, isViaInterface, resolveEffects } from './devices.js';
import { EFFECTS, CATEGORIES, FEATURED, effectName } from './effects.js';
import { ViaKeyboard } from './via.js';
import { KeyboardPreview } from './preview.js';
import { cssHsv } from './color.js';
import { iconSvg } from './icons.js';
import { SIDE_MODES, SIDE_COLOURS, SIDE_CUSTOM, DUAL_COLOURS } from './sidelight.js';
import { PerKeyEditor } from './perkey.js';
import { KeymapEditor } from './keymap.js';
import { t, getLang, setLang, applyI18n } from './i18n.js';
import * as store from './store.js';
import { PRESETS } from './presets.js';
import { DEFAULT_FN, FN_LAYERS, SIDE_LAYER, HOLD, NAMES as SC_NAMES, SHORT as SC_SHORT, EXTRA } from './shortcuts.js';
import { keycodeName, keycodeLabel, isLayerKey } from './keycodes.js';

const $ = id => document.getElementById(id);

const POLL_MS = 800;

const USER_QUIET_MS = 1500;

const COLORS = [
  ['red', 0, 255], ['orange', 16, 255], ['yellow', 40, 255], ['green', 85, 255], ['teal', 120, 255],
  ['blue', 165, 255], ['purple', 192, 255], ['pink', 225, 255], ['white', 0, 0],
];
const CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const LINK_ICONS = {
  usb: '<svg viewBox="0 0 24 24"><path d="M9 3h6v5H9z" fill="currentColor"/><path d="M7 8h10v5a5 5 0 0 1-10 0z" fill="currentColor"/><path d="M12 18v4" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  dongle: '<svg viewBox="0 0 24 24"><rect x="8" y="10" width="8" height="12" rx="2.5" fill="currentColor"/><path d="M7.5 6.5a6.5 6.5 0 0 1 9 0M5 3.8a10 10 0 0 1 14 0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  bluetooth: '<svg viewBox="0 0 24 24"><path d="M7 7.5l10 9-5 4.5V3l5 4.5-10 9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const DEFAULT_LIGHTING = { effect: 12, brightness: 255, speed: 96, hue: 0, sat: 255 };

const state = {
  def: DEVICES[0],
  effects: resolveEffects(DEVICES[0], null),
  lighting: { ...DEFAULT_LIGHTING },
  kb: null,
  connecting: false,
  saving: false,
  dirty: false,
  tab: null,
  view: 'lighting',
  lightType: 'effect',
  savedType: 'effect',
  customColor: false,

  side: { mode: 'wave', colour: 'rainbow', light: 2, speed: 2, segments: 3, custom: [255, 255, 255], ...store.get('side') },
  kg: 0,
  kgStatus: null,
  dongle: false,
  bluetooth: null,
};

const KG_LINKS = { 0: 'dongle', 1: 'bluetooth', 2: 'bluetooth', 3: 'bluetooth', 4: 'usb' };

function linkMode() {
  if (state.kgStatus && KG_LINKS[state.kgStatus.link]) return KG_LINKS[state.kgStatus.link];
  if (state.bluetooth?.state === 'connected') return 'bluetooth';
  if (state.kb) return 'usb';
  if (state.dongle) return 'dongle';
  return null;
}

const hasHid = 'hid' in navigator;
const preview = new KeyboardPreview($('kbStage'));

const ctx = {
  kb: () => state.kb,
  def: () => state.def,
  preview,
  t,
  toast: msg => toast(msg),
  get lang() { return getLang(); },
  platform: window.keyglow?.platform ?? (/Mac/.test(navigator.platform) ? 'darwin' : 'win32'),
  markDirty: () => {
    if (!state.kb) return;
    state.dirty = true;
    renderCaption();
  },
  onError: err => onDeviceError(err),
};
const perkey = new PerKeyEditor(ctx);
const keymap = new KeymapEditor(ctx);

const differs = (a, b) => Object.keys(a).some(k => Math.abs(a[k] - b[k]) > (k === 'brightness' ? 3 : 0));

const fxById = id => state.effects.find(e => e.id === id) ?? { id, key: 'unknown', n: id };

const idForKey = key => (state.effects.find(e => e.key === key && !e.hidden) ?? state.effects.find(e => e.key === key))?.id;
const fxMeta = fx => EFFECTS[fx.key] ?? EFFECTS.unknown;

const settingsKey = () => `settings.${state.def.id}`;

function lightingRecord() {
  const l = state.lighting;
  const fx = fxById(l.effect);
  return {
    effect: fx.key === 'unknown' ? `#${fx.id}` : fx.key,
    hue: l.hue, sat: l.sat, brightness: l.brightness, speed: l.speed,
    mode: state.savedType,
  };
}

function rememberSettings() {
  store.set(settingsKey(), lightingRecord());
}

function rememberPreview() {
  store.set(`preview.${state.def.id}`, lightingRecord());
}

function savedLighting(key = settingsKey()) {
  const s = store.get(key);
  if (!s) return null;
  const effect = s.effect.startsWith('#') ? Number(s.effect.slice(1)) : idForKey(s.effect);
  if (effect == null || !state.effects.some(e => e.id === effect)) return null;
  return { effect, hue: s.hue, sat: s.sat, brightness: s.brightness, speed: s.speed };
}

const FIELD = { effect: 'effect', brightness: 'brightness', speed: 'speed', hue: 'color', sat: 'color' };

function update(patch, { fromDevice = false } = {}) {
  const changed = Object.keys(patch).filter(k => patch[k] !== state.lighting[k]);
  const effectChanged = changed.includes('effect');
  Object.assign(state.lighting, patch);
  if (!fromDevice) {
    state.lastUserChange = Date.now();
    if (state.kb && changed.length) {
      new Set(changed.map(k => FIELD[k])).forEach(queueWrite);
      state.dirty = true;
      lightingDirty = true;
    }
  }
  if (!fromDevice && !state.kb && linkMode()) hintWireless();
  if (fromDevice) {
    rememberSettings();
    state.dirty = false;
    lightingDirty = false;
  } else if (!state.kb) {
    rememberPreview();
  }
  if (effectChanged) renderEffects();
  renderControls();
  renderCaption();
  syncPreview();
}

let scSystem = window.keyglow?.platform === 'darwin' ? 'mac' : 'win';

const TRANSPARENT = 0x0001;

function layerCodes(layer) {
  const keys = state.def.keys;
  const live = layer === SIDE_LAYER ? keymap.sideLayer : keymap.layers?.[layer];
  if (live) return keys.map(k => live[k.row * state.def.matrix.cols + k.col]);
  const defaults = DEFAULT_FN[layer] ?? {};
  return keys.map((k, i) => defaults[i] ?? TRANSPARENT);
}

function shortcutEntries(layer, base) {
  const keys = state.def.keys;
  const codes = layerCodes(layer);
  const baseCodes = base == null || !keymap.layers ? null : layerCodes(base);
  return keys.map((k, i) => ({ key: k, code: codes[i], base: baseCodes?.[i] }))
    .filter(e => e.code !== TRANSPARENT && e.code !== 0 && !isLayerKey(e.code) && e.code !== e.base)
    .filter(e => baseCodes || keycodeLabel(e.code) !== e.key.label);
}

function describeCode(code) {
  const lang = getLang();
  const name = SC_NAMES.get(code)?.[lang] ?? keycodeName(code, lang);
  const hold = HOLD.get(code)?.[lang];
  return hold ? `${name} · ${hold}` : name;
}

function shortcutRow(caps, text) {
  const row = document.createElement('div');
  row.className = 'sc-row';
  const combo = document.createElement('span');
  combo.className = 'sc-keys';
  caps.forEach((cap, i) => {
    if (i) combo.append(Object.assign(document.createElement('span'), { className: 'sc-plus', textContent: '+' }));
    combo.append(Object.assign(document.createElement('kbd'), { className: 'sc-cap', textContent: cap }));
  });
  const desc = document.createElement('span');
  desc.className = 'sc-desc';
  desc.textContent = text;
  row.append(combo, desc);
  return row;
}

const mKey = () => state.def.keys.find(k => k.code === 'KeyM')?.label ?? 'M';

const SIDE_ORDER = [0x7e12, 0x7e14, 0x7e10, 0x7e11, 0x7e15, 0x7e16, 0x7e13];

function sideEntries() {
  return shortcutEntries(SIDE_LAYER, null).sort((a, b) => SIDE_ORDER.indexOf(a.code) - SIDE_ORDER.indexOf(b.code));
}

function sideShortcutRows() {
  const lang = getLang();
  return sideEntries().map(e => shortcutRow(['Fn', mKey(), e.key.label], SC_SHORT.get(e.code)?.[lang] ?? describeCode(e.code)));
}

function sideKeyChips() {
  const lang = getLang();
  const lead = document.createElement('span');
  lead.className = 'side-keys-lead';
  lead.append(...['Fn', '+', mKey(), '+'].map(x => Object.assign(document.createElement(x === '+' ? 'span' : 'kbd'), { className: x === '+' ? 'sc-plus' : 'sc-cap', textContent: x })));
  return [lead, ...sideEntries().map(e => {
    const chip = document.createElement('span');
    chip.className = 'side-key';
    chip.title = describeCode(e.code);
    chip.append(Object.assign(document.createElement('kbd'), { className: 'sc-cap', textContent: e.key.label }),
      Object.assign(document.createElement('span'), { textContent: SC_SHORT.get(e.code)?.[lang] ?? keycodeLabel(e.code) }));
    return chip;
  })];
}

function shortcutLegends() {
  const { fn } = FN_LAYERS[scSystem];
  const codes = layerCodes(fn);
  const shown = new Set(shortcutEntries(fn, FN_LAYERS[scSystem].base).map(e => e.key.i));
  return state.def.keys.map((k, i) => (shown.has(k.i) ? keycodeLabel(codes[i]) : ''));
}

function renderShortcuts() {
  const { fn, base } = FN_LAYERS[scSystem];
  $('scLayers').replaceChildren(...Object.keys(FN_LAYERS).map(id => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab' + (id === scSystem ? ' is-active' : '');
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(id === scSystem));
    b.textContent = t(`keymap.layer.${id}`);
    b.addEventListener('click', () => {
      scSystem = id;
      renderShortcuts();
      preview.setLegends(shortcutLegends());
    });
    return b;
  }));
  $('scSource').textContent = keymap.layers ? t('sc.live') : t('sc.default');
  $('scFn').replaceChildren(...shortcutEntries(fn, base).map(e => shortcutRow(['Fn', e.key.label], describeCode(e.code))));
  $('scSide').replaceChildren(...sideShortcutRows());
  const lang = getLang();
  $('scOther').replaceChildren(...EXTRA.map(x => shortcutRow(x.keys, x[lang])));
}

const SIDE_DEFAULTS = { mode: 'wave', colour: 'rainbow', light: 2, speed: 2, segments: 3 };

async function resetDefaults() {
  const d = state.def.defaults;
  if (!state.kb || !d || state.saving || !confirm(t('reset.confirm'))) return;
  if (state.view === 'perkey') await setView('lighting');
  else await setLightType('effect');
  const effect = idForKey(d.effect) ?? idForKey('solid_color');
  update({ effect, hue: d.hue, sat: d.sat, brightness: d.brightness, speed: d.speed });
  if (state.def.sideLight) {
    const wasOff = sideOff();
    setSide({ ...SIDE_DEFAULTS });
    if (keepsSide() && wasOff) queueWrite('sidePower');
  }
  await save({ quiet: true, keys: false });
  toast(t('reset.done'));
}

let wirelessHintAt = 0;
function hintWireless() {
  if (Date.now() - wirelessHintAt < 8000) return;
  wirelessHintAt = Date.now();
  toast(t('toast.wireless'));
}

const STOCK_SIDE = { mode: 'wave', colour: 'rainbow', light: 2, speed: 2 };

function syncPreview() {
  preview.setLighting(state.lighting, fxById(state.lighting.effect).key);
  preview.setSide(state.kg || !state.def.sideLight ? state.side : { ...STOCK_SIDE, segments: state.side.segments });
}

const pending = new Set();
let writing = false;

function queueWrite(field) {
  pending.add(field);
  pump();
}

async function pump() {
  if (writing || !state.kb) return;
  writing = true;
  try {
    while (pending.size && state.kb) {
      const [field] = pending;
      pending.delete(field);
      await writeField(state.kb, field);
    }
  } catch (err) {
    onDeviceError(err);
  } finally {
    writing = false;
  }
}

function writeField(kb, field) {
  const l = state.lighting;
  switch (field) {
    case 'effect': return writeEffect(kb, l);
    case 'brightness': return keepsSide() && l.effect === 0 ? undefined : kb.setBrightness(l.brightness);
    case 'speed': return kb.setSpeed(l.speed);
    case 'color': return kb.setColor(l.hue, l.sat);
    case 'sidePower': return writeSidePower(kb, l);
  }
}

const sideOff = () => Boolean(state.def.sideLight) && state.side.segments === 0;

async function keepSideOff(kb, l) {
  await kb.setEffect(0);
  if (l.effect !== 0) await kb.setBrightness(l.brightness);
}

async function writeSidePower(kb, l) {
  if (!keepsSide()) return;
  if (sideOff()) {
    await keepSideOff(kb, l);
    lastEffect = 0;
    return;
  }
  await kb.setEffect(l.effect || idForKey('solid_color'));
  if (l.effect === 0) {
    await kb.setBrightness(0);
    lastEffect = 0;
    return;
  }
  lastEffect = l.effect;
  const [now] = await kb.getValue('brightness');
  if (Math.abs(now - l.brightness) > 3) await kb.setBrightness(l.brightness);
}

let lastEffect = null;
let lightingDirty = false;

const keepsSide = () => !state.kg && state.def.effectResetsSide;
const isOffRead = l => keepsSide() && l.brightness === 0;
const offKey = () => `off.${state.def.id}`;

async function writeEffect(kb, l) {
  const effect = l.effect;
  if (!keepsSide()) {
    await kb.setEffect(effect);
    lastEffect = effect;
    return;
  }
  if (effect === 0) {
    if (lastEffect === 0) await kb.setBrightness(0);
    else {
      await kb.setEffect(0);
      if (state.def.sideLight && !sideOff()) {
        await kb.setEffect(idForKey('solid_color'));
        await kb.setBrightness(0);
      }
    }
    lastEffect = 0;
    store.set(offKey(), true);
    return;
  }
  const fromOff = lastEffect === 0;
  if (!fromOff) {
    await kb.setEffect(0);
    lastEffect = 0;
  }
  await kb.setEffect(effect);
  lastEffect = effect;
  store.set(offKey(), false);
  if (sideOff()) {
    await keepSideOff(kb, l);
    lastEffect = 0;
    return;
  }
  if (fromOff || l.brightness <= 3) {
    const [now] = await kb.getValue('brightness');
    if (Math.abs(now - l.brightness) > 3) await kb.setBrightness(l.brightness);
  }
}

let probed = false;

async function findMaxEffect(kb, def, kg) {
  probed = false;
  if (kg || !def.effectResetsSide) return kb.probeMaxEffect();
  const tag = await kb.firmwareTag().catch(() => 'via');
  const key = `maxEffect.${def.id}.${tag}`;
  const known = store.get(key) ?? def.knownMaxEffect?.[tag];
  if (Number.isInteger(known)) return known;
  const [brightness] = await kb.getValue('brightness');
  if (!brightness) return def.maxEffect ?? null;
  const max = await kb.probeMaxEffect({ keepSide: true });
  probed = true;
  store.set(key, max);
  return max;
}

const idle = async () => {
  while (writing || pending.size) await new Promise(r => setTimeout(r, 30));
};

async function save({ quiet = false, keys = true } = {}) {
  const kb = state.kb;
  if (!kb || state.saving) return;
  state.saving = true;
  renderCaption();
  try {
    await idle();
    if (state.lightType === 'effect') await kb.save();
    if (state.kg) {
      clearTimeout(sideTimer);
      sideTimer = null;
      await kb.kgWriteSide(sideToFirmware(state.side));
      await kb.kgSaveSide();
    }
    perkey.persist();
    lightingDirty = false;
    if (keys && keymap.hasPending) await keymap.save(kb);
    state.savedType = state.lightType;
    rememberSettings();
    state.dirty = keymap.hasPending;
    if (state.view === 'keymap') keymap.sync();
    if (!quiet) toast(t('toast.saved'));
  } catch (err) {
    onDeviceError(err);
  } finally {
    state.saving = false;
    renderCaption();
  }
}

async function poll() {
  const kb = state.kb;
  if (!kb || writing || pending.size || state.saving || document.hidden) return;
  if (Date.now() - (state.lastUserChange ?? 0) < USER_QUIET_MS) return;
  const startedAt = state.lastUserChange;
  try {
    if (state.lightType === 'perkey') {
      const [effect] = await kb.getValue('effect');
      const direct = state.effects.find(e => e.key === 'signalrgb')?.id;
      if (kb !== state.kb || effect === direct) return;
      if (effect === idForKey('position_mode') || effect === state.lighting.effect) await perkey.activate();
      else {
        state.lighting.effect = effect;
        state.lightType = 'effect';
        state.savedType = 'effect';
        await setView('lighting');
        rememberSettings();
      }
      return;
    }
    await pollKg(kb);
    const l = await kb.readLighting();
    if (kb !== state.kb || startedAt !== state.lastUserChange) return;
    if (lastEffect === 0 && isOffRead(l)) Object.assign(l, { effect: 0, brightness: state.lighting.brightness });
    if (differs(l, state.lighting)) update(l, { fromDevice: true });
  } catch (err) {
    onDeviceError(err);
  }
}

const sideFromFirmware = fw => ({
  mode: SIDE_MODES[fw.modeA] ?? 'wave',
  colour: fw.rgb && [0, 3].includes(fw.modeA) ? 'rainbow' : fw.colour > SIDE_CUSTOM ? 0 : fw.colour,
  light: fw.light,
  speed: fw.speed,
  segments: fw.modeB,
  custom: fw.custom,
});

const sideToFirmware = side => ({
  modeA: Math.max(0, SIDE_MODES.indexOf(side.mode)),
  modeB: side.segments ?? 3,
  light: side.light,
  speed: side.speed,
  rgb: side.colour === 'rainbow' ? 1 : 0,
  colour: side.colour === 'rainbow' ? 0 : side.colour,
  custom: side.custom ?? [255, 255, 255],
});

let kgTick = 0;
let sideTimer = null;

async function pollKg(kb) {
  if (!state.kg) return;
  if (kgTick++ % 5 === 0) {
    state.kgStatus = await kb.kgStatus();
    renderStatus();
  }
  if (sideTimer) return;
  const side = sideFromFirmware(await kb.kgReadSide());
  if (JSON.stringify(side) !== JSON.stringify(state.side)) {
    Object.assign(state.side, side);
    renderSide();
    syncPreview();
  }
}

function pushSide() {
  if (!state.kg || !state.kb) return;
  clearTimeout(sideTimer);
  sideTimer = setTimeout(async () => {
    sideTimer = null;
    try {
      await state.kb?.kgWriteSide(sideToFirmware(state.side));
    } catch (err) {
      onDeviceError(err);
    }
  }, 80);
  ctx.markDirty();
}

async function connect(hid) {
  if (state.connecting || state.kb) return;
  const def = findDevice(hid.vendorId, hid.productId);
  if (!def || !isViaInterface(hid)) return;
  state.connecting = true;
  renderStatus();
  renderCaption();
  const kb = new ViaKeyboard(hid);
  lastEffect = null;
  try {
    await kb.open();
    const kg = await kb.kgProbe().catch(() => 0);
    const maxEffect = await findMaxEffect(kb, def, kg);
    const current = await kb.readLighting();
    if (def !== state.def) preview.setDevice(def);
    state.def = def;
    state.effects = resolveEffects(def, maxEffect);
    state.kb = kb;
    state.kg = kg;
    if (state.kg) {
      Object.assign(state.side, sideFromFirmware(await kb.kgReadSide()));
      state.kgStatus = await kb.kgStatus();
    }
    const saved = savedLighting();
    const direct = current.effect === state.effects.find(e => e.key === 'signalrgb')?.id;
    const wasOff = saved?.effect === 0 || store.get(offKey()) === true;
    if (!direct && wasOff && isOffRead(current)) {
      Object.assign(current, { effect: 0, brightness: saved?.brightness || state.lighting.brightness || 127 });
      lastEffect = 0;
    } else if (keepsSide() && !isOffRead(current)) {
      store.set(offKey(), false);
    }
    Object.assign(state.lighting, current);

    state.dirty = false;
    lightingDirty = false;
    state.lightType = 'effect';
    if (direct) await kb.directOff();
    if (probed && keepsSide() && sideOff()) {
      await keepSideOff(kb, current);
      lastEffect = 0;
    }
    if (saved && differs(saved, current)) {
      update(Object.fromEntries(Object.entries(saved).filter(([k, v]) => Math.abs(v - current[k]) > (k === 'brightness' ? 3 : 0))));
      await save({ quiet: true });
      toast(t('toast.restored'));
    }
    state.savedType = store.get(settingsKey())?.mode ?? 'effect';
    if (state.view === 'perkey' || (state.view === 'keymap' && state.savedType === 'perkey')) {
      state.lightType = 'perkey';
      await perkey.activate();
    }
    await keymap.load(kb).catch(err => console.error(err));
    if (state.view === 'keymap') keymap.sync();
  } catch (err) {
    await kb.close();
    state.kb = null;
    toast(t('toast.error', { msg: err.message }));
  } finally {
    state.connecting = false;
    renderAll();
  }
}

async function disconnect() {
  const kb = state.kb;
  if (!kb) return;
  state.kb = null;
  state.saving = false;
  state.dirty = false;
  state.kg = 0;
  state.kgStatus = null;
  perkey.direct = false;
  keymap.unload();
  pending.clear();
  await kb.close();
  renderAll();
}

function onDeviceError(err) {
  console.error(err);
  toast(t('toast.error', { msg: err.message }));
  if (state.kb && !state.kb.hid.opened) disconnect();
}

async function requestKeyboard() {
  try {
    const devices = await navigator.hid.requestDevice({ filters: HID_FILTERS });
    const hid = devices.find(isViaInterface);
    if (hid) await connect(hid);
  } catch (err) {
    if (err.name !== 'NotFoundError') toast(t('toast.error', { msg: err.message }));
  }
}

async function autoConnect() {
  if (state.kb || state.connecting) return;
  const devices = await navigator.hid.getDevices();
  const hid = devices.find(d => findDevice(d.vendorId, d.productId) && isViaInterface(d));
  if (hid) await connect(hid);
}

async function scanDongles() {
  const devices = await navigator.hid.getDevices();
  const present = devices.some(isDongle);
  if (present !== state.dongle) {
    state.dongle = present;
    renderStatus();
    renderCaption();
  }
}

function setBluetooth(status) {
  state.bluetooth = status;
  if (status?.battery != null) store.set('lastBattery', { value: status.battery, at: Date.now() });
  renderStatus();
  renderCaption();
}

function renderAll() {
  renderThemes();
  applyI18n();
  document.querySelectorAll('.lang button').forEach(b => b.classList.toggle('is-active', b.dataset.lang === getLang()));
  renderStatus();
  renderEffects();
  renderControls();
  renderSide();
  renderCaption();
  syncPreview();
}

function renderStatus() {
  const el = $('status');
  const mode = linkMode();
  el.classList.toggle('is-on', Boolean(mode));
  el.classList.toggle('is-busy', state.connecting);
  el.classList.toggle('has-link', Boolean(mode) && !state.connecting);
  $('statusIcon').innerHTML = mode ? LINK_ICONS[mode] : '';
  const channel = mode === 'bluetooth' ? state.bluetooth?.channel : null;
  const label = mode ? `${t(`link.${mode}`)}${channel ? ` ${channel}` : ''}` : t('status.none');
  $('statusText').textContent = state.connecting ? t('status.connecting') : label;
  el.title = mode === 'dongle' ? t('link.dongleHint') : mode ? `${state.def.name} · ${label}` : label;
  renderBattery(mode);
}

function renderBattery(mode) {
  const el = $('battery');
  const kg = state.kgStatus;
  const charging = kg ? kg.charging : Boolean(state.kb);
  const percent = kg ? (charging ? null : kg.battery) : mode === 'bluetooth' ? state.bluetooth?.battery ?? null : null;
  el.hidden = !charging && percent == null;
  if (el.hidden) return;
  el.classList.toggle('is-charging', charging);
  el.classList.toggle('is-unknown', percent == null);
  el.classList.toggle('is-mid', percent != null && percent <= 50 && percent > 20);
  el.classList.toggle('is-low', percent != null && percent <= 20);
  el.querySelector('.battery-fill').setAttribute('width', String(percent == null ? 0 : Math.max(1.5, (percent / 100) * 18)));
  $('batteryText').textContent = percent != null ? `${percent}%` : t('battery.charging');
  const last = store.get('lastBattery');
  const lastText = last && percent == null
    ? ` ${t('battery.last', { n: last.value, time: new Date(last.at).toLocaleString(getLang() === 'pl' ? 'pl-PL' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })}`
    : '';
  el.title = percent != null ? t('battery.level', { n: percent }) : t(kg ? 'battery.chargingHintKg' : 'battery.chargingHint') + lastText;
}

function renderCaption() {
  const fx = fxById(state.lighting.effect);
  $('effectTitle').textContent = state.view === 'lighting' ? effectName(fx, getLang()) : t(`mode.${state.view}`);
  const saved = Boolean(state.kb) && !state.saving && !state.dirty && !state.connecting;
  let text;
  if (state.connecting) text = t('status.connecting');
  else if (state.kb) text = state.saving ? t('caption.saving') : state.dirty ? t('caption.unsaved') : t('caption.saved');
  else if (linkMode()) text = t('caption.wireless');
  else text = hasHid ? t('caption.preview') : t('caption.noHid');
  if (state.view === 'lighting' && fxMeta(fx).keys && !state.connecting) text += ` · ${t('caption.type')}`;
  if (state.view === 'perkey' && state.kb) text += ` · ${t('perkey.note')}`;
  $('captionText').textContent = text;
  $('captionSub').classList.toggle('is-saved', saved);
  $('captionSub').classList.toggle('is-dirty', Boolean(state.kb) && state.dirty);
  $('captionCheck').style.display = saved ? '' : 'none';
  const connect = $('connectBtn');
  connect.hidden = !hasHid || Boolean(state.kb) || state.connecting;
  connect.textContent = t('caption.connect');
  const reset = $('resetBtn');
  reset.hidden = !state.kb || !state.def.defaults;
  reset.disabled = state.saving;
  const btn = $('saveBtn');
  btn.hidden = !state.kb;
  btn.disabled = !state.dirty || state.saving;
  btn.textContent = state.saving ? t('caption.saving') : state.dirty ? t('save.button') : t('save.done');
}

const TABS = ['featured', ...CATEGORIES, 'presets'];

const presetsKey = () => `presets.${state.def.id}`;
const customPresets = () => store.get(presetsKey()) ?? [];
const allPresets = () => [...PRESETS.map(p => ({ ...p, builtIn: true })), ...customPresets()];
const presetName = p => p.name ?? p[getLang()] ?? p.pl;

function presetMatches(p) {
  const l = state.lighting;
  if (idForKey(p.effect) !== l.effect) return false;
  const meta = EFFECTS[p.effect] ?? EFFECTS.unknown;
  return Math.abs(l.brightness - p.brightness) <= 3
    && (!meta.color || (l.hue === p.hue && l.sat === p.sat))
    && (!meta.speed || l.speed === p.speed);
}

function applyPreset(p) {
  const effect = idForKey(p.effect);
  if (effect == null) {
    toast(t('presets.missing'));
    return;
  }
  update({ effect, hue: p.hue, sat: p.sat, brightness: p.brightness, speed: p.speed });
  if (p.side && state.def.sideLight && state.kg) setSide({ ...p.side });
  renderEffects();
  if (state.kb) toast(t('presets.applied', { name: presetName(p) }));
}

function savePreset(name) {
  const l = state.lighting;
  const fx = fxById(l.effect);
  if (['unknown', 'signalrgb'].includes(fx.key)) {
    toast(t('presets.cant'));
    return;
  }
  const preset = {
    id: `c${Date.now().toString(36)}`,
    name: name.trim().slice(0, 24) || effectName(fx, getLang()),
    effect: fx.key, hue: l.hue, sat: l.sat, brightness: l.brightness, speed: l.speed,
    side: { ...state.side },
  };
  store.set(presetsKey(), [...customPresets(), preset]);
  renderEffects();
  toast(t('presets.saved', { name: preset.name }));
}

function deletePreset(p) {
  store.set(presetsKey(), customPresets().filter(c => c.id !== p.id));
  renderEffects();
  toast(t('presets.deleted', { name: presetName(p) }));
}

function presetChip(p) {
  const box = document.createElement('div');
  box.className = 'preset' + (p.builtIn ? '' : ' preset--custom');
  const b = document.createElement('button');
  b.type = 'button';
  const active = presetMatches(p);
  b.className = 'chip' + (active ? ' is-active' : '');
  b.setAttribute('role', 'option');
  b.setAttribute('aria-selected', String(active));
  b.innerHTML = `${iconSvg(p.effect)}<span></span>`;
  b.querySelector('span').textContent = presetName(p);
  b.title = presetName(p);
  b.style.setProperty('--preset', EFFECTS[p.effect]?.color ? cssHsv(p.hue, p.sat) : 'transparent');
  b.addEventListener('click', () => applyPreset(p));
  box.append(b);
  if (!p.builtIn) {
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'preset-del';
    del.setAttribute('aria-label', t('presets.delete'));
    del.title = t('presets.delete');
    del.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 4.5l7 7m0-7l-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
    del.addEventListener('click', () => deletePreset(p));
    box.append(del);
  }
  return box;
}

function presetAdd() {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip chip--add';
  b.innerHTML = '<svg class="fx-icon" viewBox="0 0 28 28" aria-hidden="true"><rect x="2" y="2" width="24" height="24" rx="8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="4 3"/><path d="M14 9v10M9 14h10" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg><span></span>';
  b.querySelector('span').textContent = t('presets.add');
  b.addEventListener('click', () => {
    const form = document.createElement('form');
    form.className = 'chip chip--form';
    form.innerHTML = '<input type="text" maxlength="24" autocomplete="off"><button type="submit"></button>';
    const input = form.querySelector('input');
    input.placeholder = t('presets.name');
    input.setAttribute('aria-label', t('presets.name'));
    input.value = effectName(fxById(state.lighting.effect), getLang());
    form.querySelector('button').textContent = t('presets.ok');
    form.addEventListener('submit', e => {
      e.preventDefault();
      savePreset(input.value);
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') renderEffects();
    });
    b.replaceWith(form);
    input.focus();
    input.select();
  });
  return b;
}

function tabOf(fx) {
  return FEATURED.includes(fx.key) ? 'featured' : fxMeta(fx).cat;
}

function effectsInTab(tab, active) {
  if (tab === 'presets') return allPresets();
  const usable = state.effects.filter(fx => !fx.hidden || fx.id === active);
  if (tab === 'featured') {
    return usable.filter(fx => FEATURED.includes(fx.key)).sort((a, b) => FEATURED.indexOf(a.key) - FEATURED.indexOf(b.key));
  }
  return usable.filter(fx => fxMeta(fx).cat === tab);
}

function renderEffects() {
  const lang = getLang();
  const active = state.lighting.effect;
  if (!state.tab) state.tab = tabOf(fxById(active));

  const tabs = TABS.filter(tab => effectsInTab(tab, active).length);
  if (!tabs.includes(state.tab)) state.tab = tabs[0];
  $('fxTabs').replaceChildren(...tabs.map(tab => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab' + (tab === state.tab ? ' is-active' : '');
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(tab === state.tab));
    b.innerHTML = '<span></span><span class="tab-count"></span>';
    b.firstChild.textContent = t(`tab.${tab}`);
    b.lastChild.textContent = effectsInTab(tab, active).length;
    b.addEventListener('click', () => {
      state.tab = tab;
      renderEffects();
    });
    return b;
  }));

  const list = $('fxList');
  if (state.tab === 'presets') {
    list.replaceChildren(...allPresets().map(presetChip), presetAdd());
    const hit = list.querySelector('.is-active');
    list.scrollTop = hit ? Math.max(0, hit.closest('.preset').offsetTop - 8) : 0;
    return;
  }
  list.replaceChildren(...effectsInTab(state.tab, active).map(fx => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (fx.id === active ? ' is-active' : '');
    b.setAttribute('role', 'option');
    b.setAttribute('aria-selected', String(fx.id === active));
    b.innerHTML = `${iconSvg(fx.key)}<span></span>`;
    b.querySelector('span').textContent = effectName(fx, lang);
    b.title = effectName(fx, lang);
    b.addEventListener('click', () => update({ effect: fx.id }));
    return b;
  }));
  const current = list.querySelector('.is-active');
  list.scrollTop = current ? Math.max(0, current.offsetTop - 8) : 0;
}

function renderBubbles(disabled) {
  const box = $('bubbles');
  if (!box.children.length) {
    for (const [name, h, s] of COLORS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bubble';
      b.dataset.h = h;
      b.dataset.s = s;
      b.style.setProperty('--c', cssHsv(h, s));
      b.style.color = s === 0 ? '#131f24' : '#fff';
      b.setAttribute('role', 'radio');
      b.dataset.name = name;
      b.innerHTML = CHECK;
      b.addEventListener('click', () => {
        state.customColor = false;
        update({ hue: h, sat: s });
      });
      box.append(b);
    }
    const custom = document.createElement('button');
    custom.type = 'button';
    custom.className = 'bubble bubble--custom';
    custom.dataset.name = 'custom';
    custom.setAttribute('role', 'radio');
    custom.innerHTML = CHECK;
    custom.style.color = '#fff';
    custom.addEventListener('click', () => {
      state.customColor = true;
      update({ sat: 255 });
    });
    box.append(custom);
  }
  const { hue, sat } = state.lighting;
  const preset = COLORS.find(([, h, s]) => s === sat && (s === 0 || h === hue));
  const isCustom = state.customColor || !preset;
  for (const b of box.children) {
    const on = b.dataset.name === 'custom' ? isCustom : !isCustom && b.dataset.name === preset[0];
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-checked', String(on));
    b.setAttribute('aria-label', t(`color.${b.dataset.name}`));
    b.title = t(`color.${b.dataset.name}`);
    b.disabled = disabled;
  }
  $('hueRow').hidden = !isCustom || disabled;
}

function setBar(input, value, fill) {
  if (input.value !== String(value)) input.value = value;
  input.style.setProperty('--pct', `${(value / 255) * 100}%`);
  if (fill) input.style.setProperty('--fill', fill);
}

const pct = v => `${Math.round((v / 255) * 100)}%`;

const SIDE_ONE_COLOUR = ['new', 'static'];
const brighten = rgb => rgb.map(v => Math.min(255, v * 1.6 | 0)).join(',');
const sideColourCss = (c, mode = state.side.mode) => {
  if (c === 'rainbow') return 'conic-gradient(#ff4b4b, #ffc800, #58cc02, #1cb0f6, #ce82ff, #ff4b4b)';
  if (mode === 'new') {
    const [a, b] = DUAL_COLOURS[Math.min(c, DUAL_COLOURS.length - 1)];
    return `linear-gradient(135deg, rgb(${a.join(',')}) 0 50%, rgb(${b.join(',')}) 50% 100%)`;
  }
  if (c === SIDE_CUSTOM) return `rgb(${(state.side.custom ?? [255, 255, 255]).join(',')})`;
  return `rgb(${brighten(SIDE_COLOURS[c])})`;
};

function sideColourOptions(mode) {
  if (mode === 'mix') return [];
  if (mode === 'new') return DUAL_COLOURS.map((_, i) => i);
  const list = SIDE_COLOURS.map((_, i) => i);
  if (state.kg || state.side.colour === SIDE_CUSTOM) list.push(SIDE_CUSTOM);
  return SIDE_ONE_COLOUR.includes(mode) ? list : ['rainbow', ...list];
}



function setSide(patch) {
  Object.assign(state.side, patch);
  if (SIDE_ONE_COLOUR.includes(state.side.mode) && state.side.colour === 'rainbow') state.side.colour = 0;
  if (state.side.mode === 'new' && state.side.colour !== 'rainbow' && state.side.colour > 2) state.side.colour = 0;
  store.set('side', state.side);
  renderSide();
  syncPreview();
  pushSide();
}

function renderSide() {
  const row = $('sideRow');
  row.hidden = !state.def.sideLight;
  if (row.hidden) return;
  const box = $('sideModes');
  box.replaceChildren(...SIDE_MODES.map(mode => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip chip--icon' + (mode === state.side.mode ? ' is-active' : '');
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(mode === state.side.mode));
    b.setAttribute('aria-label', t(`side.${mode}`));
    b.title = t(`side.${mode}`);
    b.innerHTML = iconSvg(`side_${mode}`);
    b.addEventListener('click', () => setSide({ mode }));
    return b;
  }));
  const { colour, mode } = state.side;
  $('sideModeName').textContent = state.side.segments === 0 ? `· ${t('side.offName')}` : state.kg ? `· ${t(`side.${mode}`)}` : `· ${t('side.onName')}`;
  $('sideExtra').hidden = !state.kg;
  $('sideHint').textContent = state.kg ? t('panel.sideHintKg') : t('panel.sideHint');
  if (state.kg) {
    const steps = (id, value, count, onPick) => $(id).replaceChildren(...Array.from({ length: count }, (_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'step' + (i <= value ? ' is-on' : '');
      b.setAttribute('aria-label', String(i + 1));
      b.addEventListener('click', () => onPick(i));
      return b;
    }));
    steps('sideLight', state.side.light, 5, i => setSide({ light: i }));
    steps('sideSpeed', 4 - state.side.speed, 5, i => setSide({ speed: 4 - i }));
  }
  const power = $('sidePower');
  const off = state.side.segments === 0;
  power.classList.toggle('is-off', off);
  power.querySelector('span').textContent = off ? t('side.turnOn') : t('side.turnOff');
  power.disabled = false;
  power.title = '';
  const stock = !state.kg;
  $('sideControls').hidden = stock;
  $('sideStock').hidden = !stock;
  $('sideHint').hidden = stock;
  if (stock) $('sideStockKeys').replaceChildren(...sideKeyChips());
  const options = stock ? [] : sideColourOptions(mode);
  $('sideColours').hidden = !options.length || off;
  $('sideColours').replaceChildren(...options.map(c => {
    const b = document.createElement('button');
    b.type = 'button';
    const active = c === colour;
    b.className = 'bubble' + (active ? ' is-active' : '');
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(active));
    const name = mode === 'new' ? t('side.pair', { n: c + 1 }) : c === 'rainbow' ? t('side.rainbow') : t(`side.colour${c}`);
    b.setAttribute('aria-label', name);
    b.title = name;
    b.style.setProperty('--c', sideColourCss(c, mode));
    b.style.color = c === 7 || (c === SIDE_CUSTOM && (state.side.custom ?? [255, 255, 255]).reduce((a, v) => a + v, 0) > 600) ? '#131f24' : '#fff';
    b.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    b.addEventListener('click', () => setSide({ colour: c }));
    return b;
  }));
}

function renderControls() {
  const l = state.lighting;
  const meta = fxMeta(fxById(l.effect));
  renderBubbles(!meta.color);
  setBar($('hue'), l.hue);

  const fill = meta.color ? cssHsv(l.hue, l.sat) : '#58cc02';
  setBar($('brightness'), l.brightness, fill);
  $('brightnessOut').textContent = pct(l.brightness);
  const off = fxById(l.effect).key === 'none';
  $('brightness').disabled = off;
  $('brightness').closest('.slider').classList.toggle('is-disabled', off);

  setBar($('speed'), l.speed, '#ffc800');
  $('speedOut').textContent = meta.speed ? pct(l.speed) : '—';
  $('speedRow').classList.toggle('is-disabled', !meta.speed);
  $('speed').disabled = !meta.speed;
}

let toastTimer = null;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), Math.max(3600, msg.length * 65));
}

async function setView(view) {
  state.view = view;
  for (const [id, v] of [['panelLighting', 'lighting'], ['panelPerkey', 'perkey'], ['panelKeymap', 'keymap'], ['panelShortcuts', 'shortcuts']]) $(id).hidden = v !== view;
  document.querySelectorAll('.mode').forEach(b => {
    b.classList.toggle('is-active', b.dataset.mode === view);
    b.setAttribute('aria-selected', String(b.dataset.mode === view));
  });
  preview.setMode(view === 'shortcuts' ? 'keymap' : view);
  preview.setLegends(view === 'keymap' ? keymap.labels() : view === 'shortcuts' ? shortcutLegends() : null);
  if (view === 'perkey') {
    perkey.push();
    perkey.syncSelection();
    await setLightType('perkey');
  } else if (view === 'lighting') {
    preview.setSelection(new Set());
    await setLightType('effect');
  } else if (view === 'shortcuts') {
    preview.setSelection(new Set());
    preview.setMarks(new Set());
    renderShortcuts();
  } else {
    keymap.sync();
  }
  renderCaption();
}

async function setLightType(type) {
  if (type === state.lightType) return;
  state.lightType = type;
  if (type === 'perkey') {
    await perkey.activate();
  } else {
    await perkey.deactivate();
    if (lightingDirty) ['effect', 'color', 'brightness', 'speed'].forEach(queueWrite);
  }
  if (type !== state.savedType) ctx.markDirty();
}

function bindEvents() {
  document.querySelectorAll('.mode').forEach(b => b.addEventListener('click', () => setView(b.dataset.mode)));
  preview.onSelect = event => {
    if (state.view === 'perkey') perkey.select(event);
    else if (state.view === 'keymap') keymap.select(event);
  };
  perkey.bind();
  keymap.bind();
  $('connectBtn').addEventListener('click', requestKeyboard);
  $('sidePower').addEventListener('click', () => {
    setSide({ segments: state.side.segments === 0 ? 3 : 0 });
    if (keepsSide() && state.kb) queueWrite('sidePower');
  });
  $('saveBtn').addEventListener('click', () => save());
  $('sideUnlock').addEventListener('click', async () => {
    const opened = await window.keyglow?.revealFirmware?.().catch(() => false);
    toast(t(opened ? 'side.unlockOpened' : 'side.unlockHint'));
  });
  $('themeBtn').addEventListener('click', e => {
    e.stopPropagation();
    toggleThemes();
  });
  document.addEventListener('click', e => {
    if (!$('themeMenu').hidden && !e.target.closest('.theme')) toggleThemes(false);
  });
  window.addEventListener('blur', () => toggleThemes(false));
  document.querySelector('.theme').addEventListener('focusout', e => {
    if (!e.currentTarget.contains(e.relatedTarget)) toggleThemes(false);
  });
  $('resetBtn').addEventListener('click', () => resetDefaults());
  $('battery').addEventListener('click', () => toast($('battery').title));

  $('hue').addEventListener('input', e => update({ hue: Number(e.target.value), sat: 255 }));
  for (const id of ['brightness', 'speed']) {
    $(id).addEventListener('input', e => update({ [id]: Number(e.target.value) }));
  }

  document.querySelectorAll('.lang button').forEach(b => b.addEventListener('click', () => {
    setLang(b.dataset.lang);
    renderAll();
  }));

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
      e.preventDefault();
      if (state.dirty) save();
      return;
    }
    if (state.view === 'perkey' && (e.ctrlKey || e.metaKey) && e.code === 'KeyA' && e.target.tagName !== 'INPUT') {
      e.preventDefault();
      perkey.selectGroup('all');
      return;
    }
    if (e.code === 'Escape' && !$('themeMenu').hidden) {
      toggleThemes(false);
      $('themeBtn').focus();
      return;
    }
    if (e.code === 'Escape' && state.view === 'perkey') perkey.selectGroup('none');
    if (e.code === 'Escape' && state.view === 'keymap') {
      keymap.selected = null;
      keymap.sync();
    }
    if (e.repeat || e.target.tagName === 'INPUT') return;
    const hit = preview.pressCode(e.code);
    if (hit && e.target === document.body && ['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'Backspace', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.code)) {
      e.preventDefault();
    }
  });

  if (hasHid) {
    navigator.hid.addEventListener('connect', () => {
      autoConnect();
      scanDongles();
    });
    navigator.hid.addEventListener('disconnect', e => {
      scanDongles();
      if (state.kb && e.device === state.kb.hid) {
        disconnect();
        toast(t('toast.disconnected'));
      }
    });
  }

  window.keyglow?.onWireless?.(setBluetooth);
}

const THEMES = [
  { id: 'sea', bg: '#131f24', fg: '#a3b5bf', accent: '#1cb0f6' },
  { id: 'violet', bg: '#1a1530', fg: '#b9aedb', accent: '#ce82ff' },
  { id: 'cherry', bg: '#1f1416', fg: '#d9b5b5', accent: '#ff7a59' },
  { id: 'graphite', bg: '#141517', fg: '#b0b3ba', accent: '#1cb0f6' },
  { id: 'forest', bg: '#111c15', fg: '#a6c4ae', accent: '#2bd9c5' },
];

function applyTheme(id) {
  const theme = THEMES.find(x => x.id === id) ?? THEMES[0];
  if (theme.id === THEMES[0].id) delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme.id;
  store.set('theme', theme.id);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.bg);
  window.keyglow?.setTheme?.(theme.bg, theme.fg);
  renderThemes();
}

function renderThemes() {
  const current = store.get('theme') ?? THEMES[0].id;
  $('themeMenu').replaceChildren(...THEMES.map(theme => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'theme-item' + (theme.id === current ? ' is-active' : '');
    b.setAttribute('role', 'menuitemradio');
    b.setAttribute('aria-checked', String(theme.id === current));
    b.innerHTML = '<span class="theme-swatch"></span><span></span>';
    b.firstChild.style.setProperty('--sw-bg', theme.bg);
    b.firstChild.style.setProperty('--sw-accent', theme.accent);
    b.lastChild.textContent = t(`theme.${theme.id}`);
    b.addEventListener('click', () => {
      applyTheme(theme.id);
      toggleThemes(false);
    });
    return b;
  }));
}

function toggleThemes(open = $('themeMenu').hidden) {
  $('themeMenu').hidden = !open;
  $('themeBtn').setAttribute('aria-expanded', String(open));
}

let installPrompt = null;

function setupInstall() {
  if (window.keyglow?.isElectron || !location.protocol.startsWith('http')) return;
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  const btn = $('installBtn');
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    installPrompt = e;
    btn.hidden = false;
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    btn.hidden = true;
    toast(t('install.done'));
  });
  btn.addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    installPrompt = null;
    btn.hidden = true;
  });
}

function init() {
  if (window.keyglow?.isElectron) document.documentElement.classList.add('is-electron');
  if (window.keyglow?.platform === 'darwin') document.documentElement.classList.add('is-mac');
  setLang(getLang());
  applyTheme(store.get('theme'));
  Object.assign(state.lighting, savedLighting() ?? savedLighting(`preview.${state.def.id}`) ?? {});
  preview.setDevice(state.def);
  bindEvents();
  setupInstall();
  state.savedType = store.get(settingsKey())?.mode ?? 'effect';
  renderAll();
  setView(state.savedType === 'perkey' ? 'perkey' : 'lighting');
  if (hasHid) {
    autoConnect();
    scanDongles();
    setInterval(poll, POLL_MS);
  }
  window.keyglow?.getWireless?.().then(setBluetooth).catch(() => {});
}

init();
