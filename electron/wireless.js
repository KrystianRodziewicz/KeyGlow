const { execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const NAME = /halo\s*75|nuphy/i;
const INTERVAL_MS = 30_000;
const NONE = { state: 'none', name: null, channel: null, battery: null };

function run(cmd, args, timeout = 3000) {
  return new Promise(resolve => {
    execFile(cmd, args, { timeout, windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => resolve(err ? '' : stdout));
  });
}

const percent = v => (Number.isInteger(v) && v >= 0 && v <= 100 ? v : null);
const channelOf = name => Number(/-(\d)$/.exec(name ?? '')?.[1]) || null;

function result(state, name, battery) {
  return { state, name, channel: channelOf(name), battery: state === 'connected' ? percent(battery) : null };
}

async function readWindows() {
  const ps = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const script = fs.readFileSync(path.join(__dirname, 'bt-windows.ps1'), 'utf8');
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  const raw = await run(ps, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded], 15000);
  if (!raw.trim()) return null;
  let data;
  try { data = JSON.parse(raw); } catch { return null; }
  const list = [].concat(data.devices ?? []).filter(Boolean);
  const connected = data.aepOk ? list.find(d => d.connected === true) : null;
  if (connected) return result('connected', connected.name, connected.battery);
  return list.length ? result('paired', list[0].name, null) : NONE;
}

async function readMac() {
  const accps = await run('/usr/bin/pmset', ['-g', 'accps'], 5000);
  for (const line of accps.split('\n')) {
    const m = /^\s*-(.+?) \(id=\d+\)\s+(\d+)%/.exec(line);
    if (m && NAME.test(m[1])) return result('connected', m[1].trim(), Math.min(100, Number(m[2])));
  }
  const raw = await run('/usr/sbin/system_profiler', ['SPBluetoothDataType', '-json'], 15000);
  if (!raw) return null;
  let root;
  try { root = JSON.parse(raw).SPBluetoothDataType?.[0]; } catch { return null; }
  for (const group of [].concat(root?.device_connected ?? [])) {
    for (const [name, info] of Object.entries(group ?? {})) {
      if (NAME.test(name)) return result('connected', name, parseInt(info?.device_batteryLevelMain ?? '', 10));
    }
  }
  for (const group of [].concat(root?.device_not_connected ?? [])) {
    const name = Object.keys(group ?? {}).find(n => NAME.test(n));
    if (name) return result('paired', name, null);
  }
  return NONE;
}

async function readLinuxBusctl() {
  const raw = await run('busctl', ['--system', '--json=short', 'call', 'org.bluez', '/', 'org.freedesktop.DBus.ObjectManager', 'GetManagedObjects'], 5000);
  if (!raw) return null;
  let objects;
  try { objects = JSON.parse(raw).data[0]; } catch { return null; }
  let paired = null;
  for (const ifaces of Object.values(objects)) {
    const dev = ifaces['org.bluez.Device1'];
    const name = dev?.Name?.data ?? dev?.Alias?.data ?? '';
    if (!dev || !NAME.test(name)) continue;
    if (dev.Connected?.data === true) return result('connected', name, ifaces['org.bluez.Battery1']?.Percentage?.data);
    if (dev.Paired?.data) paired ??= result('paired', name, null);
  }
  return paired ?? NONE;
}

async function readLinuxBluetoothctl() {
  const devices = await run('bluetoothctl', ['devices'], 3000);
  if (!devices) return null;
  let paired = null;
  for (const m of devices.matchAll(/^Device ([0-9A-F:]{17}) (.+)$/gim)) {
    if (!NAME.test(m[2])) continue;
    const info = await run('bluetoothctl', ['info', m[1]], 3000);
    if (!/^\s*Connected:\s*yes/im.test(info)) {
      paired ??= result('paired', m[2], null);
      continue;
    }
    const battery = /^\s*Battery Percentage:\s*0x[0-9a-f]+\s*\((\d+)\)/im.exec(info)?.[1];
    return result('connected', m[2], battery == null ? null : Number(battery));
  }
  return paired ?? NONE;
}

async function readLinuxUpower() {
  const list = (await run('upower', ['-e'])).split('\n').filter(Boolean);
  for (const item of list) {
    const info = await run('upower', ['-i', item]);
    const model = /model:\s*(.+)/.exec(info)?.[1]?.trim() ?? '';
    if (NAME.test(model)) return result('connected', model, parseInt(/percentage:\s*(\d+)/.exec(info)?.[1] ?? '', 10));
  }
  return NONE;
}

async function readLinux() {
  return (await readLinuxBusctl()) ?? (await readLinuxBluetoothctl()) ?? (await readLinuxUpower());
}

async function readRaw() {
  try {
    if (process.platform === 'win32') return await readWindows();
    if (process.platform === 'darwin') return await readMac();
    if (process.platform === 'linux') return await readLinux();
  } catch {}
  return null;
}

let lastGood = NONE;
let failures = 0;

async function read() {
  const status = await readRaw();
  if (status) {
    lastGood = status;
    failures = 0;
  } else if (++failures >= 3) {
    lastGood = NONE;
  }
  return lastGood;
}

function watch(onChange) {
  let last = '';
  const tick = async () => {
    const status = await read();
    const key = JSON.stringify(status);
    if (key !== last) {
      last = key;
      onChange(status);
    }
  };
  tick();
  return setInterval(tick, INTERVAL_MS);
}

module.exports = { read, watch };
