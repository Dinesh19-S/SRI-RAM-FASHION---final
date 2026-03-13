const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // App info
    isElectron: true,
    platform: process.platform,

    // Print the current page
    print: () => ipcRenderer.invoke('print'),

    // App version
    getVersion: () => ipcRenderer.invoke('get-version'),
});
