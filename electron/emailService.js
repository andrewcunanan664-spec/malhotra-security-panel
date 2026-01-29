const nodemailer = require('nodemailer');

// Database lazy loaded - yüklendiğinde modül hazır olmayabilir
let database = null;
function getDatabase() {
  if (!database) {
    database = require('./database');
  }
  return database;
}

// Varsayılan SMTP ayarları
const DEFAULT_SMTP_SETTINGS = {
  host: 'smtp.malhotracables.com.tr',
  port: 587,
  secure: false, // TLS için false (port 587)
  user: 'sosyal@malhotracables.com.tr',
  pass: '32103210Asd,.',
  fromName: 'Güvenlik Paneli',
  recipients: [
    'ozguncobandere@malhotracables.com.tr',
    'osmanozger@malhotracables.com.tr',
    'tahagunduz@malhotracables.com.tr'
  ],
  scheduleHour: 18, // Her gün saat 18:00'de gönder
  scheduleMinute: 0,
  enabled: true
};

// Ayarları veritabanından oku
function getEmailSettings() {
  try {
    const saved = getDatabase().getSetting('email_settings');
    if (saved) {
      return { ...DEFAULT_SMTP_SETTINGS, ...saved };
    }
  } catch (e) {
    console.error('Error reading email settings:', e);
  }
  return DEFAULT_SMTP_SETTINGS;
}

// Ayarları veritabanına kaydet
function saveEmailSettings(settings) {
  try {
    getDatabase().setSetting('email_settings', settings);
    return { success: true };
  } catch (e) {
    console.error('Error saving email settings:', e);
    return { success: false, error: e.message };
  }
}

// SMTP transporter oluştur
function createTransporter(settings) {
  const config = settings || getEmailSettings();
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    },
    tls: {
      rejectUnauthorized: false // Self-signed sertifikalar için
    }
  });
}

// SMTP bağlantısını test et
async function testSmtpConnection() {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    return { success: true, message: 'SMTP bağlantısı başarılı!' };
  } catch (error) {
    console.error('SMTP test failed:', error);
    return { success: false, error: error.message };
  }
}

// Saat formatla
function formatTime(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Süre hesapla
function calcDuration(entry, exit) {
  if (!exit) return '<span style="color:#22c55e;font-weight:bold">İçeride</span>';
  const diff = new Date(exit).getTime() - new Date(entry).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}s ${m}dk` : `${m}dk`;
}

// HTML rapor oluştur
function generateReportHTML(logs, dateStr, stats) {
  const rows = logs.map(l => `
    <tr style="border-bottom:1px solid #334155">
      <td style="padding:10px;font-size:12px;color:#94a3b8">${l.sub_category || '-'}</td>
      <td style="padding:10px;font-weight:bold;color:#fff">${l.plate || l.name || '-'}</td>
      <td style="padding:10px;font-size:12px;color:#94a3b8">${l.driver || '-'}</td>
      <td style="padding:10px;font-size:12px;color:#94a3b8">${l.host || '-'}</td>
      <td style="padding:10px;font-size:12px;color:#22c55e">${formatTime(l.created_at)}</td>
      <td style="padding:10px;font-size:12px;color:#ef4444">${l.exit_at ? formatTime(l.exit_at) : '-'}</td>
      <td style="padding:10px;font-size:12px;color:#94a3b8">${calcDuration(l.created_at, l.exit_at)}</td>
    </tr>
  `).join('');

  const insideList = logs.filter(l => !l.exit_at);
  const insideSection = insideList.length > 0 ? `
    <div style="background:#7f1d1d;border:1px solid #ef4444;border-radius:8px;padding:16px;margin-top:20px">
      <h3 style="color:#fca5a5;margin:0 0 10px 0;font-size:14px">⚠️ Hala İçeride (${insideList.length})</h3>
      <ul style="margin:0;padding-left:20px;color:#fecaca;font-size:13px">
        ${insideList.map(l => `<li>${l.plate || l.name} - ${l.sub_category} (${formatTime(l.created_at)})</li>`).join('')}
      </ul>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:20px;background:#0f172a;font-family:Arial,sans-serif;color:#e2e8f0">
  <div style="max-width:800px;margin:auto">
    <div style="background:#1e293b;border-radius:12px;padding:20px;margin-bottom:20px;border:1px solid #334155">
      <h1 style="color:#fff;margin:0 0 5px 0;font-size:22px">🏭 Malhotra Kablo Güvenlik Raporu</h1>
      <p style="color:#94a3b8;margin:0;font-size:14px">📅 ${dateStr}</p>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:20px">
      <div style="flex:1;background:#1e293b;border-radius:8px;padding:16px;text-align:center;border:1px solid #334155">
        <div style="font-size:28px;font-weight:bold;color:#3b82f6">${stats.total}</div>
        <div style="font-size:11px;color:#94a3b8">Toplam Giriş</div>
      </div>
      <div style="flex:1;background:#1e293b;border-radius:8px;padding:16px;text-align:center;border:1px solid #334155">
        <div style="font-size:28px;font-weight:bold;color:#22c55e">${stats.exited}</div>
        <div style="font-size:11px;color:#94a3b8">Çıkış Yapan</div>
      </div>
      <div style="flex:1;background:${stats.inside > 0 ? '#7f1d1d' : '#1e293b'};border-radius:8px;padding:16px;text-align:center;border:1px solid ${stats.inside > 0 ? '#ef4444' : '#334155'}">
        <div style="font-size:28px;font-weight:bold;color:${stats.inside > 0 ? '#fca5a5' : '#64748b'}">${stats.inside}</div>
        <div style="font-size:11px;color:#94a3b8">Hala İçeride</div>
      </div>
    </div>

    <div style="background:#1e293b;border-radius:8px;overflow:hidden;border:1px solid #334155">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#0f172a">
            <th style="padding:12px 10px;text-align:left;font-size:11px;color:#64748b">Kategori</th>
            <th style="padding:12px 10px;text-align:left;font-size:11px;color:#64748b">Plaka/İsim</th>
            <th style="padding:12px 10px;text-align:left;font-size:11px;color:#64748b">Sürücü</th>
            <th style="padding:12px 10px;text-align:left;font-size:11px;color:#64748b">İlgili</th>
            <th style="padding:12px 10px;text-align:left;font-size:11px;color:#64748b">Giriş</th>
            <th style="padding:12px 10px;text-align:left;font-size:11px;color:#64748b">Çıkış</th>
            <th style="padding:12px 10px;text-align:left;font-size:11px;color:#64748b">Süre</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="7" style="padding:30px;text-align:center;color:#64748b">Kayıt bulunamadı</td></tr>'}
        </tbody>
      </table>
    </div>

    ${insideSection}

    <p style="margin-top:20px;font-size:11px;color:#64748b;text-align:center">
      Bu rapor Güvenlik Paneli üzerinden otomatik olarak gönderilmiştir.
    </p>
  </div>
</body>
</html>`;
}

// Günlük rapor gönder
async function sendDailyReport(targetDate = null) {
  try {
    const settings = getEmailSettings();

    if (!settings.recipients || settings.recipients.length === 0) {
      return { success: false, error: 'Alıcı listesi boş' };
    }

    // Hedef tarih
    let date;
    if (targetDate) {
      date = new Date(targetDate);
    } else {
      date = new Date();
      date.setDate(date.getDate() - 1); // Dünün raporu
    }

    const dateStr = date.toLocaleDateString('tr-TR');
    // Yerel tarih formatı kullan (UTC yerine)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateISO = `${year}-${month}-${day}`;

    console.log('📅 E-posta raporu tarih:', dateISO, dateStr);

    // Veritabanından logları al
    const logs = getDatabase().getLogsByDateRange(dateISO, dateISO);

    console.log('📊 Bulunan kayıt sayısı:', logs.length);
    if (logs.length > 0) {
      console.log('📋 İlk kayıt:', logs[0]);
    }

    // İstatistikler
    const stats = {
      total: logs.length,
      exited: logs.filter(l => l.exit_at).length,
      inside: logs.filter(l => !l.exit_at).length
    };

    // HTML oluştur
    const html = generateReportHTML(logs, dateStr, stats);

    // E-posta gönder
    const transporter = createTransporter(settings);
    const subject = `🏭 Güvenlik Raporu - ${dateStr}`;

    const results = [];
    for (const to of settings.recipients) {
      try {
        await transporter.sendMail({
          from: `"${settings.fromName}" <${settings.user}>`,
          to: to,
          subject: subject,
          html: html
        });
        results.push({ email: to, status: 'ok' });
        console.log(`Email sent to ${to}`);
      } catch (e) {
        results.push({ email: to, status: 'error', error: e.message });
        console.error(`Failed to send email to ${to}:`, e);
      }
    }

    return {
      success: true,
      date: dateStr,
      stats,
      results
    };
  } catch (error) {
    console.error('Send daily report error:', error);
    return { success: false, error: error.message };
  }
}

// Test e-postası gönder
async function sendTestEmail() {
  try {
    const settings = getEmailSettings();
    const transporter = createTransporter(settings);

    await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.user}>`,
      to: settings.recipients[0] || settings.user,
      subject: '🧪 Güvenlik Paneli - Test E-postası',
      html: `
        <div style="font-family:Arial,sans-serif;padding:20px;background:#1e293b;color:#e2e8f0;border-radius:8px">
          <h2 style="color:#22c55e">✅ Test Başarılı!</h2>
          <p>SMTP ayarlarınız doğru yapılandırılmış.</p>
          <p style="color:#94a3b8;font-size:12px">Gönderim zamanı: ${new Date().toLocaleString('tr-TR')}</p>
        </div>
      `
    });

    return { success: true, message: 'Test e-postası gönderildi!' };
  } catch (error) {
    console.error('Test email error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getEmailSettings,
  saveEmailSettings,
  testSmtpConnection,
  sendDailyReport,
  sendTestEmail
};
