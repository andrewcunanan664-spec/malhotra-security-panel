// Deno ve Nodemailer Entegrasyonu
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer from "npm:nodemailer@6.9.7"

// GMAIL AYARLARI
const GMAIL_USER = "malhotrakablo.43@gmail.com"
const GMAIL_PASS = "amwy oeho wsyn abmm" // Sizin verdiğiniz uygulama şifresi

// Supabase Credentials
const SUPABASE_URL = Deno.env.get('PROJECT_URL') ?? Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const RECIPIENTS = [
  "melihengin@malhotracables.com.tr",
  "osmanozger@malhotracables.com.tr",
  "ozguncobandere@malhotracables.com.tr",
  "tahagunduz@malhotracables.com.tr"
]

serve(async (req) => {
  try {
    // 1. Supabase Bağlantı Kontrolü
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials (PROJECT_URL, SERVICE_ROLE_KEY) eksik!")
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 2. Tarih ve Veri Çekme
    const url = new URL(req.url)
    const dateParam = url.searchParams.get('date')
    let targetDate = dateParam ? new Date(dateParam) : new Date()
    if (!dateParam) targetDate.setDate(targetDate.getDate() - 1) // Varsayılan: Dün

    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)
    const dateStr = targetDate.toLocaleDateString('tr-TR')

    // Veritabanından Kayıtları Al
    const { data: logs, error: dbError } = await supabase
      .from('security_logs')
      .select('*')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: true })

    if (dbError) throw dbError

    // 3. Rapor İstatistikleri
    const stats = {
      total: logs.length,
      exited: logs.filter((l: any) => l.exit_at).length,
      inside: logs.filter((l: any) => !l.exit_at).length
    }

    // 4. HTML Oluştur
    const html = generateHTML(logs, dateStr, stats)

    // 5. Nodemailer ile Gönderim
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });

    const info = await transporter.sendMail({
      from: '"Malhotra Güvenlik" <malhotrakablo.43@gmail.com>',
      to: RECIPIENTS.join(", "),
      subject: `🏭 Güvenlik Raporu - ${dateStr}`,
      html: html,
    });

    return new Response(JSON.stringify({ success: true, messageId: info.messageId, stats }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
})

// === HTML OLUŞTURUCU ===
function generateHTML(logs: any[], date: string, stats: any) {
  const formatTime = (d: string) => new Date(d).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  const calcDuration = (entry: string, exit: string) => {
    if (!exit) return '<span style="color:#22c55e;font-weight:bold">İçeride</span>'
    const diff = new Date(exit).getTime() - new Date(entry).getTime()
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return h > 0 ? `${h}s ${m}dk` : `${m}dk`
  }
  const rows = logs.map(l => `
    <tr style="border-bottom:1px solid #334155">
      <td style="padding:10px;font-size:12px;color:#94a3b8">${l.sub_category || '-'}</td>
      <td style="padding:10px;font-weight:bold;color:#fff">${l.plate || l.name || '-'}</td>
      <td style="padding:10px;font-size:12px;color:#94a3b8">${l.driver || '-'}</td>
      <td style="padding:10px;font-size:12px;color:#94a3b8">${l.host || '-'}</td>
      <td style="padding:10px;font-size:12px;color:#22c55e">${formatTime(l.created_at)}</td>
      <td style="padding:10px;font-size:12px;color:#ef4444">${l.exit_at ? formatTime(l.exit_at) : '-'}</td>
      <td style="padding:10px;font-size:12px;color:#94a3b8">${calcDuration(l.created_at, l.exit_at)}</td>
    </tr>`).join('')

  const insideList = logs.filter(l => !l.exit_at)
  const insideSection = insideList.length > 0 ? `
    <div style="background:#7f1d1d;border:1px solid #ef4444;border-radius:8px;padding:16px;margin-top:20px">
      <h3 style="color:#fca5a5;margin:0 0 10px 0;font-size:14px">⚠️ Hala İçeride (${insideList.length})</h3>
      <ul style="margin:0;padding-left:20px;color:#fecaca;font-size:13px">
        ${insideList.map(l => `<li>${l.plate || l.name} - ${l.sub_category} (${formatTime(l.created_at)})</li>`).join('')}
      </ul>
    </div>` : ''

  return `<!DOCTYPE html><html><body style="background:#0f172a;color:#fff;font-family:Arial,sans-serif;padding:20px">
    <div style="max-width:800px;margin:auto">
      <div style="background:#1e293b;border-radius:12px;padding:20px;margin-bottom:20px;border:1px solid #334155">
        <h1 style="color:#fff;margin:0 0 5px 0;font-size:22px">🏭 Malhotra Kablo Güvenlik Raporu</h1>
        <p style="color:#94a3b8;margin:0;font-size:14px">📅 ${date}</p>
      </div>
      <div style="display:flex;gap:12px;margin-bottom:20px;text-align:center">
        <div style="flex:1;background:#1e293b;padding:15px;border-radius:8px"><div style="font-size:24px;color:#3b82f6">${stats.total}</div><div style="font-size:12px;color:#aaa">Toplam</div></div>
        <div style="flex:1;background:#1e293b;padding:15px;border-radius:8px"><div style="font-size:24px;color:#22c55e">${stats.exited}</div><div style="font-size:12px;color:#aaa">Çıkan</div></div>
        <div style="flex:1;background:${stats.inside > 0 ? '#7f1d1d' : '#1e293b'};padding:15px;border-radius:8px"><div style="font-size:24px;color:${stats.inside > 0 ? '#fca5a5' : '#aaa'}">${stats.inside}</div><div style="font-size:12px;color:#aaa">İçeride</div></div>
      </div>
      <table style="width:100%;border-collapse:collapse;background:#1e293b;border-radius:8px;overflow:hidden">
        <thead style="background:#0f172a;color:#94a3b8;font-size:12px;text-align:left"><tr><th style="padding:10px">Kategori</th><th style="padding:10px">Plaka</th><th style="padding:10px">Sürücü</th><th style="padding:10px">İlgili</th><th style="padding:10px">Giriş</th><th style="padding:10px">Çıkış</th><th style="padding:10px">Süre</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="7" style="padding:20px;text-align:center;color:#64748b">Kayıt Bulunamadı</td></tr>'}</tbody>
      </table>
      ${insideSection}
    </div></body></html>`
}
