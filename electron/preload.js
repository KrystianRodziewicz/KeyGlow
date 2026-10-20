const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('keyglow', {
  isElectron: true,
  platform: process.platform,

  getWireless: () => ipcRenderer.invoke('wireless:get'),
  onWireless: cb => ipcRenderer.on('wireless:update', (_, status) => cb(status)),
  setTheme: (bg, fg) => ipcRenderer.send('theme:set', { bg, fg }),
  revealFirmware: () => ipcRenderer.invoke('firmware:reveal'),
});
