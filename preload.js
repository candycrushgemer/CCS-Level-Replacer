const { contextBridge, ipcRenderer } = require('electron');

let dialogData = null;

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (filePath, content) => ipcRenderer.invoke('file:saveFile', filePath, content),
  readFile: (filePath) => ipcRenderer.invoke('file:readFile', filePath),
  showMessage: (options) => ipcRenderer.invoke('dialog:showMessage', options),
  getUserProfile: () => ipcRenderer.invoke('os:getUserProfile'),
  findFiles: (dir, pattern) => ipcRenderer.invoke('file:findFiles', dir, pattern),
  getAllFiles: (dir) => ipcRenderer.invoke('file:getAllFiles', dir),
  disableWifiAndLaunchCCS: () => ipcRenderer.invoke('system:disableWifiAndLaunchCCS'),
  // For dialog.html only:
  getDialogData: () => dialogData,
  onDialogData: (callback) => ipcRenderer.on('dialog:setData', (event, data) => {
    dialogData = data;
    callback(data);
  }),
  sendDialogResponse: (idx) => ipcRenderer.send('dialog:response', idx),
  sendDialogResize: (height) => ipcRenderer.send('dialog:resize', height),
  // Window focus events
  onWindowFocusChange: (callback) => ipcRenderer.on('window:focus-change', callback),
  // Window controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
}); 