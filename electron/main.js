const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, session, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const wireless = require('./wireless');

const KEYBOARDS = [{ vendorId: 0x19f5, productId: 0x32f5 }];
const DONGLES = [{ vendorId: 0x19f5, productId: 0x3247 }];
const matches = list => d => list.some(s => s.vendorId === d.vendorId && s.productId === d.productId);
const isKeyboard = matches(KEYBOARDS);
const isAllowed = matches([...KEYBOARDS, ...DONGLES]);

const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';
const isStore = Boolean(process.windowsStore);
const ICON = path.join(__dirname, '..', 'src', 'assets', 'icon.png');
const HIDDEN_ARG = '--hidden';
const ZOOM = 1.1;
const ZOOM_MIN_HEIGHT = 980;
let zoom = 1;

let win = null;
let tray = null;
let quitting = false;

const configPath = () => path.join(app.getPath('userData'), 'keyglow.json');
function readConfig() {
  try { return JSON.parse(fs.readFileSync(configPath(), 'utf8')); } catch { return {}; }
}
function writeConfig(patch) {
  const next = { ...readConfig(), ...patch };
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(next, null, 2));
}

const loginArgs = () => (app.isPackaged ? [HIDDEN_ARG] : [path.resolve(app.getAppPath()), HIDDEN_ARG]);
const windowsExe = () => process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
const linuxExe = () => process.env.APPIMAGE || process.execPath;
const autostartDir = () => path.join(process.env.XDG_CONFIG_HOME || path.join(app.getPath('home'), '.config'), 'autostart');
const linuxAutostartFile = () => path.join(autostartDir(), 'keyglow.desktop');
const desktopArg = s => `"${String(s).replace(/[\\"`$]/g, '\\\\$&').replace(/%/g, '%%')}"`;

function writeLinuxAutostart() {
  fs.mkdirSync(autostartDir(), { recursive: true });
  fs.writeFileSync(linuxAutostartFile(), [
    '[Desktop Entry]',
    'Type=Application',
    'Name=KeyGlow',
    'Comment=NuPhy Halo75 V2',
    `Exec=${[linuxExe(), ...loginArgs()].map(desktopArg).join(' ')}`,
    'Icon=keyglow',
    'Terminal=false',
    'X-GNOME-Autostart-enabled=true',
    '',
  ].join('\n'));
}

function isLinuxAutostart() {
  try {
    const text = fs.readFileSync(linuxAutostartFile(), 'utf8');
    return !/^Hidden\s*=\s*true/im.test(text) && !/^X-GNOME-Autostart-enabled\s*=\s*false/im.test(text);
  } catch {
    return false;
  }
}

function isAutostart() {
  if (isLinux) return isLinuxAutostart();
  if (isMac) return app.getLoginItemSettings().openAtLogin;
  return app.getLoginItemSettings({ path: windowsExe(), args: loginArgs() }).openAtLogin;
}

function setAutostart(enabled) {
  if (isLinux) return enabled ? writeLinuxAutostart() : fs.rmSync(linuxAutostartFile(), { force: true });
  if (isMac) return app.setLoginItemSettings({ openAtLogin: enabled });
  app.setLoginItemSettings({ openAtLogin: enabled, path: windowsExe(), args: loginArgs() });
}

const startedHidden = () => process.argv.includes(HIDDEN_ARG) || (isMac && app.getLoginItemSettings().wasOpenedAtLogin);

function showWindow() {
  if (!win) return createWindow(true);
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function createWindow(visible) {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 720,
    minHeight: 560,
    show: false,
    title: 'KeyGlow',
    icon: ICON,
    backgroundColor: themeColors().bg,
    titleBarStyle: 'hidden',

    ...(isMac
      ? { trafficLightPosition: { x: 20, y: 24 } }
      : { titleBarOverlay: { color: themeColors().bg, symbolColor: themeColors().fg, height: 64 } }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  if (visible) win.once('ready-to-show', () => win.show());
  win.webContents.on('did-finish-load', fitZoom);
  win.on('resize', fitZoom);
  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', e => e.preventDefault());

  win.on('close', e => {
    if (quitting) return;
    e.preventDefault();
    win.hide();
    if (!readConfig().trayHintShown && tray && process.platform === 'win32') {
      tray.displayBalloon({
        iconType: 'info',
        title: 'KeyGlow działa w tle',
        content: 'Ustawienia klawiatury są pilnowane. Kliknij ikonę przy zegarze, żeby otworzyć panel.',
      });
      writeConfig({ trayHintShown: true });
    }
  });
  win.on('closed', () => { win = null; });
}

function trayMenu() {
  return Menu.buildFromTemplate([
    { label: 'Otwórz KeyGlow', click: showWindow },
    { type: 'separator' },
    isStore
      ? { label: 'Uruchamianie razem z systemem…', click: () => shell.openExternal('ms-settings:startupapps') }
      : {
          label: 'Uruchamiaj razem z systemem',
          type: 'checkbox',
          checked: isAutostart(),
          click: item => {
            setAutostart(item.checked);
            if (process.platform !== 'win32') tray.setContextMenu(trayMenu());
          },
        },
    { type: 'separator' },
    { label: 'Zamknij', click: () => { quitting = true; app.quit(); } },
  ]);
}

function createTray() {
  const size = isMac ? 18 : isLinux ? 24 : 32;
  tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: size, height: size }));
  tray.setToolTip('KeyGlow');
  if (process.platform === 'win32') {
    tray.on('click', showWindow);
    tray.on('right-click', () => tray.popUpContextMenu(trayMenu()));
  } else {
    tray.setContextMenu(trayMenu());
    tray.on('click', showWindow);
  }
}

function setupHid() {
  const ses = session.defaultSession;
  ses.on('select-hid-device', (event, details, callback) => {
    event.preventDefault();
    const device = details.deviceList.find(isKeyboard);
    callback(device ? device.deviceId : '');
  });
  ses.setPermissionCheckHandler((webContents, permission) => permission === 'hid');
  ses.setDevicePermissionHandler(details => details.deviceType === 'hid' && isAllowed(details.device));
}

const HEX = /^#[0-9a-f]{6}$/i;
const isHex = v => typeof v === 'string' && HEX.test(v);
function themeColors() {
  const theme = readConfig().theme;
  return theme && isHex(theme.bg) && isHex(theme.fg) ? theme : { bg: '#131f24', fg: '#a3b5bf' };
}

function fitZoom() {
  if (!win || win.isDestroyed()) return;
  const next = win.getContentSize()[1] >= ZOOM_MIN_HEIGHT ? ZOOM : 1;
  if (next === zoom && win.webContents.getZoomFactor() === next) return;
  zoom = next;
  win.webContents.setZoomFactor(zoom);
  if (isMac) win.setWindowButtonPosition?.({ x: 20, y: Math.round(24 * zoom) });
  else win.setTitleBarOverlay({ height: Math.round(64 * zoom) });
}

function setupFirmware() {
  ipcMain.handle('firmware:reveal', async () => {
    const dir = path.join(app.getAppPath(), 'firmware');
    const file = path.join(dir, 'keyglow-halo75-v2-ansi.bin');
    if (fs.existsSync(file)) {
      shell.showItemInFolder(file);
      return true;
    }
    if (fs.existsSync(dir)) return (await shell.openPath(dir)) === '';
    return false;
  });
}

function setupTheme() {
  ipcMain.on('theme:set', (event, theme) => {
    if (!theme || !isHex(theme.bg) || !isHex(theme.fg)) return;
    const current = readConfig().theme;
    if (current?.bg !== theme.bg || current?.fg !== theme.fg) writeConfig({ theme: { bg: theme.bg, fg: theme.fg } });
    if (!win) return;
    win.setBackgroundColor(theme.bg);
    if (!isMac) win.setTitleBarOverlay({ color: theme.bg, symbolColor: theme.fg, height: Math.round(64 * zoom) });
  });
}

function setupWireless() {
  ipcMain.handle('wireless:get', () => wireless.read());
  wireless.watch(status => {
    win?.webContents.send('wireless:update', status);
    tray?.setToolTip(status.battery != null ? `KeyGlow · Bluetooth ${status.battery}%` : 'KeyGlow');
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showWindow);

  app.whenReady().then(() => {
    if (process.platform === 'win32') app.setAppUserModelId('io.github.keyglow');
    Menu.setApplicationMenu(isMac ? Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }]) : null);
    setupHid();

    const config = readConfig();
    if (app.isPackaged && !isStore && !config.autostartConfigured) {
      setAutostart(true);
      writeConfig({ autostartConfigured: true });
    } else if (isLinux && isLinuxAutostart()) {
      writeLinuxAutostart();
    }

    createTray();
    setupTheme();
    setupFirmware();
    setupWireless();
    createWindow(!startedHidden());
  });

  app.on('activate', showWindow);
  app.on('before-quit', () => { quitting = true; });
  app.on('window-all-closed', e => e.preventDefault());
}
