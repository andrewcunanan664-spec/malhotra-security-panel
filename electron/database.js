const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db = null;
let SQL = null;

// Veritabanı dosya yolu
function getDbPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'security_panel.db');
}

// Veritabanı başlatma
async function initDatabase() {
  if (db) return db;

  const dbPath = getDbPath();
  console.log('Database path:', dbPath);

  // SQL.js'i başlat
  SQL = await initSqlJs();

  // Mevcut veritabanı dosyası var mı kontrol et
  let buffer = null;
  if (fs.existsSync(dbPath)) {
    try {
      buffer = fs.readFileSync(dbPath);
      console.log('Existing database loaded');
    } catch (e) {
      console.log('Could not read existing database, creating new one');
    }
  }

  // Veritabanını oluştur veya aç
  db = buffer ? new SQL.Database(buffer) : new SQL.Database();

  // Tablo oluşturma
  db.run(`
    CREATE TABLE IF NOT EXISTS security_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      sub_category TEXT,
      shift TEXT,
      plate TEXT,
      driver TEXT,
      name TEXT,
      host TEXT,
      note TEXT,
      location TEXT,
      seal_number TEXT,
      seal_number_entry TEXT,
      seal_number_exit TEXT,
      tc_no TEXT,
      phone TEXT,
      user_email TEXT,
      created_at TEXT NOT NULL,
      exit_at TEXT
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_plate ON security_logs(plate)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_name ON security_logs(name)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_created_at ON security_logs(created_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_exit_at ON security_logs(exit_at)`);

  // Ayarlar tablosu
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // Değişiklikleri kaydet
  saveDatabase();

  console.log('Database initialized successfully');
  return db;
}

// Veritabanını dosyaya kaydet
function saveDatabase() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(getDbPath(), buffer);
  } catch (e) {
    console.error('Error saving database:', e);
  }
}

// SQL sonucunu obje dizisine dönüştür
function resultToObjects(result) {
  if (!result || result.length === 0) return [];
  const columns = result[0].columns;
  const values = result[0].values;
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

// Tüm aktif kayıtları getir (çıkış yapmamış)
function getActiveLogs() {
  const result = db.exec(`
    SELECT * FROM security_logs 
    WHERE exit_at IS NULL 
    ORDER BY created_at DESC
  `);
  return resultToObjects(result);
}

// Tüm kayıtları getir (limit ile)
function getAllLogs(limit = 1000) {
  const result = db.exec(`
    SELECT * FROM security_logs 
    ORDER BY created_at DESC 
    LIMIT ${limit}
  `);
  return resultToObjects(result);
}

// Tarih aralığına göre kayıtları getir
function getLogsByDateRange(dateFrom, dateTo) {
  console.log('🔍 getLogsByDateRange çağrıldı:', dateFrom, dateTo);

  // Önce tüm kayıtları al ve tarihlerini kontrol et
  const allResult = db.exec(`SELECT id, created_at, plate, name FROM security_logs ORDER BY created_at DESC LIMIT 10`);
  const allLogs = resultToObjects(allResult);
  console.log('📊 Veritabanındaki son 10 kayıt:', allLogs.map(l => ({ id: l.id, created_at: l.created_at, plate: l.plate || l.name })));

  const result = db.exec(`
    SELECT * FROM security_logs 
    WHERE date(created_at) >= date('${dateFrom}') AND date(created_at) <= date('${dateTo}')
    ORDER BY created_at DESC
  `);
  const logs = resultToObjects(result);
  console.log('✅ Filtrelenmiş kayıt sayısı:', logs.length);
  return logs;
}

// Yeni kayıt ekle
function insertLog(logData) {
  const stmt = db.prepare(`
    INSERT INTO security_logs (
      type, sub_category, shift, plate, driver, name, host, note, location,
      seal_number, seal_number_entry, seal_number_exit, tc_no, phone, user_email, created_at, exit_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run([
    logData.type || null,
    logData.sub_category || null,
    logData.shift || null,
    logData.plate || null,
    logData.driver || null,
    logData.name || null,
    logData.host || null,
    logData.note || null,
    logData.location || null,
    logData.seal_number || null,
    logData.seal_number_entry || null,
    logData.seal_number_exit || null,
    logData.tc_no || null,
    logData.phone || null,
    logData.user_email || null,
    logData.created_at || new Date().toISOString(),
    logData.exit_at || null
  ]);
  stmt.free();

  // Son eklenen ID'yi al
  const lastId = db.exec("SELECT last_insert_rowid() as id")[0].values[0][0];
  saveDatabase();

  return { id: lastId, ...logData };
}

// Kayıt güncelle
function updateLog(id, updateData) {
  const fields = Object.keys(updateData).filter(k => updateData[k] !== undefined);
  if (fields.length === 0) return false;

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => updateData[f]);
  values.push(id);

  const stmt = db.prepare(`UPDATE security_logs SET ${setClause} WHERE id = ?`);
  stmt.run(values);
  stmt.free();

  saveDatabase();
  return true;
}

// Çıkış işlemi
function exitLog(id, exitData = {}) {
  const updateData = {
    exit_at: new Date().toISOString(),
    ...exitData
  };
  return updateLog(id, updateData);
}

// Kayıt sil
function deleteLog(id) {
  db.run(`DELETE FROM security_logs WHERE id = ${id}`);
  saveDatabase();
  return true;
}

// Plaka veya isim ile arama
function searchLogs(searchTerm, limit = 100) {
  const term = `%${searchTerm}%`;
  const result = db.exec(`
    SELECT * FROM security_logs 
    WHERE plate LIKE '${term}' OR name LIKE '${term}' OR host LIKE '${term}' OR driver LIKE '${term}'
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);
  return resultToObjects(result);
}

// İstatistikler
function getStats() {
  const today = new Date().toISOString().split('T')[0];

  const todayResult = db.exec(`SELECT COUNT(*) as count FROM security_logs WHERE date(created_at) = date('${today}')`);
  const todayCount = todayResult[0]?.values[0][0] || 0;

  const activeResult = db.exec(`SELECT COUNT(*) as count FROM security_logs WHERE exit_at IS NULL`);
  const activeCount = activeResult[0]?.values[0][0] || 0;

  const vehicleResult = db.exec(`SELECT COUNT(*) as count FROM security_logs WHERE date(created_at) = date('${today}') AND type = 'vehicle'`);
  const vehicleToday = vehicleResult[0]?.values[0][0] || 0;

  const visitorResult = db.exec(`SELECT COUNT(*) as count FROM security_logs WHERE date(created_at) = date('${today}') AND type = 'visitor'`);
  const visitorToday = visitorResult[0]?.values[0][0] || 0;

  return {
    today: todayCount,
    activeNow: activeCount,
    todayVehicle: vehicleToday,
    todayVisitor: visitorToday
  };
}

// Ayar kaydet
function setSetting(key, value) {
  db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('${key}', '${JSON.stringify(value)}')`);
  saveDatabase();
}

// Ayar oku
function getSetting(key) {
  const result = db.exec(`SELECT value FROM settings WHERE key = '${key}'`);
  if (result.length > 0 && result[0].values.length > 0) {
    return JSON.parse(result[0].values[0][0]);
  }
  return null;
}

// Veritabanını kapat
function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

module.exports = {
  initDatabase,
  getActiveLogs,
  getAllLogs,
  getLogsByDateRange,
  insertLog,
  updateLog,
  exitLog,
  deleteLog,
  searchLogs,
  getStats,
  setSetting,
  getSetting,
  closeDatabase,
  getDbPath,
  saveDatabase
};
