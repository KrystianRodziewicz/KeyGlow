const REPORT_SIZE = 32;
const TIMEOUT_MS = 1000;

const CMD = {
  GET_PROTOCOL_VERSION: 0x01,
  KEYMAP_SET_KEYCODE: 0x05,
  KEYMAP_RESET: 0x06,
  CUSTOM_SET_VALUE: 0x07,
  CUSTOM_GET_VALUE: 0x08,
  CUSTOM_SAVE: 0x09,
  KEYMAP_LAYER_COUNT: 0x11,
  KEYMAP_GET_BUFFER: 0x12,
  SRGB_QMK_VERSION: 0x21,
  SRGB_PROTOCOL: 0x22,
  SRGB_STREAM: 0x24,
  SRGB_ENABLE: 0x25,
  SRGB_DISABLE: 0x26,
  SRGB_TOTAL_LEDS: 0x27,
  UNHANDLED: 0xff,
};

const ECHO_LENGTH = {
  [CMD.KEYMAP_SET_KEYCODE]: 4,
  [CMD.KEYMAP_GET_BUFFER]: 3,
  [CMD.SRGB_STREAM]: 3,
};

const SRGB_PER_PACKET = 9;

const KG_CHANNEL = 0;
const KG = { PROBE: 0x00, SIDE_ALL: 0x10, STATUS: 0x2f };

const sideFrom = r => ({ modeA: r[3], modeB: r[4], light: r[5], speed: r[6], rgb: r[7], colour: r[8], custom: [r[9], r[10], r[11]] });

const RGB_MATRIX_CHANNEL = 3;
const VALUE_IDS = { brightness: 1, effect: 2, speed: 3, color: 4 };

const LEGACY_IDS = { brightness: 0x80, effect: 0x81, speed: 0x82, color: 0x83 };

export class ViaError extends Error {}

export class ViaKeyboard {
  constructor(hid) {
    this.hid = hid;
    this.protocol = 0;
    this.queue = Promise.resolve();
    this.pending = null;
    this.onReport = this.onReport.bind(this);
  }

  async open() {
    if (!this.hid.opened) await this.hid.open();
    this.hid.addEventListener('inputreport', this.onReport);
    const r = await this.send([CMD.GET_PROTOCOL_VERSION]);
    this.protocol = (r[1] << 8) | r[2];
    if (!this.protocol) throw new ViaError('Klawiatura nie odpowiada na protokół VIA');
  }

  async close() {
    this.hid.removeEventListener('inputreport', this.onReport);
    if (this.hid.opened) await this.hid.close().catch(() => {});
  }

  onReport(e) {
    const data = new Uint8Array(e.data.buffer, e.data.byteOffset, e.data.byteLength);
    const p = this.pending;
    if (!p) return;
    const echoed = p.echo.every((b, i) => data[i] === b);
    const unhandled = data[0] === CMD.UNHANDLED && p.echo.slice(1).every((b, i) => data[i + 1] === b);
    if (echoed || unhandled) {
      this.pending = null;
      p.resolve(data);
    }
  }

  send(bytes) {
    const run = () => new Promise((resolve, reject) => {
      const buf = new Uint8Array(REPORT_SIZE);
      buf.set(bytes);
      const timer = setTimeout(() => {
        this.pending = null;
        reject(new ViaError('Przekroczono czas odpowiedzi klawiatury'));
      }, TIMEOUT_MS);
      const custom = [CMD.CUSTOM_SET_VALUE, CMD.CUSTOM_GET_VALUE].includes(bytes[0]) && this.modern;
      const echo = bytes.slice(0, custom ? 3 : ECHO_LENGTH[bytes[0]] ?? 1);
      this.pending = { echo, resolve: data => { clearTimeout(timer); resolve(data); } };
      this.hid.sendReport(0, buf).catch(err => {
        clearTimeout(timer);
        this.pending = null;
        reject(err);
      });
    });
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => {});
    return p;
  }

  get modern() {
    return this.protocol >= 12;
  }

  async getValue(name) {
    const r = this.modern
      ? await this.send([CMD.CUSTOM_GET_VALUE, RGB_MATRIX_CHANNEL, VALUE_IDS[name]])
      : await this.send([CMD.CUSTOM_GET_VALUE, LEGACY_IDS[name]]);
    if (r[0] === CMD.UNHANDLED) throw new ViaError('Firmware nie obsługuje RGB Matrix przez VIA');
    const offset = this.modern ? 3 : 2;
    return [r[offset], r[offset + 1]];
  }

  async setValue(name, ...data) {
    const r = this.modern
      ? await this.send([CMD.CUSTOM_SET_VALUE, RGB_MATRIX_CHANNEL, VALUE_IDS[name], ...data])
      : await this.send([CMD.CUSTOM_SET_VALUE, LEGACY_IDS[name], ...data]);
    if (r[0] === CMD.UNHANDLED) throw new ViaError('Firmware odrzucił zmianę oświetlenia');
  }

  async save() {
    await this.send(this.modern ? [CMD.CUSTOM_SAVE, RGB_MATRIX_CHANNEL] : [CMD.CUSTOM_SAVE]);
  }

  async readLighting() {
    const [brightness] = await this.getValue('brightness');
    const [effect] = await this.getValue('effect');
    const [speed] = await this.getValue('speed');
    const [hue, sat] = await this.getValue('color');
    return { brightness, effect, speed, hue, sat };
  }

  setBrightness(v) { return this.setValue('brightness', v); }
  setEffect(id) { return this.setValue('effect', id); }
  setSpeed(v) { return this.setValue('speed', v); }
  setColor(hue, sat) { return this.setValue('color', hue, sat); }

  async layerCount() {
    const r = await this.send([CMD.KEYMAP_LAYER_COUNT]);
    return r[1];
  }

  async readKeymap(layers, rows, cols, from = 0) {
    const total = layers * rows * cols * 2;
    const start = from * rows * cols * 2;
    const bytes = new Uint8Array(total);
    for (let offset = 0; offset < total; offset += 28) {
      const size = Math.min(28, total - offset);
      const at = start + offset;
      const r = await this.send([CMD.KEYMAP_GET_BUFFER, at >> 8, at & 0xff, size]);
      bytes.set(r.slice(4, 4 + size), offset);
    }
    return Array.from({ length: layers }, (_, layer) => Array.from({ length: rows * cols }, (_, i) => {
      const at = (layer * rows * cols + i) * 2;
      return (bytes[at] << 8) | bytes[at + 1];
    }));
  }

  async setKeycode(layer, row, col, code) {
    await this.send([CMD.KEYMAP_SET_KEYCODE, layer, row, col, code >> 8, code & 0xff]);
  }

  async resetKeymap() {
    await this.send([CMD.KEYMAP_RESET]);
  }

  async ledCount() {
    const r = await this.send([CMD.SRGB_TOTAL_LEDS]);
    return r[0] === CMD.UNHANDLED ? 0 : r[1];
  }

  async directOn() {
    await this.send([CMD.SRGB_ENABLE]);
  }

  async directOff() {
    await this.send([CMD.SRGB_DISABLE]);
  }

  async directColors(colors, start = 0) {
    for (let i = 0; i < colors.length; i += SRGB_PER_PACKET) {
      const chunk = colors.slice(i, i + SRGB_PER_PACKET);
      await this.send([CMD.SRGB_STREAM, start + i, chunk.length, ...chunk.flat()]);
    }
  }

  async kgProbe() {
    if (!this.modern) return 0;
    const r = await this.send([CMD.CUSTOM_GET_VALUE, KG_CHANNEL, KG.PROBE]);
    return r[0] === CMD.CUSTOM_GET_VALUE && r[3] === 0x4b && r[4] === 0x47 ? r[5] : 0;
  }

  async kgReadSide() {
    const r = await this.send([CMD.CUSTOM_GET_VALUE, KG_CHANNEL, KG.SIDE_ALL]);
    if (r[0] === CMD.UNHANDLED) throw new ViaError('Firmware nie obsługuje paska');
    return sideFrom(r);
  }

  async kgWriteSide(side) {
    const r = await this.send([CMD.CUSTOM_SET_VALUE, KG_CHANNEL, KG.SIDE_ALL, side.modeA, side.modeB, side.light, side.speed, side.rgb, side.colour, ...side.custom]);
    if (r[0] === CMD.UNHANDLED) throw new ViaError('Firmware odrzucił ustawienia paska');
    return sideFrom(r);
  }

  async kgSaveSide() {
    await this.send([CMD.CUSTOM_SAVE, KG_CHANNEL, KG.SIDE_ALL]);
  }

  async kgStatus() {
    const r = await this.send([CMD.CUSTOM_GET_VALUE, KG_CHANNEL, KG.STATUS]);
    if (r[0] === CMD.UNHANDLED) return null;
    return { battery: r[3], charging: Boolean(r[4] & 1), link: r[5], rfState: r[6] };
  }

  async firmwareTag() {
    const qmk = await this.send([CMD.SRGB_QMK_VERSION]);
    if (qmk[0] !== CMD.SRGB_QMK_VERSION) return `via${this.protocol}`;
    const srgb = await this.send([CMD.SRGB_PROTOCOL]);
    return [...qmk.slice(1, 4), ...srgb.slice(1, 4)].join('.');
  }

  async probeMaxEffect({ keepSide = false } = {}) {
    const [current] = await this.getValue('effect');
    if (keepSide) await this.setEffect(0);
    await this.setEffect(255);
    const [max] = await this.getValue('effect');
    if (keepSide) await this.setEffect(0);
    await this.setEffect(current);
    return max;
  }
}
