import { createClient } from '@supabase/supabase-js'

// Supabase konfigürasyonu - çalışan proje: tpimffjekmaqkyfxfqfc
// NOT: .env'deki btcrgumaoqigwthbiumy projesi geçersiz/mevcut değil
const supabaseUrl = 'https://muqryghjhzhbjkvxwrgp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11cXJ5Z2hqaHpuYmprdnh3cmdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2ODE3OTksImV4cCI6MjA4NTI1Nzc5OX0.g_eAWDbwy2DWVnM3LZIA0e1vGhrz60toHUDgDWVcnGA'

export const supabase = createClient(supabaseUrl, supabaseKey)