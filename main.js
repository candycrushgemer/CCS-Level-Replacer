const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const { exec } = require('child_process');

let mainWindow = null;
function createWindow() {
  const win = new BrowserWindow({
    width: 520,
    height: 185,
    minWidth: 520,
    maxWidth: 520,
    minHeight: 185,
    maxHeight: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      devTools: false,
    },
    resizable: false,
    title: 'CCS Level Replacer',
    transparent: true,
    frame: false,
  });
  mainWindow = win;
  win.setMenuBarVisibility(false);
  win.setAlwaysOnTop(false);
  win.setResizable(false);
  // Handle window focus/blur for .active class
  win.on('blur', () => {
    win.webContents.send('window:focus-change', false);
  });
  win.on('focus', () => {
    win.webContents.send('window:focus-change', true);
  });
  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript(`
      const winBody = document.querySelector('.window-body');
      if (winBody) {
        const rect = winBody.getBoundingClientRect();
        require('electron').ipcRenderer.send('resize-window', rect.height + 80);
      }
    `);
  });
  win.removeMenu();
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.on('resize-window', (event, height) => {
  if (mainWindow) {
    const boundedHeight = Math.max(200, Math.min(800, height));
    mainWindow.setSize(520, boundedHeight);
  }
});

ipcMain.on('window:minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

app.whenReady().then(() => {
  app.setName('CCS Level Replacer');
  createWindow();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'JSON or Text', extensions: ['json', 'txt'] },
    ],
  });
  if (canceled || !filePaths.length) return null;
  return filePaths[0];
});

ipcMain.handle('file:saveFile', async (_event, filePath, content) => {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf8');
    return true;
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('file:readFile', async (_event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return content;
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('dialog:showMessage', async (_event, options) => {
  return new Promise((resolve) => {
    const dialogWin = new BrowserWindow({
      width: 420,
      height: 200,
      minWidth: 420,
      maxWidth: 420,
      minHeight: 140,
      maxHeight: 420,
      parent: mainWindow,
      modal: true,
      show: false,
      frame: false,
      transparent: true,
      resizable: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        devTools: false,
      },
    });
    dialogWin.setMenuBarVisibility(false);
    dialogWin.loadFile(path.join(__dirname, 'renderer', 'dialog.html'));
    
    // Send dialog data via IPC after window loads
    dialogWin.webContents.once('did-finish-load', () => {
      dialogWin.webContents.send('dialog:setData', {
        title: options.title || 'Dialog',
        message: options.message || 'No message provided.',
        buttons: options.buttons || ['OK'],
        icon: options.icon || 'info'
      });
    });
    
    dialogWin.once('ready-to-show', () => dialogWin.show());
    ipcMain.once('dialog:response', (_evt, response) => {
      resolve({ response });
      dialogWin.close();
    });
    ipcMain.once('dialog:resize', (_evt, height) => {
      const boundedHeight = Math.max(140, Math.min(420, height));
      dialogWin.setSize(420, boundedHeight);
    });
  });
});

ipcMain.handle('os:getUserProfile', async () => {
  return os.homedir();
});

ipcMain.handle('file:getAllFiles', async (_event, dir) => {
  try {
    const files = await fs.readdir(dir);
    return files;
  } catch (error) {
    return [];
  }
});

ipcMain.handle('file:findFiles', async (_event, dir, pattern) => {
  try {
    const files = await fs.readdir(dir);
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const filteredFiles = files.filter(f => regex.test(f));
    return filteredFiles;
  } catch (error) {
    return [];
  }
});

ipcMain.handle('shell:openExternal', async (_event, url) => {
  await shell.openExternal(url);
});

ipcMain.handle('system:disableWifiAndLaunchCCS', async () => {
  // Try to disconnect WiFi (optional - don't fail if it doesn't work)
  try {
    await new Promise((resolve, reject) => {
      exec('netsh wlan disconnect', (err) => {
        resolve(); // Always resolve, don't fail if WiFi disconnect doesn't work
      });
    });
  } catch (error) {
    // Continue anyway
  }
  
  // Launch Candy Crush Saga UWP
  await new Promise((resolve, reject) => {
    exec('start "" shell:AppsFolder\\king.com.CandyCrushSaga_kgqvnymyfvs32!App', (err) => {
      if (err) {
        return reject(new Error('Failed to launch Candy Crush Saga.'));
      }
      resolve();
    });
  });
  
  return true;
}); 