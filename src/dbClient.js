// Electron veya Web ortamını tespit et ve uygun API'yi kullan
import { supabase } from './supabaseClient';

const isElectron = typeof window !== 'undefined' && window.electronAPI;

// Supabase senkronizasyon kuyruğu için key
const SYNC_QUEUE_KEY = 'supabase_sync_queue';

// Senkronizasyon kuyruğuna ekle
function addToSyncQueue(action, data, localId = null) {
    try {
        const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
        queue.push({ action, data, localId, timestamp: Date.now() });
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
        console.error('Sync queue error:', e);
    }
}

// Supabase'e senkronize et (arka planda)
async function syncToSupabase(action, data, localId = null) {
    console.log(`🔄 Supabase sync başlatılıyor: ${action}`, data);
    try {
        if (action === 'INSERT') {
            // id'yi kaldır, Supabase kendi id'sini oluşturacak
            const { id, ...insertData } = data;
            console.log('📤 Supabase INSERT data:', insertData);
            const { data: result, error } = await supabase.from('security_logs').insert([insertData]).select();
            if (error) {
                console.error('❌ Supabase insert error:', error.message, error.code, error.details);
                console.error('❌ Hata detayları:', JSON.stringify(error, null, 2));
                // RLS hatası kontrolü
                if (error.code === '42501' || error.message.includes('policy')) {
                    console.error('⚠️ RLS HATASI: Supabase Dashboard\'da security_logs tablosu için RLS politikası eklemeniz gerekiyor!');
                }
                addToSyncQueue(action, data, localId);
            } else {
                console.log('✅ Supabase sync: INSERT başarılı', result);
            }
        } else if (action === 'UPDATE') {
            // Supabase'de created_at ile eşleşen kaydı bul ve güncelle
            const { error } = await supabase
                .from('security_logs')
                .update(data)
                .eq('created_at', data.created_at || localId);
            if (error) {
                console.error('Supabase update error:', error);
                addToSyncQueue(action, data, localId);
            } else {
                console.log('✅ Supabase sync: UPDATE başarılı');
            }
        } else if (action === 'DELETE') {
            const { error } = await supabase
                .from('security_logs')
                .delete()
                .eq('created_at', localId);
            if (error) {
                console.error('Supabase delete error:', error);
                addToSyncQueue(action, data, localId);
            } else {
                console.log('✅ Supabase sync: DELETE başarılı');
            }
        } else if (action === 'EXIT') {
            // Çıkış işlemi için - plate veya name ile ara
            const updateData = { exit_at: data.exit_at, ...data.extraData };
            let query = supabase.from('security_logs').update(updateData).is('exit_at', null);

            if (data.plate) {
                query = query.eq('plate', data.plate);
            } else if (data.name) {
                query = query.eq('name', data.name);
            }

            const { error } = await query;
            if (error) {
                console.error('Supabase exit error:', error);
                addToSyncQueue(action, data, localId);
            } else {
                console.log('✅ Supabase sync: EXIT başarılı');
            }
        }
    } catch (e) {
        console.error('Supabase sync exception:', e);
        addToSyncQueue(action, data, localId);
    }
}

// Bekleyen senkronizasyonları işle
async function processSyncQueue() {
    try {
        const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
        if (queue.length === 0) return;

        const newQueue = [];
        for (const item of queue) {
            try {
                await syncToSupabase(item.action, item.data, item.localId);
            } catch (e) {
                // 3 denemeden fazla olmayanları yeniden kuyruğa ekle
                if (!item.retries || item.retries < 3) {
                    newQueue.push({ ...item, retries: (item.retries || 0) + 1 });
                }
            }
        }
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(newQueue));
    } catch (e) {
        console.error('Process sync queue error:', e);
    }
}

// Electron ortamında SQLite kullan + Supabase senkronizasyonu
const electronDB = {
    async getActiveLogs() {
        return await window.electronAPI.db.getActiveLogs();
    },

    async getAllLogs(limit = 1000) {
        return await window.electronAPI.db.getAllLogs(limit);
    },

    async getLogsByDateRange(dateFrom, dateTo) {
        return await window.electronAPI.db.getLogsByDateRange(dateFrom, dateTo);
    },

    async insertLog(logData) {
        // Önce yerel SQLite'a kaydet
        const result = await window.electronAPI.db.insertLog(logData);

        // Sonra Supabase'e senkronize et (arka planda)
        syncToSupabase('INSERT', { ...logData, created_at: result.created_at || logData.created_at }, result.id);

        return result;
    },

    async updateLog(id, updateData) {
        // Önce güncellenecek kaydı bul (created_at için)
        const logs = await this.getAllLogs();
        const existingLog = logs.find(l => l.id === id);

        const result = await window.electronAPI.db.updateLog(id, updateData);

        // Supabase'e senkronize et
        if (existingLog) {
            syncToSupabase('UPDATE', { ...updateData, created_at: existingLog.created_at }, existingLog.created_at);
        }

        return result;
    },

    async exitLog(id, exitData = {}) {
        // Önce çıkış yapılacak kaydı bul
        const logs = await this.getActiveLogs();
        const existingLog = logs.find(l => l.id === id);

        const result = await window.electronAPI.db.exitLog(id, exitData);

        // Supabase'e senkronize et
        if (existingLog) {
            syncToSupabase('EXIT', {
                plate: existingLog.plate,
                name: existingLog.name,
                exit_at: new Date().toISOString(),
                extraData: exitData
            }, existingLog.created_at);
        }

        return result;
    },

    async deleteLog(id) {
        // Önce silinecek kaydı bul
        const logs = await this.getAllLogs();
        const existingLog = logs.find(l => l.id === id);

        const result = await window.electronAPI.db.deleteLog(id);

        // Supabase'e senkronize et
        if (existingLog) {
            syncToSupabase('DELETE', null, existingLog.created_at);
        }

        return result;
    },

    async searchLogs(searchTerm, limit = 100) {
        return await window.electronAPI.db.searchLogs(searchTerm, limit);
    },

    async getStats() {
        return await window.electronAPI.db.getStats();
    },

    async setSetting(key, value) {
        return await window.electronAPI.db.setSetting(key, value);
    },

    async getSetting(key) {
        return await window.electronAPI.db.getSetting(key);
    }
};

// Web ortamında localStorage + Supabase kullan (fallback)
const webDB = {
    // LocalStorage key
    LOGS_KEY: 'security_logs_local',
    SETTINGS_KEY: 'security_settings_local',

    _getLogs() {
        try {
            return JSON.parse(localStorage.getItem(this.LOGS_KEY) || '[]');
        } catch {
            return [];
        }
    },

    _saveLogs(logs) {
        localStorage.setItem(this.LOGS_KEY, JSON.stringify(logs));
    },

    async getActiveLogs() {
        const logs = this._getLogs();
        return logs.filter(log => !log.exit_at).sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        );
    },

    async getAllLogs(limit = 1000) {
        const logs = this._getLogs();
        return logs
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, limit);
    },

    async getLogsByDateRange(dateFrom, dateTo) {
        const logs = this._getLogs();
        return logs.filter(log => {
            const logDate = new Date(log.created_at).toISOString().split('T')[0];
            return logDate >= dateFrom && logDate <= dateTo;
        }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },

    async insertLog(logData) {
        const logs = this._getLogs();
        const newLog = {
            id: Date.now(),
            ...logData,
            created_at: logData.created_at || new Date().toISOString()
        };
        logs.unshift(newLog);
        this._saveLogs(logs);

        // Supabase'e de senkronize et (web için önemli!)
        console.log('🌐 Web: Supabase\'e senkronize ediliyor...', newLog);
        syncToSupabase('INSERT', newLog, newLog.id);

        return newLog;
    },

    async updateLog(id, updateData) {
        const logs = this._getLogs();
        const index = logs.findIndex(log => log.id === id);
        if (index !== -1) {
            const existingLog = logs[index];
            logs[index] = { ...logs[index], ...updateData };
            this._saveLogs(logs);

            // Supabase'e de senkronize et
            syncToSupabase('UPDATE', { ...updateData, created_at: existingLog.created_at }, existingLog.created_at);

            return true;
        }
        return false;
    },

    async exitLog(id, exitData = {}) {
        const logs = this._getLogs();
        const existingLog = logs.find(log => log.id === id);
        const result = await this.updateLog(id, { exit_at: new Date().toISOString(), ...exitData });

        // Supabase'e EXIT senkronizasyonu
        if (existingLog) {
            syncToSupabase('EXIT', {
                plate: existingLog.plate,
                name: existingLog.name,
                exit_at: new Date().toISOString(),
                extraData: exitData
            }, existingLog.created_at);
        }

        return result;
    },

    async deleteLog(id) {
        const logs = this._getLogs();
        const filtered = logs.filter(log => log.id !== id);
        if (filtered.length !== logs.length) {
            this._saveLogs(filtered);
            return true;
        }
        return false;
    },

    async searchLogs(searchTerm, limit = 100) {
        const logs = this._getLogs();
        const term = searchTerm.toLowerCase();
        return logs
            .filter(log =>
                (log.plate && log.plate.toLowerCase().includes(term)) ||
                (log.name && log.name.toLowerCase().includes(term)) ||
                (log.host && log.host.toLowerCase().includes(term)) ||
                (log.driver && log.driver.toLowerCase().includes(term))
            )
            .slice(0, limit);
    },

    async getStats() {
        const logs = this._getLogs();
        const today = new Date().toISOString().split('T')[0];

        const todayLogs = logs.filter(log =>
            new Date(log.created_at).toISOString().split('T')[0] === today
        );

        return {
            today: todayLogs.length,
            activeNow: logs.filter(log => !log.exit_at).length,
            todayVehicle: todayLogs.filter(log => log.type === 'vehicle').length,
            todayVisitor: todayLogs.filter(log => log.type === 'visitor').length
        };
    },

    async setSetting(key, value) {
        const settings = JSON.parse(localStorage.getItem(this.SETTINGS_KEY) || '{}');
        settings[key] = value;
        localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    },

    async getSetting(key) {
        const settings = JSON.parse(localStorage.getItem(this.SETTINGS_KEY) || '{}');
        return settings[key] || null;
    }
};

// Doğru API'yi seç
const db = isElectron ? electronDB : webDB;

// Uygulama başladığında bekleyen senkronizasyonları işle
if (typeof window !== 'undefined') {
    // 5 saniyelik gecikme ile başlat
    setTimeout(() => {
        processSyncQueue();
    }, 5000);

    // Her 30 saniyede bir kontrol et
    setInterval(() => {
        processSyncQueue();
    }, 30000);
}

// Export
export { db, isElectron, syncToSupabase, processSyncQueue };
export default db;
