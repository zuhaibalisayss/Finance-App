const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

const isDev = process.env.NODE_ENV !== 'production';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.ico'),
    titleBarStyle: 'default',
    frame: true,
    backgroundColor: '#ffffff'
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('save-data', async (event, data) => {
  try {
    const userDataPath = app.getPath('userData');
    const dataFilePath = path.join(userDataPath, 'finance-data.json');
    
    await fs.promises.writeFile(dataFilePath, JSON.stringify(data, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error saving data:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-data', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const dataFilePath = path.join(userDataPath, 'finance-data.json');
    
    if (fs.existsSync(dataFilePath)) {
      const data = await fs.promises.readFile(dataFilePath, 'utf-8');
      return { success: true, data: JSON.parse(data) };
    } else {
      return { success: true, data: null };
    }
  } catch (error) {
    console.error('Error loading data:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-user-data-path', async () => {
  return app.getPath('userData');
});
