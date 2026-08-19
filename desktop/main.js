const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1380,
    height: 840,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#070a14',
    title: 'جنگ سلسله — استراتژی فتح جهان',
    icon: path.join(__dirname, 'icon.ico'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, 'game', 'index.html'));
  win.once('ready-to-show', () => win.show());

  // حذف کامل منو برای تجربه‌ی تمام‌صفحه‌تر
  Menu.setApplicationMenu(null);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
