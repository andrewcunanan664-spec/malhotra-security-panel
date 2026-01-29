const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Database modülünü import et
const database = require('./database');

// Email ve Scheduler modüllerini import et
const emailService = require('./emailService');
const scheduler = require('./scheduler');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Malhotra Kablo Güvenlik Paneli',
    icon: path.join(__dirname, '../public/logo512.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false,
    backgroundColor: '#0f172a'
  });

  // Development veya Production URL
  const isDev = process.env.ELECTRON_DEV === 'true';

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Menü oluştur
  const template = [
    {
      label: 'Dosya',
      submenu: [
        { role: 'reload', label: 'Yenile' },
        { role: 'forceReload', label: 'Zorla Yenile' },
        { type: 'separator' },
        {
          label: 'Veritabanı Konumu',
          click: () => {
            const dbPath = database.getDbPath();
            shell.showItemInFolder(dbPath);
          }
        },
        { type: 'separator' },
        { role: 'quit', label: 'Çıkış' }
      ]
    },
    {
      label: 'Görünüm',
      submenu: [
        { role: 'resetZoom', label: 'Gerçek Boyut' },
        { role: 'zoomIn', label: 'Yakınlaştır' },
        { role: 'zoomOut', label: 'Uzaklaştır' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Tam Ekran' },
        { type: 'separator' },
        { role: 'toggleDevTools', label: 'Geliştirici Araçları' }
      ]
    },
    {
      label: 'Yardım',
      submenu: [
        {
          label: 'Hakkında',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Hakkında',
              message: 'Malhotra Kablo Güvenlik Paneli',
              detail: `Sürüm: ${app.getVersion()}\nVeritabanı: SQLite (Lokal)\n\nMalhotra Kablo İdari İşler`
            });
          }
        },
        {
          label: 'Veritabanı Yedekle',
          click: async () => {
            const dbPath = database.getDbPath();
            const { filePath } = await dialog.showSaveDialog(mainWindow, {
              title: 'Veritabanı Yedeği Kaydet',
              defaultPath: `guvenlik_yedek_${new Date().toISOString().split('T')[0]}.db`,
              filters: [{ name: 'SQLite Database', extensions: ['db'] }]
            });

            if (filePath) {
              try {
                fs.copyFileSync(dbPath, filePath);
                dialog.showMessageBox(mainWindow, {
                  type: 'info',
                  title: 'Başarılı',
                  message: 'Veritabanı yedeği alındı!'
                });
              } catch (error) {
                dialog.showErrorBox('Hata', 'Yedek alınamadı: ' + error.message);
              }
            }
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Veritabanı IPC Handler'ları
function setupDatabaseHandlers() {
  ipcMain.handle('db:getActiveLogs', () => database.getActiveLogs());
  ipcMain.handle('db:getAllLogs', (_, limit) => database.getAllLogs(limit));
  ipcMain.handle('db:getLogsByDateRange', (_, dateFrom, dateTo) => database.getLogsByDateRange(dateFrom, dateTo));
  ipcMain.handle('db:insertLog', (_, logData) => database.insertLog(logData));
  ipcMain.handle('db:updateLog', (_, id, updateData) => database.updateLog(id, updateData));
  ipcMain.handle('db:exitLog', (_, id, exitData) => database.exitLog(id, exitData));
  ipcMain.handle('db:deleteLog', (_, id) => database.deleteLog(id));
  ipcMain.handle('db:searchLogs', (_, searchTerm, limit) => database.searchLogs(searchTerm, limit));
  ipcMain.handle('db:getStats', () => database.getStats());
  ipcMain.handle('db:setSetting', (_, key, value) => database.setSetting(key, value));
  ipcMain.handle('db:getSetting', (_, key) => database.getSetting(key));
  ipcMain.handle('db:getDbPath', () => database.getDbPath());

  // Uygulama bilgileri
  ipcMain.handle('app:getVersion', () => app.getVersion());

  // Dosya işlemleri
  ipcMain.handle('file:saveFile', async (_, fileName, data) => {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Dosyayı Kaydet',
      defaultPath: fileName,
      filters: [
        { name: 'Excel', extensions: ['xlsx'] },
        { name: 'PDF', extensions: ['pdf'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (filePath) {
      fs.writeFileSync(filePath, Buffer.from(data));
      return filePath;
    }
    return null;
  });

  ipcMain.handle('file:openFolder', (_, folderPath) => {
    shell.openPath(folderPath);
  });

  // E-posta işlemleri
  ipcMain.handle('email:getSettings', () => emailService.getEmailSettings());
  ipcMain.handle('email:saveSettings', (_, settings) => emailService.saveEmailSettings(settings));
  ipcMain.handle('email:testSmtp', () => emailService.testSmtpConnection());
  ipcMain.handle('email:sendDailyReport', (_, date) => emailService.sendDailyReport(date));
  ipcMain.handle('email:sendTestEmail', () => emailService.sendTestEmail());

  // Zamanlayıcı işlemleri
  ipcMain.handle('scheduler:start', () => scheduler.start());
  ipcMain.handle('scheduler:stop', () => scheduler.stop());
  ipcMain.handle('scheduler:restart', () => scheduler.restart());
  ipcMain.handle('scheduler:getStatus', () => scheduler.getStatus());
}

app.whenReady().then(async () => {
  // Veritabanını başlat (async)
  await database.initDatabase();

  // IPC handler'ları kur
  setupDatabaseHandlers();

  // Zamanlayıcıyı başlat
  scheduler.start();

  // Pencereyi oluştur
  createWindow();
});

app.on('window-all-closed', () => {
  scheduler.stop(); // Zamanlayıcıyı durdur
  database.closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Beklenmedik hatalarda veritabanını kapat
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  database.closeDatabase();
});
