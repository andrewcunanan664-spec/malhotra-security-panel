import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import {
  Shield, Car, User, FileText, CheckCircle, Clock, LogOut, Search,
  Edit, X, Wifi, WifiOff, LogIn, MapPin, Lock, Briefcase, Layers, RefreshCw, UserMinus, UserCheck, AlertTriangle, Crown, Bus,
  Trash2, BarChart3, Calendar, Filter, Phone, TrendingUp, Users, Activity, PieChart, History, Timer, AlertCircle, ArrowRightCircle, ArrowLeftCircle,
  CalendarClock, Eye, EyeOff, Mail, Volume2, VolumeX, Zap, Star, Send, RotateCcw
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { db as dbClient, isElectron } from './dbClient';
// Trigger deploy: 2026-01-28 manual trigger
import * as XLSX from 'xlsx';

// --- LOGO İÇE AKTARMA ---
import logoImg from './logo.png';

// --- SABİT AYARLAR ---
const OFFLINE_QUEUE_KEY = 'security_offline_queue';
const LONG_STAY_HOURS = 4;
const APP_VERSION = '6.7';

// --- GÜVENLİK: INPUT SANİTİZASYON FONKSİYONU (XSS Koruması) ---
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
    .slice(0, 500);
};

// --- YÖNETİM VE ŞİRKET ARAÇ LİSTESİ ---
const MANAGEMENT_VEHICLES = [
  "34 GMP 988 - GÖKSEL ONUŞ",
  "34 GRZ 326 - GÖKHAN BİLİR",
  "34 HDD 055 - CAFER ÖZTOP",
  "34 GHK 292 - ŞİRKET ARACI",
  "34 MPP 153 - ŞİRKET ARACI"
];

// --- PERSONEL LİSTESİ ---
const STAFF_LIST = [
  "1 - ENDER YILMAZ", "2 - GÖKSEL ONUŞ", "3 - MUHAMMET FATİH AKSU", "6 - BATUHAN ASLIHAN", "10 - SELAMİ KADER",
  "15 - MUSTAFA ERTÜRK", "16 - FATİH BENLİ", "18 - MEHMET NALÇAKAN", "20 - AHMER KIRCALI", "23 - MEHMET SELİM SEVİNÇ",
  "24 - SELİM ÖZTÜRK", "25 - İLKAY ANIL KOÇHAN", "28 - MUHAMMED ALİ KAYACAN", "31 - RAMAZAN MUTLU", "33 - UMUT ÇELİK",
  "34 - RAMAZAN AKYOL", "35 - RECEP AYYILDIZ", "37 - MEHMET BİLENSOY", "41 - ÖZGÜN ÇOBANDERE", "43 - OSMAN ÖZGER",
  "50 - HÜSEYİN YENİLMEZ", "53 - OSMAN ÖZCAN", "54 - FATİH BAYRAM", "56 - SELİM AYDIN", "57 - HÜSEYİN YENİLMEZ 2",
  "59 - ŞENOL SEVİMLİ", "61 - ABDULLAH ARGUN", "62 - BELKİZE TAŞ", "63 - FURKAN ŞAHİN", "67 - MUHARREM BOZKURT",
  "70 - İSMAİL ELYAK", "76 - NİYAZİ TUNÇ", "77 - İBRAHİM ÜNLÜÇAKIR", "82 - ALİ İHSAN VER", "83 - ÖZKAN DEMİR",
  "88 - SEVİM YÜĞRÜK", "89 - FATMA BALABAN", "90 - NURSEMA ATA", "96 - ONUR YALÇIN", "97 - ŞÜKRÜ GÜDER",
  "98 - YUNUS BAYRAK", "99 - KEMAL FARUK MUTLU", "100 - SÜLEYMAN ÖZAY", "101 - İBRAHİM KASAP", "102 - SİNAN DEMİRAĞ",
  "103 - MUSTAFA SOLUK", "104 - İBRAHİM YAŞAR", "106 - HASAN HÜSEYİN ÖZTÜRK", "107 - ALİ ÖZCAN", "109 - OĞUZ YILDIZ",
  "110 - OSMAN GÜRÇINAR", "112 - MEHMET MALKOÇ", "113 - ADEM ŞAKRAK", "114 - RIZA ÜLKÜSEVEN", "115 - HAKKI GÜÇLÜ",
  "119 - ŞULE AKKOÇ", "122 - OZAN ÖZDEMİR", "125 - MELTEM GÜNAY TEK", "130 - ERSİN AYDIN", "131 - CAFER ÖZTOP",
  "132 - MEHMET ÇAKIR", "133 - HÜLYA ÜNAL", "137 - KÜBRA EYİDEMİR", "145 - EMİR BARAN TARAKÇI", "146 - HÜSEYİN GURHAN",
  "151 - İSMAİL TİTİK", "153 - HÜSEYİN SARIZEYBEK", "156 - FURKAN MUHAMMED BÜLBÜL", "163 - ÖMER BAYIN", "165 - ALİ YİĞİT",
  "166 - SEMA OLGUN", "170 - MUHAMMED RIDVAN USLU", "175 - HÜMEYRA RAMAZAN", "177 - MELTEM ZOR", "179 - EREN KURU",
  "185 - RÜMEYSA KUMUZ", "189 - ALİ HAN ŞENTÜRK", "190 - TAHA GÜNDÜZ", "191 - AHMET AY", "195 - SALTUK BUĞRAHAN KARA",
  "201 - MEHMET YILDIRIM", "202 - ALİ TOLAN", "205 - MURAT CİK", "211 - ALEV KAHRAMANSOY", "221 - İSMAİL YOLDAŞ",
  "224 - HALİL KARACA", "227 - ADEM AKKAYA", "231 - CANİP BÜBER", "232 - AFRA AKBOYA", "233 - EMİNE KUTLU",
  "236 - ERCAN ÖZKILIÇ", "237 - LEYLA BAL", "240 - ÖMER KOCAMAN", "241 - AHMET DİNCEL", "244 - FURKAN ATASOY",
  "245 - BİRKAN AKTEPE", "246 - MURAT KURU", "249 - HAVVA KARABULUT", "252 - MEHMET HASDEMİR", "253 - MUHAMMED KARA",
  "255 - İLKER ALTINTAŞ", "256 - BEYTULLAH ELİBOL", "257 - OSMAN TOKMAK", "258 - ŞEYMA TANRIKULU", "259 - AHMET DURMUŞ",
  "260 - OĞUZ KABAK", "261 - MEHMET EKİN", "262 - GÖKHAN BİLİR", "276 - MELİH MUSTAFA SEKMEN", "281 - İSMAİL YAVUZ",
  "287 - AHMET PEKER", "289 - DOĞAY DOĞAN", "293 - İLKER TEYMUROĞLU", "294 - CİHAN DEMİRELLİ", "296 - ENES GÜNDÜZ",
  "299 - NERMİN AKÇA", "305 - DENİZ DİKMEN", "306 - MELDA YILMAZ", "309 - HEVİDAR AKIN", "310 - RAMAZAN KAVDUR",
  "314 - MEHMET HAKARAYAN", "315 - YUSUF KARABAYIR", "320 - AHMET ÇAKIR", "328 - ÖMER BÜTÜN", "332 - MUSTAFA DURMAZ",
  "333 - DİLARA DEMİRAY", "335 - MEHMET DEMİRAY", "340 - AYŞE AKA", "342 - MUSTAFA EREN ÖZYILDIZ", "343 - YUSUF AYDIN",
  "345 - MERVE KAYNAK", "346 - SEREN MEBRURE ÜNVER", "347 - İSMİHAN YILDIRIM", "350 - KADER AYDIN", "352 - RÜMEYSA ÇOŞKUN",
  "361 - EMRE ACAR", "362 - CEYHUN MAYDA", "363 - SAMET KARABAŞ", "364 - İrem DOĞRU", "365 - ÖMER ASAF KISA",
  "367 - AKIN ERSOY", "369 - GÜLSEREN ERDOĞMUŞ", "373 - YASEMİN ALTIN", "375 - SEYFİ YILDIRIM", "377 - AHMET ÖZER",
  "378 - RECEP DEMİRCİ", "380 - OSMAN ARSLAN", "384 - HATİCE ARSLAN", "385 - İBRAHİM ÖZÇİĞDEM", "386 - SEDEF SARIÖZ",
  "387 - VİLDAN YAVUZ", "388 - MERT CAN ÇANKAYA", "390 - GÜLSÜM ŞEN", "393 - HASAN EMİR ALTUN", "396 - MERT DEMİR",
  "403 - MERT AYDIN", "404 - HÜSEYİN YILMAZ", "406 - BURHAN ERSOY", "407 - MELİH ENGİN", "408 - HAKAN SEKMEN",
  "413 - SEFA GÜRE", "414 - MEHMET İNANÇ", "417 - MÜCAHİT SÖNMEZ", "421 - SİNAN UÇAR", "423 - AHMET ÇETİN",
  "425 - EMRE YAŞA", "428 - SERPİL SALAN", "440 - FERHAT YILDIZER", "441 - UĞUR GÜLERYÜZ", "447 - BURAK TÜRKOĞLU",
  "449 - İSMAİL RESUL GÜLER", "451 - MERVE DÖNMEZ", "452 - OSMAN ÖZEN", "454 - YALÇIN KARABULUT", "456 - TUBA CANBAZ",
  "463 - HÜSEYİN ELDEŞ", "469 - İBRAHİM ŞAHAN", "471 - HAMDİ TÜRK", "474 - ABDURRAHİM GÜLMÜŞ", "476 - ŞERİF ÇELİKTEN",
  "480 - MEHMET EREN ÖZAYMAN", "484 - İBRAHİM EFE BEKTEŞ", "485 - CEREN KILINÇ", "487 - BAKİ BOZACI", "488 - ESRA KIRTAŞ",
  "489 - EMİRHAN SUNEL", "491 - HÜSEYİN YILMAZ", "495 - FATMA ARSLAN", "496 - AHMET KODAŞ", "500 - ETHEM TETİK",
  "501 - ZAHİDE AKSOY"
];

// --- KATEGORİ LİSTESİ ---
const CATEGORIES = [
  { value: '', label: 'Tüm Kategoriler' },
  { value: 'Misafir Araç', label: 'Misafir Araç' },
  { value: 'Personel Aracı', label: 'Personel Aracı' },
  { value: 'Yönetim Aracı', label: 'Yönetim Aracı' },
  { value: 'Personel Servis Aracı', label: 'Servis Aracı' },
  { value: 'Mühürlü Araç', label: 'Mühürlü Araç' },
  { value: 'Şirket Aracı', label: 'Şirket Aracı' },
  { value: 'Misafir', label: 'Misafir (Yaya)' },
  { value: 'Fabrika Personeli', label: 'Fabrika Personeli' },
  { value: 'İşten Ayrılan', label: 'İşten Ayrılan' },
];

// --- STİL TANIMLARI ---
const inputClass = "w-full bg-slate-900 border border-slate-600 rounded p-3 text-white outline-none focus:border-blue-500 transition-colors text-sm placeholder-slate-500";
const labelClass = "block text-xs font-bold text-slate-400 mb-1 ml-1";

// --- VALIDASYON FONKSİYONLARI ---
const isValidTC = (tc) => {
  if (!tc) return false;
  tc = String(tc).trim();
  if (tc.length !== 11 || tc[0] === '0') return false;
  if (!/^\d{11}$/.test(tc)) return false;
  const digits = tc.split('').map(Number);
  const sum1 = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const sum2 = digits[1] + digits[3] + digits[5] + digits[7];
  let check1 = (sum1 * 7 - sum2) % 10;
  if (check1 < 0) check1 += 10;
  const check2 = digits.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return check1 === digits[9] && check2 === digits[10];
};

const formatPhone = (value) => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  if (cleaned.length <= 8) return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 10)}`;
};

const formatForInput = (isoString) => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date - offset)).toISOString().slice(0, 16);
    return localISOTime;
  } catch (error) {
    return '';
  }
};

const calculateWaitTime = (createdAt) => {
  try {
    const now = new Date();
    const entry = new Date(createdAt);
    if (isNaN(entry.getTime())) return { hours: 0, mins: 0, totalMins: 0, isLongStay: false };
    const diffMs = Math.max(0, now - entry);
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return { hours, mins, totalMins: diffMins, isLongStay: hours >= LONG_STAY_HOURS };
  } catch (error) {
    return { hours: 0, mins: 0, totalMins: 0, isLongStay: false };
  }
};

const getCategoryStyle = (cat) => {
  if (cat?.includes('Yönetim')) return 'border-yellow-500 text-yellow-400 bg-yellow-500/10';
  if (cat?.includes('Şirket')) return 'border-blue-500 text-blue-400 bg-blue-500/10';
  if (cat?.includes('Servis')) return 'border-purple-500 text-purple-400 bg-purple-500/10';
  if (cat?.includes('Mühür')) return 'border-red-500 text-red-400 bg-red-500/10';
  if (cat?.includes('Personel Aracı')) return 'border-cyan-500 text-cyan-400 bg-cyan-500/10';
  if (cat?.includes('Misafir Araç')) return 'border-green-500 text-green-400 bg-green-500/10';
  if (cat?.includes('Misafir')) return 'border-emerald-500 text-emerald-400 bg-emerald-500/10';
  if (cat?.includes('Fabrika')) return 'border-orange-500 text-orange-400 bg-orange-500/10';
  if (cat?.includes('İşten')) return 'border-rose-500 text-rose-400 bg-rose-500/10';
  return 'border-slate-600 text-slate-400';
};

const getShortCategory = (cat) => {
  if (!cat) return 'Genel';
  return cat.replace(' (Giriş)', '').replace(' (Çıkış)', '').replace(' Aracı', '');
};

// --- CUSTOM HOOKS ---
const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

// --- TOAST COMPONENT ---
const Toast = memo(function Toast({ notification, onClose }) {
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(onClose, notification.type === 'error' ? 4000 : 3000);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!notification) return null;
  const bgColors = { error: 'bg-red-600', warning: 'bg-orange-500', info: 'bg-blue-600', success: 'bg-green-600' };
  return (
    <div className={`fixed bottom-5 right-5 px-6 py-4 rounded-lg shadow-xl text-white font-bold z-50 animate-bounce ${bgColors[notification.type] || bgColors.success}`} role="alert">
      {notification.message}
    </div>
  );
});

// --- CONFIRM MODAL ---
const ConfirmModal = memo(function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, type = 'warning' }) {
  if (!isOpen) return null;
  const colors = { warning: 'bg-orange-600 hover:bg-orange-500', danger: 'bg-red-600 hover:bg-red-500', info: 'bg-blue-600 hover:bg-blue-500' };
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="bg-slate-800 p-6 rounded-xl w-full max-w-sm border border-slate-600 shadow-2xl animate-in fade-in zoom-in">
        <h3 className="text-xl font-bold text-white mb-4 flex gap-2 items-center">
          <AlertTriangle className={type === 'danger' ? 'text-red-500' : 'text-orange-500'} />
          {title}
        </h3>
        <p className="text-slate-300 text-sm mb-6 whitespace-pre-line">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 bg-slate-700 text-white py-3 rounded font-bold hover:bg-slate-600 transition-colors">İptal</button>
          <button onClick={onConfirm} className={`flex-1 ${colors[type]} text-white py-3 rounded font-bold shadow-lg transition-colors`}>Onayla</button>
        </div>
      </div>
    </div>
  );
});

// --- SUB TAB BUTTON ---
const SubTabBtn = memo(function SubTabBtn({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center p-3 rounded border transition-all ${active ? 'bg-blue-600/20 border-blue-500 text-blue-200 shadow-md' : 'bg-slate-900 border-transparent text-slate-400 hover:bg-slate-700'}`} aria-pressed={active}>
      {icon}
      <span className="text-[10px] font-bold mt-1 uppercase text-center leading-3">{label}</span>
    </button>
  );
});

// --- LOGIN PAGE ---
const LoginPage = memo(function LoginPage({ email, setEmail, password, setPassword, handleLogin, loginError }) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl">
        <Shield size={48} className="text-blue-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white text-center mb-6">Güvenlik Paneli V{APP_VERSION}</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} autoComplete="email" required />
          <div className="relative">
            <input type={showPassword ? "text" : "password"} placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} className={`${inputClass} pr-10`} autoComplete="current-password" required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {loginError && <p className="text-red-400 text-sm text-center">{loginError}</p>}
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded transition-all">Giriş Yap</button>
        </form>
      </div>
    </div>
  );
});

// === MAIN APP COMPONENT ===
export default function App() {
  // --- STATE TANIMLARI ---
  const [session, setSession] = useState(null);
  const [activeLogs, setActiveLogs] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [showStaffList, setShowStaffList] = useState(false);
  const [showManagementList, setShowManagementList] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [plateHistory, setPlateHistory] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [todayPageFilter, setTodayPageFilter] = useState('all'); // all, entry, exit
  const [todayCategoryFilter, setTodayCategoryFilter] = useState('');
  const [todayCurrentPage, setTodayCurrentPage] = useState(1);
  const [todayPageSize] = useState(15);
  const [showHostStaffList, setShowHostStaffList] = useState(false);
  const [hostSearchTerm, setHostSearchTerm] = useState('');
  const [vehicleDirection, setVehicleDirection] = useState('Giriş');
  const [exitSealModalOpen, setExitSealModalOpen] = useState(false);
  const [exitingLogData, setExitingLogData] = useState(null);
  const [exitSealNumber, setExitSealNumber] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'warning' });
  const [mainTab, setMainTab] = useState('vehicle');
  const [vehicleSubTab, setVehicleSubTab] = useState('guest');
  const [visitorSubTab, setVisitorSubTab] = useState('guest');
  const [formData, setFormData] = useState({ plate: '', driver: '', driver_type: 'owner', name: '', host: '', note: '', location: '', seal_number_entry: '', seal_number_exit: '', tc_no: '', phone: '' });
  const [editingLog, setEditingLog] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('soundEnabled') !== 'false');
  const [sendingReport, setSendingReport] = useState(false);
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);

  // Refs
  const isMountedRef = useRef(true);
  const fetchIntervalRef = useRef(null);

  // Debounced values
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const debouncedActiveSearchTerm = useDebounce(activeSearchTerm, 300);

  // Vardiya hesaplama
  const getShiftByTime = useCallback(() => {
    const hour = new Date().getHours();
    if (hour >= 8 && hour < 16) return 'Vardiya 1 (08:00-16:00)';
    if (hour >= 16 && hour < 24) return 'Vardiya 2 (16:00-00:00)';
    return 'Vardiya 3 (00:00-08:00)';
  }, []);

  const [currentShift, setCurrentShift] = useState(() => getShiftByTime());

  // --- CALLBACKS ---
  const showToast = useCallback((message, type = 'success') => {
    setNotification({ message, type });
  }, []);

  const closeToast = useCallback(() => setNotification(null), []);

  const checkOnlineStatus = useCallback(async () => {
    try {
      const { error } = await supabase.from('security_logs').select('id').limit(1);
      return !error;
    } catch (e) {
      return false;
    }
  }, []);

  const checkPendingData = useCallback(() => {
    try {
      const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
      setPendingCount(queue.length);
    } catch (error) {
      setPendingCount(0);
    }
  }, []);

  const saveToOfflineQueue = useCallback((data, action = 'INSERT', id = null) => {
    try {
      const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
      queue.push({ action, data, id, _offlineTimestamp: Date.now() });
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      checkPendingData();
      showToast(action === 'DELETE' ? "Silme işlemi hafızaya alındı." : "İnternet yok. İşlem hafızaya alındı!", "warning");
      if (action === 'UPDATE' && id) {
        setActiveLogs(prev => prev.map(log => log.id === id ? { ...log, ...data } : log));
        setAllLogs(prev => prev.map(log => log.id === id ? { ...log, ...data } : log));
      } else if (action === 'DELETE' && id) {
        setActiveLogs(prev => prev.filter(log => log.id !== id));
        setAllLogs(prev => prev.filter(log => log.id !== id));
      }
    } catch (error) {
      showToast("Offline kayıt hatası!", "error");
    }
  }, [checkPendingData, showToast]);

  const fetchData = useCallback(async () => {
    if (!session) return;
    try {
      // Electron ortamında yerel SQLite kullan
      if (isElectron) {
        const [activeData, allData] = await Promise.all([
          dbClient.getActiveLogs(),
          dbClient.getAllLogs(1000)
        ]);
        if (!isMountedRef.current) return;
        setActiveLogs(activeData || []);
        setAllLogs(allData || []);
      } else {
        // Web ortamında Supabase kullan
        if (!isOnline) return;
        const [activeResult, allResult] = await Promise.all([
          supabase.from('security_logs').select('*').is('exit_at', null).order('created_at', { ascending: false }),
          supabase.from('security_logs').select('*').order('created_at', { ascending: false }).limit(1000)
        ]);
        if (!isMountedRef.current) return;
        if (activeResult.data) setActiveLogs(activeResult.data);
        if (allResult.data) setAllLogs(allResult.data);
      }
    } catch (error) {
      if (isMountedRef.current) showToast("Veri çekme hatası!", "error");
    }
  }, [session, isOnline, showToast]);

  const syncOfflineData = useCallback(async () => {
    try {
      const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
      if (queue.length === 0) return;
      const newQueue = [];
      let successCount = 0;
      let failCount = 0;

      for (const item of queue) {
        try {
          const action = item.action || 'INSERT';
          const data = item.data || item;
          const id = item.id;
          const { _offlineTimestamp, _syncAttempts, ...cleanData } = data || {};
          let error = null;

          if (action === 'INSERT' && cleanData) {
            const { error: e } = await supabase.from('security_logs').insert([cleanData]);
            error = e;
          } else if (action === 'UPDATE' && id && cleanData) {
            const { error: e } = await supabase.from('security_logs').update(cleanData).eq('id', id);
            error = e;
          } else if (action === 'DELETE' && id) {
            const { error: e } = await supabase.from('security_logs').delete().eq('id', id);
            error = e;
          }

          if (error) {
            const attempts = (item._syncAttempts || 0) + 1;
            if (attempts < 5) newQueue.push({ ...item, _syncAttempts: attempts });
            else failCount++;
          } else {
            successCount++;
          }
        } catch (e) {
          const attempts = (item._syncAttempts || 0) + 1;
          if (attempts < 5) newQueue.push({ ...item, _syncAttempts: attempts });
          else failCount++;
        }
      }

      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(newQueue));
      checkPendingData();
      if (successCount > 0) { showToast(`${successCount} işlem senkronize edildi!`, "success"); fetchData(); }
      if (failCount > 0) showToast(`${failCount} işlem başarısız oldu.`, "warning");
    } catch (error) {
      console.error('Sync error:', error);
    }
  }, [checkPendingData, fetchData, showToast]);

  const resetForm = useCallback(() => {
    setFormData({ plate: '', driver: '', driver_type: 'owner', name: '', host: '', note: '', location: '', seal_number_entry: '', seal_number_exit: '', tc_no: '', phone: '' });
    setPlateHistory(null);
  }, []);

  // --- ÇIKIŞ FONKSİYONU ---
  const handleExit = useCallback(async (id, sealNo, additionalData = {}) => {
    if (!id) { showToast("Geçersiz kayıt ID'si!", "error"); return; }
    setActionLoading(id);

    try {
      const updateData = { exit_at: new Date().toISOString(), ...additionalData };
      if (sealNo) {
        updateData.seal_number_exit = sealNo;
        const existingLog = activeLogs.find(l => l.id === id);
        if (existingLog?.seal_number_entry) {
          updateData.seal_number = `Giriş: ${existingLog.seal_number_entry} / Çıkış: ${sealNo}`;
        }
      }

      // Electron ortamında yerel SQLite kullan
      if (isElectron) {
        await dbClient.exitLog(id, updateData);
        showToast("Çıkış işlemi tamamlandı.", "success");
        await fetchData();
      } else {
        // Web ortamında Supabase kullan
        const reallyOnline = await checkOnlineStatus();
        setIsOnline(reallyOnline);

        if (!reallyOnline) {
          saveToOfflineQueue(updateData, 'UPDATE', id);
          setActionLoading(null);
          return;
        }

        const { error } = await supabase.from('security_logs').update(updateData).eq('id', id);
        if (error) {
          showToast(`Çıkış hatası: ${error.message}`, "error");
        } else {
          showToast("Çıkış işlemi tamamlandı.", "success");
          await fetchData();
        }
      }
    } catch (error) {
      showToast(`Hata: ${error.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  }, [activeLogs, checkOnlineStatus, fetchData, saveToOfflineQueue, showToast]);

  // --- GİRİŞ FONKSİYONU ---
  const handleEntry = useCallback(async () => {
    if (mainTab === 'vehicle' && !formData.plate) return showToast("Plaka giriniz!", "error");
    if (mainTab === 'visitor' && !formData.name) return showToast("İsim seçiniz/giriniz!", "error");
    if ((vehicleSubTab === 'company' || vehicleSubTab === 'service') && vehicleDirection === 'Giriş' && !formData.location) return showToast("Lokasyon giriniz!", "error");
    if ((vehicleSubTab === 'management' || vehicleSubTab === 'company') && vehicleDirection === 'Giriş' && formData.driver_type !== 'owner' && !formData.driver) return showToast("Aracı kullanan kişinin adını giriniz!", "error");
    // MÜHÜR NUMARASI ARTIK OPSİYONEL - Zorunlu değil!
    // if (vehicleSubTab === 'sealed' && vehicleDirection === 'Giriş' && !formData.seal_number_entry) return showToast("Giriş Mühür No giriniz!", "error");
    if (formData.tc_no && formData.tc_no !== 'BELİRTİLMEDİ' && !isValidTC(formData.tc_no)) return showToast("Geçersiz TC Kimlik No!", "error");

    const isHostRequired = !(mainTab === 'visitor' && visitorSubTab === 'staff');
    if (isHostRequired && vehicleDirection === 'Giriş' && !formData.host) return showToast("İlgili birimi/kişiyi seçiniz.", "error");

    // Çıkış işlemi
    if (vehicleDirection === 'Çıkış') {
      const searchValue = mainTab === 'vehicle' ? formData.plate.toUpperCase() : formData.name.toUpperCase();
      const existingLog = activeLogs.find(log => (mainTab === 'vehicle' && log.plate === searchValue) || (mainTab === 'visitor' && log.name === searchValue));

      if (existingLog) {
        if (existingLog.sub_category === 'Mühürlü Araç') {
          setExitingLogData(existingLog);
          setExitSealNumber('');
          setExitSealModalOpen(true);
          return;
        }

        const extraData = {};
        // Tüm çıkışlarda lokasyon bilgisini kaydet
        if (formData.location) {
          extraData.location = sanitizeInput(formData.location);
        }
        if (mainTab === 'vehicle') {
          if (vehicleSubTab === 'management') {
            if (formData.driver_type !== 'owner' && formData.driver_type) {
              const labels = { driver: 'Şoför', supervisor: 'Vardiya Amiri', other: 'Diğer' };
              extraData.driver = `[${labels[formData.driver_type] || 'Diğer'}] ${sanitizeInput(formData.driver)}`;
            } else {
              extraData.driver = sanitizeInput(formData.driver);
            }
          }
        }

        setConfirmModal({
          isOpen: true,
          title: 'Çıkış Onayı',
          message: `${searchValue} için çıkış işlemini onaylıyor musunuz?${extraData.location ? `\nGidilen: ${extraData.location}` : ''}`,
          type: 'warning',
          onConfirm: async () => {
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
            await handleExit(existingLog.id, null, extraData);
            resetForm();
          }
        });
        return;
      } else {
        // Araç/kişi içeride görünmüyorsa çıkış yapılamaz
        showToast("HATA: Bu araç/kişi içeride görünmüyor! Önce giriş kaydı yapılmalı.", "error");
        return;
      }
    }

    // Giriş kontrolü - Veritabanından anlık kontrol yap
    if (vehicleDirection === 'Giriş') {
      const searchValue = mainTab === 'vehicle' ? formData.plate.toUpperCase() : formData.name.toUpperCase();

      // Önce local kontrolü yap
      const isAlreadyInsideLocal = activeLogs.some(log =>
        (mainTab === 'vehicle' && log.plate === searchValue) ||
        (mainTab === 'visitor' && log.name === searchValue)
      );

      if (isAlreadyInsideLocal) {
        return showToast("DİKKAT: Bu araç veya kişi zaten içeride görünüyor!", "error");
      }

      // Veritabanından da kontrol et (senkronizasyon hatalarını önlemek için)
      try {
        // Electron ortamında yerel veritabanını kontrol et
        if (isElectron) {
          const activeData = await dbClient.getActiveLogs();
          const existingRecords = activeData.filter(log =>
            (mainTab === 'vehicle' && log.plate === searchValue) ||
            (mainTab === 'visitor' && log.name === searchValue)
          );

          if (existingRecords && existingRecords.length > 0) {
            setConfirmModal({
              isOpen: true,
              title: '⚠️ Araç/Kişi Zaten İçeride!',
              message: `${searchValue} veritabanında içeride görünüyor!\n\nBu kayıt için çıkış işlemi yapmak ister misiniz?`,
              type: 'warning',
              onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                await handleExit(existingRecords[0].id, null, {});
                showToast(`${searchValue} çıkış yaptırıldı.`, "success");
                fetchData();
              }
            });
            return;
          }
        } else {
          // Web ortamında Supabase kontrolü
          const reallyOnline = await checkOnlineStatus();
          if (reallyOnline) {
            let dbQuery = supabase.from('security_logs').select('id, plate, name').is('exit_at', null);

            if (mainTab === 'vehicle') {
              dbQuery = dbQuery.eq('plate', searchValue);
            } else {
              dbQuery = dbQuery.eq('name', searchValue);
            }

            const { data: existingRecords } = await dbQuery;

            if (existingRecords && existingRecords.length > 0) {
              // Varolan kaydı çıkış yapmak isteyip istemediğini sor
              setConfirmModal({
                isOpen: true,
                title: '⚠️ Araç/Kişi Zaten İçeride!',
                message: `${searchValue} veritabanında içeride görünüyor!\n\nBu kayıt için çıkış işlemi yapmak ister misiniz?`,
                type: 'warning',
                onConfirm: async () => {
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  await handleExit(existingRecords[0].id, null, {});
                  showToast(`${searchValue} çıkış yaptırıldı.`, "success");
                  fetchData();
                }
              });
              return;
            }
          }
        }
      } catch (error) {
        console.error('DB check error:', error);
        // Hata durumunda devam et, local kontrol yeterli
      }
    }

    setLoading(true);

    let subCategory = 'Genel';
    if (mainTab === 'vehicle') {
      const map = { guest: 'Misafir Araç', staff: 'Personel Aracı', management: 'Yönetim Aracı', service: 'Servis Aracı', sealed: 'Mühürlü Araç', company: 'Şirket Aracı' };
      subCategory = map[vehicleSubTab] || 'Genel';
    } else {
      const map = { guest: 'Misafir', staff: 'Fabrika Personeli', 'ex-staff': 'İşten Ayrılan' };
      subCategory = map[visitorSubTab] || 'Misafir';
    }

    const isExitLog = vehicleDirection === 'Çıkış';
    let driverInfo = null;
    if (mainTab === 'vehicle') {
      if (formData.driver_type !== 'owner' && formData.driver_type) {
        const labels = { driver: 'Şoför', supervisor: 'Vardiya Amiri', other: 'Diğer' };
        driverInfo = `[${labels[formData.driver_type] || 'Diğer'}] ${sanitizeInput(formData.driver)}`;
      } else {
        driverInfo = sanitizeInput(formData.driver);
      }
    }

    const newLog = {
      type: mainTab,
      sub_category: subCategory,
      shift: currentShift,
      plate: mainTab === 'vehicle' ? sanitizeInput(formData.plate).toUpperCase() : null,
      driver: driverInfo,
      name: mainTab === 'visitor' ? sanitizeInput(formData.name) : null,
      host: (mainTab === 'visitor' && visitorSubTab === 'staff') ? 'Fabrika' : sanitizeInput(formData.host),
      note: sanitizeInput(formData.note),
      location: sanitizeInput(formData.location),
      seal_number_entry: vehicleSubTab === 'sealed' ? sanitizeInput(formData.seal_number_entry) : null,
      seal_number_exit: null,
      seal_number: vehicleSubTab === 'sealed' ? sanitizeInput(formData.seal_number_entry) : null,
      tc_no: formData.tc_no || null,
      phone: formData.phone || null,
      user_email: session?.user?.email || 'local_user',
      created_at: new Date().toISOString(),
      exit_at: isExitLog ? new Date().toISOString() : null
    };

    try {
      // Electron ortamında yerel SQLite kullan
      if (isElectron) {
        await dbClient.insertLog(newLog);
        showToast(isExitLog ? "Çıkış Kaydedildi" : "Giriş Kaydedildi");
        resetForm();
        fetchData();
      } else {
        // Web ortamında Supabase kullan
        const reallyOnline = await checkOnlineStatus();
        setIsOnline(reallyOnline);

        if (!reallyOnline) {
          saveToOfflineQueue(newLog);
          resetForm();
          setLoading(false);
          return;
        }

        const { error } = await supabase.from('security_logs').insert([newLog]);
        if (error) {
          saveToOfflineQueue(newLog);
        } else {
          showToast(isExitLog ? "Çıkış Kaydedildi" : "Giriş Kaydedildi");
          resetForm();
          fetchData();
        }
      }
    } catch (error) {
      if (!isElectron) {
        saveToOfflineQueue(newLog);
      } else {
        showToast(`Hata: ${error.message}`, "error");
      }
    } finally {
      setLoading(false);
    }
  }, [mainTab, vehicleSubTab, visitorSubTab, vehicleDirection, formData, activeLogs, currentShift, session, checkOnlineStatus, saveToOfflineQueue, resetForm, fetchData, showToast, handleExit]);

  const confirmSealedExit = useCallback(async () => {
    if (!exitSealNumber?.trim()) return showToast("Lütfen Çıkış Mühür Numarasını Giriniz!", "error");
    if (!exitingLogData?.id) return showToast("Geçersiz kayıt!", "error");
    await handleExit(exitingLogData.id, sanitizeInput(exitSealNumber));
    setExitSealModalOpen(false);
    setExitingLogData(null);
    setExitSealNumber('');
  }, [exitSealNumber, exitingLogData, handleExit, showToast]);

  const handleDelete = useCallback(async (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Kayıt Silme',
      message: 'Bu kaydı kalıcı olarak silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz!',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          setActionLoading(id);
          // Electron ortamında yerel SQLite kullan
          if (isElectron) {
            await dbClient.deleteLog(id);
            showToast("Kayıt silindi.", "success");
            fetchData();
            setEditingLog(null);
          } else {
            // Web ortamında Supabase kullan
            if (!isOnline) {
              saveToOfflineQueue(null, 'DELETE', id);
              setEditingLog(null);
              return;
            }
            const { error } = await supabase.from('security_logs').delete().eq('id', id);
            if (!error) { showToast("Kayıt silindi.", "success"); fetchData(); setEditingLog(null); }
            else showToast("Silme hatası!", "error");
          }
        } catch (error) {
          showToast("Bağlantı hatası!", "error");
        } finally {
          setActionLoading(null);
        }
      }
    });
  }, [isOnline, saveToOfflineQueue, fetchData, showToast]);

  const handleUpdate = useCallback(async () => {
    const updateData = {
      plate: sanitizeInput(editForm.plate), driver: sanitizeInput(editForm.driver), name: sanitizeInput(editForm.name),
      host: sanitizeInput(editForm.host), note: sanitizeInput(editForm.note), location: sanitizeInput(editForm.location),
      seal_number: sanitizeInput(editForm.seal_number), seal_number_entry: sanitizeInput(editForm.seal_number_entry),
      seal_number_exit: sanitizeInput(editForm.seal_number_exit), shift: editForm.shift, tc_no: editForm.tc_no,
      phone: editForm.phone, created_at: editForm.created_at, exit_at: editForm.exit_at
    };

    try {
      setActionLoading(editingLog.id);
      // Electron ortamında yerel SQLite kullan
      if (isElectron) {
        await dbClient.updateLog(editingLog.id, updateData);
        showToast("Güncellendi.");
        setEditingLog(null);
        fetchData();
      } else {
        // Web ortamında Supabase kullan
        if (!isOnline) {
          saveToOfflineQueue(updateData, 'UPDATE', editingLog.id);
          setEditingLog(null);
          return;
        }
        const { error } = await supabase.from('security_logs').update(updateData).eq('id', editingLog.id);
        if (!error) { showToast("Güncellendi."); setEditingLog(null); fetchData(); }
        else showToast("Güncelleme hatası!", "error");
      }
    } catch (error) {
      showToast("Bağlantı hatası!", "error");
    } finally {
      setActionLoading(null);
    }
  }, [editForm, editingLog, isOnline, saveToOfflineQueue, fetchData, showToast]);

  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setLoginError("E-posta veya şifre hatalı.");
    } catch (error) {
      setLoginError("Bağlantı hatası. Lütfen tekrar deneyin.");
    }
  }, [email, password]);

  const handleLogout = useCallback(async () => {
    try { await supabase.auth.signOut(); setEmail(""); setPassword(""); } catch (error) { }
  }, []);

  const handleQuickExit = useCallback(async (log) => {
    if (actionLoading) return;
    if (log.sub_category === 'Mühürlü Araç') {
      setExitingLogData(log);
      setExitSealNumber('');
      setExitSealModalOpen(true);
      return;
    }
    const identifier = log.plate || log.name;
    setConfirmModal({
      isOpen: true,
      title: 'Çıkış Onayı',
      message: `${identifier} için çıkış işlemini onaylıyor musunuz?`,
      type: 'warning',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          setActionLoading(log.id);
          // Electron ortamında yerel SQLite kullan
          if (isElectron) {
            await dbClient.exitLog(log.id, { exit_at: new Date().toISOString() });
            showToast(`✅ ${identifier} çıkış yaptı!`, "success");
            fetchData();
          } else {
            // Web ortamında Supabase kullan
            const reallyOnline = await checkOnlineStatus();
            setIsOnline(reallyOnline);
            if (!reallyOnline) { showToast("Çıkış işlemi için internet bağlantısı gerekir.", "error"); return; }
            const { error } = await supabase.from('security_logs').update({ exit_at: new Date().toISOString() }).eq('id', log.id);
            if (error) showToast(`Çıkış hatası: ${error.message}`, "error");
            else { showToast(`✅ ${identifier} çıkış yaptı!`, "success"); fetchData(); }
          }
        } catch (error) {
          showToast(`Hata: ${error.message}`, "error");
        } finally {
          setActionLoading(null);
        }
      }
    });
  }, [actionLoading, checkOnlineStatus, fetchData, showToast]);

  const quickEntry = useCallback(async (plate, category, host) => {
    if (loading) return;
    const normalizedPlate = plate.toUpperCase();
    const isInside = activeLogs.some(log => log.plate === normalizedPlate);
    if (isInside) { showToast(`${normalizedPlate} zaten içerde!`, "error"); return; }

    setConfirmModal({
      isOpen: true, title: 'Hızlı Giriş', message: `${normalizedPlate} için hızlı giriş yapılsın mı?`, type: 'info',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setLoading(true);
        const newLog = { type: 'vehicle', sub_category: category, shift: currentShift, plate: normalizedPlate, driver: null, name: null, host, note: 'Hızlı giriş', user_email: session?.user?.email || 'local_user', created_at: new Date().toISOString(), exit_at: null };
        try {
          // Electron ortamında yerel SQLite kullan
          if (isElectron) {
            await dbClient.insertLog(newLog);
            showToast(`${normalizedPlate} girişi kaydedildi`, "success");
            fetchData();
          } else {
            // Web ortamında Supabase kullan
            const { error } = await supabase.from('security_logs').insert([newLog]);
            if (error) showToast("Hata: " + error.message, "error");
            else { showToast(`${normalizedPlate} girişi kaydedildi`, "success"); fetchData(); }
          }
        } catch (error) {
          showToast("Bağlantı hatası!", "error");
        } finally {
          setLoading(false);
        }
      }
    });
  }, [loading, activeLogs, currentShift, session, fetchData, showToast]);

  // --- HIZLI TEKRAR GİRİŞ FONKSİYONU ---
  const handleReEntry = useCallback(async (log) => {
    if (loading || actionLoading) return;
    const identifier = log.plate || log.name;
    const isInside = activeLogs.some(l => (log.plate && l.plate === log.plate) || (log.name && l.name === log.name));
    if (isInside) return showToast(`${identifier} zaten içeride!`, "error");

    setConfirmModal({
      isOpen: true,
      title: 'Hızlı Tekrar Giriş',
      message: `${identifier} için tekrar giriş işlemi yapılsın mı?\n\nBilgiler önceki kayıttan kopyalanacak.`,
      type: 'info',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setActionLoading(log.id);

        const newLog = {
          type: log.type,
          sub_category: log.sub_category,
          shift: currentShift,
          plate: log.plate,
          driver: log.driver,
          name: log.name,
          host: log.host,
          location: log.location,
          note: log.note ? `[Tekrar Giriş] ${log.note}` : 'Tekrar Giriş',
          tc_no: log.tc_no,
          phone: log.phone,
          seal_number_entry: null,
          seal_number: null,
          user_email: session?.user?.email || 'local_user',
          created_at: new Date().toISOString(),
          exit_at: null
        };

        try {
          // Electron ortamında yerel SQLite kullan
          if (isElectron) {
            await dbClient.insertLog(newLog);
            showToast(`✅ ${identifier} tekrar giriş yaptı!`, "success");
            fetchData();
          } else {
            // Web ortamında Supabase kullan
            const { error } = await supabase.from('security_logs').insert([newLog]);
            if (error) {
              showToast("Hata: " + error.message, "error");
            } else {
              showToast(`✅ ${identifier} tekrar giriş yaptı!`, "success");
              fetchData();
            }
          }
        } catch (error) {
          showToast("Bağlantı hatası!", "error");
        } finally {
          setActionLoading(null);
        }
      }
    });
  }, [loading, actionLoading, activeLogs, currentShift, session, fetchData, showToast]);

  const exportToExcel = useCallback(() => {
    try {
      if (filteredLogs.length === 0) return showToast("Veri yok", "error");
      const exportData = filteredLogs.map(log => ({
        Tarih: new Date(log.created_at).toLocaleDateString('tr-TR'), Vardiya: log.shift, Kategori: log.sub_category,
        'Plaka/İsim': log.plate || log.name, 'Sürücü': log.driver || '-', 'İlgili Birim': log.host,
        Lokasyon: log.location || '-', 'TC Kimlik': log.tc_no || '-', Telefon: log.phone || '-',
        Açıklama: log.note || '-', 'Giriş Mührü': log.seal_number_entry || '-', 'Çıkış Mührü': log.seal_number_exit || '-',
        'Giriş Saati': new Date(log.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        'Çıkış Saati': log.exit_at ? new Date(log.exit_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : 'İÇERİDE'
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Rapor");
      XLSX.writeFile(wb, `Guvenlik_Raporu_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`);
      showToast("Excel dosyası indirildi!", "success");
    } catch (error) {
      showToast("Excel oluşturma hatası!", "error");
    }
  }, [showToast]);

  const sendDailyReport = useCallback(async (targetDate = null) => {
    if (sendingReport) return;
    const dateParam = targetDate || new Date().toISOString().split('T')[0];
    const isElectronApp = typeof window !== 'undefined' && window.electronAPI;

    setConfirmModal({
      isOpen: true,
      title: 'Rapor Gönderimi',
      message: `${new Date(dateParam).toLocaleDateString('tr-TR')} tarihli rapor hazırlanacak.\n\n${isElectronApp ? '📧 E-posta yerel SMTP üzerinden gönderilecek.' : '📧 Excel raporu indirilecek.'}`,
      type: 'info',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setSendingReport(true);
        showToast("📊 Rapor hazırlanıyor...", "info");

        try {
          // Electron ortamında yerel email API kullan
          if (isElectronApp && window.electronAPI.email) {
            const result = await window.electronAPI.email.sendDailyReport(dateParam);

            if (result.success) {
              const successCount = result.results?.filter(r => r.status === 'ok').length || 0;
              const failCount = result.results?.filter(r => r.status === 'error').length || 0;

              if (successCount > 0) {
                showToast(`✅ Rapor ${successCount} kişiye gönderildi!${failCount > 0 ? ` (${failCount} başarısız)` : ''}`, "success");
              } else if (failCount > 0) {
                showToast(`⚠️ E-posta gönderilemedi. SMTP ayarlarını kontrol edin.`, "error");
              } else {
                showToast(`✅ Rapor işlemi tamamlandı. (${result.stats?.total || 0} kayıt)`, "success");
              }
            } else {
              showToast(`❌ Hata: ${result.error || 'Bilinmeyen hata'}`, "error");
            }
          } else {
            // Web ortamında Excel indir
            const reportLogs = allLogs.filter(log => {
              const logDate = new Date(log.created_at).toISOString().split('T')[0];
              return logDate === dateParam;
            });

            if (reportLogs.length === 0) {
              showToast("⚠️ Seçilen tarihte kayıt bulunamadı!", "error");
              setSendingReport(false);
              return;
            }

            const reportData = reportLogs.map(log => ({
              Tarih: new Date(log.created_at).toLocaleDateString('tr-TR'),
              Saat: new Date(log.created_at).toLocaleTimeString('tr-TR'),
              Vardiya: log.shift || '-',
              Tip: log.type === 'vehicle' ? 'Araç' : 'Ziyaretçi',
              Kategori: log.sub_category || '-',
              'Plaka/İsim': log.plate || log.name || '-',
              Sürücü: log.driver || '-',
              'İlgili Birim': log.host || '-',
              Lokasyon: log.location || '-',
              'Giriş Saati': new Date(log.created_at).toLocaleTimeString('tr-TR'),
              'Çıkış Saati': log.exit_at ? new Date(log.exit_at).toLocaleTimeString('tr-TR') : 'İçeride',
              'TC Kimlik': log.tc_no || '-',
              Telefon: log.phone || '-',
              Açıklama: log.note || '-'
            }));

            const ws = XLSX.utils.json_to_sheet(reportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Güvenlik Raporu");
            const fileName = `Guvenlik_Raporu_${dateParam}.xlsx`;
            XLSX.writeFile(wb, fileName);

            showToast(`✅ ${reportLogs.length} kayıtlı rapor indirildi!`, "success");
          }
        } catch (error) {
          console.error('Rapor hatası:', error);
          showToast(`❌ Hata: ${error.message}`, "error");
        } finally {
          setSendingReport(false);
        }
      }
    });
  }, [sendingReport, allLogs, showToast]);

  // --- EFFECTS ---
  useEffect(() => {
    isMountedRef.current = true;

    // Electron ortamında authentication bypass - yerel kullanıcı oturumu oluştur
    if (isElectron) {
      // Electron'da yerel oturum oluştur, Supabase authentication atla
      const localSession = {
        user: {
          email: 'local_user@electron.local',
          id: 'local-electron-user'
        }
      };
      if (isMountedRef.current) setSession(localSession);
      setIsOnline(true); // Electron'da her zaman online kabul et (yerel DB kullanılıyor)
    } else {
      // Web ortamında Supabase authentication kullan
      supabase.auth.getSession().then(({ data: { session } }) => { if (isMountedRef.current) setSession(session); });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { if (isMountedRef.current) setSession(session); });

      const handleOnline = async () => {
        const reallyOnline = await checkOnlineStatus();
        if (isMountedRef.current) {
          setIsOnline(reallyOnline);
          if (reallyOnline) {
            showToast("İnternet bağlantısı sağlandı", "success");
            const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
            if (queue.length > 0) showToast(`${queue.length} bekleyen kayıt var. "Gönder" butonuna tıklayın.`, "info");
          }
        }
      };
      const handleOffline = () => { if (isMountedRef.current) { setIsOnline(false); showToast("İnternet kesildi. Offline mod aktif.", "warning"); } };

      checkOnlineStatus().then(status => { if (isMountedRef.current) setIsOnline(status); });
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Cleanup for web only
      return () => {
        isMountedRef.current = false;
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        subscription?.unsubscribe();
      };
    }

    checkPendingData();

    return () => {
      isMountedRef.current = false;
    };
  }, [checkOnlineStatus, checkPendingData, showToast]);

  useEffect(() => {
    if (mainTab === 'vehicle' && vehicleSubTab === 'management') setFormData(prev => ({ ...prev, host: 'Yönetim' }));
    else if (mainTab === 'vehicle' && vehicleSubTab === 'company') setFormData(prev => ({ ...prev, host: 'Şirket' }));
    else if (mainTab === 'vehicle' && vehicleSubTab === 'service') setFormData(prev => ({ ...prev, host: 'Personel Servisi' }));
    else if (mainTab === 'visitor' && visitorSubTab === 'staff') setFormData(prev => ({ ...prev, host: 'Fabrika' }));
  }, [mainTab, vehicleSubTab, visitorSubTab]);

  useEffect(() => {
    const checkShift = () => { const newShift = getShiftByTime(); if (newShift !== currentShift) setCurrentShift(newShift); };
    const interval = setInterval(checkShift, 60000);
    return () => clearInterval(interval);
  }, [currentShift, getShiftByTime]);

  useEffect(() => {
    fetchData();
    fetchIntervalRef.current = setInterval(fetchData, 10000);
    return () => { if (fetchIntervalRef.current) clearInterval(fetchIntervalRef.current); };
  }, [fetchData]);

  useEffect(() => { localStorage.setItem('soundEnabled', soundEnabled); }, [soundEnabled]);

  const checkHistory = useCallback(async (searchValue, type) => {
    if (!searchValue || searchValue.length < 3) { setPlateHistory(null); return; }
    const searchUpper = searchValue.toUpperCase();
    let matchingLogs = type === 'plate' ? allLogs.filter(log => log.plate === searchUpper) : allLogs.filter(log => log.name && log.name.includes(searchUpper));
    if (matchingLogs.length > 0) {
      const sortedLogs = matchingLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const lastVisit = sortedLogs[0];
      setPlateHistory({ count: matchingLogs.length, lastVisit: new Date(lastVisit.created_at).toLocaleDateString('tr-TR'), lastHost: lastVisit.host, lastNote: lastVisit.note, recentVisits: sortedLogs.slice(0, 5) });
    } else setPlateHistory({ count: 0 });
  }, [allLogs]);

  useEffect(() => {
    if (mainTab === 'vehicle' && formData.plate) { const timer = setTimeout(() => checkHistory(formData.plate, 'plate'), 500); return () => clearTimeout(timer); }
    else if (mainTab === 'visitor' && formData.name) { const timer = setTimeout(() => checkHistory(formData.name, 'name'), 500); return () => clearTimeout(timer); }
    else setPlateHistory(null);
  }, [formData.plate, formData.name, mainTab, checkHistory]);

  const playAlertSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleTE8teleTE8teleTE8teleTE8teleTE8teleTE8teleTE8teleTE8teleTDN');
      audio.volume = 0.5;
      audio.play().catch(() => { });
    } catch (e) { }
  }, [soundEnabled]);

  useEffect(() => {
    const longStayLogs = activeLogs.filter(log => (new Date() - new Date(log.created_at)) / 3600000 >= 4);
    if (longStayLogs.length > 0 && soundEnabled) {
      const interval = setInterval(playAlertSound, 300000);
      return () => clearInterval(interval);
    }
  }, [activeLogs, soundEnabled, playAlertSound]);

  // --- MEMOIZED VALUES ---
  const filteredLogs = useMemo(() => {
    return allLogs.filter(log => {
      const matchesSearch = !debouncedSearchTerm || (log.plate && log.plate.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (log.name && log.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (log.sub_category && log.sub_category.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (log.host && log.host.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (log.tc_no && log.tc_no.includes(debouncedSearchTerm)) ||
        (log.phone && log.phone.includes(debouncedSearchTerm)) ||
        (log.driver && log.driver.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
      const matchesCategory = !categoryFilter || log.sub_category?.includes(categoryFilter);
      const logDate = new Date(log.created_at).toISOString().split('T')[0];
      const matchesDateFrom = !dateFrom || logDate >= dateFrom;
      const matchesDateTo = !dateTo || logDate <= dateTo;
      return matchesSearch && matchesCategory && matchesDateFrom && matchesDateTo;
    });
  }, [allLogs, debouncedSearchTerm, categoryFilter, dateFrom, dateTo]);

  const todayAllLogs = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const movements = [];
    const todayLogs = allLogs.filter(log => new Date(log.created_at).toISOString().split('T')[0] === today);

    todayLogs.forEach(log => {
      movements.push({ ...log, direction: 'entry', time: log.created_at, hasExited: !!log.exit_at });
      if (log.exit_at) {
        const exitDate = new Date(log.exit_at).toISOString().split('T')[0];
        if (exitDate === today) movements.push({ ...log, direction: 'exit', time: log.exit_at });
      }
    });
    return movements.sort((a, b) => new Date(b.time) - new Date(a.time));
  }, [allLogs]);

  // Bugünkü Hareketler için detaylı istatistikler
  const todayDetailedStats = useMemo(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentMovements = todayAllLogs.filter(log => new Date(log.time) >= oneHourAgo);

    const categoryBreakdown = {};
    todayAllLogs.forEach(log => {
      if (log.direction === 'entry') {
        const cat = log.sub_category || 'Diğer';
        categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
      }
    });

    const shiftBreakdown = {
      'Vardiya 1 (08:00-16:00)': 0,
      'Vardiya 2 (16:00-00:00)': 0,
      'Vardiya 3 (00:00-08:00)': 0
    };
    todayAllLogs.forEach(log => {
      if (log.direction === 'entry' && log.shift) {
        shiftBreakdown[log.shift] = (shiftBreakdown[log.shift] || 0) + 1;
      }
    });

    // Ortalama bekleme süresi (içeride kalanlar için)
    const completedToday = allLogs.filter(log => {
      const entryDate = new Date(log.created_at).toISOString().split('T')[0];
      const exitDate = log.exit_at ? new Date(log.exit_at).toISOString().split('T')[0] : null;
      const today = new Date().toISOString().split('T')[0];
      return entryDate === today && exitDate === today && log.exit_at;
    });

    let avgWaitMinutes = 0;
    if (completedToday.length > 0) {
      const totalMinutes = completedToday.reduce((sum, log) => {
        return sum + Math.floor((new Date(log.exit_at) - new Date(log.created_at)) / 60000);
      }, 0);
      avgWaitMinutes = Math.floor(totalMinutes / completedToday.length);
    }

    return {
      recentCount: recentMovements.length,
      recentEntries: recentMovements.filter(l => l.direction === 'entry').length,
      recentExits: recentMovements.filter(l => l.direction === 'exit').length,
      categoryBreakdown,
      shiftBreakdown,
      avgWaitMinutes,
      completedCount: completedToday.length
    };
  }, [todayAllLogs, allLogs]);

  const longStayCount = useMemo(() => activeLogs.filter(log => calculateWaitTime(log.created_at).isLongStay).length, [activeLogs]);

  const frequentVisitors = useMemo(() => {
    const counts = {};
    allLogs.forEach(log => {
      const key = log.plate || log.name;
      if (key) {
        if (!counts[key]) counts[key] = { key, count: 0, lastVisit: log.created_at, category: log.sub_category, host: log.host };
        counts[key].count++;
        if (new Date(log.created_at) > new Date(counts[key].lastVisit)) counts[key].lastVisit = log.created_at;
      }
    });
    return Object.values(counts).filter(v => v.count >= 2).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [allLogs]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = allLogs.filter(log => new Date(log.created_at).toISOString().split('T')[0] === today);
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekLogs = allLogs.filter(log => new Date(log.created_at) >= weekAgo);
    const categoryStats = {}; allLogs.forEach(log => { categoryStats[log.sub_category] = (categoryStats[log.sub_category] || 0) + 1; });
    const shiftStats = {}; todayLogs.forEach(log => { shiftStats[log.shift] = (shiftStats[log.shift] || 0) + 1; });
    const dailyStats = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(); date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = allLogs.filter(log => new Date(log.created_at).toISOString().split('T')[0] === dateStr).length;
      dailyStats.push({ date: date.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric' }), count });
    }
    const completedVisits = allLogs.filter(log => log.exit_at);
    let avgStayMins = 0;
    if (completedVisits.length > 0) {
      const totalMins = completedVisits.reduce((sum, log) => sum + Math.floor((new Date(log.exit_at) - new Date(log.created_at)) / 60000), 0);
      avgStayMins = Math.floor(totalMins / completedVisits.length);
    }
    return {
      today: todayLogs.length, todayVehicle: todayLogs.filter(l => l.type === 'vehicle').length,
      todayVisitor: todayLogs.filter(l => l.type === 'visitor').length, activeNow: activeLogs.length,
      longStayCount, week: weekLogs.length, categoryStats, shiftStats, dailyStats, avgStayMins
    };
  }, [allLogs, activeLogs, longStayCount]);

  // --- SAFETY & RESET MECHANISMS ---
  useEffect(() => {
    let timeoutId;
    if (loading || actionLoading) {
      timeoutId = setTimeout(() => {
        if (isMountedRef.current) {
          setLoading(false);
          setActionLoading(null);
          showToast("İşlem çok uzun sürdü, sistem güvenlik için yenilendi.", "warning");
        }
      }, 15000);
    }
    return () => clearTimeout(timeoutId);
  }, [loading, actionLoading, showToast]);

  const handleSystemReset = useCallback(() => {
    setLoading(false);
    setActionLoading(null);
    setExitSealModalOpen(false);
    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null, type: 'warning' });
    setEditingLog(null);
    setShowReportModal(false);
    setExitingLogData(null);
    showToast("Sistem arayüzü yenilendi.", "info");
  }, [showToast]);

  // --- RENDER ---
  if (!session) return <LoginPage email={email} setEmail={setEmail} password={password} setPassword={setPassword} handleLogin={handleLogin} loginError={loginError} />;

  // === DASHBOARD ===
  if (currentPage === 'dashboard') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-2 md:p-4">
        <header className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Malhotra Kablo" className="h-12 w-auto object-contain" />
            <div>
              <h1 className="text-xl font-bold">Malhotra Kablo Güvenlik Paneli V{APP_VERSION}</h1>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                {isOnline ? <span className="text-green-400 flex items-center gap-1"><Wifi size={12} /> Online</span> : <span className="text-red-400 flex items-center gap-1"><WifiOff size={12} /> Offline</span>}
                <span>| {session.user.email}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSystemReset} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded font-bold flex items-center gap-2 text-sm" title="Takılı kalırsa sistemi yeniler"><RefreshCw size={16} /> Yenile</button>
            <button onClick={() => setCurrentPage('main')} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-bold flex items-center gap-2"><LogIn size={18} /> Giriş Paneli</button>
            <button onClick={handleLogout} className="bg-red-900/30 text-red-200 px-4 py-2 rounded hover:bg-red-900/50 transition"><LogOut size={18} /></button>
          </div>
        </header>

        <main className="mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="text-blue-400" /> Dashboard & İstatistikler</h2>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setSoundEnabled(!soundEnabled)} className={`px-3 py-2 rounded font-bold flex items-center gap-2 text-sm transition-all ${soundEnabled ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}>
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
              <button onClick={() => setShowReportModal(true)} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded font-bold flex items-center gap-2 text-sm"><Calendar size={16} /> Tarih Seç</button>
              <button onClick={() => sendDailyReport(new Date().toISOString().split('T')[0])} disabled={sendingReport} className="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 text-white px-4 py-2 rounded font-bold flex items-center gap-2 text-sm">
                {sendingReport ? <RefreshCw size={16} className="animate-spin" /> : <Mail size={16} />} {sendingReport ? 'Gönderiliyor...' : 'Bugünü Gönder'}
              </button>
              <button onClick={() => { const y = new Date(); y.setDate(y.getDate() - 1); sendDailyReport(y.toISOString().split('T')[0]); }} disabled={sendingReport} className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 text-white px-4 py-2 rounded font-bold flex items-center gap-2 text-sm">
                {sendingReport ? <RefreshCw size={16} className="animate-spin" /> : <Mail size={16} />} {sendingReport ? 'Gönderiliyor...' : 'Dünü Gönder'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-5 rounded-xl shadow-lg"><div className="flex items-center justify-between"><div><p className="text-blue-200 text-sm font-medium">Bugün Toplam</p><p className="text-3xl font-bold text-white mt-1">{stats.today}</p></div><Activity className="text-blue-300" size={40} /></div></div>
            <div className="bg-gradient-to-br from-green-600 to-green-800 p-5 rounded-xl shadow-lg"><div className="flex items-center justify-between"><div><p className="text-green-200 text-sm font-medium">Şu An İçeride</p><p className="text-3xl font-bold text-white mt-1">{stats.activeNow}</p></div><Users className="text-green-300" size={40} /></div></div>
            <div className={`bg-gradient-to-br ${stats.longStayCount > 0 ? 'from-red-600 to-red-800' : 'from-slate-600 to-slate-800'} p-5 rounded-xl shadow-lg`}><div className="flex items-center justify-between"><div><p className={stats.longStayCount > 0 ? 'text-red-200' : 'text-slate-300'}>4+ Saat İçeride</p><p className="text-3xl font-bold text-white mt-1">{stats.longStayCount}</p></div><AlertCircle className={stats.longStayCount > 0 ? 'text-red-300 animate-pulse' : 'text-slate-400'} size={40} /></div></div>
            <div className="bg-gradient-to-br from-purple-600 to-purple-800 p-5 rounded-xl shadow-lg"><div className="flex items-center justify-between"><div><p className="text-purple-200 text-sm font-medium">Bu Hafta</p><p className="text-3xl font-bold text-white mt-1">{stats.week}</p></div><TrendingUp className="text-purple-300" size={40} /></div></div>
            <div className="bg-gradient-to-br from-orange-600 to-orange-800 p-5 rounded-xl shadow-lg"><div className="flex items-center justify-between"><div><p className="text-orange-200 text-sm font-medium">Ort. Kalış Süresi</p><p className="text-2xl font-bold text-white mt-1">{Math.floor(stats.avgStayMins / 60)}s {stats.avgStayMins % 60}dk</p></div><Timer className="text-orange-300" size={40} /></div></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Clock className="text-blue-400" /> Bugün Detay</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-900 rounded"><span className="flex items-center gap-2"><Car className="text-blue-400" size={18} /> Araç Girişi</span><span className="font-bold text-xl">{stats.todayVehicle}</span></div>
                <div className="flex justify-between items-center p-3 bg-slate-900 rounded"><span className="flex items-center gap-2"><User className="text-purple-400" size={18} /> Ziyaretçi</span><span className="font-bold text-xl">{stats.todayVisitor}</span></div>
              </div>
            </div>

            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><PieChart className="text-green-400" /> Kategori Dağılımı</h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {Object.entries(stats.categoryStats).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([cat, count]) => (
                  <div key={cat} className="flex justify-between items-center p-2 bg-slate-900 rounded text-sm"><span className="truncate">{cat}</span><span className="font-bold bg-slate-700 px-2 py-1 rounded">{count}</span></div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><TrendingUp className="text-orange-400" /> Son 7 Gün</h3>
              <div className="flex items-end justify-between h-[150px] gap-2">
                {stats.dailyStats.map((day, idx) => {
                  const maxCount = Math.max(...stats.dailyStats.map(d => d.count), 1);
                  const height = (day.count / maxCount) * 100;
                  return (
                    <div key={idx} className="flex flex-col items-center flex-1"><span className="text-xs font-bold mb-1">{day.count}</span><div className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all" style={{ height: `${Math.max(height, 5)}%` }}></div><span className="text-[10px] text-slate-400 mt-1 text-center">{day.date}</span></div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-6 bg-slate-800 p-5 rounded-xl border border-slate-700">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Layers className="text-yellow-400" /> Bugünkü Vardiya Dağılımı</h3>
            <div className="grid grid-cols-3 gap-4">
              {['Vardiya 1 (08:00-16:00)', 'Vardiya 2 (16:00-00:00)', 'Vardiya 3 (00:00-08:00)'].map(shift => (
                <div key={shift} className={`p-4 rounded-xl text-center ${currentShift === shift ? 'bg-blue-600' : 'bg-slate-900'}`}><p className="text-sm text-slate-300">{shift.split(' ')[0]} {shift.split(' ')[1]}</p><p className="text-2xl font-bold mt-1">{stats.shiftStats[shift] || 0}</p></div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Star className="text-yellow-400" /> Sık Gelen Araç/Ziyaretçiler</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {frequentVisitors.length > 0 ? frequentVisitors.map((visitor, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg hover:bg-slate-700 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${idx < 3 ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-white'}`}>{idx + 1}</div>
                      <div><p className="font-bold text-white">{visitor.key}</p><p className="text-xs text-slate-400">{visitor.category} • {visitor.host}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right"><p className="font-bold text-blue-400">{visitor.count} kez</p><p className="text-[10px] text-slate-500">Son: {new Date(visitor.lastVisit).toLocaleDateString('tr-TR')}</p></div>
                      <button onClick={() => quickEntry(visitor.key, visitor.category, visitor.host)} className="opacity-0 group-hover:opacity-100 bg-green-600 hover:bg-green-500 text-white p-2 rounded transition-all" title="Hızlı Giriş"><Zap size={14} /></button>
                    </div>
                  </div>
                )) : <div className="text-center text-slate-500 py-8 italic">Henüz yeterli veri yok</div>}
              </div>
            </div>

            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Zap className="text-green-400" /> Hızlı İşlemler</h3>
              <div className="space-y-4">
                <div className="bg-slate-900 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-3"><span className="text-slate-400 text-sm">Şu an içeride</span><span className="text-2xl font-bold text-green-400">{activeLogs.length}</span></div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-slate-800 p-2 rounded flex justify-between"><span className="text-slate-400">Araç</span><span className="font-bold">{activeLogs.filter(l => l.type === 'vehicle').length}</span></div>
                    <div className="bg-slate-800 p-2 rounded flex justify-between"><span className="text-slate-400">Ziyaretçi</span><span className="font-bold">{activeLogs.filter(l => l.type === 'visitor').length}</span></div>
                  </div>
                </div>
                {activeLogs.filter(l => (new Date() - new Date(l.created_at)) / 3600000 >= 4).length > 0 && (
                  <div className="bg-red-900/30 border border-red-500/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2"><AlertTriangle className="text-red-400" size={18} /><span className="text-red-300 font-bold">4+ Saat İçeride</span></div>
                    <div className="space-y-1 max-h-[120px] overflow-y-auto">
                      {activeLogs.filter(l => (new Date() - new Date(l.created_at)) / 3600000 >= 4).map(log => (
                        <div key={log.id} className="flex justify-between items-center text-sm bg-red-900/30 p-2 rounded">
                          <span className="text-red-200">{log.plate || log.name}</span>
                          <span className="text-red-400 font-mono">{Math.floor((new Date() - new Date(log.created_at)) / 3600000)}s {Math.floor(((new Date() - new Date(log.created_at)) % 3600000) / 60000)}dk</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="bg-slate-900 p-4 rounded-lg">
                  <p className="text-slate-400 text-sm mb-2">Son Çıkışlar</p>
                  <div className="space-y-1 max-h-[100px] overflow-y-auto">
                    {allLogs.filter(l => l.exit_at).slice(0, 5).map(log => (
                      <div key={log.id} className="flex justify-between items-center text-sm text-slate-300">
                        <span>{log.plate || log.name}</span>
                        <span className="text-slate-500">{new Date(log.exit_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Toast notification={notification} onClose={closeToast} />
        <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} type={confirmModal.type} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} />

        {showReportModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-slate-800 p-6 rounded-xl w-full max-w-md border border-slate-600 shadow-2xl relative animate-in fade-in zoom-in">
              <button onClick={() => setShowReportModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20} /></button>
              <h3 className="text-xl font-bold text-white mb-6 flex gap-2 items-center"><Mail className="text-purple-500" /> Tarih Seçerek Rapor Gönder</h3>
              <div className="space-y-4">
                <div><label className={labelClass}>RAPOR TARİHİ</label><input type="date" value={reportDateFrom} onChange={e => setReportDateFrom(e.target.value)} className={inputClass} max={new Date().toISOString().split('T')[0]} /></div>
                <div className="bg-slate-900 p-4 rounded-lg"><p className="text-slate-400 text-sm mb-2">Alıcılar:</p><ul className="text-sm space-y-1"><li className="text-slate-300">• ozguncobandere@malhotracables.com.tr</li><li className="text-slate-300">• osmanozger@malhotracables.com.tr</li><li className="text-slate-300">• tahagunduz@malhotracables.com.tr</li></ul></div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowReportModal(false)} className="flex-1 bg-slate-700 text-white py-3 rounded font-bold hover:bg-slate-600 transition-all">İptal</button>
                  <button onClick={() => { if (!reportDateFrom) { showToast("Lütfen tarih seçin", "error"); return; } setShowReportModal(false); sendDailyReport(reportDateFrom); }} disabled={sendingReport || !reportDateFrom} className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 text-white py-3 rounded font-bold shadow-lg transition-all flex items-center justify-center gap-2"><Send size={18} /> Rapor Gönder</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // === ANA SAYFA ===
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-2 md:p-4">
      {!isOnline && (<div className="bg-red-600 text-white p-3 rounded-xl mb-4 flex items-center justify-between shadow-lg"><div className="flex items-center gap-2 font-bold"><WifiOff size={20} /><span>İNTERNET BAĞLANTISI YOK - OFFLINE MOD</span></div><div className="bg-black/20 px-3 py-1 rounded text-sm font-mono">Bekleyen: {pendingCount}</div></div>)}
      {isOnline && pendingCount > 0 && (<div className="bg-orange-600 text-white p-3 rounded-xl mb-4 flex items-center justify-between shadow-lg"><div className="flex items-center gap-2 font-bold"><AlertCircle size={20} /><span>{pendingCount} bekleyen kayıt var</span></div><div className="flex gap-2"><button onClick={() => { localStorage.removeItem(OFFLINE_QUEUE_KEY); checkPendingData(); showToast("Kuyruk temizlendi", "info"); }} className="bg-red-800 text-white px-3 py-2 rounded text-sm font-bold hover:bg-red-700 flex items-center gap-1"><Trash2 size={14} /> Temizle</button><button onClick={syncOfflineData} className="bg-white text-orange-600 px-4 py-2 rounded text-sm font-bold hover:bg-slate-100 flex items-center gap-2"><RefreshCw size={16} /> Gönder</button></div></div>)}

      <header className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="Malhotra Kablo" className="h-12 w-auto object-contain" />
          <div>
            <h1 className="text-xl font-bold">Malhotra Kablo Güvenlik Paneli V{APP_VERSION}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {isOnline ? <span className="text-green-400 flex items-center gap-1"><Wifi size={12} /> Online</span> : <span className="text-red-400 flex items-center gap-1"><WifiOff size={12} /> Offline</span>}
              <span>| {session.user.email}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-600"><Layers size={18} className="text-orange-400" /><div className="flex flex-col"><span className="text-[10px] text-slate-400 font-bold uppercase">Aktif Vardiya</span><span className="text-white text-sm font-bold">{currentShift}</span></div></div>
        <div className="flex items-center gap-2">
          {longStayCount > 0 && <div className="bg-red-600 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-2 animate-pulse hidden md:flex"><AlertCircle size={18} /><span>{longStayCount} kişi 4+ saat!</span></div>}
          <button onClick={handleSystemReset} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded font-bold flex items-center gap-2 text-sm" title="Takılı kalırsa sistemi yeniler"><RefreshCw size={16} /> Yenile</button>
          <button onClick={() => setCurrentPage('dashboard')} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded font-bold flex items-center gap-2"><BarChart3 size={18} /> Dashboard</button>
          <button onClick={handleLogout} className="bg-red-900/30 text-red-200 px-4 py-2 rounded hover:bg-red-900/50 transition"><LogOut size={18} /></button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SOL: GİRİŞ/ÇIKIŞ FORMU */}
        <section className="lg:col-span-5 bg-slate-800 p-6 rounded-xl border border-slate-700 h-fit shadow-lg">
          <div className="flex bg-slate-900 p-1 rounded-lg mb-4">
            <button onClick={() => setVehicleDirection('Giriş')} className={`flex-1 py-3 text-sm font-bold rounded flex items-center justify-center gap-2 transition-all ${vehicleDirection === 'Giriş' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><ArrowRightCircle size={18} /> GİRİŞ İŞLEMİ</button>
            <button onClick={() => setVehicleDirection('Çıkış')} className={`flex-1 py-3 text-sm font-bold rounded flex items-center justify-center gap-2 transition-all ${vehicleDirection === 'Çıkış' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><ArrowLeftCircle size={18} /> ÇIKIŞ İŞLEMİ</button>
          </div>

          <div className="flex bg-slate-900 p-1 rounded-lg mb-6"><button onClick={() => setMainTab('vehicle')} className={`flex-1 py-2 text-sm font-bold rounded ${mainTab === 'vehicle' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>ARAÇ</button><button onClick={() => setMainTab('visitor')} className={`flex-1 py-2 text-sm font-bold rounded ${mainTab === 'visitor' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}>YAYA / ZİYARETÇİ</button></div>

          {mainTab === 'vehicle' && (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-1 mb-6">
              <SubTabBtn active={vehicleSubTab === 'guest'} onClick={() => { setVehicleSubTab('guest'); setFormData(prev => ({ ...prev, driver_type: 'other' })); }} icon={<Car size={14} />} label="Misafir" />
              <SubTabBtn active={vehicleSubTab === 'staff'} onClick={() => { setVehicleSubTab('staff'); setFormData(prev => ({ ...prev, driver_type: 'other' })); }} icon={<User size={14} />} label="Personel" />
              <SubTabBtn active={vehicleSubTab === 'management'} onClick={() => { setVehicleSubTab('management'); setFormData(prev => ({ ...prev, driver_type: 'owner' })); }} icon={<Crown size={14} />} label="Yönetim" />
              <SubTabBtn active={vehicleSubTab === 'service'} onClick={() => { setVehicleSubTab('service'); setFormData(prev => ({ ...prev, driver_type: 'other' })); }} icon={<Bus size={14} />} label="Servis" />
              <SubTabBtn active={vehicleSubTab === 'sealed'} onClick={() => { setVehicleSubTab('sealed'); setFormData(prev => ({ ...prev, driver_type: 'other' })); }} icon={<Lock size={14} />} label="Mühürlü" />
              <SubTabBtn active={vehicleSubTab === 'company'} onClick={() => { setVehicleSubTab('company'); setFormData(prev => ({ ...prev, driver_type: 'other' })); }} icon={<Briefcase size={14} />} label="Şirket" />
            </div>
          )}
          {mainTab === 'visitor' && (
            <div className="grid grid-cols-3 gap-2 mb-6">
              <SubTabBtn active={visitorSubTab === 'guest'} onClick={() => setVisitorSubTab('guest')} icon={<User size={16} />} label="Misafir" />
              <SubTabBtn active={visitorSubTab === 'staff'} onClick={() => setVisitorSubTab('staff')} icon={<UserCheck size={16} />} label="Fabrika Personeli" />
              <SubTabBtn active={visitorSubTab === 'ex-staff'} onClick={() => setVisitorSubTab('ex-staff')} icon={<UserMinus size={16} />} label="İşten Ayrılan" />
            </div>
          )}

          <div className="space-y-4">
            {mainTab === 'visitor' && visitorSubTab === 'ex-staff' && (<div className="bg-red-900/30 border border-red-500/50 p-3 rounded flex items-start gap-3 animate-pulse"><AlertTriangle className="text-red-500 shrink-0" size={20} /><div><p className="text-red-200 text-sm font-bold">DİKKAT: ESKİ PERSONEL GİRİŞİ</p><p className="text-red-300 text-xs mt-1">Lütfen İnsan Kaynakları biriminden onay almadan içeri almayınız.</p></div></div>)}

            {mainTab === 'vehicle' ? (
              <>
                <div className="relative group">
                  <label className={labelClass}>ARAÇ PLAKASI</label>
                  {(vehicleSubTab === 'management' || vehicleSubTab === 'company') ? (
                    <div className="relative">
                      <input type="text" placeholder="34 AB 123" value={formData.plate || ''} onChange={(e) => { setFormData({ ...formData, plate: e.target.value.toUpperCase() }); setShowManagementList(true); }} onFocus={() => setShowManagementList(true)} className={`${inputClass} uppercase text-lg tracking-widest font-mono border-purple-500/50`} autoComplete="off" />
                      {showManagementList && formData.plate && (<div className="absolute z-50 w-full bg-slate-800 border border-slate-600 rounded-b-xl shadow-2xl max-h-60 overflow-y-auto mt-1">{MANAGEMENT_VEHICLES.filter(v => v.includes(formData.plate || '')).map((veh, idx) => (<div key={idx} className="p-3 hover:bg-purple-600 hover:text-white cursor-pointer border-b border-slate-700 last:border-0 text-sm transition-all flex items-center gap-2 font-mono" onClick={() => { const [platePart, namePart] = veh.split(' - '); const isCompany = veh.includes('ŞİRKET') || veh.includes('HAVUZ'); setFormData({ ...formData, plate: platePart.trim(), driver: namePart ? namePart.trim() : '', driver_type: (vehicleSubTab === 'management' && !isCompany) ? 'owner' : 'other', host: vehicleSubTab === 'management' ? 'Yönetim' : 'Şirket' }); setShowManagementList(false); }}><Crown size={14} className="text-yellow-400" />{veh}</div>))}{MANAGEMENT_VEHICLES.filter(v => v.includes(formData.plate || '')).length === 0 && (<div className="p-3 text-slate-500 text-xs italic text-center">Listede bulunamadı.</div>)}</div>)}
                    </div>
                  ) : (<input type="text" placeholder="34 AB 123" value={formData.plate} onChange={e => setFormData({ ...formData, plate: e.target.value.toUpperCase() })} className={`${inputClass} uppercase text-lg tracking-widest font-mono`} />)}
                </div>
                {plateHistory && plateHistory.count > 0 && (<div className="bg-blue-900/30 border border-blue-500/50 p-3 rounded animate-in fade-in slide-in-from-top-2"><div className="flex items-center gap-2 mb-2"><History size={16} className="text-blue-400" /><span className="text-blue-200 text-sm font-bold">Bu plaka {plateHistory.count} kez geldi</span></div><div className="text-xs text-blue-300 space-y-1"><p>📅 Son: <span className="font-bold text-white">{plateHistory.lastVisit}</span></p><p>👤 İlgili: <span className="font-bold text-white">{plateHistory.lastHost}</span></p></div></div>)}

                {(vehicleSubTab === 'management' || vehicleSubTab === 'company') && (
                  <div className="bg-purple-900/20 p-3 rounded border border-purple-500/30 animate-in fade-in slide-in-from-top-2">
                    <label className="text-xs text-purple-300 flex items-center gap-1 mb-2 font-bold"><User size={12} /> {vehicleDirection === 'Çıkış' ? 'ÇIKIŞTA ARACI KULLANAN' : 'ARACI KULLANAN'}</label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {vehicleSubTab === 'management' && !MANAGEMENT_VEHICLES.some(v => v.includes(formData.plate) && (v.includes('ŞİRKET') || v.includes('HAVUZ'))) && (<button type="button" onClick={() => setFormData({ ...formData, driver_type: 'owner' })} className={`p-2 rounded text-sm font-bold transition-all ${formData.driver_type === 'owner' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>👤 Araç Sahibi</button>)}
                      <button type="button" onClick={() => setFormData({ ...formData, driver_type: 'driver', driver: 'MURAT CİK' })} className={`p-2 rounded text-sm font-bold transition-all ${formData.driver_type === 'driver' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>🚗 Fabrika Şoförü</button>
                      <button type="button" onClick={() => setFormData({ ...formData, driver_type: 'supervisor', driver: 'AHMET PEKER' })} className={`p-2 rounded text-sm font-bold transition-all ${formData.driver_type === 'supervisor' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>👷 Vardiya Amiri</button>
                      <button type="button" onClick={() => setFormData({ ...formData, driver_type: 'manual', driver: '' })} className={`p-2 rounded text-sm font-bold transition-all ${formData.driver_type === 'manual' ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>✍️ Manuel Giriş</button>
                      <button type="button" onClick={() => setFormData({ ...formData, driver_type: 'other', driver: '' })} className={`p-2 rounded text-sm font-bold transition-all ${formData.driver_type === 'other' ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>✏️ Diğer</button>
                    </div>
                    {formData.driver_type === 'manual' && (
                      <div className="space-y-2">
                        <input type="text" placeholder="İsim Soyisim giriniz..." value={formData.driver} onChange={e => setFormData({ ...formData, driver: e.target.value.toUpperCase() })} className={`${inputClass} border-green-500/50`} />
                        <p className="text-green-400 text-xs">💡 İsim ve soyisimi büyük harfle giriniz.</p>
                      </div>
                    )}
                    {formData.driver_type !== 'owner' && formData.driver_type !== 'manual' && (<input type="text" placeholder={formData.driver_type === 'driver' ? "Şoför adı soyadı..." : formData.driver_type === 'supervisor' ? "Vardiya amiri adı..." : "Kullanan kişi adı..."} value={formData.driver} onChange={e => setFormData({ ...formData, driver: e.target.value })} className={inputClass} />)}
                    {formData.driver_type === 'owner' && formData.driver && (<p className="text-purple-300 text-sm mt-1">👤 {formData.driver}</p>)}
                  </div>
                )}

                {!(vehicleSubTab === 'management' || vehicleSubTab === 'company') && (
                  <div>
                    <label className={labelClass}>SÜRÜCÜ ADI SOYADI</label>
                    {vehicleSubTab === 'staff' ? (
                      <div className="relative group">
                        <div className="relative"><input type="text" placeholder="Personel Adı Ara veya Seç..." value={formData.driver || ''} onChange={(e) => { setFormData({ ...formData, driver: e.target.value.toUpperCase() }); setShowStaffList(true); }} onFocus={() => setShowStaffList(true)} className={`${inputClass} pl-10 border-blue-500/50 focus:bg-slate-800`} autoComplete="off" /><Search className="absolute left-3 top-3 text-blue-400" size={18} />{formData.driver && (<button onClick={() => setFormData({ ...formData, driver: '' })} className="absolute right-3 top-3 text-slate-500 hover:text-red-400 transition-colors"><X size={18} /></button>)}</div>
                        {showStaffList && formData.driver && (<div className="absolute z-50 w-full bg-slate-800 border border-slate-600 rounded-b-xl shadow-2xl max-h-60 overflow-y-auto mt-1">{STAFF_LIST.filter(p => p.includes(formData.driver || '')).map((person, idx) => (<div key={idx} className="p-3 pl-10 hover:bg-blue-600 hover:text-white cursor-pointer border-b border-slate-700 last:border-0 text-sm transition-all flex items-center gap-2 group" onClick={() => { setFormData({ ...formData, driver: person, host: 'Fabrika' }); setShowStaffList(false); }}><CheckCircle size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-white" />{person}</div>))}{STAFF_LIST.filter(p => p.includes(formData.driver || '')).length === 0 && (<div className="p-4 text-slate-500 text-sm italic text-center">"{formData.driver}" bulunamadı.</div>)}</div>)}
                      </div>
                    ) : (
                      <input type="text" placeholder="Ad Soyad Giriniz" value={formData.driver} onChange={e => setFormData({ ...formData, driver: e.target.value })} className={inputClass} />
                    )}
                  </div>
                )}

                {(vehicleSubTab === 'company' || vehicleSubTab === 'service' || (vehicleSubTab === 'management' && formData.driver_type !== 'owner')) && (
                  <div className="bg-blue-900/20 p-3 rounded border border-blue-500/30 animate-in fade-in slide-in-from-top-2">
                    <label className="text-xs text-blue-300 flex items-center gap-1 mb-1 font-bold"><MapPin size={12} /> {vehicleDirection === 'Giriş' ? 'GELDİĞİ LOKASYON (NEREDEN)' : 'GİDECEĞİ LOKASYON'}</label>
                    <input type="text" placeholder="Örn: Merkez Ofis, Gümrük..." value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className={inputClass} />
                  </div>
                )}

                {vehicleDirection === 'Çıkış' && (
                  <>
                    <div className="bg-orange-900/20 p-3 rounded border border-orange-500/30 animate-in fade-in slide-in-from-top-2"><p className="text-orange-300 text-sm flex items-center gap-2"><AlertCircle size={16} />Plakayı girin. Eğer araç içerideyse otomatik çıkış yapılacak.</p></div>
                    <div className="bg-blue-900/20 p-3 rounded border border-blue-500/30 animate-in fade-in slide-in-from-top-2 mt-2">
                      <label className="text-xs text-blue-300 flex items-center gap-1 mb-1 font-bold"><MapPin size={12} /> GİDECEĞİ LOKASYON</label>
                      <input type="text" placeholder="Nereye gidecek? Örn: Merkez Ofis, Gümrük, Depo..." value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className={inputClass} />
                    </div>
                  </>
                )}

                {vehicleSubTab === 'sealed' && (
                  <div className={`${vehicleDirection === 'Giriş' ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'} p-3 rounded border animate-in fade-in slide-in-from-top-2`}>
                    <label className={`text-xs ${vehicleDirection === 'Giriş' ? 'text-green-300' : 'text-red-300'} flex items-center gap-1 mb-1 font-bold`}>
                      <Lock size={12} /> {vehicleDirection === 'Giriş' ? 'GİRİŞ MÜHÜR NUMARASI' : 'ÇIKIŞ MÜHÜR NUMARASI'}
                      <span className="text-slate-400 font-normal">(Opsiyonel)</span>
                    </label>
                    <input
                      type="text"
                      placeholder={vehicleDirection === 'Giriş' ? "Giriş Mühür No..." : "Çıkış Mühür No..."}
                      value={vehicleDirection === 'Giriş' ? formData.seal_number_entry : formData.seal_number_exit}
                      onChange={e => vehicleDirection === 'Giriş' ? setFormData({ ...formData, seal_number_entry: e.target.value }) : setFormData({ ...formData, seal_number_exit: e.target.value })}
                      className={`${inputClass} ${vehicleDirection === 'Giriş' ? 'border-green-500/50' : 'border-red-500/50'}`}
                    />

                    {/* HIZLI BUTONLAR */}
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => vehicleDirection === 'Giriş' ? setFormData({ ...formData, seal_number_entry: 'MÜHÜR YOK' }) : setFormData({ ...formData, seal_number_exit: 'MÜHÜR YOK' })}
                        className="px-3 py-1.5 rounded text-xs font-bold bg-slate-700 hover:bg-slate-600 text-slate-300 transition-all flex items-center gap-1"
                      >
                        <X size={12} /> Mühür Yok
                      </button>
                      <button
                        type="button"
                        onClick={() => vehicleDirection === 'Giriş' ? setFormData({ ...formData, seal_number_entry: 'BELİRSİZ' }) : setFormData({ ...formData, seal_number_exit: 'BELİRSİZ' })}
                        className="px-3 py-1.5 rounded text-xs font-bold bg-slate-700 hover:bg-slate-600 text-slate-300 transition-all"
                      >
                        Belirsiz
                      </button>
                      {(vehicleDirection === 'Giriş' ? formData.seal_number_entry : formData.seal_number_exit) && (
                        <button
                          type="button"
                          onClick={() => vehicleDirection === 'Giriş' ? setFormData({ ...formData, seal_number_entry: '' }) : setFormData({ ...formData, seal_number_exit: '' })}
                          className="px-3 py-1.5 rounded text-xs font-bold bg-red-900/50 hover:bg-red-600 text-red-400 hover:text-white transition-all flex items-center gap-1"
                        >
                          <RotateCcw size={12} /> Temizle
                        </button>
                      )}
                    </div>

                    {vehicleDirection === 'Giriş' && <p className="text-xs text-green-400 mt-2 italic">* Çıkışta ayrıca Çıkış Mührü sorulacaktır.</p>}
                  </div>
                )}
              </>
            ) : (
              <div>
                <label className={labelClass}>ADI SOYADI</label>
                {visitorSubTab === 'staff' ? (
                  <div className="relative group">
                    <div className="relative"><input type="text" placeholder="Personel Adı Ara veya Seç..." value={formData.name || ''} onChange={(e) => { setFormData({ ...formData, name: e.target.value.toUpperCase() }); setShowStaffList(true); }} onFocus={() => setShowStaffList(true)} className={`${inputClass} pl-10 border-blue-500/50 focus:bg-slate-800`} autoComplete="off" /><Search className="absolute left-3 top-3 text-blue-400" size={18} />{formData.name && (<button onClick={() => setFormData({ ...formData, name: '' })} className="absolute right-3 top-3 text-slate-500 hover:text-red-400 transition-colors"><X size={18} /></button>)}</div>
                    {showStaffList && formData.name && (<div className="absolute z-50 w-full bg-slate-800 border border-slate-600 rounded-b-xl shadow-2xl max-h-60 overflow-y-auto mt-1">{STAFF_LIST.filter(p => p.includes(formData.name || '')).map((person, idx) => (<div key={idx} className="p-3 pl-10 hover:bg-blue-600 hover:text-white cursor-pointer border-b border-slate-700 last:border-0 text-sm transition-all flex items-center gap-2 group" onClick={() => { setFormData({ ...formData, name: person, host: 'Fabrika' }); setShowStaffList(false); }}><CheckCircle size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-white" />{person}</div>))}{STAFF_LIST.filter(p => p.includes(formData.name || '')).length === 0 && (<div className="p-4 text-slate-500 text-sm italic text-center">"{formData.name}" bulunamadı.</div>)}</div>)}
                  </div>
                ) : (<input type="text" placeholder="Kimlikteki Tam Ad" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={inputClass} />)}
                {plateHistory && plateHistory.count > 0 && (<div className="bg-purple-900/30 border border-purple-500/50 p-3 rounded mt-2 animate-in fade-in slide-in-from-top-2"><div className="flex items-center gap-2 mb-2"><History size={16} className="text-purple-400" /><span className="text-purple-200 text-sm font-bold">Bu kişi {plateHistory.count} kez geldi</span></div><div className="text-xs text-purple-300 space-y-1"><p>📅 Son: <span className="font-bold text-white">{plateHistory.lastVisit}</span></p><p>👤 İlgili: <span className="font-bold text-white">{plateHistory.lastHost}</span></p></div></div>)}
                {vehicleDirection === 'Çıkış' && (
                  <>
                    <div className="bg-orange-900/20 p-3 rounded border border-orange-500/30 mt-2 animate-in fade-in slide-in-from-top-2"><p className="text-orange-300 text-sm flex items-center gap-2"><AlertCircle size={16} />İsmi girin. Eğer kişi içerideyse otomatik çıkış yapılacak.</p></div>
                    <div className="bg-blue-900/20 p-3 rounded border border-blue-500/30 animate-in fade-in slide-in-from-top-2 mt-2">
                      <label className="text-xs text-blue-300 flex items-center gap-1 mb-1 font-bold"><MapPin size={12} /> GİDECEĞİ LOKASYON</label>
                      <input type="text" placeholder="Nereye gidecek? Opsiyonel..." value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className={inputClass} />
                    </div>
                  </>
                )}
                {vehicleDirection === 'Giriş' && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div><label className={labelClass}>TC KİMLİK NO</label><div className="relative"><select value={formData.tc_no === 'BELİRTİLMEDİ' ? 'BELİRTİLMEDİ' : (formData.tc_no ? 'MANUAL' : '')} onChange={e => { if (e.target.value === 'BELİRTİLMEDİ') setFormData({ ...formData, tc_no: 'BELİRTİLMEDİ' }); else setFormData({ ...formData, tc_no: '' }); }} className={`${inputClass} mb-1`}><option value="">TC Girmek İstiyorum</option><option value="BELİRTİLMEDİ">Belirtilmedi / Yok</option></select>{formData.tc_no !== 'BELİRTİLMEDİ' && (<input type="text" maxLength="11" placeholder="11 Haneli TC" value={formData.tc_no === 'BELİRTİLMEDİ' ? '' : formData.tc_no} onChange={e => setFormData({ ...formData, tc_no: e.target.value.replace(/\D/g, '') })} className={inputClass} />)}</div></div>
                    <div><label className={labelClass}>TELEFON</label><div className="relative"><input type="text" placeholder="05XX... (Opsiyonel)" value={formData.phone} onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })} className={inputClass} /><Phone size={14} className="absolute right-3 top-3 text-slate-500" /></div></div>
                  </div>
                )}
              </div>
            )}

            {vehicleDirection === 'Giriş' && (
              <div>
                <label className={labelClass}>İLGİLİ BİRİM / KİŞİ</label>
                <select
                  value={["Yönetim", "İnsan Kaynakları", "Muhasebe", "Depo / Lojistik", "Üretim / Fabrika", "Teknik Servis", "Şirket", "Personel Servisi"].includes(formData.host) ? formData.host : (formData.host === 'Fabrika Personeli' || STAFF_LIST.includes(formData.host) ? 'Fabrika Personeli' : 'Diğer')}
                  onChange={e => {
                    if (e.target.value === 'Fabrika Personeli') { setFormData({ ...formData, host: 'Fabrika Personeli' }); setShowHostStaffList(true); }
                    else if (e.target.value === 'Diğer') { setFormData({ ...formData, host: 'Diğer' }); }
                    else { setFormData({ ...formData, host: e.target.value }); setShowHostStaffList(false); }
                  }}
                  className={inputClass}
                >
                  <option value="">Seçiniz...</option>
                  <option value="Yönetim">Yönetim</option>
                  <option value="İnsan Kaynakları">İnsan Kaynakları</option>
                  <option value="Muhasebe">Muhasebe</option>
                  <option value="Depo / Lojistik">Depo / Lojistik</option>
                  <option value="Üretim / Fabrika">Üretim / Fabrika</option>
                  <option value="Teknik Servis">Teknik Servis</option>
                  <option value="Şirket">Şirket</option>
                  <option value="Personel Servisi">Personel Servisi</option>
                  <option value="Fabrika Personeli">Fabrika Personeli (Listeden Seç)</option>
                  <option value="Diğer">Diğer</option>
                </select>

                {(formData.host === 'Fabrika Personeli' || showHostStaffList) && (<div className="relative mt-2 animate-in fade-in slide-in-from-top-2"><div className="relative"><input type="text" placeholder="Personel Ara (İsim veya No)..." value={hostSearchTerm} onChange={(e) => { setHostSearchTerm(e.target.value.toUpperCase()); setShowHostStaffList(true); }} className={`${inputClass} pl-9 border-green-500/50`} autoFocus /><Search className="absolute left-3 top-3 text-green-500" size={16} /></div>{showHostStaffList && hostSearchTerm && (<div className="absolute z-50 w-full bg-slate-800 border border-slate-600 rounded-b-xl shadow-2xl max-h-60 overflow-y-auto mt-1">{STAFF_LIST.filter(p => p.includes(hostSearchTerm)).map((person, idx) => (<div key={idx} className="p-3 hover:bg-green-700 hover:text-white cursor-pointer border-b border-slate-700 last:border-0 text-sm transition-all flex items-center gap-2" onClick={() => { setFormData({ ...formData, host: person }); setShowHostStaffList(false); setHostSearchTerm(''); }}><UserCheck size={14} className="text-green-400" />{person}</div>))}{STAFF_LIST.filter(p => p.includes(hostSearchTerm)).length === 0 && (<div className="p-3 text-slate-500 text-xs italic text-center">Bulunamadı.</div>)}</div>)}</div>)}

                {!["Yönetim", "İnsan Kaynakları", "Muhasebe", "Depo / Lojistik", "Üretim / Fabrika", "Teknik Servis", "Şirket", "Personel Servisi", "Fabrika Personeli", ""].includes(formData.host) && !STAFF_LIST.includes(formData.host) && (
                  <input type="text" placeholder="LÜTFEN AÇIKLAMA GİRİNİZ" value={formData.host === 'Diğer' ? '' : formData.host} onChange={e => setFormData({ ...formData, host: e.target.value.toUpperCase() })} className={`${inputClass} mt-2 animate-in fade-in slide-in-from-top-2 border-orange-500/50`} autoFocus />
                )}
              </div>
            )}

            <div><label className={labelClass}>NOT / AÇIKLAMA</label><textarea placeholder="Firma adı, görüşme konusu vb." value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} className={`${inputClass} h-24 resize-none`} style={{ backgroundColor: '#0f172a', color: 'white' }}></textarea></div>

            <button onClick={handleEntry} disabled={loading} className={`w-full font-bold py-4 rounded shadow-lg transition-all active:scale-95 mt-2 flex items-center justify-center gap-2 ${vehicleDirection === 'Çıkış' ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-orange-900/20' : 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20'}`}>
              {loading ? <><RefreshCw size={20} className="animate-spin" /> KAYDEDİLİYOR...</> : vehicleDirection === 'Çıkış' ? <><LogOut size={20} /> ÇIKIŞI KAYDET</> : <><LogIn size={20} /> GİRİŞİ KAYDET</>}
            </button>
          </div>
        </section>

        {/* SAĞ: BUGÜNKÜ HAREKETLER */}
        <section className="lg:col-span-7 bg-slate-800 p-6 rounded-xl border border-slate-700 min-h-[500px] shadow-lg flex flex-col">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 pb-4 border-b border-slate-700 gap-3">
            <h2 className="text-lg font-bold flex items-center gap-2">📋 Bugünkü Hareketler</h2>
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <div className="relative flex-1 md:flex-none">
                <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
                <input
                  type="text"
                  placeholder="Ara..."
                  value={activeSearchTerm}
                  onChange={e => setActiveSearchTerm(e.target.value)}
                  className="bg-slate-900 border border-slate-600 rounded pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-orange-500 w-full md:w-48"
                />
              </div>
              <button
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  const todayData = todayAllLogs.map(log => ({
                    Tarih: new Date(log.time).toLocaleDateString('tr-TR'),
                    Saat: new Date(log.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
                    Durum: log.direction === 'entry' ? 'GİRİŞ' : 'ÇIKIŞ',
                    Kategori: log.sub_category,
                    'Plaka/İsim': log.plate || log.name,
                    Sürücü: log.driver || '-',
                    'İlgili Birim': log.host,
                    Vardiya: log.shift
                  }));
                  const ws = XLSX.utils.json_to_sheet(todayData);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'Bugünkü Hareketler');
                  XLSX.writeFile(wb, `Bugunun_Hareketleri_${today}.xlsx`);
                  showToast('📊 Excel dosyası indirildi!', 'success');
                }}
                className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded text-sm font-bold flex items-center gap-1 transition-all"
                title="Bugünkü Hareketleri Excel'e Aktar"
              >
                <FileText size={16} /> Excel
              </button>
              <span className="bg-blue-500/20 text-blue-300 px-3 py-2 rounded text-sm font-bold whitespace-nowrap">
                {todayAllLogs.length} Kayıt
              </span>
            </div>
          </div>

          {/* DETAYLI İSTATİSTİK KARTLARI */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-green-900/30 border border-green-500/30 p-4 rounded-lg hover:scale-105 transition-transform cursor-pointer group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-green-300 flex items-center gap-1 font-bold">
                  <ArrowRightCircle size={16} /> Giriş
                </span>
                <span className="text-3xl font-bold text-green-400 group-hover:scale-110 transition-transform">
                  {todayAllLogs.filter(l => l.direction === 'entry').length}
                </span>
              </div>
              <div className="text-[10px] text-green-300/60">Bugün Toplam</div>
            </div>

            <div className="bg-red-900/30 border border-red-500/30 p-4 rounded-lg hover:scale-105 transition-transform cursor-pointer group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-red-300 flex items-center gap-1 font-bold">
                  <ArrowLeftCircle size={16} /> Çıkış
                </span>
                <span className="text-3xl font-bold text-red-400 group-hover:scale-110 transition-transform">
                  {todayAllLogs.filter(l => l.direction === 'exit').length}
                </span>
              </div>
              <div className="text-[10px] text-red-300/60">Bugün Toplam</div>
            </div>

            <div className="bg-orange-900/30 border border-orange-500/30 p-4 rounded-lg hover:scale-105 transition-transform cursor-pointer group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-orange-300 flex items-center gap-1 font-bold">
                  <Activity size={16} /> İçeride
                </span>
                <span className="text-3xl font-bold text-orange-400 group-hover:scale-110 transition-transform animate-pulse">{activeLogs.length}</span>
              </div>
              <div className="text-[10px] text-orange-300/60">Şu Anda Aktif</div>
            </div>

            <div className="bg-purple-900/30 border border-purple-500/30 p-4 rounded-lg hover:scale-105 transition-transform cursor-pointer group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-purple-300 flex items-center gap-1 font-bold">
                  <Timer size={16} /> Ort. Süre
                </span>
                <span className="text-2xl font-bold text-purple-400 group-hover:scale-110 transition-transform">
                  {todayDetailedStats.avgWaitMinutes > 0
                    ? `${Math.floor(todayDetailedStats.avgWaitMinutes / 60)}s ${todayDetailedStats.avgWaitMinutes % 60}dk`
                    : '-'
                  }
                </span>
              </div>
              <div className="text-[10px] text-purple-300/60">
                {todayDetailedStats.completedCount} tamamlanan ziyaret
              </div>
            </div>
          </div>

          {/* VARDİYA BAZLI GÖRSEL GRAFİK */}
          <div className="bg-slate-900/50 p-4 rounded-lg mb-4 border border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <CalendarClock className="text-blue-400" size={18} />
              <h3 className="text-sm font-bold text-blue-300">Vardiya Dağılımı (Girişler)</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(todayDetailedStats.shiftBreakdown).map(([shift, count]) => {
                const total = Object.values(todayDetailedStats.shiftBreakdown).reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                const isActiveShift = shift === currentShift;

                return (
                  <div key={shift} className={`p-3 rounded-lg transition-all ${isActiveShift ? 'bg-blue-600/30 border-2 border-blue-500 scale-105' : 'bg-slate-800 border border-slate-700'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-300">{shift.split(' ')[0]}</span>
                      {isActiveShift && <span className="bg-blue-500 text-white text-[9px] px-2 py-0.5 rounded font-bold animate-pulse">AKTİF</span>}
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">{count}</div>
                    <div className="w-full bg-slate-700 rounded-full h-2 mb-1">
                      <div className={`h-2 rounded-full transition-all duration-500 ${isActiveShift ? 'bg-blue-500' : 'bg-slate-500'}`} style={{ width: `${percentage}%` }}></div>
                    </div>
                    <div className="text-[10px] text-slate-400">{percentage}% / {shift.match(/\(([^)]+)\)/)[1]}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* KATEGORİ BAZLI İSTATİSTİKLER */}
          {Object.keys(todayDetailedStats.categoryBreakdown).length > 0 && (
            <div className="bg-slate-900/50 p-4 rounded-lg mb-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <PieChart className="text-green-400" size={18} />
                <h3 className="text-sm font-bold text-green-300">Kategori Dağılımı (Girişler)</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(todayDetailedStats.categoryBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, count]) => {
                    const total = Object.values(todayDetailedStats.categoryBreakdown).reduce((a, b) => a + b, 0);
                    const percentage = Math.round((count / total) * 100);

                    return (
                      <div key={category} className="bg-slate-800 p-2 rounded border border-slate-700 hover:border-slate-500 transition-colors group">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getCategoryStyle(category)}`}>
                            {category.replace(' Aracı', '').replace('Fabrika Personeli', 'Personel')}
                          </span>
                          <span className="text-lg font-bold text-white group-hover:scale-110 transition-transform">{count}</span>
                        </div>
                        <div className="text-[9px] text-slate-400">%{percentage}</div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* SON 1 SAAT İSTATİSTİĞİ - GELİŞTİRİLMİŞ */}
          {todayDetailedStats.recentCount > 0 && (
            <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border border-blue-500/50 p-4 rounded-lg mb-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="text-blue-400 animate-pulse" size={20} />
                  <span className="text-base font-bold text-blue-200">Son 1 Saatteki Hareketlilik</span>
                </div>
                <span className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full font-bold animate-pulse">
                  CANLI
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-900/30 p-3 rounded-lg border border-green-500/30">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowRightCircle className="text-green-400" size={16} />
                    <span className="text-xs text-green-300 font-bold">Giriş</span>
                  </div>
                  <div className="text-2xl font-bold text-green-400">{todayDetailedStats.recentEntries}</div>
                </div>
                <div className="bg-red-900/30 p-3 rounded-lg border border-red-500/30">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowLeftCircle className="text-red-400" size={16} />
                    <span className="text-xs text-red-300 font-bold">Çıkış</span>
                  </div>
                  <div className="text-2xl font-bold text-red-400">{todayDetailedStats.recentExits}</div>
                </div>
                <div className="bg-blue-900/30 p-3 rounded-lg border border-blue-500/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="text-blue-400" size={16} />
                    <span className="text-xs text-blue-300 font-bold">Toplam</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-400">{todayDetailedStats.recentCount}</div>
                </div>
              </div>
            </div>
          )}

          {/* FİLTRELEME VE AYARLAR */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4 pb-3 border-b border-slate-700">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => { setTodayPageFilter('all'); setTodayCurrentPage(1); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md ${todayPageFilter === 'all'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white scale-105'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
              >
                📊 Tümü ({todayAllLogs.length})
              </button>
              <button
                onClick={() => { setTodayPageFilter('entry'); setTodayCurrentPage(1); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1 ${todayPageFilter === 'entry'
                  ? 'bg-gradient-to-r from-green-600 to-green-500 text-white scale-105'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
              >
                <ArrowRightCircle size={14} /> Girişler ({todayAllLogs.filter(l => l.direction === 'entry').length})
              </button>
              <button
                onClick={() => { setTodayPageFilter('exit'); setTodayCurrentPage(1); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1 ${todayPageFilter === 'exit'
                  ? 'bg-gradient-to-r from-red-600 to-red-500 text-white scale-105'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
              >
                <ArrowLeftCircle size={14} /> Çıkışlar ({todayAllLogs.filter(l => l.direction === 'exit').length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={todayCategoryFilter}
                onChange={(e) => { setTodayCategoryFilter(e.target.value); setTodayCurrentPage(1); }}
                className="px-3 py-2 rounded-lg text-xs font-bold bg-slate-700 text-white border border-slate-600 outline-none hover:bg-slate-600 transition-all focus:ring-2 focus:ring-blue-500"
              >
                <option value="">🏷️ Tüm Kategoriler</option>
                {Object.entries(todayDetailedStats.categoryBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, count]) => (
                    <option key={cat} value={cat}>
                      {cat} ({count})
                    </option>
                  ))}
              </select>

              <select
                value={todayPageSize}
                onChange={(e) => {
                  const newSize = parseInt(e.target.value);
                  // todayPageSize state'i const olduğu için değiştiremedik, alternatif çözüm gerekiyor
                  // Şimdilik bu özelliği iptal ediyoruz
                }}
                className="px-3 py-2 rounded-lg text-xs font-bold bg-slate-700 text-white border border-slate-600 outline-none hover:bg-slate-600 transition-all"
                disabled
                title="Sayfa başına gösterim ayarı (15 kayıt sabit)"
              >
                <option value={15}>15 kayıt/sayfa</option>
              </select>
            </div>
          </div>

          {/* TABLO */}
          <div className="flex-1 overflow-auto rounded-lg border border-slate-700">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="bg-gradient-to-r from-slate-900 to-slate-800 text-slate-200 sticky top-0 shadow-lg">
                <tr>
                  <th className="p-3 font-bold">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-blue-400" />
                      Saat
                    </div>
                  </th>
                  <th className="p-3 font-bold">
                    <div className="flex items-center gap-2">
                      <Activity size={14} className="text-orange-400" />
                      Durum
                    </div>
                  </th>
                  <th className="p-3 font-bold">
                    <div className="flex items-center gap-2">
                      <Layers size={14} className="text-purple-400" />
                      Kategori
                    </div>
                  </th>
                  <th className="p-3 font-bold">
                    <div className="flex items-center gap-2">
                      <Car size={14} className="text-green-400" />
                      Plaka / İsim
                    </div>
                  </th>
                  <th className="p-3 text-right font-bold">
                    <div className="flex items-center justify-end gap-2">
                      <Zap size={14} className="text-yellow-400" />
                      Hızlı İşlem
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {(() => {
                  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

                  let filtered = todayAllLogs.filter(log => {
                    // Arama filtresi
                    if (debouncedActiveSearchTerm) {
                      const term = debouncedActiveSearchTerm.toLowerCase();
                      const matches = (log.plate && log.plate.toLowerCase().includes(term)) ||
                        (log.name && log.name.toLowerCase().includes(term)) ||
                        (log.driver && log.driver.toLowerCase().includes(term));
                      if (!matches) return false;
                    }

                    // Durum filtresi
                    if (todayPageFilter !== 'all' && log.direction !== todayPageFilter) return false;

                    // Kategori filtresi
                    if (todayCategoryFilter && log.sub_category !== todayCategoryFilter) return false;

                    return true;
                  });

                  // Sayfalama
                  const startIndex = (todayCurrentPage - 1) * todayPageSize;
                  const endIndex = startIndex + todayPageSize;
                  const paginatedLogs = filtered.slice(startIndex, endIndex);
                  const totalPages = Math.ceil(filtered.length / todayPageSize);

                  return (
                    <>
                      {paginatedLogs.map(log => {
                        const isEntry = log.direction === 'entry';
                        const isCurrentlyInside = isEntry && !log.hasExited && activeLogs.some(a => (log.plate && a.plate === log.plate) || (log.name && a.name === log.name));
                        const hasExited = isEntry && log.hasExited;
                        const identifier = log.plate || log.name;
                        const isAlreadyInside = activeLogs.some(a => (log.plate && a.plate === log.plate) || (log.name && a.name === log.name));
                        const isRecent = new Date(log.time) >= oneHourAgo;

                        return (
                          <tr
                            key={`${log.id}-${log.direction}`}
                            className={`hover:bg-slate-700/50 transition-all ${isEntry ? 'bg-green-900/5' : 'bg-red-900/5'} ${isRecent ? 'border-l-4 border-l-blue-500 bg-blue-900/10 animate-in fade-in slide-in-from-left-2' : ''}`}
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-bold">
                                  {new Date(log.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isRecent && (
                                  <span className="bg-blue-500 text-white px-2 py-0.5 rounded text-[9px] font-bold animate-pulse shadow-lg">
                                    SON 1 SAAT
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              {isEntry ? (
                                <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 w-fit">
                                  <ArrowRightCircle size={12} /> GİRİŞ
                                </span>
                              ) : (
                                <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 w-fit">
                                  <ArrowLeftCircle size={12} /> ÇIKIŞ
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase ${getCategoryStyle(log.sub_category)}`}>
                                {getShortCategory(log.sub_category)}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-white">
                              <div>{identifier}</div>
                              {log.driver && <div className="text-xs text-slate-400 font-normal">{log.driver}</div>}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex justify-end gap-1">
                                {isEntry && isCurrentlyInside && (
                                  <button
                                    onClick={() => handleQuickExit(log)}
                                    disabled={actionLoading === log.id}
                                    className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-50"
                                    title="Çıkış Yap"
                                  >
                                    {actionLoading === log.id ? <RefreshCw size={12} className="animate-spin" /> : <LogOut size={12} />}
                                    Çıkış Yap
                                  </button>
                                )}
                                {isEntry && hasExited && !isAlreadyInside && (
                                  <button
                                    onClick={() => handleReEntry(log)}
                                    disabled={actionLoading === log.id || loading}
                                    className="px-3 py-1.5 rounded bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-50"
                                    title="Tekrar Giriş Yap"
                                  >
                                    {actionLoading === log.id ? <RefreshCw size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                                    Tekrar Giriş
                                  </button>
                                )}
                                {!isEntry && !isAlreadyInside && (
                                  <button
                                    onClick={() => handleReEntry(log)}
                                    disabled={actionLoading === log.id || loading}
                                    className="px-3 py-1.5 rounded bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-50"
                                    title="Tekrar Giriş Yap"
                                  >
                                    {actionLoading === log.id ? <RefreshCw size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                                    Tekrar Giriş
                                  </button>
                                )}
                                {!isEntry && isAlreadyInside && (
                                  <span className="text-xs text-green-400 italic flex items-center h-full px-2">
                                    Zaten içeride
                                  </span>
                                )}

                                {/* DÜZENLE BUTONU */}
                                <button
                                  onClick={() => {
                                    setEditingLog(log);
                                    setEditForm(log);
                                  }}
                                  className="px-2 py-1.5 rounded bg-blue-900/50 hover:bg-blue-600 text-blue-400 hover:text-white transition-all"
                                  title="Kaydı Düzenle"
                                >
                                  <Edit size={14} />
                                </button>

                                {/* SİL BUTONU */}
                                <button
                                  onClick={() => handleDelete(log.id)}
                                  className="px-2 py-1.5 rounded bg-slate-800 hover:bg-red-900 text-red-500 hover:text-red-300 transition-colors"
                                  title="Kaydı Sil"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-10 text-center text-slate-500 italic">
                            {debouncedActiveSearchTerm || todayPageFilter !== 'all' || todayCategoryFilter
                              ? 'Filtreye uygun kayıt bulunamadı.'
                              : 'Bugün henüz kayıt bulunmuyor.'
                            }
                          </td>
                        </tr>
                      )}
                      {/* SAYFALAMA - GELİŞTİRİLMİŞ */}
                      {totalPages > 1 && (
                        <tr>
                          <td colSpan={5} className="p-0">
                            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 border-t border-slate-700">
                              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                                    📄 {filtered.length} kayıttan <span className="font-bold text-blue-400">{startIndex + 1}-{Math.min(endIndex, filtered.length)}</span> arası
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setTodayCurrentPage(1)}
                                    disabled={todayCurrentPage === 1}
                                    className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    title="İlk Sayfa"
                                  >
                                    ⏮️
                                  </button>
                                  <button
                                    onClick={() => setTodayCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={todayCurrentPage === 1}
                                    className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                                  >
                                    ← Önceki
                                  </button>

                                  <div className="flex items-center gap-1">
                                    {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                                      let pageNum;
                                      if (totalPages <= 5) {
                                        pageNum = idx + 1;
                                      } else if (todayCurrentPage <= 3) {
                                        pageNum = idx + 1;
                                      } else if (todayCurrentPage >= totalPages - 2) {
                                        pageNum = totalPages - 4 + idx;
                                      } else {
                                        pageNum = todayCurrentPage - 2 + idx;
                                      }

                                      return (
                                        <button
                                          key={pageNum}
                                          onClick={() => setTodayCurrentPage(pageNum)}
                                          className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${todayCurrentPage === pageNum
                                            ? 'bg-blue-600 text-white scale-110 shadow-lg'
                                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                            }`}
                                        >
                                          {pageNum}
                                        </button>
                                      );
                                    })}
                                    {totalPages > 5 && todayCurrentPage < totalPages - 2 && (
                                      <>
                                        <span className="text-slate-500 px-2">...</span>
                                        <button
                                          onClick={() => setTodayCurrentPage(totalPages)}
                                          className="px-3 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-xs font-bold transition-all"
                                        >
                                          {totalPages}
                                        </button>
                                      </>
                                    )}
                                  </div>

                                  <button
                                    onClick={() => setTodayCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={todayCurrentPage === totalPages}
                                    className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                                  >
                                    Sonraki →
                                  </button>
                                  <button
                                    onClick={() => setTodayCurrentPage(totalPages)}
                                    disabled={todayCurrentPage === totalPages}
                                    className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    title="Son Sayfa"
                                  >
                                    ⏭️
                                  </button>
                                </div>

                                <div className="text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                                  Sayfa <span className="font-bold text-blue-400">{todayCurrentPage}</span> / {totalPages}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </section>

        {/* ALT: RAPOR */}
        <section className="lg:col-span-12 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg mt-2">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"><h2 className="text-lg font-bold flex items-center gap-2"><FileText className="text-blue-400" /> Kayıt Geçmişi & Rapor</h2><button onClick={exportToExcel} className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 shadow-lg transition-all">Excel <CheckCircle size={14} /></button></div>
            <div className="flex flex-wrap gap-3 p-3 bg-slate-900 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2"><Filter size={16} className="text-slate-400" /><span className="text-xs text-slate-400 font-bold">FİLTRELE:</span></div>
              <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-2.5 text-slate-500" size={16} /><input type="text" placeholder="Plaka, İsim, TC, Telefon, Sürücü ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-blue-500" /></div>
              <div className="flex items-center gap-2"><Calendar size={16} className="text-slate-400" /><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white outline-none focus:border-blue-500" /><span className="text-slate-500">-</span><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white outline-none focus:border-blue-500" /></div>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white outline-none focus:border-blue-500 min-w-[150px]">{CATEGORIES.map(cat => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}</select>
              {(searchTerm || dateFrom || dateTo || categoryFilter) && (<button onClick={() => { setSearchTerm(''); setDateFrom(''); setDateTo(''); setCategoryFilter(''); }} className="bg-red-900/50 text-red-300 px-3 py-2 rounded text-sm hover:bg-red-900 transition flex items-center gap-1"><X size={14} /> Temizle</button>)}
              <span className="text-xs text-slate-500 self-center ml-auto">{filteredLogs.length} kayıt</span>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-left text-sm text-slate-400" id="raporTablosu">
              <thead className="bg-slate-900 text-slate-200 sticky top-0 z-10"><tr><th className="p-3">Tarih</th><th className="p-3">Vardiya</th><th className="p-3">Kategori</th><th className="p-3">Plaka / İsim</th><th className="p-3">Sürücü</th><th className="p-3">İlgili / Lokasyon</th><th className="p-3">Not</th><th className="p-3">Giriş</th><th className="p-3">Çıkış</th><th className="p-3">Durum</th><th className="p-3 text-right">İşlem</th></tr></thead>
              <tbody className="divide-y divide-slate-700">
                {filteredLogs.map(log => {
                  const isInside = !log.exit_at;
                  const identifier = log.plate || log.name;
                  const isAlreadyInside = activeLogs.some(a => (log.plate && a.plate === log.plate) || (log.name && a.name === log.name));

                  return (
                    <tr key={log.id} className={`hover:bg-slate-700/30 ${isInside ? 'bg-green-900/10' : ''}`}>
                      <td className="p-3 text-xs">{new Date(log.created_at).toLocaleDateString('tr-TR')}</td>
                      <td className="p-3 text-xs font-mono text-orange-300">{log.shift?.split(' ')[0]}</td>
                      <td className="p-3 text-xs"><span className={`px-2 py-1 rounded text-[10px] font-bold ${getCategoryStyle(log.sub_category)}`}>{log.sub_category?.replace(' Aracı', '')}</span></td>
                      <td className="p-3 font-bold text-white">{identifier}</td>
                      <td className="p-3 text-xs text-slate-300">{log.driver || '-'}</td>
                      <td className="p-3 text-xs"><div>{log.host}</div>{log.location && <div className="text-blue-400">📍 {log.location}</div>}</td>
                      <td className="p-3 text-xs text-slate-400 max-w-[150px] truncate" title={log.note}>{log.note || '-'}</td>
                      <td className="p-3 font-mono text-xs text-green-400">{new Date(log.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="p-3 font-mono text-xs text-red-400">{log.exit_at ? new Date(log.exit_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td className="p-3">{isInside ? <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold animate-pulse">İÇERİDE</span> : <span className="bg-slate-500/20 text-slate-400 px-2 py-1 rounded text-xs">ÇIKTI</span>}</td>
                      <td className="p-3 text-right">
                        <div className="flex gap-1 justify-end">
                          {isInside && (<button onClick={() => handleQuickExit(log)} disabled={actionLoading === log.id} className="text-red-400 hover:text-white p-2 bg-red-900/50 rounded hover:bg-red-600 transition text-xs font-bold flex items-center gap-1" title="Çıkış Yap"><LogOut size={14} /></button>)}
                          {!isInside && !isAlreadyInside && (<button onClick={() => handleReEntry(log)} disabled={actionLoading === log.id || loading} className="text-green-400 hover:text-white p-2 bg-green-900/50 rounded hover:bg-green-600 transition text-xs font-bold flex items-center gap-1" title="Tekrar Giriş Yap"><RotateCcw size={14} /></button>)}
                          <button onClick={() => { setEditingLog(log); setEditForm(log); }} className="text-blue-400 hover:text-blue-300 p-2 bg-slate-900 rounded hover:bg-slate-700 transition"><Edit size={14} /></button>
                          <button onClick={() => handleDelete(log.id)} className="text-red-400 hover:text-red-300 p-2 bg-slate-900 rounded hover:bg-red-900/50 transition"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* MODALS */}
      <Toast notification={notification} onClose={closeToast} />
      <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} type={confirmModal.type} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} />

      {exitSealModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-800 p-6 rounded-xl w-full max-w-sm border border-red-500 shadow-2xl relative animate-in fade-in zoom-in">
            <h3 className="text-xl font-bold text-white mb-4 flex gap-2 items-center"><Lock className="text-red-500" /> Araç Çıkış Mühürü</h3>
            <p className="text-slate-300 text-sm mb-2">Lütfen çıkış yapan mühürlü araç için <strong className="text-red-400">ÇIKIŞ MÜHÜR</strong> numarasını giriniz.</p>
            {exitingLogData?.seal_number_entry && (<div className="bg-green-900/30 border border-green-500/50 p-2 rounded mb-4"><p className="text-green-300 text-sm">🔒 Giriş Mührü: <strong className="text-white">{exitingLogData.seal_number_entry}</strong></p></div>)}
            <input type="text" autoFocus placeholder="Çıkış Mühür No Giriniz..." value={exitSealNumber} onChange={(e) => setExitSealNumber(e.target.value)} className="w-full bg-slate-900 border border-red-500/50 rounded p-3 text-white outline-none focus:border-red-500 transition-colors mb-4 font-bold text-lg" />
            <div className="flex gap-3">
              <button onClick={() => { setExitSealModalOpen(false); setExitingLogData(null); }} className="flex-1 bg-slate-700 text-white py-3 rounded font-bold hover:bg-slate-600">İptal</button>
              <button onClick={confirmSealedExit} disabled={actionLoading} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded font-bold shadow-lg disabled:opacity-50">{actionLoading ? 'İŞLENİYOR...' : 'Çıkışı Onayla'}</button>
            </div>
          </div>
        </div>
      )}

      {editingLog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-800 p-6 rounded-xl w-full max-w-lg border border-slate-600 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setEditingLog(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X /></button>
            <h3 className="text-xl font-bold text-white mb-6 flex gap-2 border-b border-slate-700 pb-2"><Edit className="text-blue-500" /> Kaydı Düzenle</h3>
            <div className="mb-4"><label className={labelClass}>DURUM</label><div className="flex bg-slate-900 rounded p-1"><button onClick={() => setEditForm({ ...editForm, exit_at: null })} className={`flex-1 py-3 rounded font-bold text-sm transition-all ${!editForm.exit_at ? 'bg-green-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>İÇERİDE</button><button onClick={() => setEditForm({ ...editForm, exit_at: editForm.exit_at || new Date().toISOString() })} className={`flex-1 py-3 rounded font-bold text-sm transition-all ${editForm.exit_at ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>DIŞARIDA</button></div></div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="col-span-2 bg-slate-900/50 p-3 rounded border border-slate-700 mb-2"><div className="text-xs font-bold text-orange-400 mb-2 flex items-center gap-1"><CalendarClock size={14} /> ZAMAN DÜZENLEME</div><div className="grid grid-cols-2 gap-4"><div><label className={labelClass}>GİRİŞ SAATİ</label><input type="datetime-local" value={formatForInput(editForm.created_at)} onChange={(e) => setEditForm({ ...editForm, created_at: new Date(e.target.value).toISOString() })} className={`${inputClass} text-xs`} /></div><div><label className={labelClass}>ÇIKIŞ SAATİ</label><input type="datetime-local" disabled={!editForm.exit_at} value={formatForInput(editForm.exit_at)} onChange={(e) => setEditForm({ ...editForm, exit_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className={`${inputClass} text-xs ${!editForm.exit_at ? 'opacity-50 cursor-not-allowed' : ''}`} /></div></div></div>
              <div className="col-span-2"><label className={labelClass}>VARDİYA</label><select value={editForm.shift || ''} onChange={e => setEditForm({ ...editForm, shift: e.target.value })} className={inputClass}><option value="Vardiya 1 (08:00-16:00)">Vardiya 1 (08:00-16:00)</option><option value="Vardiya 2 (16:00-00:00)">Vardiya 2 (16:00-00:00)</option><option value="Vardiya 3 (00:00-08:00)">Vardiya 3 (00:00-08:00)</option></select></div>
              <div><label className={labelClass}>PLAKA / İSİM</label><input type="text" value={editForm.plate || editForm.name || ''} onChange={e => editForm.type === 'vehicle' ? setEditForm({ ...editForm, plate: e.target.value }) : setEditForm({ ...editForm, name: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>SÜRÜCÜ</label><input type="text" value={editForm.driver || ''} onChange={e => setEditForm({ ...editForm, driver: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>İLGİLİ BİRİM</label><input type="text" value={editForm.host || ''} onChange={e => setEditForm({ ...editForm, host: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>LOKASYON</label><input type="text" value={editForm.location || ''} onChange={e => setEditForm({ ...editForm, location: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>TC KİMLİK</label><input type="text" value={editForm.tc_no || ''} onChange={e => setEditForm({ ...editForm, tc_no: e.target.value.replace(/\D/g, '').slice(0, 11) })} className={inputClass} maxLength={11} /></div>
              <div><label className={labelClass}>TELEFON</label><input type="text" value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: formatPhone(e.target.value) })} className={inputClass} maxLength={14} /></div>
              {editForm.sub_category?.includes('Mühür') && (<><div><label className={labelClass}>GİRİŞ MÜHRÜ</label><input type="text" value={editForm.seal_number_entry || ''} onChange={e => setEditForm({ ...editForm, seal_number_entry: e.target.value })} className={`${inputClass} border-green-500/50`} /></div><div><label className={labelClass}>ÇIKIŞ MÜHRÜ</label><input type="text" value={editForm.seal_number_exit || ''} onChange={e => setEditForm({ ...editForm, seal_number_exit: e.target.value })} className={`${inputClass} border-red-500/50`} /></div></>)}
              <div className="col-span-2"><label className={labelClass}>AÇIKLAMA</label><textarea value={editForm.note || ''} onChange={e => setEditForm({ ...editForm, note: e.target.value })} className={`${inputClass} h-24 resize-none`} style={{ backgroundColor: '#0f172a', color: 'white' }}></textarea></div>
            </div>
            <div className="flex gap-3"><button onClick={() => handleDelete(editingLog.id)} className="bg-red-600 hover:bg-red-500 text-white py-3 px-4 rounded font-bold flex items-center gap-2"><Trash2 size={16} /> Sil</button><button onClick={() => setEditingLog(null)} className="flex-1 bg-slate-700 text-white py-3 rounded font-bold hover:bg-slate-600">İptal</button><button onClick={handleUpdate} disabled={actionLoading === editingLog?.id} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded font-bold shadow-lg disabled:opacity-50">{actionLoading === editingLog?.id ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
