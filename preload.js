const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  switchService: (serviceKey) => ipcRenderer.send('switch-service', serviceKey)
});
