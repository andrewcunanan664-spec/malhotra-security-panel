const { contextBridge, ipcRenderer } = require('electron');

// API'yi renderer process'e expose et
contextBridge.exposeInMainWorld('electronAPI', {
    // Veritabanı işlemleri
    db: {
        getActiveLogs: () => ipcRenderer.invoke('db:getActiveLogs'),
        getAllLogs: (limit) => ipcRenderer.invoke('db:getAllLogs', limit),
        getLogsByDateRange: (dateFrom, dateTo) => ipcRenderer.invoke('db:getLogsByDateRange', dateFrom, dateTo),
        insertLog: (logData) => ipcRenderer.invoke('db:insertLog', logData),
        updateLog: (id, updateData) => ipcRenderer.invoke('db:updateLog', id, updateData),
        exitLog: (id, exitData) => ipcRenderer.invoke('db:exitLog', id, exitData),
        deleteLog: (id) => ipcRenderer.invoke('db:deleteLog', id),
        searchLogs: (searchTerm, limit) => ipcRenderer.invoke('db:searchLogs', searchTerm, limit),
        getStats: () => ipcRenderer.invoke('db:getStats'),
        setSetting: (key, value) => ipcRenderer.invoke('db:setSetting', key, value),
        getSetting: (key) => ipcRenderer.invoke('db:getSetting', key),
        getDbPath: () => ipcRenderer.invoke('db:getDbPath')
    },

    // Uygulama bilgileri
    app: {
        getVersion: () => ipcRenderer.invoke('app:getVersion'),
        getPlatform: () => process.platform,
        isElectron: true
    },

    // Dosya işlemleri
    file: {
        saveFile: (fileName, data) => ipcRenderer.invoke('file:saveFile', fileName, data),
        openFolder: (folderPath) => ipcRenderer.invoke('file:openFolder', folderPath)
    },

    // E-posta işlemleri
    email: {
        getSettings: () => ipcRenderer.invoke('email:getSettings'),
        saveSettings: (settings) => ipcRenderer.invoke('email:saveSettings', settings),
        testSmtp: () => ipcRenderer.invoke('email:testSmtp'),
        sendDailyReport: (date) => ipcRenderer.invoke('email:sendDailyReport', date),
        sendTestEmail: () => ipcRenderer.invoke('email:sendTestEmail')
    },

    // Zamanlayıcı işlemleri
    scheduler: {
        start: () => ipcRenderer.invoke('scheduler:start'),
        stop: () => ipcRenderer.invoke('scheduler:stop'),
        restart: () => ipcRenderer.invoke('scheduler:restart'),
        getStatus: () => ipcRenderer.invoke('scheduler:getStatus')
    }
});
