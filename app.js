
/* =========================================================
 * app.js — Inventory (GAS backend)
 * =======================================================*/
(function () {
  "use strict";
// --- LOGIKA ABC ANALYSIS (PARETO) ---
window.__FREQ_MAP = {}; 

function calculateABC() {
  const freq = {};
  const now = new Date();
  
  // 1. Hitung frekuensi pergerakan keluar (OUT) dalam 30 hari terakhir
  _HISTORY_CACHE.forEach(h => {
    if (h.type === 'OUT') {
      const d = new Date(String(h.date).replace(' ', 'T'));
      if (!isNaN(d) && (now - d) / (1000*60*60*24) <= 30) {
        freq[h.code] = (freq[h.code] || 0) + 1; // Kita hitung frekuensi transaksi, bukan qty
      }
    }
  });

  // 2. Sortir barang dari yang paling sering keluar
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const totalItems = sorted.length;
  
  window.__FREQ_MAP = {};
  sorted.forEach(([code, count], index) => {
    const percentile = (index + 1) / totalItems;
    
    if (percentile <= 0.2) window.__FREQ_MAP[code] = { cls: 'A', color: 'bg-danger' }; // Top 20%
    else if (percentile <= 0.5) window.__FREQ_MAP[code] = { cls: 'B', color: 'bg-warning text-dark' }; // Next 30%
    else window.__FREQ_MAP[code] = { cls: 'C', color: 'bg-info text-white' }; // Bottom 50%
  });
}

// Helper untuk mengambil badge ABC
window.__getABC = (code) => {
  return window.__FREQ_MAP[code] || { cls: '', color: '' };
};
  // Helpers
  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const fmt = (n) => new Intl.NumberFormat("ja-JP").format(Number(n || 0));
  const isMobile = () => /Android|iPhone|iPad/i.test(navigator.userAgent);
  // GANTI fungsi toast(msg) { alert(msg); } dengan ini:
// --- GANTI function toast() YANG LAMA DENGAN INI ---
function toast(msg, type = 'dark') {
  const area = document.getElementById('toast-area');
  if (!area) return alert(msg); // Fallback jika elemen HTML belum siap

  const el = document.createElement('div');
  el.className = `toast-mini text-bg-${type} fade show`; 
  el.innerHTML = `
    <div class="d-flex">
      <div class="toast-body px-3 py-2">${escapeHtml(msg)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.parentElement.parentElement.remove()"></button>
    </div>`;
  
  area.appendChild(el);
  
  // Hapus otomatis setelah 3 detik
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 3000);
}
// =========================================================
// FITUR UX BARU: CUSTOM DIALOG (Pengganti alert/confirm/prompt bawaan browser)
// =========================================================
function showCustomDialog({ title, message, type = 'confirm', inputPlaceholder = '', confirmText = 'OK', cancelText = 'キャンセル (Batal)' }) {
  return new Promise((resolve) => {
    // Buat elemen pembungkus
    const wrap = document.createElement('div');
    wrap.className = 'modal fade';
    wrap.setAttribute('data-bs-backdrop', 'static');
    wrap.setAttribute('tabindex', '-1');
    
    // Tentukan warna ikon dan tombol berdasarkan tipe
    let icon = type === 'prompt' ? '<i class="bi bi-keyboard text-primary fs-3"></i>' : '<i class="bi bi-question-circle text-warning fs-3"></i>';
    let btnClass = type === 'delete' ? 'btn-danger' : 'btn-primary';

    wrap.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content border-0 shadow-lg" style="border-radius: 16px; overflow: hidden;">
          <div class="modal-body p-4 text-center">
            <div class="mb-3">${icon}</div>
            <h6 class="fw-bold mb-2">${escapeHtml(title)}</h6>
            <p class="text-muted small mb-4">${escapeHtml(message)}</p>
            ${type === 'prompt' ? `<input type="text" id="custom-dialog-input" class="form-control text-center mb-3" placeholder="${inputPlaceholder}" autocomplete="off">` : ''}
            <div class="d-flex gap-2 justify-content-center">
              <button id="btn-dialog-cancel" class="btn btn-light w-50" style="border-radius: 10px;">${cancelText}</button>
              <button id="btn-dialog-confirm" class="btn ${btnClass} w-50" style="border-radius: 10px;">${confirmText}</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(wrap);
    const modal = new bootstrap.Modal(wrap);
    modal.show();

    // Fokus ke input jika ini adalah prompt
    if (type === 'prompt') {
      wrap.addEventListener('shown.bs.modal', () => {
        document.getElementById('custom-dialog-input').focus();
      });
    }

    // Handler Tombol
    const cleanUp = () => {
      modal.hide();
      wrap.addEventListener('hidden.bs.modal', () => wrap.remove(), { once: true });
    };

    document.getElementById('btn-dialog-cancel').onclick = () => {
      cleanUp();
      resolve(null); // Return null jika batal
    };

    document.getElementById('btn-dialog-confirm').onclick = () => {
      let result = true;
      if (type === 'prompt') {
        const inputVal = document.getElementById('custom-dialog-input').value.trim();
        if (!inputVal) {
           document.getElementById('custom-dialog-input').classList.add('is-invalid');
           return; // Jangan tutup jika kosong
        }
        result = inputVal;
      }
      cleanUp();
      resolve(result); // Return hasil input atau true
    };
  });
}

function playBeep() {
  try {
    // 1. Efek Getar (Haptic) - Khusus HP Android
    if (navigator.vibrate) navigator.vibrate(200);

    // 2. Efek Suara (Audio API)
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine"; // Jenis suara (sine wave = 'tit')
      osc.frequency.value = 1200; // Nada tinggi (1200Hz)
      
      // Volume kecil saja biar tidak kaget
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.15); // Bunyi selama 0.15 detik
    }
  } catch (e) {
    // Abaikan jika browser tidak support audio (misal iOS mode silent)
    console.warn("Audio feedback error", e);
  }
}
 // --- HELPER HAPTIC PATTERN ---
function feedbackSuccess() {
  // Suara: Tinggi pendek
  playBeep(); 
  // Getar: Pendek tajam (Tik!)
  if (navigator.vibrate) navigator.vibrate(50);
}

function feedbackError() {
  // Suara: Rendah panjang (Buzz...)
  // (Anda bisa tambah logika audio freq rendah di playBeep jika mau)
  
  // Getar: Panjang ganda (Brrr... Brrr...) -> Tanda Bahaya!
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}
  
  // --- TEXT TO SPEECH (BAHASA JEPANG) ---
function speakJP(text) {
  // Cek apakah browser mendukung suara
  if (!window.speechSynthesis) return;

  // Hentikan antrian suara sebelumnya (biar tidak tumpang tindih saat scan cepat)
  window.speechSynthesis.cancel();

  const msg = new SpeechSynthesisUtterance(String(text));
  msg.lang = "ja-JP";  // KUNCI: Set ke Bahasa Jepang
  msg.volume = 1.0;    // Volume maksimal
  msg.rate = 1.2;      // Kecepatan bicara (1.0 normal, 1.2 agak cepat biar efisien)
  msg.pitch = 1.0;     // Nada normal

  window.speechSynthesis.speak(msg);
}
  function ensure(x, msg) { if (!x) throw new Error(msg || "Assertion failed"); return x; }

  // Escape
  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[m]));
  }
  function escapeAttr(s){ return escapeHtml(s); }

  // CSV helper: paksa Excel baca UTF-8 + JP header OK
  function downloadCSV_JP(filename, csv){
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    // bebaskan memori
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  // File helpers
  function sanitizeFilename(name){ return String(name || "").replace(/[\\/:*?"<>|]/g, "_"); }
  function normalizeCodeDash(s){ return String(s || "").replace(/[\u2212\u2010-\u2015\uFF0D]/g, "-").trim(); }
  function safeId(s){ return String(s||"").replace(/[^a-zA-Z0-9_-]/g, "_"); }

  // Global caches
 
let _ITEMS_CACHE   = [];
  let _LAST_SYNC_TIME = null;
let _HISTORY_CACHE = [];      // cache semua history dari API
let _HISTORY_FILTER = "all";  // all / today / week / month

  async function fetchItemsDelta(silent = false) {
  try {
    // Kirim waktu terakhir sync ke server (Gunakan POST agar bisa kirim body)
    const res = await api("items", { method: "POST", body: { lastSync: _LAST_SYNC_TIME }, silent: silent });
    
    if (res && res.data) {
      if (!_LAST_SYNC_TIME || _ITEMS_CACHE.length === 0) {
        // Jika ini pertama kali buka aplikasi, timpa semua data
        _ITEMS_CACHE = res.data;
   } else if (res.data.length > 0) {
        res.data.forEach(newItem => {
          const idx = _ITEMS_CACHE.findIndex(x => String(x.code) === String(newItem.code));
          
          if (newItem.deleted) {
             // Jika statusnya '無効', hapus dari layar HP!
             if (idx >= 0) _ITEMS_CACHE.splice(idx, 1);
          } else {
             if (idx >= 0) _ITEMS_CACHE[idx] = newItem;
             else _ITEMS_CACHE.push(newItem);
          }
        });
        console.log(`[Delta Sync] Berhasil memperbarui data.`);
      }
      
      // Simpan waktu server terbaru untuk request berikutnya
      if (res.syncTime) _LAST_SYNC_TIME = res.syncTime;
    }
  } catch (e) {
    console.warn("Delta Sync Error:", e);
  }
}

function setLoading(show, text) {
    const el = document.getElementById("global-loading"); 
    if (!el) return;
    
    if (show) { 
      el.classList.remove("d-none"); 
      // KAIZEN FIX: Cek apakah loading-text ada sebelum diubah agar tidak error
      const textEl = document.getElementById("loading-text");
      if (textEl) textEl.textContent = text || "読み込み中…"; 
    } else {
      el.classList.add("d-none");
    }
  }

 /* === API helper (timeout + retry + pesan error jelas) === */
 async function api(action, opts = {}) {
   // timeout & retry agak longgar di jaringan seluler
   const { method = 'GET', body = null, silent = false, timeout = 20000, retry = 2 } = opts;
  if (!window.CONFIG || !CONFIG.BASE_URL) throw new Error('config.js BASE_URL belum di-set');

  const apikey = encodeURIComponent(CONFIG.API_KEY || '');
  const url = `${CONFIG.BASE_URL}?action=${encodeURIComponent(action)}&apikey=${apikey}&_=${Date.now()}`;
  if (!silent) setLoading(true);

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort('timeout'), timeout);

  try {
   // --- KODE BARU: Menyisipkan Token Auth ---
    const currentUser = getCurrentUser();
    const authPayload = currentUser ? { _auth: { id: currentUser.id, role: currentUser.role, token: currentUser.token } } : {};

    const init = (method === 'GET')
      ? { mode: 'cors', cache: 'no-cache', signal: ctrl.signal, headers: { 'Accept': 'application/json' } }
      : {
          method: 'POST', mode: 'cors', signal: ctrl.signal,
                 // Pakai text/plain supaya tidak preflight (OPTIONS) → menghindari "Failed to fetch" di HP
         headers: { 'Content-Type': 'text/plain;charset=utf-8', 'Accept': 'application/json' },
         // Menambahkan authPayload ke dalam body request
         body: JSON.stringify({ ...(body || {}), ...authPayload, apikey: CONFIG.API_KEY })
        };

    const res = await fetch(url, init);
    const ctype = res.headers.get('content-type') || '';

    // jika status bukan 2xx → lempar error dengan detail
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`[${res.status}] ${res.statusText}${txt ? ' — ' + txt.slice(0, 160) : ''}`);
    }

    // parse aman
    if (ctype.includes('application/json')) {
      return await res.json();
    } else {
      const txt = await res.text();
      // Apps Script kadang kirim 'OK' sederhana → kembalikan bentuk seragam
      if (txt.trim().toUpperCase() === 'OK') return { ok: true };
      throw new Error(`Unexpected response (non‑JSON): ${txt.slice(0, 160)}`);
    }
  } catch (e) {
    const offline   = !navigator.onLine;
   const looksLikeCors = /Failed to fetch|NetworkError|TypeError/i.test(String(e && (e.message || e)));
    const isTimeout = e?.name === 'AbortError' || e === 'timeout' || /time(out)?/i.test(e?.message||'');
    const pretty = offline
      ? 'オフラインです。通信状況をご確認ください。'
    : (isTimeout ? 'タイムアウトしました。電波を確認してください。'
                  : (looksLikeCors ? '通信に失敗しました（ネットワーク／CORS）。電波やWi‑Fiを確認の上、再実行してください。'
                                   : (e?.message || 'Failed to fetch')));

    if (retry > 0) {
      await new Promise(r => setTimeout(r, 800));
      return api(action, { ...opts, retry: retry - 1 });
    }
    throw new Error(pretty);
  } finally {
    clearTimeout(t);
    if (!silent) setLoading(false);
  }
}


  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      if ([...document.scripts].some(s => s.src === src || s.src.endsWith(src))) return resolve();
      const s = document.createElement("script");
      s.src = src; s.async = true; s.crossOrigin = "anonymous";
      s.onload = () => resolve(); s.onerror = () => reject(new Error("Gagal memuat: " + src));
      document.head.appendChild(s);
    });
  }

  async function ensureQRCode() {
    if (window.QRCode) return;
    const locals = ["./qrlib.js", "./qrcode.min.js", "./vendor/qrcode.min.js"];
    for (const p of locals) { try { await loadScriptOnce(p); if (window.QRCode) return; } catch (e) {} }
    const cdns = [
      "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js",
      "https://unpkg.com/qrcodejs@1.0.0/qrcode.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"
    ];
    for (const u of cdns) { try { await loadScriptOnce(u); if (window.QRCode) return; } catch (e) {} }
    throw new Error("QRCode library tidak tersedia (qrlib.js)");
  }

  async function ensureHtml5Qrcode() {
    if (window.Html5Qrcode) return;
    const locals = ["./html5-qrcode.min.js", "./vendor/html5-qrcode.min.js"];
    for (const p of locals) { try { await loadScriptOnce(p); if (window.Html5Qrcode) return; } catch (e) {} }
    const cdns = [
      "https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/minified/html5-qrcode.min.js",
      "https://unpkg.com/html5-qrcode@2.3.8/minified/html5-qrcode.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/minified/html5-qrcode.min.js"
    ];
    for (const u of cdns) { try { await loadScriptOnce(u); if (window.Html5Qrcode) return; } catch (e) {} }
    throw new Error("html5-qrcode tidak tersedia");
  }

  function getCurrentUser() { try { return JSON.parse(localStorage.getItem("currentUser") || "null"); } catch (e) { return null; } }
  function setCurrentUser(u) { localStorage.setItem("currentUser", JSON.stringify(u || null)); }
  function logout() { setCurrentUser(null); location.href = "index.html"; }
  function isAdmin() { return (getCurrentUser()?.role || "user").toLowerCase() === "admin"; }

  // --- User hydrator & sync ---
  function readCookie(name){
    const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g,'\\$1') + '=([^;]*)'));
    try { return m ? decodeURIComponent(m[1]) : null; } catch (e) { return null; }
  }
  function hydrateCurrentUser(){
    const keys = ["currentUser","authUser","user","loggedInUser","me"];
    for (const k of keys){
      const v = localStorage.getItem(k);
      if (v){ try { const o = JSON.parse(v); if (o && o.id){ setCurrentUser(o); return o; } } catch (e) {} }
    }
    for (const k of keys){
      const v = sessionStorage.getItem(k);
      if (v){ try { const o = JSON.parse(v); if (o && o.id){ setCurrentUser(o); return o; } } catch (e) {} }
    }
    const ck = readCookie("currentUser");
    if (ck){ try { const o = JSON.parse(ck); if (o && o.id){ setCurrentUser(o); return o; } } catch (e) {} }
    if (window.CURRENT_USER && window.CURRENT_USER.id){ setCurrentUser(window.CURRENT_USER); return window.CURRENT_USER; }
    if (window.CONFIG && CONFIG.DEFAULT_USER && CONFIG.DEFAULT_USER.id){
      setCurrentUser(CONFIG.DEFAULT_USER);
      return CONFIG.DEFAULT_USER;
    }
    return null;
  }
  window.addEventListener("storage", (e) => {
    if (e.key === "currentUser") { updateWelcomeBanner(); }
  });

  // === PATCH: print semua label (A4 panjang, 1 label per "halaman") ===
  function bindPrintAllLabels(){
    const btn =
      document.getElementById('btn-items-print-all') ||
      document.getElementById('btn-print-all-labels') ||
      document.querySelector('[data-action="print-all-labels"]') ||
      Array.from(document.querySelectorAll('#view-items .items-toolbar button, #view-items .items-toolbar .btn'))
           .find(b => /全件ラベルを印刷/.test((b.textContent||'').trim()));
    if (!btn) return;

   btn.addEventListener('click', async ()=>{
      try{
        btn.disabled = true;
        const orig = btn.textContent;
        btn.textContent = '生成中...';

        if (!_ITEMS_CACHE.length) {
          const listAll = await api('items', { method:'GET' });
          _ITEMS_CACHE = Array.isArray(listAll) ? listAll : (listAll?.data || []);
        }

        const w = window.open('', '_blank', 'width=1024,height=700');
        if (!w) { alert('ポップアップがブロックされました。'); btn.disabled=false; btn.textContent=orig; return; }

        w.document.write('<meta charset="utf-8">');
        w.document.write('<title>全件ラベル</title>');
        w.document.write('<style>body{font-family:sans-serif;padding:8mm;} img{width:100%;max-width:100%;display:block;margin:6mm auto;} @media print{img{page-break-inside:avoid;}}</style>');
        w.document.write('<h3>全件ラベル</h3>');

        for (let i = 0; i < _ITEMS_CACHE.length; i++) {
          const it = _ITEMS_CACHE[i];
          const url = await makeItemLabelDataURL(it);
          w.document.write(`<img src="${url}" alt="${(it.code||'')}" />`);
          if (i % 20 === 0) { // kecilkan tekanan main thread
            await new Promise(r => requestAnimationFrame(r));
          }
        }
        w.document.close();
        w.focus();
        setTimeout(()=>{ try{ w.print(); }catch(e){} }, 600);

        btn.textContent = orig;
        btn.disabled = false;
      }catch(e){
        alert('印刷用ラベルの生成に失敗しました。');
        try{ btn.disabled=false; }catch(_){}
      }
    });
  }
// =================================================================
  // KODE TAMBAHAN: CETAK LABEL UNTUK BARANG YANG DICENTANG (BATCH PRINT)
  // =================================================================
  function bindPrintSelectedLabels() {
    const btnSelect = document.getElementById('btn-items-print-selected');
    if (!btnSelect) return;

    btnSelect.addEventListener('click', async () => {
      // Cari semua checkbox yang sedang dicentang di tabel
      const checkedBoxes = Array.from(document.querySelectorAll('.row-chk:checked'));
      
      if (checkedBoxes.length === 0) {
        alert('印刷する商品にチェックを入れてください (Centang barang yang ingin dicetak terlebih dahulu).');
        return;
      }

      try {
        btnSelect.disabled = true;
        const orig = btnSelect.textContent;
        btnSelect.textContent = '生成中...';

        // Buka window pop-up untuk nge-print
        const w = window.open('', '_blank', 'width=1024,height=700');
        if (!w) { alert('ポップアップがブロックされました。'); btnSelect.disabled=false; btnSelect.textContent=orig; return; }

        w.document.write('<meta charset="utf-8"><title>選択ラベル印刷</title>');
        w.document.write('<style>body{font-family:sans-serif;padding:8mm;} img{width:100%;max-width:100%;display:block;margin:6mm auto;} @media print{img{page-break-inside:avoid;}}</style>');
        w.document.write(`<h3>選択ラベル (${checkedBoxes.length}件)</h3>`);

        // Looping hanya untuk barang yang dicentang
        for (let i = 0; i < checkedBoxes.length; i++) {
          const code = checkedBoxes[i].getAttribute('data-code');
          const it = _ITEMS_CACHE.find(x => String(x.code) === String(code));
          
          if (it) {
             const url = await makeItemLabelDataURL(it);
             w.document.write(`<img src="${url}" alt="${escapeAttr(it.code)}" />`);
             if (i % 10 === 0) await new Promise(r => requestAnimationFrame(r)); // Cegah freeze
          }
        }
        
        w.document.close();
        w.focus();
        setTimeout(() => { try { w.print(); } catch(e){} }, 600);

        btnSelect.textContent = orig;
        btnSelect.disabled = false;
        
        // Otomatis hilangkan centang setelah berhasil
        checkedBoxes.forEach(chk => chk.checked = false);

      } catch(e) {
        alert('印刷用ラベルの生成に失敗しました。');
        btnSelect.disabled = false;
      }
    });
  }
  // =================================================================
  /* -------------------- Sidebar + Router -------------------- */
 
// --- Helper: ambil array baris dari berbagai bentuk respons API
function pickRows(raw) {
  if (Array.isArray(raw)) return raw;

  // Langsung cek properti umum
  for (const k of [
    'rows', 'history', 'data', 'logs', 'list',
    'items', 'values', 'users', 'series' ]) {
    const v = raw?.[k];
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object' && Array.isArray(v.rows)) return v.rows; // bentuk nested: {data:{rows:[]}}
  }

  // Beberapa backend mengirim {ok:true, result:[...]} / {ok:true, result:{rows:[...]}}
  const r = raw?.result || raw?.payload || raw?.body;
  if (Array.isArray(r)) return r;
  if (r && typeof r === 'object' && Array.isArray(r.rows)) return r.rows;

  return [];
}
function setTextSafe(selector, value) {
  const el = document.querySelector(selector);
  if (!el) return;          // kalau tidak ada, jangan bikin error
  el.textContent = value;
}

  /* -------------------- Dashboard -------------------- */
  // Palet warna untuk chart (IN / OUT)
  const CHART_COLORS = {
    in: {
      border: "rgba(59,130,246,1)",   // biru
      fill:   "rgba(59,130,246,0.16)"
    },
    out: {
      border: "rgba(244,63,94,1)",    // merah
      fill:   "rgba(244,63,94,0.20)"
    }
  };

  let chartLine = null, chartPie = null;
  async function renderDashboard() {
    const who = getCurrentUser();
    if (who) {
      setTextSafe("#who", `${who.name || who.id || "user"} (${who.id} | ${who.role || "user"})`);
    }

  try {
      // [👇 KAIZEN PERFORMA] Cukup 1 kali panggil API untuk semua data Dashboard!
     const dashData = await api("initDashboard", {
  method: "POST",
  body: {},
  silent: true
}).catch(() => ({}));
      
      const items   = dashData.items || [];
      const users   = dashData.users || [];
      const series  = dashData.series || [];
      const history = dashData.history || [];

      // Simpan syncTime terbaru jika ada
      if (dashData.syncTime) _LAST_SYNC_TIME = dashData.syncTime;
      // [👆 AKHIR PERBAIKAN]
      
      _HISTORY_CACHE = history; 
      calculateABC();           

      if (items.length && !_ITEMS_CACHE.length) {
        _ITEMS_CACHE = items.slice();
      }

      // ==== METRIK KARTU ATAS ====
      const totalItems = items.length;
      
      let totalValue = 0;
      for (const it of items) {
        const stock = Number(it.stock || 0);
        const price = Number(it.price || 0);
        totalValue += stock * price;
      }
      setTextSafe("#metric-total-value", "¥" + fmt(totalValue));
      
      let low = 0;
      for (const it of items) {
        const stock = Number(it.stock || 0);
        const min   = Number(it.min   || 0);
        if (stock <= min) low++;
      }

      const userCount = users.length;

      setTextSafe("#metric-items", fmt(totalItems));   
      setTextSafe("#metric-below", fmt(low));          
      setTextSafe("#metric-users", fmt(userCount));    

      const belowBadge = document.getElementById("metric-below-badge");
      if (belowBadge) {
        if (low > 0) {
          belowBadge.textContent = `要補充: ${fmt(low)} アイテム`;
        } else {
          belowBadge.textContent = "OK";
        }
        belowBadge.classList.remove("metric-badge-neutral", "metric-badge-success", "metric-badge-danger");
        belowBadge.classList.add(low > 0 ? "metric-badge-danger" : "metric-badge-success");
      }

      // ==== 直近30日 取引件数 ====
      const now         = new Date();
      const limit       = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); 
      const prevStart   = new Date(limit.getTime() - 30 * 24 * 60 * 60 * 1000); 

      let count30 = 0;   
      let prev30  = 0;   

      for (const h of history) {
        const raw = h.timestamp || h.date || h.datetime || "";
        if (!raw) continue;

        let dt = raw instanceof Date ? raw : new Date(String(raw).replace(" ", "T"));
        if (!dt || isNaN(dt)) continue;

        if (dt >= limit && dt <= now) {
          count30++;
        } else if (dt >= prevStart && dt < limit) {
          prev30++;
        }
      }

      setTextSafe("#metric-trx", fmt(count30));

      const days = 30;
      const avg  = days ? (count30 / days) : 0;
      setTextSafe("#metric-trx-badge", `平均 ${avg.toFixed(1)}件/日`);

      const diff = count30 - prev30;
      let diffLabel;

      if (!prev30 && !count30) {
        diffLabel = "前30日比 0件";
      } else if (diff > 0) {
        diffLabel = `前30日比 +${fmt(diff)}件`;
      } else if (diff < 0) {
        diffLabel = `前30日比 -${fmt(Math.abs(diff))}件`;
      } else {
        diffLabel = "前30日比 ±0件";
      }

      setTextSafe("#metric-trx-diff", diffLabel);

      const diffEl = document.querySelector("#metric-trx-diff");
      if (diffEl) {
        diffEl.classList.remove("text-success", "text-danger", "text-muted");
        if (diff > 0) {
          diffEl.classList.add("text-primary");
        } else if (diff < 0) {
          diffEl.classList.add("text-success");
        } else {
          diffEl.classList.add("text-muted");
        }
      }

      // ==== CHART SUBTITLES ====
      const latest = series.length ? series[series.length - 1] : null;
      if (latest) {
        const inLast  = Number(latest.in  || 0);
        const outLast = Number(latest.out || 0);
        const label   = latest.month || "";
        setTextSafe("#chart-monthly-sub", `${label}：IN ${fmt(inLast)}件 ／ OUT ${fmt(outLast)}件`);
      } else {
        setTextSafe("#chart-monthly-sub", "データがありません");
      }

      const lastForPie = series.length ? series[series.length - 1] : null;
      if (lastForPie) {
        const inCur  = Number(lastForPie.in  || 0);
        const outCur = Number(lastForPie.out || 0);
        const sumCur = inCur + outCur;

        if (sumCur > 0) {
          const pIn  = Math.round((inCur  * 100) / sumCur);
          const pOut = 100 - pIn;
          setTextSafe("#chart-pie-sub", `IN ${fmt(inCur)}件 (${pIn}%) ／ OUT ${fmt(outCur)}件 (${pOut}%)`);
        } else {
          setTextSafe("#chart-pie-sub", "当月のデータがありません");
        }
      } else {
        setTextSafe("#chart-pie-sub", "当月のデータがありません");
      }


      // =================================================================
      // KAIZEN IDE 2: DAILY HEARTBEAT (14-Day Spline Chart)
      // =================================================================
      const ctxDaily = document.getElementById("chart-daily");
      if (ctxDaily && window.Chart) {
        if (window.chartDailyHeartbeat) window.chartDailyHeartbeat.destroy();

        // Buat array 14 hari terakhir
        const last14Days = [];
        const dailyData = { in: {}, out: {} };
        const todayDt = new Date();
        
        for (let i = 13; i >= 0; i--) {
           const d = new Date(todayDt);
           d.setDate(d.getDate() - i);
           const yyyy = d.getFullYear();
           const mm = String(d.getMonth() + 1).padStart(2, '0');
           const dd = String(d.getDate()).padStart(2, '0');
           const dateStr = `${yyyy}-${mm}-${dd}`;
           const labelStr = `${mm}/${dd}`;
           
           last14Days.push({ full: dateStr, label: labelStr });
           dailyData.in[dateStr] = 0;
           dailyData.out[dateStr] = 0;
        }

        // Isi data dari history
        if (Array.isArray(history)) {
           for (const h of history) {
              const rawDate = h.timestamp || h.date || h.datetime || "";
              if (!rawDate) continue;
              const dt = rawDate instanceof Date ? rawDate : new Date(String(rawDate).replace(" ", "T"));
              if (isNaN(dt)) continue;
              
              const yyyy = dt.getFullYear();
              const mm = String(dt.getMonth() + 1).padStart(2, '0');
              const dd = String(dt.getDate()).padStart(2, '0');
              const dateStr = `${yyyy}-${mm}-${dd}`;
              
              if (dailyData.in[dateStr] !== undefined) {
                 const type = String(h.type || "").toUpperCase();
                 const qty = Number(h.qty || h.quantity || 0);
                 if (type === "IN") dailyData.in[dateStr] += qty;
                 else if (type === "OUT") dailyData.out[dateStr] += qty;
              }
           }
        }

        window.chartDailyHeartbeat = new Chart(ctxDaily, {
          type: "line",
          data: {
            labels: last14Days.map(d => d.label),
            datasets: [
              {
                label: "IN (Masuk)", data: last14Days.map(d => dailyData.in[d.full]),
                borderColor: "rgba(16, 185, 129, 1)", backgroundColor: "rgba(16, 185, 129, 0.15)",
                borderWidth: 2, pointRadius: 3, pointHoverRadius: 6, fill: true, tension: 0.4
              },
              {
                label: "OUT (Keluar)", data: last14Days.map(d => dailyData.out[d.full]),
                borderColor: "rgba(239, 68, 68, 1)", backgroundColor: "rgba(239, 68, 68, 0.15)",
                borderWidth: 2, pointRadius: 3, pointHoverRadius: 6, fill: true, tension: 0.4
              }
            ]
          },
          options: {
            responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
            plugins: { legend: { position: "top", labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { mode: 'index', intersect: false } },
            scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { borderDash: [4, 4] } } }
          }
        });
      }
      // =================================================================
      // 1. BAR CHART (月次 IN / OUT)
      // =================================================================
      const ctx1 = $("#chart-monthly");
      if (ctx1 && window.Chart) {
        chartLine?.destroy();

        const labels = series.map(s => s.month || "");
        const dataIn  = series.map(s => Number(s.in  || 0));
        const dataOut = series.map(s => Number(s.out || 0));

        chartLine = new Chart(ctx1, {
          type: "bar", 
          data: {
            labels,
           datasets: [
              {
                label: "IN (入庫)",
                data: dataIn,
                // KAIZEN: Premium Gradient untuk IN
                backgroundColor: (context) => {
                  const ctx = context.chart.ctx;
                  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                  gradient.addColorStop(0, "rgba(59, 130, 246, 0.9)"); // Biru solid atas
                  gradient.addColorStop(1, "rgba(59, 130, 246, 0.1)"); // Transparan bawah
                  return gradient;
                },
                borderColor: "rgba(59, 130, 246, 1)",
                borderWidth: 1,
                borderRadius: 4, 
                borderSkipped: false
              },
              {
                label: "OUT (出庫)",
                data: dataOut,
                // KAIZEN: Premium Gradient untuk OUT
                backgroundColor: (context) => {
                  const ctx = context.chart.ctx;
                  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                  gradient.addColorStop(0, "rgba(244, 63, 94, 0.9)"); // Merah solid atas
                  gradient.addColorStop(1, "rgba(244, 63, 94, 0.1)"); // Transparan bawah
                  return gradient;
                },
                borderColor: "rgba(244, 63, 94, 1)",
                borderWidth: 1,
                borderRadius: 4, 
                borderSkipped: false
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
              legend: { position: "top" },
              tooltip: { callbacks: { label(ctx) { const v = ctx.parsed.y || 0; return `${ctx.dataset.label}: ${fmt(v)} 件`; } } }
            },
            scales: {
              x: { grid: { display: false } },
              y: {
                beginAtZero: true,
                grid: { borderDash: [4, 4], color: "rgba(148,163,184,0.2)" }, 
                ticks: { callback(value) { return fmt(value); } }
              }
            }
          }
        });
      }

      // =================================================================
      // 2. PIE CHART (当月 IN vs OUT)
      // =================================================================
      const ctx2 = $("#chart-pie");
      if (ctx2 && window.Chart) {
        chartPie?.destroy();

        const last = series.length ? series[series.length - 1] : { in: 0, out: 0 };
        const totalIn  = Number(last.in  || 0);
        const totalOut = Number(last.out || 0);
        const sum = totalIn + totalOut || 1;

        chartPie = new Chart(ctx2, {
          type: "pie",
          data: {
            labels: ["IN", "OUT"],
            datasets: [{
              data: [totalIn, totalOut],
              backgroundColor: [CHART_COLORS.in.fill, CHART_COLORS.out.fill],
              borderColor: [CHART_COLORS.in.border, CHART_COLORS.out.border],
              borderWidth: 2,
              hoverOffset: 8
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: "bottom" },
              tooltip: {
                callbacks: {
                  label(ctx) {
                    const v = ctx.parsed || 0;
                    const pct = ((v * 100) / sum).toFixed(1);
                    return ` ${ctx.label}: ${fmt(v)} 件 (${pct}%)`;
                  }
                }
              }
            }
          }
        });
      }

      // =================================================================
      // 3. DOUGHNUT CHART (在庫の健康状態 / Inventory Health)
      // =================================================================
      const ctxHealth = $("#chart-health");
      if (ctxHealth && window.Chart) {
        if (window.chartHealth) window.chartHealth.destroy(); 

        let cZero = 0, cLow = 0, cDead = 0, cHealthy = 0;
        const nowDt = new Date();

        items.forEach(it => {
          const stock = Number(it.stock || 0);
          const min = Number(it.min || 0);

          if (stock === 0) {
            cZero++; 
          } else if (stock <= min) {
            cLow++;  
          } else {
          // Cek apakah barang ini Dead Stock (tidak ada pergerakan IN/OUT dalam 60 hari)
            let isDead = true;
            let hasHistory = false;
            
            if (Array.isArray(history)) {
              for (const h of history) {
                // Cek HANYA berdasarkan kode barang (Tanpa mempedulikan IN atau OUT)
                if (String(h.code) === String(it.code)) {
                  hasHistory = true;
                  const d = new Date(String(h.timestamp || h.date || "").replace(' ', 'T'));
                  
                  // Jika ada pergerakan apapun dalam 60 hari terakhir, BUKAN dead stock
                  if (!isNaN(d) && (nowDt - d) / (1000 * 60 * 60 * 24) <= 60) {
                    isDead = false; 
                    break;
                  }
                }
              }
            }
            
            // Jika barang baru didaftarkan dan belum ada history sama sekali, jangan anggap Dead Stock
            if (!hasHistory) isDead = false;

            if (isDead) cDead++;
            else cHealthy++;
          }
        });

        window.chartHealth = new Chart(ctxHealth, {
          type: "doughnut",
          data: {
           labels: ["適正在庫", "不動在庫", "要補充", "欠品"],
            datasets: [{
              data: [cHealthy, cDead, cLow, cZero],
              backgroundColor: [
                "rgba(34, 197, 94, 0.8)",  
                "rgba(156, 163, 175, 0.8)", 
                "rgba(245, 158, 11, 0.8)",  
                "rgba(239, 68, 68, 0.8)"    
              ],
              borderWidth: 2,
              hoverOffset: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%', 
            plugins: {
              legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 10 } } },
              tooltip: { callbacks: { label(ctx) { return ` ${ctx.label}: ${fmt(ctx.parsed)} アイテム`; } } }
            }
          }
        });
      }

      // =================================================================
      // 4. TOP 5 NILAI ASET (Horizontal Bar Chart)
      // =================================================================
      const ctxValue = $("#chart-top-value");
      if (ctxValue && window.Chart) {
        if (window.chartValue) window.chartValue.destroy();
        
        const valItems = items.map(it => {
          return {
            name: it.name || it.code,
            value: (Number(it.stock) || 0) * (Number(it.price) || 0)
          };
        }).sort((a, b) => b.value - a.value).slice(0, 5); 

        window.chartValue = new Chart(ctxValue, {
          type: "bar",
          data: {
            labels: valItems.map(v => v.name.length > 12 ? v.name.substring(0, 12) + '...' : v.name),
            datasets: [{
              label: "在庫金額 (¥)",
              data: valItems.map(v => v.value),
              backgroundColor: "rgba(16, 185, 129, 0.8)", 
              borderRadius: 6
            }]
          },
          options: {
            indexAxis: 'y', 
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }, 
              tooltip: { callbacks: { label(ctx) { return ` ¥${fmt(ctx.parsed.x)}`; } } }
            },
            scales: {
              x: { 
                beginAtZero: true, 
                grid: { borderDash: [4, 4], color: "rgba(148,163,184,0.2)" }, 
                ticks: { callback(value) { return '¥' + fmt(value); } } 
              },
              y: { grid: { display: false } }
            }
          }
        });
      }

      // =================================================================
      // 5. ABC ANALYSIS CHART (Doughnut Chart)
      // =================================================================
      const ctxAbc = $("#chart-abc");
      if (ctxAbc && window.Chart) {
        if (window.chartAbc) window.chartAbc.destroy();

        let countA = 0, countB = 0, countC = 0;
        
        items.forEach(it => {
           const abc = window.__getABC(it.code);
           if (abc.cls === 'A') countA++;
           else if (abc.cls === 'B') countB++;
           else countC++; 
        });

        window.chartAbc = new Chart(ctxAbc, {
          type: "doughnut",
          data: {
            labels: ["Aクラス (高回転)", "Bクラス (標準)", "Cクラス (低回転)"],
            datasets: [{
              data: [countA, countB, countC],
              backgroundColor: [
                "rgba(239, 68, 68, 0.8)",  
                "rgba(245, 158, 11, 0.8)", 
                "rgba(59, 130, 246, 0.8)"  
              ],
              borderWidth: 2,
              hoverOffset: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '50%',
            plugins: {
              legend: { position: "right" },
              tooltip: { callbacks: { label(ctx) { return ` ${ctx.label}: ${fmt(ctx.parsed)} アイテム`; } } }
            }
          }
        });
      }

     // ==== KAIZEN: 入出庫ランキング（TOP20） TIME MACHINE ====
      const rankTbody = $("#tbl-rank-month");
      const monthSelect = $("#rank-month-select");

      if (rankTbody) {
         // Fungsi terpisah agar bisa di-trigger ulang saat dropdown ganti
         const renderRanking = (targetYear, targetMonth) => {
            const agg = new Map();
            for (const h of history || []) {
               const rawDate = h.timestamp || h.date || h.datetime || "";
               if (!rawDate) continue;

               let dt = rawDate instanceof Date ? rawDate : new Date(String(rawDate).replace(" ", "T"));
               if (!dt || isNaN(dt)) continue;
               
               // Saring berdasarkan Tahun & Bulan yang dipilih
               if (dt.getFullYear() !== targetYear || dt.getMonth() !== targetMonth) continue;

               const code = String(h.code || "").trim();
               const name = String(h.itemName || h.name || "").trim();
               const qty  = Number(h.qty || h.quantity || 0) || 0;
               if (!code && !name) continue;
               if (!qty) continue;

               const key = `${code}||${name}`;
               const cur = agg.get(key) || { code, name, total: 0 };
               cur.total += Math.abs(qty); // Hitung total IN + OUT
               agg.set(key, cur);
            }

            const rows = Array.from(agg.values())
               .filter(r => r.total > 0)
               .sort((a, b) => b.total - a.total)
               .slice(0, 20);

            if (!rows.length) {
               rankTbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-4"><i class="bi bi-inbox fs-4 d-block mb-1 text-secondary opacity-25"></i>この月のデータはありません<br><small>(Tidak ada data di bulan ini)</small></td></tr>`;
            } else {
               rankTbody.innerHTML = rows.map((r, index) => {
                  const rank = index + 1;
                  let icon  = "bi-award";
                  let badge = "bg-light text-muted border";
                  if (rank === 1) { icon = "bi-trophy-fill"; badge = "bg-warning text-dark shadow-sm border-0"; }
                  else if (rank === 2) { icon = "bi-trophy-fill"; badge = "bg-secondary text-white shadow-sm border-0"; }
                  else if (rank === 3) { icon = "bi-trophy-fill"; badge = "bg-info text-white shadow-sm border-0"; }

                  return `
                    <tr>
                      <td class="text-center align-middle">
                        <span class="badge ${badge} rounded-pill px-2 py-1"><i class="bi ${icon} me-1"></i>${rank}</span>
                      </td>
                      <td class="align-middle">
                        <div class="small text-muted font-monospace">${escapeHtml(r.code || "")}</div>
                        <div class="fw-bold text-dark">${escapeHtml(r.name || "")}</div>
                      </td>
                      <td class="text-end align-middle fw-bold fs-5 text-primary">
                        ${fmt(r.total)}
                      </td>
                    </tr>`;
               }).join("");
            }
         };

         // 1. Set default dropdown ke Bulan & Tahun Saat Ini (jika belum di-set)
         const now = new Date();
         if (monthSelect && !monthSelect.value) {
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            monthSelect.value = `${y}-${m}`;
         }

         // 2. Render Awal
         if (monthSelect && monthSelect.value) {
            const [y, m] = monthSelect.value.split('-');
            renderRanking(Number(y), Number(m) - 1);
         }

         // 3. Pasang Event Listener (Agar saat dropdown diganti, tabel langsung update)
         if (monthSelect && !monthSelect.__bound) {
            monthSelect.__bound = true;
            monthSelect.addEventListener("change", (e) => {
               const val = e.target.value;
               if (val) {
                 const [y, m] = val.split('-');
                 renderRanking(Number(y), Number(m) - 1);
               }
            });
         }
      }
  // =================================================================
      // KAIZEN: PREDICTIVE RUNOUT RADAR & AI INSIGHT
      // =================================================================
      const radarTbody = $("#tbl-runout-radar");
      const insightBanner = $("#ai-insight-banner");
      const insightText = $("#ai-insight-text");
      const radarCountBadge = $("#radar-count");

      if (radarTbody && Array.isArray(history)) {
        // FIX BUG: Gunakan Date.now() langsung agar tidak error
        const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
        
        // 1. Hitung pengeluaran (OUT) 30 hari terakhir per barang
        const usageMap = {};
        for (const h of history) {
           const type = String(h.type || "").toUpperCase();
           if (type === 'OUT') {
              const d = new Date(String(h.timestamp || h.date || "").replace(' ', 'T'));
              if (!isNaN(d) && d >= thirtyDaysAgo) {
                 usageMap[h.code] = (usageMap[h.code] || 0) + Number(h.qty || 0);
              }
           }
        }

        // 2. Hitung Days of Supply (Sisa Hari sebelum habis)
        let radarItems = [];
        let emptySoonCount = 0;
        
        items.forEach(it => {
           const stock = Number(it.stock || 0);
           const out30 = usageMap[it.code] || 0;
           
           if (stock > 0 && out30 > 0) {
              const dailyAvg = out30 / 30;
              const daysLeft = Math.floor(stock / dailyAvg);
              
              // Masuk radar jika diprediksi habis dalam 14 hari ke bawah
              if (daysLeft <= 14) { 
                 radarItems.push({ code: it.code, name: it.name, stock, daysLeft });
                 if (daysLeft <= 3) emptySoonCount++; // Sangat kritis (<= 3 hari)
              }
           }
        });

        // 3. Render Tabel Radar (Urutkan dari yang paling cepat habis)
        radarItems.sort((a, b) => a.daysLeft - b.daysLeft); 
        
        if (radarCountBadge) radarCountBadge.textContent = radarItems.length;

        if (radarItems.length === 0) {
           radarTbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-4"><i class="bi bi-shield-check fs-4 d-block mb-2 text-success"></i>直近で枯渇する商品はありません<br>(Stok aman, tidak ada yang segera habis)</td></tr>`;
        } else {
           radarTbody.innerHTML = radarItems.map(r => {
             let badge = "bg-warning text-dark";
             let icon = "⚡";
             if (r.daysLeft === 0) { badge = "bg-dark border border-light text-white"; icon = "🔥"; }
             else if (r.daysLeft <= 3) { badge = "bg-danger text-white"; icon = "⚠️"; }
             
             return `
               <tr>
                 <td>
                   <div class="small text-muted font-monospace">${escapeHtml(r.code)}</div>
                   <div class="fw-bold text-dark">${escapeHtml(r.name)}</div>
                 </td>
                 <td class="text-end align-middle fw-bold fs-5">${fmt(r.stock)}</td>
                 <td class="text-end align-middle">
                   <span class="badge ${badge} rounded-pill px-3 py-2 shadow-sm" style="font-size:0.8rem">あと ${r.daysLeft} 日 ${icon}</span>
                 </td>
               </tr>`;
           }).join("");
        }

        // 4. Render AI Insight Banner (Asisten Proaktif)
        if (insightBanner && insightText) {
           let insights = [];
           if (emptySoonCount > 0) insights.push(`🚨 <strong class="text-danger">${emptySoonCount}点</strong> の商品が <strong>3日以内</strong> に枯渇する予測です。(Kritis: Akan habis dalam 3 hari!)`);
           if (low > 0) insights.push(`⚠️ <strong class="text-warning">${low}点</strong> の商品が 最小在庫を下回っています。(Di bawah batas minimum)`);
           if (insights.length === 0 && radarItems.length > 0) insights.push(`ℹ️ 近日中に枯渇する商品が <strong>${radarItems.length}点</strong> あります。レーダーを確認してください。(Cek radar di bawah)`);
           
           if (insights.length > 0) {
              insightText.innerHTML = insights.join("<br>");
              insightBanner.classList.remove("d-none");
              insightBanner.classList.add("d-flex");
           } else {
              insightText.innerHTML = "現在、早急に対応が必要なアラートはありません。素晴らしい管理状態です！✨ (Stok keseluruhan sangat aman dan sehat)";
              insightBanner.classList.remove("d-none");
              insightBanner.classList.add("d-flex");
           }
        }
      }
      // =================================================================

      $("#btn-export-mov")?.addEventListener("click", () => {
        const heads = ["月","IN","OUT"];
        const csv = [heads.join(",")]
          .concat(series.map(s => [s.month, s.in || 0, s.out || 0].join(",")))
          .join("\n");
        downloadCSV_JP("月次INOUT.csv", csv);
      }, { once: true });

      // --- RENDER TIMELINE (Aktivitas Terbaru) ---
      const timelineContainer = document.getElementById("dash-timeline");
      if (timelineContainer && history.length) {
        const sortedHistory = [...history].sort((a, b) => {
          const dateA = new Date(a.timestamp || a.date || 0);
          const dateB = new Date(b.timestamp || b.date || 0);
          return dateB - dateA; 
        });

        const recent = sortedHistory.slice(0, 5); 
        
        timelineContainer.innerHTML = recent.map(h => {
          const isIn = (h.type || "IN").toUpperCase() === 'IN';
          const icon = isIn ? 'bi-box-arrow-in-down text-primary' : 'bi-box-arrow-right text-danger';
          const bg = isIn ? 'bg-primary-subtle' : 'bg-danger-subtle';
          
          let timeStr = "-";
          try {
             const d = new Date(h.timestamp || h.date);
             const timePart = d.toLocaleTimeString('ja-JP', {hour:'2-digit', minute:'2-digit'});
             const datePart = d.toLocaleDateString('ja-JP', {month:'2-digit', day:'2-digit'});
             timeStr = `${datePart} ${timePart}`;
          } catch(e) { timeStr = "-"; }

          return `
          <div class="list-group-item d-flex align-items-center gap-3 py-3 border-0 border-bottom">
            <div class="rounded-circle ${bg} d-flex align-items-center justify-content-center" style="width:40px;height:40px;flex-shrink:0">
              <i class="bi ${icon} fs-5"></i>
            </div>
            <div class="flex-grow-1 min-width-0">
              <div class="d-flex justify-content-between mb-1">
                <span class="fw-semibold text-truncate text-dark">${escapeHtml(h.itemName || h.name)}</span>
                <small class="text-muted ms-2 fw-medium" style="font-size:0.75rem; white-space:nowrap;">${timeStr}</small>
              </div>
              <div class="small text-muted">
                <span class="fw-medium text-dark">${escapeHtml(h.userName)}</span> が 
                <span class="fw-bold ${isIn?'text-primary':'text-danger'}">${isIn?'入庫':'出庫'}</span> 
                しました (数量: ${fmt(h.qty)})
              </div>
            </div>
          </div>`;
        }).join('');
      } else if (timelineContainer) {
        timelineContainer.innerHTML = '<div class="p-4 text-center text-muted">履歴はありません</div>';
      }
    } catch (e) {
      console.error("renderDashboard()", e);
      toast("ダッシュボードの読み込みに失敗しました。");
    }
  }  // --- Dashboard cards drill-down (klik kartu → pindah view) ---
  function goToView(viewId) {
    if (!viewId) return;

    // Cari link di sidebar yang punya data-view = viewId
    const link =
      document.querySelector(`#sb a[data-view="${viewId}"]`) ||
      document.querySelector(`a[data-view="${viewId}"]`);

    if (link) {
      link.click();   // biarkan initSidebar yang urus ganti view, title, dll.
    }
  }

  function bindDashboardDrilldown() {
    const map = {
      "metric-card-items": "view-items",   // アイテム数
      "metric-card-below": "view-items",   // 最小在庫以下
      "metric-card-users": "view-users",   // ユーザー数
      "metric-card-trx"  : "view-history"  // 直近30日の取引
    };

    Object.entries(map).forEach(([id, viewId]) => {
      const el = document.getElementById(id);
      if (!el || el.__drillBound) return;

      el.__drillBound = true;
      el.style.cursor = "pointer";  // kasih tanda bisa diklik

      el.addEventListener("click", () => {
        goToView(viewId);
      });
    });
  }

function updateWelcomeBanner() {
    const banner = document.getElementById('welcome-banner');
    if (!banner) return;

    const user = getCurrentUser() || (window.CONFIG && CONFIG.DEFAULT_USER) || {};
    const nama = user.displayName || user.name || user.loginId || 'ユーザー';
    const rawRole = (user.role || user.roleName || '').toLowerCase();
    const isAdmin = rawRole === 'admin' || user.isAdmin === true;
    
    const hours = new Date().getHours();
    let greeting = "こんばんは";
    if (hours >= 5 && hours < 11) greeting = "おはようございます";
    else if (hours >= 11 && hours < 17) greeting = "こんにちは";
    else if (hours >= 17 && hours < 19) greeting = "お疲れ様です";

    // Struktur Banner yang Rapi
    banner.innerHTML = `
      <div class="deposito-welcome">
        <div class="d-avatar">${escapeHtml(nama).charAt(0).toUpperCase()}</div>
        <div class="d-welcome-text">
          <h4 class="m-0 fw-bold text-dark">${greeting}、${escapeHtml(nama)}さん</h4>
          <p class="m-0 text-muted small">${isAdmin ? '管理者モード (Mode Admin)' : '今日も一日安全作業でお願いします'}</p>
        </div>
      </div>
    `;

    document.querySelectorAll('.admin-only').forEach(el => {
      if (isAdmin) el.classList.remove('d-none');
      else el.classList.add('d-none');
    });
  }

  // =================================================================
  // INI ADALAH VARIABEL YANG TERHAPUS SEHINGGA APLIKASI CRASH. 
  // JANGAN DIHAPUS.
  // =================================================================
  const LIVE_KEY = "liveRefreshSec";
  let LIVE_TIMER = null; 
  let LIVE_SEC = Number(localStorage.getItem(LIVE_KEY) || "30"); 

  function setLiveRefresh(seconds){
    LIVE_SEC = Math.max(0, Number(seconds || 0));
    localStorage.setItem(LIVE_KEY, String(LIVE_SEC));
    startLiveReload();
  }

  function executeLiveReload() {
    try {
      const active = document.querySelector("main section.active")?.id || "";
      fetchItemsDelta(true).then(() => {
         if (active === "view-dashboard") {
            api("history", { method: "GET", silent: true }).then(raw => {
               const list = pickRows(raw);
               if(list.length) { _HISTORY_CACHE = list; renderDashboard(); }
            });
         }
         if (active === "view-history")      renderHistory();
         if (active === "view-shelf-list")   loadTanaList();
      });
    } catch (e) {}
  }

  function startLiveReload(){
    clearInterval(LIVE_TIMER);
    if (LIVE_SEC <= 0) return;
    LIVE_TIMER = setInterval(executeLiveReload, LIVE_SEC * 1000);
  }
  // [👇 KAIZEN PERFORMA TAB TIDUR] Matikan interval saat tab tidak aktif
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
       clearInterval(LIVE_TIMER);
    } else {
       if (LIVE_SEC > 0) {
          executeLiveReload();
          startLiveReload();
       }
    }
  });

  


  /* -------------------- Items -------------------- */
const ACT_GRID_STYLE = [
  "display:flex;",
  "gap:6px;",
  "justify-content:flex-end;",
  "align-items:center;",
  "min-width:110px;" // Lebar diperkecil dari 170px
].join("");



  // alias agar tombol DL & bulk tidak error meski 62mm belum dibuat
  async function makeItemLabel62mmDataURL(item){ return await makeItemLabelDataURL(item); }

  // === PATCHED: tplItemRow: paksa cell aksi rata kanan & min-width ===
 // --- UPDATE: tplItemRow dengan Visual Stock Indicator ---
function tplItemRow(it){
  const qrid  = `qr-${safeId(it.code)}`;
  const stock = Number(it.stock || 0);
  const min   = Number(it.min   || 0);
const abc = (window.__FREQ_MAP && window.__FREQ_MAP[it.code]) 
              ? window.__getABC(it.code) 
              : {cls:'', color:''}; 
              
  const abcBadge = abc.cls 
    ? `<span class="badge ${abc.color} rounded-pill ms-1" style="font-size:0.6rem">Rank ${abc.cls}</span>` 
    : '';
  // --- KODE BARU: HITUNG SISA HARI ---
 // --- PREDICTIVE AI: HITUNG SISA HARI STOK (DAYS OF SUPPLY) ---
  let forecastBadge = "";
  let totalOut30Days = 0;
  const nowDt = new Date();
  
  // Hitung barang keluar 30 hari terakhir dari History Cache
  if (Array.isArray(_HISTORY_CACHE)) {
    _HISTORY_CACHE.forEach(h => {
       if (h.type === 'OUT' && String(h.code) === String(it.code)) {
          const d = new Date(String(h.date).replace(' ', 'T'));
          if (!isNaN(d) && (nowDt - d) / (1000*60*60*24) <= 30) {
             totalOut30Days += h.qty;
          }
       }
    });
  }

  // Jika ada pergerakan keluar dan stok > 0
  if (totalOut30Days > 0 && stock > 0) {
    const avgDailyUsage = totalOut30Days / 30;
    const daysLeft = Math.floor(stock / avgDailyUsage);
    
    if (daysLeft === 0) {
       forecastBadge = `<div class="mt-1"><span class="badge bg-dark border border-light" style="font-size:0.7rem">🔥 本日切れ (Habis!)</span></div>`;
    } else if (daysLeft <= 3) {
       forecastBadge = `<div class="mt-1"><span class="badge bg-danger border border-light" style="font-size:0.7rem">⚠️ あと${daysLeft}日で枯渇</span></div>`;
    } else if (daysLeft <= 7) {
       forecastBadge = `<div class="mt-1"><span class="badge bg-warning text-dark border border-light" style="font-size:0.7rem">⚡ あと${daysLeft}日</span></div>`;
    }
  } 
// =================================================================
  // KODE TAMBAHAN: DETEKSI DEAD STOCK (PERBAIKAN LOGIKA)
  // =================================================================
  else if (totalOut30Days === 0 && stock > 0) {
     // Cek apakah di 60 hari terakhir ada pergerakan APAPUN (IN atau OUT)
     let movedIn60Days = false;
     let hasHistory = false; // Untuk mendeteksi barang yang benar-benar baru

     if (Array.isArray(_HISTORY_CACHE)) {
       _HISTORY_CACHE.forEach(h => {
          if (String(h.code) === String(it.code)) {
             hasHistory = true; // Barang ini pernah dicatat di history
             const d = new Date(String(h.date || h.timestamp || "").replace(' ', 'T'));
             // Jika ada pergerakan (IN/OUT/Opname) dalam 60 hari terakhir
             if (!isNaN(d) && (nowDt - d) / (1000*60*60*24) <= 60) {
                movedIn60Days = true;
             }
          }
       });
     }

     // Barang disebut Dead Stock HANYA JIKA:
     // Punya history (pernah ditransaksikan) TETAPI tidak ada pergerakan dalam 60 hari.
     if (hasHistory && !movedIn60Days) {
       forecastBadge = `<div class="mt-1"><span class="badge bg-secondary border border-light" style="font-size:0.7rem">💤 不動在庫 (Dead Stock)</span></div>`;
     }
  }
  // =================================================================
 
  // --- KAIZEN: Visual Alert Class ---
  // Jika stok <= min, tambah class 'row-danger-glow' agar baris menyala merah
  const alertClass = (stock <= min) ? "row-danger-glow" : "";
  // ----------------------------------

  // Logika Visual Bar

  // Logika Visual Bar
  // Jika stok 0, bar kosong. Jika stok >= min, bar penuh (biru/hijau). 
  // Jika stok < min, bar merah sesuai persentase sisa.
  let barColor = "bg-success";
  let barWidth = "100%";
  
  if (stock <= 0) {
    barWidth = "0%";
  } else if (stock <= min) {
    barColor = "bg-danger";
    // Hitung persentase sisa stok dibanding min (misal: min 10, stok 2 = 20%)
    const pct = Math.min(100, Math.round((stock / (min || 1)) * 100));
    barWidth = `${pct}%`;
  }

  const dept = it.department
    ? `<span class="badge rounded-pill text-bg-light">${escapeHtml(it.department)}</span>` : '';
  const loc  = it.location
    ? `<span class="badge rounded-pill bg-body-secondary">${escapeHtml(it.location)}</span>` : '';

  // Grid tombol aksi (tetap sama)
// Grid tombol aksi (Kebab Menu / Dropdown)
  const actions = `
    <button class="btn btn-sm btn-primary btn-edit" data-code="${escapeAttr(it.code)}" title="編集"><i class="bi bi-pencil-square"></i></button>
    <button class="btn btn-sm btn-outline-secondary btn-preview" data-code="${escapeAttr(it.code)}" title="プレビュー"><i class="bi bi-search"></i></button>
    <div class="dropdown d-inline-block">
      <button class="btn btn-sm btn-light border-0 px-2" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="More">
        <i class="bi bi-three-dots-vertical"></i>
      </button>
      <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0" style="font-size: 0.85rem; border-radius: 12px; z-index: 1050;">
        <li><a class="dropdown-item btn-dl" href="#" data-code="${escapeAttr(it.code)}"><i class="bi bi-download me-2 text-success"></i> ラベルDL</a></li>
        <li><a class="dropdown-item btn-lotqr" href="#" data-code="${escapeAttr(it.code)}"><i class="bi bi-qr-code me-2 text-warning"></i> Lot QR</a></li>
        <li><hr class="dropdown-divider"></li>
        <li><a class="dropdown-item btn-del text-danger" href="#" data-code="${escapeAttr(it.code)}"><i class="bi bi-trash3 me-2"></i> 削除</a></li>
      </ul>
    </div>
  `;

 return [
    // Tambahkan alertClass di sini vvvvvvv
    '<tr data-code="', escapeAttr(it.code), '" class="', alertClass, '">',
      '<td style="width:36px"><input type="checkbox" class="row-chk" data-code="', escapeAttr(it.code), '"></td>',
      // Tambahkan class 'lazy-qr-target' untuk Lazy Loading
      '<td style="width:110px"><div class="tbl-qr-box"><div id="', qrid, '" class="d-inline-block lazy-qr-target" data-text="ITEM|', normalizeCodeDash(it.code), '"></div></div></td>',
      '<td>',
       '<div class="small text-muted">', escapeHtml(it.code), abcBadge, '</div>',
        '<div class="td-name">',
        '<a href="#" class="link-underline link-item" data-code="', escapeAttr(it.code), '">',
          escapeHtml(it.name),
        '</a>',
        forecastBadge, // <--- INI DIA YANG DITAMBAHKAN
      '</div>',
      '</td>',
      '<td>', (it.img ? `<img src="${escapeAttr(it.img)}" alt="" style="height:32px">` : ''), '</td>',
      '<td class="text-end">¥', fmt(it.price), '</td>',
      
      // KOLOM STOK DENGAN PROGRESS BAR
      '<td class="text-end">',
        '<div>', fmt(stock), '</div>',
        '<div class="progress mt-1" style="height: 6px; background-color: #e9ecef;">',
          `<div class="progress-bar ${barColor}" role="progressbar" style="width: ${barWidth}"></div>`,
        '</div>',
      '</td>',
      
      '<td class="text-end">', fmt(min), '</td>',
      '<td>', dept, '</td>',
      '<td>', loc, '</td>',
      '<td class="td-actions" style="text-align:right">',
        '<div class="act-grid actions" style="', ACT_GRID_STYLE, '">', actions, '</div>',
      '</td>',
    '</tr>'
  ].join('');
}

  // === Mobile mini "操作" button renderer (HP only) ===
  function ensureMobileActions(){ /* disabled: no floating action bubble on mobile */ }


  // === HEADER & COLGROUP sinkron ke jumlah kolom body (kuat untuk TABLE/TBODY) ===
  /* === CEK/GANTI FUNGSI ensureItemsHeader DI app.js === */
/* --- GANTI FUNCTION ensureItemsHeader YANG LAMA DENGAN INI --- */
function ensureItemsHeader() {
  const host = document.getElementById("tbl-items");
  if (!host) return;

  const table = host.tagName === "TABLE" ? host : host.closest("table");
  if (!table) return;

  // Pastikan ada THEAD
  let thead = table.tHead;
  if (!thead) {
    thead = table.createTHead();
  }

  // Pastikan ada baris TR di head
  let tr = thead.rows[0];
  if (!tr) {
    tr = thead.insertRow();
  }

  // Daftar Judul Header
  const headers = [
    "",             // 0. Checkbox
    "QR",           // 1. QR
    "コード / 名称", // 2. Code/Name
    "画像",          // 3. Image
    "価格",          // 4. Price
    "在庫",          // 5. Stock
    "最小",          // 6. Min
    "部門",          // 7. Dept
    "置場",          // 8. Loc
    "操作"           // 9. Action
  ];

  // Indeks kolom yang harus RATA KANAN
  const rightAlignIdx = [4, 5, 6, 9]; 
  // Indeks kolom yang harus RATA TENGAH
  const centerAlignIdx = [0, 1, 3];

  // Bersihkan header lama & buat baru
  tr.innerHTML = ""; 
  headers.forEach((text, i) => {
    const th = document.createElement("th");
    th.textContent = text;
    
    // Base class
    let className = "bg-light text-secondary fw-semibold border-bottom";
    
    // Tambahkan class alignment
    if (rightAlignIdx.includes(i)) {
      className += " text-end"; // Bootstrap class untuk rata kanan
      th.style.textAlign = "right"; // Paksa via inline style
    } else if (centerAlignIdx.includes(i)) {
      className += " text-center";
      th.style.textAlign = "center";
    } else {
      th.style.textAlign = "left";
    }

    th.className = className;
    tr.appendChild(th);
  });
}

function ensureItemsColgroup() {
  const host = document.getElementById("tbl-items");
  if (!host) return;

  const table = host.tagName === "TABLE" ? host : host.closest("table");
  if (!table) return;

  // 1. Tambahkan class agar CSS fixed-layout bekerja
  table.classList.add("items-table-fixed");

  // 2. Hapus colgroup lama agar bersih
  table.querySelectorAll("colgroup").forEach(cg => cg.remove());

  // 3. Definisi Lebar Kolom (Total 10 Kolom)
  // Tips: Kolom ke-3 (Nama) kita buat 'auto' agar memakan sisa ruang
  const widths = [
    "40px",   // 0. Checkbox
    "80px",   // 1. QR
    "auto",   // 2. Kode / Nama (Fleksibel)
    "60px",   // 3. Gambar
    "90px",   // 4. Harga
    "80px",   // 5. Stok
    "70px",   // 6. Min
    "100px",  // 7. Dept
    "90px",   // 8. Lokasi
    "110px"   // 9. Aksi (Tombol)
  ];

  const cg = document.createElement("colgroup");
  const tbody = table.querySelector("tbody");
  
  // Cek jumlah kolom dari baris pertama data
  const sampleRow = tbody ? tbody.querySelector("tr") : null;
  const colCount = sampleRow ? sampleRow.children.length : 10;

  for (let i = 0; i < colCount; i++) {
    const col = document.createElement("col");
    
    // Terapkan lebar
    if (i === 2) {
      // Khusus kolom Nama: biarkan kosong (auto) di style width, 
      // tapi CSS akan menangani sisanya.
      col.style.width = "auto"; 
    } else {
      // Kolom lain: width fix
      col.style.width = widths[i] || "100px";
    }
    
    cg.appendChild(col);
  }
  
  table.insertBefore(cg, table.firstChild);
}

/* --- KAIZEN: renderItems dengan Live Search & Kebab Menu FIX --- */
async function renderItems(silent = false) {
  const tbody = $("#tbl-items");
  if (!tbody) return;

  // Tampilkan Skeleton loading jika ada di config dan bukan mode silent
  if (!silent && CONFIG.FEATURES && CONFIG.FEATURES.SKELETON) {
    tbody.innerHTML = '<tr><td colspan="10"><div class="skel" style="height:120px"></div></td></tr>';
    setupTopScrollbar();
  }

  try {
    // Ambil data menggunakan Delta Sync
    await fetchItemsDelta(silent);
    
    // --- Update Badge "Low Stock" ---
    try {
      const lowCount = _ITEMS_CACHE.reduce((acc, it) => {
        const stock = Number(it.stock || 0);
        const min   = Number(it.min   || 0);
        return acc + (stock > 0 && stock <= min ? 1 : 0);
      }, 0);

      const badge = document.getElementById("items-low-badge");
      if (badge) {
        if (lowCount > 0) {
          badge.textContent = `⚠ 要補充: ${fmt(lowCount)} アイテム`;
          badge.classList.remove("d-none");
        } else {
          badge.textContent = "要補充なし";
          badge.classList.add("d-none");
        }
      }
    } catch (_) {}

    // --- SETUP PAGING & SEARCH ---
    let page = 0, size = 100;
    let filterTerm = "";

    const searchInput = document.getElementById("items-search");
    
    async function renderPage() {
      let filteredData = _ITEMS_CACHE;
      if (filterTerm) {
        const term = filterTerm.toLowerCase();
        filteredData = _ITEMS_CACHE.filter(it => 
          (it.code || "").toLowerCase().includes(term) || 
          (it.name || "").toLowerCase().includes(term)
        );
      }

      const slice = filteredData.slice(page*size, (page+1)*size);

      if (page === 0) {
        if (slice.length === 0) {
           tbody.innerHTML = '<tr><td colspan="10" class="text-center py-4 text-muted">該当する商品はありません (Tidak ditemukan)</td></tr>';
        } else {
           tbody.innerHTML = slice.map(tplItemRow).join("");
        }
      } else {
        tbody.insertAdjacentHTML("beforeend", slice.map(tplItemRow).join(""));
      }

      page++;
      
      try { await ensureQRCode(); } catch(_) {}
      renderRowQRCodes(slice);
      ensureItemsHeader();
      ensureItemsColgroup();
      setupTopScrollbar();
      if (typeof window.__resyncTopScroll === "function") window.__resyncTopScroll();
    }

    if (searchInput && !searchInput.__bound) {
      searchInput.__bound = true;
      searchInput.addEventListener("input", (e) => {
        filterTerm = (e.target.value || "").trim();
        page = 0;
        renderPage(); 
      });
    }

    await renderPage();

    const oldMore = document.getElementById("btn-load-more-container");
    if(oldMore) oldMore.remove();

    if (_ITEMS_CACHE.length > size) {
      const moreContainer = document.createElement("div");
      moreContainer.id = "btn-load-more-container";
      moreContainer.className = "text-center my-3";
      moreContainer.innerHTML = '<button id="btn-load-more" class="btn btn-outline-secondary btn-sm">Load more</button>';
      
      const table = tbody.closest('table');
      const host  = document.getElementById('items-table-wrap') || table?.parentElement || document.body;
      host.appendChild(moreContainer);

      moreContainer.addEventListener("click", async (e)=>{
        e.preventDefault();
        await renderPage();
        let currentTotal = filterTerm 
           ? _ITEMS_CACHE.filter(it => (it.code||"").includes(filterTerm) || (it.name||"").includes(filterTerm)).length
           : _ITEMS_CACHE.length;
           
        if (page * size >= currentTotal) moreContainer.style.display = 'none';
      });
    }

  } catch (e) {
    console.error("renderItems()", e);
    toast("商品一覧の読み込みに失敗しました。");
  }

  // Delegasi klik (Edit, Del, DL, dll) - FIX: Mendukung Kebab Menu Dropdown (tag <a>)
  if (!tbody.__bound) {
    tbody.addEventListener("click", async (ev)=>{
      // Deteksi tag <button> ATAU <a> yang punya class .dropdown-item
      const btn  = ev.target.closest("button, .dropdown-item");
      if (!btn) return;
      
      // Cegah halaman melompat ke atas jika yang diklik adalah link <a> (dropdown)
      if (btn.tagName === "A") ev.preventDefault();

      const code = btn.getAttribute("data-code");
      if (!code) return;

      const item = _ITEMS_CACHE.find(x => String(x.code) === String(code));
      
      if (btn.classList.contains("btn-edit")) { openEditItem(code); return; }
      
      if (btn.classList.contains("btn-del")) {
        if (!isAdmin()) return toast("Akses ditolak (admin only)");
        const isSure = await showCustomDialog({
          type: 'delete',
          title: '商品削除 (Hapus Barang)',
          message: `「${item.name}」を削除してもよろしいですか？\n(Yakin ingin menghapus barang ini?)`,
          confirmText: '削除 (Hapus)',
          cancelText: 'キャンセル (Batal)'
        });
        if (!isSure) return;
        try {
          const r = await api("deleteItem", { method:"POST", body:{ code }});
          if (r?.ok) { toast("削除しました (Berhasil dihapus)"); renderItems(); }
          else toast(r?.error || "削除失敗");
        } catch(e) { toast("削除失敗: " + (e?.message||e)); }
        return;
      }
      
      if (btn.classList.contains("btn-dl")) {
        if (!item) return;
        const url = await makeItemLabel62mmDataURL(item);
        const a = document.createElement("a");
        a.href = url; a.download = `label_${sanitizeFilename(item.code)}.png`; a.click();
        return;
      }
      
      if (btn.classList.contains("btn-lotqr")) {
        if (!item) return;
        openLotQRModal(item);
        return;
      }
      
      if (btn.classList.contains("btn-preview")) {
        if (!item) return;
        showItemPreview(item);
        return;
      }
    });
    tbody.__bound = true;
  }

  try{
    const th = tbody?.closest("table")?.querySelector("thead tr th:last-child");
    if (th) th.style.minWidth = "150px";
  } catch{}

  try { bindPreviewButtons(); } catch(e) {}
}

  // === render QR di tiap baris items ===
  // --- UPDATE: Lazy Loading QR Code ---
// Observer global variabel
let _qrObserver = null;

function renderRowQRCodes(items) {
  // 1. Reset Observer jika sudah ada
  if (_qrObserver) {
    _qrObserver.disconnect();
  }

  // 2. Buat Observer baru
  _qrObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const text = el.getAttribute('data-text');
        
        // Render QR
        if (text && !el.innerHTML) {
          try {
            new QRCode(el, {
              text: text,
              width: 64, height: 64,
              correctLevel: QRCode.CorrectLevel.M
            });
            // Hapus atribut agar tidak dirender ulang & stop observe elemen ini
            el.removeAttribute('data-text'); 
            observer.unobserve(el);
          } catch(e) { console.warn(e); }
        }
      }
    });
  }, {
    rootMargin: "100px 0px", // Pre-load 100px sebelum muncul di layar
    threshold: 0.01
  });

  // 3. Daftarkan elemen untuk diobservasi
  const targets = document.querySelectorAll('.lazy-qr-target');
  targets.forEach(el => _qrObserver.observe(el));
}

  // ---------- LABEL CANVAS ----------
  async function makeItemLabelDataURL(item) {
    const W = 760, H = 260, pad = 18, imgW = 200, gap = 16;
    const QUIET = 16, qrSize = 136, gapQR = 14;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d"); g.imageSmoothingEnabled = false;

    g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
    g.strokeStyle = "#000"; g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, W - 1, H - 1);

    const rx = pad, ry = pad, rw = imgW, rh = H - 2 * pad, r = 18;
    roundRect(g, rx, ry, rw, rh, r, true, true, "#eaf1ff", "#cbd5e1");
    await drawImageIfAny(g, item.img, rx, ry, rw, rh, r);

    const colStart = pad + imgW + gap;
    const qy = pad + ((H - 2 * pad) - qrSize) / 2;
    const qx = colStart + gapQR + QUIET;
    g.fillStyle = "#fff";
    g.fillRect(qx - QUIET, qy - QUIET, qrSize + 2 * QUIET, qrSize + 2 * QUIET);
    try {
      const codeNorm = normalizeCodeDash(item.code);
      const du = await generateQrDataUrl(`ITEM|${codeNorm}`, qrSize);
      const im = new Image(); im.src = du; await imgLoaded(im);
      g.drawImage(im, qx, qy, qrSize, qrSize);
    } catch (e) {}

    const colQRW = qrSize + 2 * QUIET;
    const gridX  = colStart + gapQR + colQRW + gapQR;
    const cellH  = (H - 2 * pad) / 3;
    g.strokeStyle = "#000"; g.lineWidth = 1;
    g.strokeRect(gridX + 0.5, pad + 0.5, W - gridX - pad - 1, H - 2 * pad - 1);
    for (let i = 1; i <= 2; i++) {
      const y = pad + cellH * i;
      g.beginPath(); g.moveTo(gridX + 0.5, y + 0.5); g.lineTo(W - pad - 0.5, y + 0.5); g.stroke();
    }

    const labelWidth = 96;
    const labelX = gridX + 10;
    const valX   = gridX + 10 + labelWidth;
    const valMaxW = W - pad - valX - 10;

    const LBL_FONT = '600 14px "Noto Sans JP", system-ui';
    const VAL_WEIGHT = "700";

    const cells = [
      { title: "コード：",     value: String(item.code || ""),            base: 20, min: 11 },
      { title: "商品名：",     value: String(item.name || ""),            base: 22, min: 11 },
      { title: "部門／置場：", value: [item.department||"", item.location? "／"+String(item.location).toUpperCase():""].join(""), base: 18, min: 11 }
    ];

    cells.forEach((cell, i) => {
      const yTop = pad + i * cellH;
      g.font = LBL_FONT; g.fillStyle = "#000";
      const labelH = 14;
      const ly = yTop + (cellH - labelH) / 2;
      g.textBaseline = "top"; g.textAlign = "left";
      g.fillText(cell.title, labelX, Math.round(ly));

      drawWrapBoxVCenter(
        g, cell.value, valX, yTop + 4, valMaxW, cellH - 8,
        { base: cell.base, min: cell.min, lineGap: 3, weight: VAL_WEIGHT }
      );
    });

    return c.toDataURL("image/png");

    // helpers
    function roundRect(ctx, x, y, w, h, r, fill, stroke, fillColor, border) {
      ctx.save(); ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      if (fill)   { ctx.fillStyle = fillColor || "#eef"; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = border || "#000"; ctx.stroke(); }
      ctx.restore();
    }
    function imgLoaded(im){ return new Promise(res => { im.onload = res; im.onerror = res; }); }
    async function drawImageIfAny(ctx, url, x, y, w, h, rr){
      if (!url){
        ctx.save(); ctx.fillStyle="#3B82F6"; ctx.font='bold 28px "Noto Sans JP", system-ui';
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText("画像", x + w/2, y + h/2);
        ctx.restore(); return;
      }
      try{
        const im = new Image(); im.crossOrigin="anonymous"; im.src=url; await imgLoaded(im);
        const s = Math.min(w/im.width, h/im.height), iw = im.width*s, ih = im.height*s;
        const ix = x + (w - iw)/2, iy = y + (h - ih)/2;
        ctx.save(); ctx.beginPath();
        ctx.moveTo(x + rr, y); ctx.arcTo(x + w, y, x + w, y + h, rr);
        ctx.arcTo(x + w, y + h, x, y + h, rr); ctx.arcTo(x, y + h, x, y, rr);
        ctx.arcTo(x, y, x + w, y, rr); ctx.closePath(); ctx.clip();
        ctx.drawImage(im, ix, iy, iw, ih); ctx.restore();
      } catch (e) {}
    }

    function measureLines(ctx, text, maxW){
      const tokens = String(text ?? "").split(/(\s+)/);
      const lines = []; let line = "";
      const push = (tok) => {
        if (ctx.measureText(tok).width <= maxW) {
          const t = line + tok;
          if (!line || ctx.measureText(t).width <= maxW) line = t;
          else { lines.push(line.trim()); line = tok.trimStart(); }
        } else {
          for (const ch of Array.from(tok)) {
            const t = line + ch;
            if (!line || ctx.measureText(t).width <= maxW) line = t;
            else { lines.push(line.trim()); line = ch; }
          }
        }
      };
      tokens.forEach(push);
      if (line) lines.push(line.trim());
      return lines;
    }

    function drawWrapBoxVCenter(ctx, text, x, yTop, maxW, maxH, opt={}){
      const base = opt.base || 18, min = opt.min || 12, gap = opt.lineGap || 4;
      const fam  = '"Noto Sans JP", system-ui';
      const weight = opt.weight || "normal";
      let size = base, lines;
      while (true){
        ctx.font = `${weight} ${size}px ${fam}`;
        lines = measureLines(ctx, text, maxW);
        const totalH = lines.length * size + (lines.length - 1) * gap;
        if (totalH <= maxH || size <= min) break;
        size -= 1;
      }
      const totalH = lines.length * size + (lines.length - 1) * gap;
      let y = yTop + (maxH - totalH) / 2;
      ctx.textBaseline = "top"; ctx.textAlign = "left"; ctx.fillStyle = "#000";
      for (const ln of lines){
        ctx.fillText(ln, x, Math.round(y));
        y += size + gap;
        if (y - yTop > maxH) break;
      }
    }
  } // end makeItemLabelDataURL

  async function generateQrDataUrl(text, size) {
    await ensureQRCode();
    return await new Promise((resolve) => {
      const tmp = document.createElement("div");
      Object.assign(tmp.style, {
        position: "fixed", left: "-9999px", top: "0", width: size + "px", height: size + "px"
      });
      document.body.appendChild(tmp);

      new QRCode(tmp, { text, width: size, height: size, correctLevel: QRCode.CorrectLevel.M });

      const grab = () => {
        const node = tmp.querySelector("img,canvas");
        if (!node) return "";
        try { return node.tagName === "IMG" ? node.src : node.toDataURL("image/png"); }
        catch (e) { return ""; }
      };

      let tries = 0;
      (function waitRender() {
        const url = grab();
        if (url || tries >= 15) {
          document.body.removeChild(tmp);
          resolve(url || "");
          return;
        }
        tries++; setTimeout(waitRender, 60);
      })();
    });
  }

  // === LOT label (pakai layout item, QR diganti LOT + caption) ===
  async function makeLotLabelDataURL(item, qtyPerBox, lotId) {
    const base = await makeItemLabelDataURL(item);
    const im = new Image(); im.src = base;
    await new Promise(r => { im.onload = r; im.onerror = r; });

    const W = im.width, H = im.height;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d"); g.imageSmoothingEnabled = false;

    g.drawImage(im, 0, 0);

    const pad = 18, imgW = 200, gap = 16;
    const QUIET = 16, qrSize = 136, gapQR = 14;
    const colStart = pad + imgW + gap;
    const qy = pad + ((H - 2 * pad) - qrSize) / 2;
    const qx = colStart + gapQR + QUIET;

    try {
      const codeNorm = normalizeCodeDash(item.code);
      const txt = lotId ? `LOT|${codeNorm}|${qtyPerBox}|${lotId}` : `LOT|${codeNorm}|${qtyPerBox}`;
      const du = await generateQrDataUrl(txt, qrSize);
      const qr = new Image(); qr.src = du;
      await new Promise(r => { qr.onload = r; qr.onerror = r; });
      g.fillStyle = "#fff"; g.fillRect(qx - QUIET, qy - QUIET, qrSize + 2 * QUIET, qrSize + 2 * QUIET);
      g.drawImage(qr, qx, qy, qrSize, qrSize);
    } catch (e) {}

    const capW = qrSize + 2 * QUIET;
    const capH = 40;
    const capX = colStart + gapQR;
    const capY = qy + qrSize + 6;

    g.fillStyle = "#ffffff";
    g.fillRect(capX, capY, capW, capH);
    g.strokeStyle = "#d1d5db";
    g.lineWidth = 1;
    g.strokeRect(capX + 0.5, capY + 0.5, capW - 1, capH - 1);

    g.fillStyle = "#111";
    g.textAlign = "center";
    g.textBaseline = "top";
    g.font = '700 14px "Noto Sans JP", system-ui';
    g.fillText(`箱あたり：${Number(qtyPerBox || 0)} pcs`, capX + capW / 2, capY + 6);

    if ((lotId || "").trim()) {
      g.font = '600 12px "Noto Sans JP", system-ui';
      g.fillStyle = "#374151";
      g.fillText(`ロット：${String(lotId)}`, capX + capW / 2, capY + 22);
    }

    return c.toDataURL("image/png");
  }

  /* -------------------- Users -------------------- */
  async function renderUsers() {
    try {
      const who = getCurrentUser();
      const list = await api("users", { method: "GET" });
      let arr = Array.isArray(list) ? list : (Array.isArray(list?.data) ? list.data : []);

      const admin = isAdmin();

      $("#btn-users-import")?.classList.toggle("d-none", !admin);
      $("#btn-users-export")?.classList.toggle("d-none", !admin);
      $("#btn-print-qr-users")?.classList.toggle("d-none", !admin);
      $("#btn-open-new-user")?.classList.toggle("d-none", !admin);

      if (!admin && who) {
        arr = arr.filter(u => String(u.id) === String(who.id));
      }

      const tbody = $("#tbl-userqr");
      tbody.innerHTML = arr.map(u => {
        const uidSafe = safeId(u.id);
        return `
        <tr>
          <td style="width:170px"><div id="uqr-${uidSafe}"></div></td>
          <td>${escapeHtml(u.id)}</td>
          <td>${escapeHtml(u.name)}</td>
          <td>${escapeHtml(u.role || "user")}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-success btn-dl-user" data-id="${escapeAttr(u.id)}" title="ダウンロード">
              <i class="bi bi-download"></i>
            </button>
          </td>
        </tr>`;
      }).join("");

      await ensureQRCode();
      for (const u of arr) {
        const el = document.getElementById(`uqr-${safeId(u.id)}`);
        if (!el) continue;
        el.innerHTML = ""; new QRCode(el, { text: `USER|${u.id}`, width: 64, height: 64, correctLevel: QRCode.CorrectLevel.M });
      }

      tbody.addEventListener("click", async (e) => {
        const b = e.target.closest(".btn-dl-user"); if (!b) return;
        const id = b.getAttribute("data-id");
        const url = await generateQrDataUrl(`USER|${id}`, 300);
        const a = document.createElement("a"); a.href = url; a.download = `user_${id}.png`; a.click();
      });
// === PATCH: User QR 印刷 (tombol「印刷」sebelumnya tidak punya handler) ===
// - Klik baris tabel (selain tombol DL) -> tampilkan preview di panel kanan
// - Klik tombol 印刷 -> buka window baru berisi QR (image) + info -> print()
// Catatan: sengaja pakai data URL (generateQrDataUrl) agar hasil print stabil.
let selectedUser = null;

// 1) Bind select row → preview kanan (ikat sekali per tbody)
if (!tbody.__userSelectBound) {
  tbody.addEventListener("click", async (ev) => {
    // Jangan ganggu fungsi download yang sudah ada
    if (ev.target.closest(".btn-dl-user")) return;

    const tr = ev.target.closest("tr");
    if (!tr) return;

    // Struktur kolom users tetap: [QR][ID][名前][権限][DL]
    const id   = (tr.children?.[1]?.textContent || "").trim();
    const name = (tr.children?.[2]?.textContent || "").trim();
    const role = (tr.children?.[3]?.textContent || "").trim();
    if (!id) return;

    selectedUser = { id, name, role };

    const right = $("#print-qr-users-grid");
    if (!right) return;

    right.innerHTML = `
      <div class="card p-3 w-100">
        <div class="fw-semibold mb-2">印刷プレビュー</div>
        <div class="d-flex align-items-center gap-3">
          <div id="sel-user-qr"></div>
          <div class="small">
            <div><b>ID</b>：${escapeHtml(id)}</div>
            <div><b>氏名</b>：${escapeHtml(name || "-")}</div>
            <div><b>権限</b>：${escapeHtml(role || "user")}</div>
          </div>
        </div>
        <div class="text-muted small mt-2">右上の「印刷」を押すと、この内容を印刷します。</div>
      </div>`;

    try {
      await ensureQRCode();
      const box = document.getElementById("sel-user-qr");
      if (box) {
        box.innerHTML = "";
        new QRCode(box, { text: `USER|${id}`, width: 140, height: 140, correctLevel: QRCode.CorrectLevel.M });
      }
    } catch {
      const box = document.getElementById("sel-user-qr");
      if (box) box.textContent = `USER|${id}`;
    }
  });
  tbody.__userSelectBound = true;
}

// 2) Bind tombol 印刷 (ikat sekali per tombol)
const btnPrintUsers = $("#btn-print-qr-users");
if (btnPrintUsers && !btnPrintUsers.__userPrintBound) {
  btnPrintUsers.__userPrintBound = true;
  btnPrintUsers.addEventListener("click", async () => {
    try {
      if (!selectedUser?.id) {
        alert("印刷するユーザーを左の表から選択してください。");
        return;
      }

      const { id, name, role } = selectedUser;
      const qrUrl = await generateQrDataUrl(`USER|${id}`, 420);

      const w = window.open("", "_blank", "width=900,height=700");
      if (!w) {
        alert("ポップアップがブロックされました。");
        return;
      }

      w.document.write("<meta charset='utf-8'><title>ユーザーQR印刷</title>");
      w.document.write(`
        <style>
          body{font-family:sans-serif;margin:0;padding:18mm;}
          .card{border:1px solid #e5e7eb;border-radius:12px;padding:14mm;max-width:160mm;}
          .row{display:flex;gap:14mm;align-items:center;}
          img{width:60mm;height:60mm;object-fit:contain;}
          .meta{font-size:12pt;line-height:1.6;}
          h2{margin:0 0 10mm 0;font-size:14pt;}
          @media print{ body{padding:0;} .card{border:none;} }
        </style>
      `);
      w.document.write(`
        <div class='card'>
          <h2>ユーザーQR</h2>
          <div class='row'>
            <img src='${qrUrl}' alt='USER|${escapeAttr(id)}'>
            <div class='meta'>
              <div><b>ID</b>：${escapeHtml(id)}</div>
              <div><b>氏名</b>：${escapeHtml(name || "-")}</div>
              <div><b>権限</b>：${escapeHtml(role || "user")}</div>
            </div>
          </div>
        </div>
      `);
      w.document.close();
      w.focus();
      setTimeout(() => { try { w.print(); } catch (_) {} }, 500);
    } catch (e) {
      console.error("user qr print error", e);
      alert("印刷に失敗しました。");
    }
  });
}

      const right = $("#print-qr-users-grid");
      if (right) {
        if (!admin && who) {
          right.innerHTML = `
            <div class="card p-3 w-100">
              <div class="fw-semibold mb-2">ユーザー情報</div>
              <div class="d-flex align-items-center gap-3">
                <div id="me-qr"></div>
                <div class="small">
                  <div><b>ID</b>：${escapeHtml(who.id || "")}</div>
                  <div><b>氏名</b>：${escapeHtml(who.name || "")}</div>
                  <div><b>ユーザー</b>：${escapeHtml(who.role || "user")}</div>
                  <div><b>PIN</b>：<span class="text-muted">（非表示）</span></div>
                </div>
              </div>
            </div>`;
          const box = document.getElementById("me-qr");
          if (box) { new QRCode(box, { text: `USER|${who.id}`, width: 120, height: 120 }); }
        } else {
          right.innerHTML = `<div class="text-muted small">印刷するユーザーQRを左の表から選択してダウンロードしてください。</div>`;
        }
      }
    } catch (e) { toast("ユーザーQRの読み込みに失敗しました。"); }
  }

  // New User (admin only)
  function openNewUser() {
    if (!isAdmin()) return toast("Akses ditolak (admin only)");
    const wrap = document.createElement("div");
    wrap.className = "modal fade";
    wrap.innerHTML = `
<div class="modal-dialog">
  <div class="modal-content">
    <div class="modal-header"><h5 class="modal-title">新規ユーザー</h5>
      <button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
    <div class="modal-body">
      <div class="row g-3">
        <div class="col-md-4"><label class="form-label">ID</label><input id="nu-id" class="form-control" placeholder="USER001"></div>
        <div class="col-md-5"><label class="form-label">氏名</label><input id="nu-name" class="form-control"></div>
        <div class="col-md-3"><label class="form-label">権限</label>
          <select id="nu-role" class="form-select"><option value="user">user</option><option value="admin">admin</option></select>
        </div>
      </div>
      <div class="small text-muted mt-2">PIN の設定は別途（GAS 側）で行ってください。</div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-bs-dismiss="modal">閉じる</button>
      <button class="btn btn-primary" id="nu-save">作成</button>
    </div>
  </div>
</div>`;
    document.body.appendChild(wrap);
    const modal = new bootstrap.Modal(wrap); modal.show();
    $("#nu-save", wrap)?.addEventListener("click", async () => {
      const id = ($("#nu-id", wrap).value || "").trim();
      const name = $("#nu-name", wrap).value || "";
      const role = $("#nu-role", wrap).value || "user";
      if (!id) return toast("ID を入力してください。");
      try {
        const r = await api("upsertUser", { method: "POST", body: { id, name, role } });
        if (r?.ok) { modal.hide(); wrap.remove(); renderUsers(); toast("作成しました"); }
        else toast(r?.error || "作成失敗");
      } catch (e) { toast("作成失敗: " + (e?.message || e)); }
    });
    wrap.addEventListener("hidden.bs.modal", () => wrap.remove(), { once: true });
  }

// --- GANTI SELURUH function ensureHistoryHeader DENGAN INI ---
function ensureHistoryHeader() {
  const host = document.getElementById("tbl-history");
  if (!host) return;
  
  // Cari elemen tabel
  const table = host.tagName === "TABLE" ? host : host.closest("table");
  if (!table) return;

  // Pastikan THEAD dan TR ada
  let thead = table.tHead;
  if (!thead) thead = table.createTHead();
  let tr = thead.rows[0];
  if (!tr) tr = thead.insertRow();

  // DEFINISI 11 KOLOM (Update: Tambah "端末" / Device)
  const headers = [
    "日時",       // 1. Date
    "ID",        // 2. User ID
    "担当者",     // 3. User Name
    "コード",     // 4. Code
    "品名",       // 5. Item Name
    "数量",       // 6. Qty
    "単位",       // 7. Unit
    "種別",       // 8. Type
    "備考",       // 9. Note
    "端末",       // 10. Device (BARU - User Agent)
    "修正"        // 11. Fix
  ];

  // Reset header jika jumlah kolom tidak sesuai
  if (tr.cells.length !== headers.length) {
    tr.innerHTML = "";
    headers.forEach((text, i) => {
      const th = document.createElement("th");
      th.textContent = text;
      
      // Base class bootstrap
      let className = "bg-light text-secondary fw-semibold border-bottom";
      
      // Atur perataan teks (Alignment)
      if (text === "数量" || text === "修正") {
        th.style.textAlign = "right"; 
        className += " text-end";
      } else if (text === "種別" || text === "ID" || text === "単位") {
        th.style.textAlign = "center";
        className += " text-center";
      } else if (text === "端末") {
        // Khusus header Device: Sembunyikan di HP
        th.style.textAlign = "left";
        className += " d-none d-md-table-cell"; 
      } else {
        th.style.textAlign = "left";
        className += " text-start";
      }
      
      th.className = className;
      tr.appendChild(th);
    });
  }
}


// --- Helper: filter history berdasarkan range (all / today / week / month) ---
function filterHistoryByRange(list, range) {
  const mode = (range || "all");
  if (!Array.isArray(list) || !list.length || mode === "all") {
    return Array.isArray(list) ? list : [];
  }

  const now = new Date();
  const todayStart   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  // minggu: Senin–Minggu
  const dow        = todayStart.getDay();          // 0:Sun ... 6:Sat
  const diffToMon  = (dow + 6) % 7;                // jarak ke Senin
  const weekStart  = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - diffToMon);
  const weekEnd    = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);        // [weekStart, weekEnd)

  // bulan berjalan
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  function parseHistDate(h) {
    const raw = h.timestamp || h.date || h.datetime || "";
    if (!raw) return null;
    const dt = raw instanceof Date ? raw : new Date(String(raw).replace(" ", "T"));
    if (!dt || isNaN(dt)) return null;
    return dt;
  }

  return list.filter(h => {
    const dt = parseHistDate(h);
    if (!dt) return false;

    if (mode === "today") return dt >= todayStart && dt < tomorrowStart;
    if (mode === "week")  return dt >= weekStart   && dt < weekEnd;
    if (mode === "month") return dt >= monthStart  && dt < monthEnd;
    return true;
  });
}

// --- Helper: update tombol filter & badge teks ---
function updateHistoryFilterUI(mode) {
  const m = mode || "all";

  document.querySelectorAll(".js-hist-filter").forEach(btn => {
    const r = btn.dataset.range || "all";
    btn.classList.toggle("active", r === m);
  });

  const badge = document.getElementById("history-range-badge");
  if (badge) {
    const map = {
      all  : "最新400件を表示",
      today: "本日の履歴（最新400件まで）",
      week : "今週の履歴（最新400件まで）",
      month: "今月の履歴（最新400件まで）"
    };
    badge.textContent = map[m] || map.all;
  }
}

/* --- PERBAIKAN: renderHistory (Unified Version) --- */
/* Fitur: Filter Range, Admin Edit, & Mobile Responsive Card Class */
async function renderHistory(range) {
  try {
    if (range) { _HISTORY_FILTER = range; }
    const mode = _HISTORY_FILTER || "all";

    // Ambil data
    const raw = await api("history", { method: "GET" });
    const list = pickRows(raw);
    _HISTORY_CACHE = list.slice();

    // Pastikan Header Tabel (Desktop) Konsisten
    ensureHistoryHeader(); 

    const tbody = document.querySelector("#tbl-history tbody") || document.getElementById("tbl-history");
    if (!tbody) return;

    const admin = isAdmin();
    // --- KODE BARU: Munculkan Tombol Download Jika Admin ---
    const expGroup = document.getElementById('hist-export-group');
    if (expGroup) {
      if (admin) {
        expGroup.classList.remove('d-none');
        expGroup.classList.add('d-flex');
      } else {
        expGroup.classList.add('d-none');
        expGroup.classList.remove('d-flex');
      }
    }
    // Ambil 400 data terbaru, lalu filter berdasarkan tanggal
    let recent = list.slice(-400).reverse(); 
    recent = filterHistoryByRange(recent, mode);

    // KOSONG?
    if (!recent.length) {
      tbody.innerHTML = `<tr><td colspan="10" class="text-muted py-4 text-center">
        <div class="d-flex flex-column align-items-center">
          <i class="bi bi-inbox fs-1 mb-2 text-secondary opacity-25"></i>
          <div>履歴はありません (Tidak ada riwayat)</div>
        </div>
      </td></tr>`;
      updateHistoryFilterUI(mode);
      return;
    }

    // RENDER BARIS (Mobile Friendly logic via CSS classes)
   // --- KOREKSI: KEMBALIKAN KE STRUKTUR STANDARD 11 KOLOM AGAR DESKTOP RAPI ---
    tbody.innerHTML = recent.map(h => {
      // 1. Logic Warna & Icon
      const isOut = String(h.type||"").toUpperCase() === 'OUT';
      const badgeClass = isOut ? 'bg-danger-subtle text-danger' : 'bg-primary-subtle text-primary';
      const rowIcon = isOut ? '<i class="bi bi-box-arrow-right"></i>' : '<i class="bi bi-box-arrow-in-down"></i>';
      const devInfo = h.Device || h.device || "-";
      
      // 2. Format Tanggal
      let dateDisplay = h.timestamp || h.date || "";
      try {
        const d = new Date(dateDisplay);
        const y = d.getFullYear();
        const m = String(d.getMonth()+1).padStart(2,'0');
        const day = String(d.getDate()).padStart(2,'0');
        const hr = String(d.getHours()).padStart(2,'0');
        const min = String(d.getMinutes()).padStart(2,'0');
        dateDisplay = `${y}-${m}-${day} ${hr}:${min}`;
      } catch(e){}

      // 3. RETURN HTML: Pastikan jumlah TD persis sama dengan Header (11 Kolom)
      return `
      <tr data-row="${h.row || ""}" data-code="${escapeAttr(h.code || "")}" class="history-row">
        
        <td class="td-date">${dateDisplay}</td>
        
        <td class="td-id text-center">${escapeHtml(h.userId || "")}</td>
        
        <td class="td-user">${escapeHtml(h.userName || h.userId || "")}</td>
        
        <td class="td-code font-monospace">${escapeHtml(h.code || "")}</td>
        
        <td class="td-name fw-bold">${escapeHtml(h.itemName || h.name || "")}</td>
        
        <td class="td-qty text-end fw-bold" style="font-size:1.1em;">${fmt(h.qty || 0)}</td>
        
        <td class="td-unit text-center small text-muted">${escapeHtml(h.unit || "pcs")}</td>
        
        <td class="td-type text-center">
          <span class="badge ${badgeClass} border border-opacity-10">
            ${rowIcon} ${escapeHtml(h.type || "")}
          </span>
        </td>
        
        <td class="td-note small text-muted">${escapeHtml(h.note || "")}</td>
        
        <td class="td-device small text-muted text-truncate" style="max-width: 100px;" title="${escapeHtml(devInfo)}">
           <i class="bi bi-phone me-1"></i>${escapeHtml(devInfo)}
        </td>

        <td class="td-action text-end">
          ${admin ? `<button class="btn btn-sm btn-outline-primary btn-hist-fix py-0" style="font-size:0.8rem" data-code="${escapeAttr(h.code||"")}">修正 (Edit)</button>` : ""}
        </td>
      </tr>
    `}).join("");

    ensureViewAutoMenu("history", "#view-history .items-toolbar .right");

    // Sembunyikan header kolom terakhir jika bukan admin
    const table = tbody.closest("table");
    const thLast = table?.querySelector("thead tr th:last-child");
    if (!admin && thLast) thLast.style.display = "none";
    if (!admin) table?.querySelectorAll("tbody tr td:last-child").forEach(td => td.style.display = "none");

    // Re-bind click event untuk tombol edit (Admin)
    if (admin && !tbody.__histBound) {
      tbody.__histBound = true;
      tbody.addEventListener("click", (ev) => {
        const btn = ev.target.closest(".btn-hist-fix");
        if (!btn) return;
        ev.preventDefault();
        
        const tr = btn.closest("tr");
        const rowNo = Number(tr.getAttribute("data-row") || "0");
        
        // Ambil data dari textContent (hati-hati urutan kolom)
        const getTxt = (idx) => (tr.children[idx]?.innerText || "").trim();

        // Mapping ulang berdasarkan urutan TD di atas:
        // 0:Date, 1:ID, 2:Name, 3:Code, 4:ItemName, 5:Qty, 6:Unit, 7:Type, 8:Note
        openHistoryEditModal({
          row: rowNo,
          date: getTxt(0),
          userId: getTxt(1),
          userName: getTxt(2),
          code: getTxt(3),
          itemName: getTxt(4),
          qty: Number(getTxt(5).replace(/[,¥]/g, "")) || 0,
          unit: getTxt(6),
          type: getTxt(7).includes("OUT") ? "OUT" : "IN",
          note: getTxt(8)
        });
      });
    }

    updateHistoryFilterUI(mode);

  } catch (e) {
    console.error("renderHistory() error:", e);
    toast("履歴の読み込みに失敗しました。");
  }
}

function openHistoryEditModal(h) {
  if (!isAdmin()) {
    toast("Akses ditolak（管理者のみ）");
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "modal fade";
  wrap.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">履歴の修正</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="mb-2 small text-muted">
            コードやユーザー情報はそのままにして、数量・種別・備考を修正できます。
          </div>
          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label">日時</label>
              <input class="form-control" value="${escapeAttr(h.date || "")}" readonly>
            </div>
            <div class="col-md-4">
              <label class="form-label">ユーザー</label>
              <input class="form-control" value="${escapeAttr(h.userName || h.userId || "")}" readonly>
            </div>
            <div class="col-md-4">
              <label class="form-label">コード</label>
              <input class="form-control" value="${escapeAttr(h.code || "")}" readonly>
            </div>
            <div class="col-md-8">
              <label class="form-label">品名</label>
              <input class="form-control" value="${escapeAttr(h.itemName || "")}" readonly>
            </div>
            <div class="col-md-4">
              <label class="form-label">数量</label>
              <input id="hist-qty" type="number" class="form-control" value="${h.qty || 0}">
            </div>
            <div class="col-md-4">
              <label class="form-label">単位</label>
              <input id="hist-unit" class="form-control" value="${escapeAttr(h.unit || "pcs")}">
            </div>
            <div class="col-md-4">
              <label class="form-label">種別</label>
              <select id="hist-type" class="form-select">
                <option value="IN"  ${h.type === "OUT" ? "" : "selected"}>IN（入庫）</option>
                <option value="OUT" ${h.type === "OUT" ? "selected" : ""}>OUT（出庫）</option>
              </select>
            </div>
            <div class="col-12">
              <label class="form-label">備考</label>
              <textarea id="hist-note" class="form-control" rows="2">${escapeHtml(h.note || "")}</textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-bs-dismiss="modal">キャンセル</button>
          <button class="btn btn-primary" id="hist-save">保存</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);
  const modal = new bootstrap.Modal(wrap);
  modal.show();

  $("#hist-save", wrap)?.addEventListener("click", async () => {
    const qtyVal  = Number($("#hist-qty", wrap).value || 0);
    const unitVal = ($("#hist-unit", wrap).value || "pcs").trim() || "pcs";
    const typeVal = $("#hist-type", wrap).value || "IN";
    const noteVal = $("#hist-note", wrap).value || "";

    if (!Number.isFinite(qtyVal) || qtyVal <= 0) {
      toast("数量を正しく入力してください。");
      return;
    }

    try {
      const res = await api("historyEdit", {
        method: "POST",
        body: {
          row : h.row,
          qty : qtyVal,
          unit: unitVal,
          type: typeVal,
          note: noteVal
        }
      });

      if (res?.ok) {
        toast("履歴を修正しました。");
        modal.hide();
        wrap.remove();
        await renderHistory();      // refresh history
        renderDashboard();          // refresh dashboard
      } else {
        toast(res?.error || "修正に失敗しました。");
      }
    } catch (e) {
      toast("修正に失敗しました: " + (e?.message || e));
    }
  });

  wrap.addEventListener("hidden.bs.modal", () => wrap.remove(), { once: true });
}
function bindHistoryFilterUI() {
  const btns = document.querySelectorAll(".js-hist-filter");
  if (!btns.length) return;

  btns.forEach(btn => {
    if (btn.__bound) return;
    btn.__bound = true;

    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      const range = btn.dataset.range || "all";
      _HISTORY_FILTER = range;
      renderHistory(range);   // reload + apply filter
    });
  });
}
// --- KODE BARU: FUNGSI DOWNLOAD CSV HISTORY ---
function bindHistoryExportUI() {
  const btnExp = document.getElementById('btn-hist-export');
  if (!btnExp || btnExp.__bound) return;
  btnExp.__bound = true;

  btnExp.addEventListener('click', async (e) => {
    e.preventDefault();
    const who = getCurrentUser();
    if (!who || !isAdmin()) return toast('Akses ditolak (Admin Only)');

    const monthInput = document.getElementById('hist-export-month').value;
    if (!monthInput) {
      alert('出力する月を選択してください (Pilih bulan yang ingin didownload).');
      return;
    }

    try {
      setLoading(true, 'CSVデータを準備中...');
      
      const res = await api('historyExport', {
        method: 'POST',
        body: { month: monthInput }
      });

      if (!res || !res.ok) throw new Error(res?.error || 'Gagal menarik data');

      const rows = res.rows || [];
      if (rows.length === 0) {
        alert('指定した月の履歴データはありません。(Tidak ada data di bulan ini).');
        return;
      }

      // Format ke CSV
      const headers = ['日時', 'ユーザーID', '担当者', 'コード', '品名', '数量', '単位', '種別', '備考', '端末'];
      const csvRows = rows.map(r => {
        return [
          r.date, r.userId, r.userName, r.code, r.itemName, 
          r.qty, r.unit, r.type, r.note, r.device
        ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','); // Di-wrap tanda kutip agar aman dari koma
      });

      const csvStr = [headers.join(',')].concat(csvRows).join('\n');
      downloadCSV_JP(`履歴_${monthInput}.csv`, csvStr);
      toast('ダウンロードが完了しました。', 'success');

    } catch (err) {
      alert('エラー: ' + err.message);
    } finally {
      setLoading(false);
    }
  });
}
  // --- Tambahan: hint visual untuk input manual di 入出荷 ---
  function setManualHints({ autoFromLot } = { autoFromLot:false }){
    const qty  = document.getElementById('io-qty');
    const type = document.getElementById('io-type');
    if (!qty || !type) return;
    if (autoFromLot){
      qty.classList.remove('needs-manual');
      type.classList.remove('needs-manual');
      qty.dataset.autofill = '1';
    }else{
      qty.classList.add('needs-manual');
      type.classList.add('needs-manual');
      delete qty.dataset.autofill;
    }
  }

  /* --- KODE BARU: MESIN UNDO (BATALKAN SCAN) --- */
  let UNDO_TIMER = null;

  function showUndoToast(payload, oldStock, cachedItem) {
    const area = document.getElementById('toast-area');
    if (!area) return;

    // Hapus tombol undo sebelumnya jika ada scan baru yang sangat cepat
    const existing = document.getElementById('undo-toast');
    if (existing) existing.remove();
    clearTimeout(UNDO_TIMER);

    const el = document.createElement('div');
    el.id = 'undo-toast';
    el.className = `toast-mini text-bg-warning fade show mt-2 shadow-lg`;
    el.innerHTML = `
      <div class="d-flex align-items-center justify-content-between px-3 py-2">
        <div class="fw-bold text-dark"><i class="bi bi-check-circle-fill me-1"></i> 保存しました</div>
        <button id="btn-undo-action" class="btn btn-sm btn-dark fw-bold ms-3" style="border-radius:20px;">
          <i class="bi bi-arrow-counterclockwise"></i> 元に戻す (Undo)
        </button>
      </div>
      <div class="progress" style="height: 4px; background-color: rgba(0,0,0,0.1);">
        <div id="undo-progress" class="progress-bar bg-dark" style="width: 100%; transition: width 10s linear;"></div>
      </div>
    `;
    area.appendChild(el);

    // Jalankan animasi progress bar menyusut (10 detik)
    setTimeout(() => {
      const bar = document.getElementById('undo-progress');
      if (bar) bar.style.width = '0%';
    }, 50);

    // Aksi saat tombol Undo ditekan
    const btnUndo = document.getElementById('btn-undo-action');
    btnUndo.addEventListener('click', async () => {
       clearTimeout(UNDO_TIMER);
       el.remove();
       await executeUndo(payload, oldStock, cachedItem);
    });

    // Hilangkan otomatis setelah 10 detik
    UNDO_TIMER = setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 10000);
  }

  async function executeUndo(payload, oldStock, cachedItem) {
     // Balikkan transaksi (Jika tadinya IN jadi OUT, dan sebaliknya)
     const oppositeType = payload.type === 'IN' ? 'OUT' : 'IN';
     const undoPayload = {
       ...payload,
       type: oppositeType,
       note: '取消 (Undo Pembatalan)' // Catatan otomatis
     };

     // 1. Kembalikan stok di layar seketika (Optimistic UI)
     if (cachedItem) {
       cachedItem.stock = oldStock;
       renderItems();
       renderDashboard();
       const stockEl = document.getElementById("io-stock");
       const codeEl = document.getElementById("io-code");
       // Jika barang yang dibatalkan masih tampil di form IO, kembalikan angkanya
       if (stockEl && codeEl && codeEl.value === payload.code) stockEl.value = oldStock;
     }

     toast('取消しています... (Membatalkan...)', 'dark');

     // 2. Tembak ke server diam-diam
     try {
       const r = await api("log", { method: "POST", body: undoPayload, silent: true });
       if (!r?.ok) throw new Error(r?.error || "Gagal membatalkan");
       
       toast('スキャンを取り消しました (Berhasil dibatalkan)', 'success');
       if (typeof playBeep === 'function') playBeep(); // Bunyi sukses
       
       // Refresh tabel history agar rapi
       api("history", { method: "GET", silent: true }).then(raw => {
         const list = pickRows(raw);
         if(list.length) {
           _HISTORY_CACHE = list;
           const hv = document.getElementById("view-history");
           if (hv && hv.classList.contains("active")) renderHistory();
         }
       });
     } catch(e) {
       // Jika sinyal hilang saat membatalkan, masukkan ke antrean offline!
       const isNetworkError = /Failed to fetch|NetworkError|offline|タイムアウト/i.test(e.message);
       if(isNetworkError) {
          let queue = [];
          try { queue = JSON.parse(localStorage.getItem('offline_io_queue') || '[]'); } catch(err){}
          queue.push({ time: new Date().getTime(), payload: undoPayload });
          localStorage.setItem('offline_io_queue', JSON.stringify(queue));
          toast('📡 Sinyal lemah. Pembatalan disimpan di antrean HP.', 'warning');
       } else {
          toast('エラー: ' + e.message, 'danger');
       }
     }
  }
  /* ------------------------------------------------ */
  /* -------------------- IO Scanner -------------------- */
  let IO_SCANNER = null;

  function bindIO() {
    const btnStart = $("#btn-io-scan"),
          btnStop  = $("#btn-io-stop"),
          area     = $("#io-scan-area");
    if (!btnStart || !btnStop || !area) return;

    setManualHints({ autoFromLot:false });
// --- 🚦 IDE 1: TRAFFIC LIGHT FORM ---
    const ioTypeDropdown = document.getElementById("io-type");
    const ioFormCard = document.getElementById("form-io")?.closest(".card");
    
    if (ioTypeDropdown && ioFormCard) {
       ioTypeDropdown.addEventListener("change", (e) => {
          ioFormCard.classList.remove("in-mode", "out-mode");
          if (e.target.value === "IN") ioFormCard.classList.add("in-mode");
          else if (e.target.value === "OUT") ioFormCard.classList.add("out-mode");
       });
       // Pancing agar warna langsung berubah saat halaman dibuka
       setTimeout(() => ioTypeDropdown.dispatchEvent(new Event("change")), 500); 
    }
    // ------------------------------------
    
    const ioCode = document.getElementById("io-code");
    if (ioCode) {
      let timer = null;
     // --- PERBAIKAN: Handler Input & Scanner ---

  // 1. Event INPUT (untuk ketikan manual pelan)
  ioCode.addEventListener("input", (e) => {
    clearTimeout(timer);
    const v = (e.target.value || "").trim();

    if (!v) {
      const n = document.getElementById("io-name");
      const p = document.getElementById("io-price");
      const s = document.getElementById("io-stock");
      if (n) n.value = ""; 
      if (p) p.value = ""; 
      if (s) s.value = "";
      return;
    }
    // Timeout diperlambat (300ms) agar input manual tidak membebani server
    timer = setTimeout(() => { setManualHints({autoFromLot:false}); findItemIntoIO(v); }, 300);
  });

// 2. Event KEYDOWN (Khusus Scanner Laser Fisik - INSTANT)
  ioCode.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); 
      clearTimeout(timer); 
      const v = (ioCode.value || "").trim();
      if (v) {
         if (typeof playBeep === 'function') playBeep(); // Bunyikan suara TIT!
         setManualHints({autoFromLot:false}); 
         findItemIntoIO(v);
         
         // Langsung bersihkan kotak agar siap ditembak barcode berikutnya!
         setTimeout(() => { ioCode.value = ""; ioCode.focus(); }, 100);
      }
    }
  });
      ioCode.addEventListener("blur", () => {
        const v = (ioCode.value || "").trim();
        if (v) findItemIntoIO(v);
      });
    // --- FITUR BARU: Tekan ESC untuk Reset Form IO ---
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const viewIo = document.getElementById('view-io');
        // Hanya jalan jika layar yang aktif adalah layar Input IO
        if (viewIo && viewIo.classList.contains('active')) {
          e.preventDefault();
          const ioCode = document.getElementById('io-code');
          if (ioCode) {
            ioCode.value = '';
            document.getElementById('io-name').value = '';
            document.getElementById('io-price').value = '';
            document.getElementById('io-stock').value = '';
            document.getElementById('io-qty').value = '';
            document.getElementById('io-qty').dataset.lotId = '';
            ioCode.focus(); // Kembalikan kursor ke input kode
            
            // Beri tahu user bahwa form telah di-reset
            if (typeof toast === 'function') toast("フォームをリセットしました (Form direset)", "dark");
          }
        }
      }
    });
    }

    /* --- PERBAIKAN AGAR BISA SCAN BERULANG KALI --- */
/* --- PERBAIKAN AGAR BISA SCAN BERULANG KALI --- */
btnStart.addEventListener("click", async () => {
  document.body.classList.add("zen-mode-active"); // KAIZEN: Nyalakan Zen Mode
  try {
    // 1. Pastikan scanner sebelumnya benar-benar mati agar tidak crash
    // 1. Pastikan scanner sebelumnya benar-benar mati agar tidak crash
    if (IO_SCANNER) {
      await IO_SCANNER.stop().catch(() => {});
    }

    area.textContent = "カメラ起動中…";
    
   IO_SCANNER = await startBackCameraScan("io-scan-area", async (text) => {
  const parsed = parseScanText(String(text || ""));
  if (!parsed) return;

  if (parsed.kind === "item" || parsed.kind === "lot") {
    const code = parsed.code;
    $("#io-code").value = code;

    if (parsed.kind === "lot") {
      $("#io-qty").value = parsed.qty || "";
      $("#io-qty").dataset.lotId = parsed.lot || "";
    } else {
      $("#io-qty").dataset.lotId = "";
    }

    const item = await findItemIntoIO(code);
    if (typeof loadItemHistory === "function") loadItemHistory(code);

    // Setelah berhasil baca QR, kembalikan tampilan ke form.
    try { await IO_SCANNER?.stop?.(); } catch (_) {}
    try { IO_SCANNER?.clear?.(); } catch (_) {}
    IO_SCANNER = null;

    document.body.classList.remove("zen-mode-active");

    if (item) {
      area.innerHTML = `✅ スキャン完了：${escapeHtml(code)}<br><small>数量を入力して登録してください</small>`;
      $("#io-qty")?.focus();
    } else {
      area.innerHTML = `⚠ 未登録：${escapeHtml(code)}<br><small>商品マスタを確認してください</small>`;
      $("#io-code")?.focus();
    }
  }
});
  } catch (e) {
    toast("Kamera error: " + e.message, "danger");
  }
});

   btnStop.addEventListener("click", async () => {
      document.body.classList.remove("zen-mode-active"); // KAIZEN: Matikan Zen Mode
      try { await IO_SCANNER?.stop?.(); IO_SCANNER?.clear?.(); } catch (e) {}
      area.innerHTML = "カメラ待機中…";
    });

  // auto-stop saat tab disembunyikan
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        document.body.classList.remove("zen-mode-active"); // KAIZEN: Matikan Zen Mode
        try { IO_SCANNER?.stop?.(); IO_SCANNER?.clear?.(); } catch(e){}
        area.innerHTML = "カメラ待機中…";
      }
    });

   $("#btn-io-lookup")?.addEventListener("click", (e) => {
      e.preventDefault();
      const code = ($("#io-code").value || "").trim();
      if (code) findItemIntoIO(code);
    });

    // =================================================================
    // KAIZEN: KERANJANG SCAN MASAL (CART SYSTEM)
    // =================================================================
    let IO_CART = [];
    const cartContainer = document.getElementById("io-cart-container");
    const cartList = document.getElementById("io-cart-list");
    const cartCount = document.getElementById("io-cart-count");
    
    function renderIOCart() {
       if (IO_CART.length === 0) {
          if (cartContainer) cartContainer.classList.add("d-none");
          return;
       }
       if (cartContainer) cartContainer.classList.remove("d-none");
       if (cartCount) cartCount.textContent = IO_CART.length;
       
       if (cartList) {
          cartList.innerHTML = IO_CART.map((c, idx) => {
             const badgeClass = c.type === 'IN' ? 'bg-success' : 'bg-danger';
             return `
             <li class="list-group-item d-flex justify-content-between align-items-center">
               <div>
                 <span class="badge ${badgeClass} me-2">${c.type}</span>
                 <span class="fw-bold font-monospace">${escapeHtml(c.code)}</span> 
                 <span class="text-muted ms-2">x ${fmt(c.qty)} ${escapeHtml(c.unit)}</span>
               </div>
               <button type="button" class="btn btn-sm btn-light text-danger py-0 px-2" onclick="window.removeCartItem(${idx})"><i class="bi bi-trash3"></i></button>
             </li>`;
          }).join("");
       }
    }
    
    window.removeCartItem = (idx) => {
       IO_CART.splice(idx, 1);
       renderIOCart();
    };

    document.getElementById("btn-io-add-cart")?.addEventListener("click", () => {
       const code = ($("#io-code").value || "").trim();
       const qty = Number($("#io-qty").value);
       const typeRaw = $("#io-type").value || "IN";
       const type = (typeRaw.toUpperCase() === "OUT") ? "OUT" : "IN";
       
       if (!code || isNaN(qty) || qty <= 0) {
          return toast("コードと数量を正しく入力してください。(Kode dan Qty harus benar)", "warning");
       }
       
       IO_CART.push({ 
          code, qty, type, 
          unit: $("#io-unit").value || "pcs", 
          lotId: $("#io-qty").dataset.lotId || "" 
       });
       
       renderIOCart();
       toast(`🛒 ${code} をカートに追加しました (Masuk keranjang)`, "info");
       if (typeof playBeep === 'function') playBeep();
       
       // Reset form untuk scan berikutnya
       $("#io-code").value = ""; $("#io-qty").value = ""; $("#io-name").value = ""; $("#io-price").value = ""; $("#io-stock").value = "";
       $("#io-qty").dataset.lotId = "";
       $("#io-code").focus();
    });

    document.getElementById("btn-io-clear-cart")?.addEventListener("click", () => {
       IO_CART = []; renderIOCart();
    });

   document.getElementById("btn-io-submit-cart")?.addEventListener("click", async () => {
       if (IO_CART.length === 0) return;
       const btn = document.getElementById("btn-io-submit-cart");
       btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>送信中... (Mengirim...)';
       
       const who = getCurrentUser();
       let successCount = 0;
       
       for (const c of IO_CART) {
          const payloadData = { userId: who.id, userName: who.name || "", code: c.code, qty: c.qty, unit: c.unit, type: c.type, device: navigator.userAgent, lotId: c.lotId };
          try {
             const r = await api("log", { method: "POST", body: payloadData, silent: true });
             if (r?.ok) successCount++;
          } catch (e) {}
          await new Promise(resolve => setTimeout(resolve, 300)); 
       }
       
       toast(`✅ ${successCount} 件の一括登録が完了しました`, "success");
       IO_CART = []; renderIOCart();
       btn.disabled = false; btn.innerHTML = '<i class="bi bi-cloud-arrow-up-fill me-2"></i>一括登録';
       
       await fetchItemsDelta(true);
       renderItems(true);
       renderDashboard();
       
       // FIX: Beri jeda 2 detik agar Google Sheets selesai menulis data
       setTimeout(() => {
         api("history", { method: "GET", silent: true }).then(raw => {
            const list = pickRows(raw);
            if(list.length) { _HISTORY_CACHE = list; renderHistory(); }
         });
       }, 4000);
    });
    // =================================================================

   
 // --- REVISI app.js: IO Form Submit (日本語版) ---
    $("#form-io")?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const who = getCurrentUser();
      if (!who) return toast("ログインが必要です。"); 

      const code = ($("#io-code").value || "").trim();
      const qtyRaw = $("#io-qty").value; 
      const qty  = Number(qtyRaw);
      const unit = $("#io-unit").value || "pcs";
      
      const typeRaw = $("#io-type").value || "IN";
      const type = (typeRaw.toUpperCase() === "OUT") ? "OUT" : "IN";
      const typeLabel = (type === "IN") ? "入庫" : "出庫";

      if (!code) return toast("コードをスキャンまたは入力してください。"); 
      if (qtyRaw === "" || qty <= 0) return toast("正しい数量を入力してください。"); 

      const btn = $("#form-io button[type=submit]") || $("#btn-io-submit");
      if (btn?.__busy) return;
      if (btn) { btn.__busy = true; btn.disabled = true; btn.textContent = "処理中..."; } 

      // =================================================================
      // PENGECEKAN RIWAYAT TERAKHIR SEBELUM SUBMIT
      // =================================================================
      let lastHistory = null;
      if (Array.isArray(_HISTORY_CACHE)) {
         const itemHistories = _HISTORY_CACHE.filter(h => String(h.code) === String(code));
         if (itemHistories.length > 0) {
            itemHistories.sort((a, b) => new Date(b.date || b.timestamp || 0) - new Date(a.date || a.timestamp || 0));
            const latest = itemHistories[0];
            
            // FIX: Hanya muncul jika scan ganda terjadi dalam 5 menit terakhir
            const timeDiff = new Date() - new Date(latest.date || latest.timestamp || 0);
            if (timeDiff < 5 * 60 * 1000) { 
               lastHistory = latest;
            }
         }
      }

      if (lastHistory) {
         const lastDate = lastHistory.date || lastHistory.timestamp || "不明";
         const lastType = (lastHistory.type === "OUT") ? "出庫 (Keluar)" : "入庫 (Masuk)";
         const lastQty = lastHistory.qty || 0;
         
         const isConfirmed = await showCustomDialog({
           type: 'confirm',
           title: '⚠️ 重複チェック (Peringatan Riwayat)',
           message: `この商品は直近で取引されています。\n\n【前回】 ${lastDate} | ${lastType} | ${lastQty}\n\n続行しますか？ (Lanjutkan transaksi ini?)`,
           confirmText: '続行 (Lanjut)',
           cancelText: 'キャンセル (Batal)'
         });
         
         if (!isConfirmed) {
            if (btn) { btn.disabled = false; btn.__busy = false; btn.innerHTML = '<i class="bi bi-check2-circle me-1"></i> 登録'; }
            $("#io-qty").value = ""; 
            return; 
         }
      }

      // --- 1. OPTIMISTIC UPDATE (History & Stok Muncul Instan di Layar) ---
      const cachedItem = _ITEMS_CACHE.find(x => String(x.code) === String(code));
      let oldStock = 0;
      
      const device = navigator.userAgent || "Unknown Device";
      const scannedLotId = $("#io-qty").dataset.lotId || "";
      const payloadData = { userId: who.id, userName: who.name || "", code, qty, unit, type, device, lotId: scannedLotId };

      if (cachedItem) {
        oldStock = Number(cachedItem.stock || 0);
        const delta = (type === "IN" ? qty : -qty);
        const newStock = oldStock + delta;
        cachedItem.stock = newStock;
        
        // FIX: Tembak History buatan langsung ke UI agar langsung muncul di Timeline!
        const nowStr = new Date().toLocaleString("sv-SE").replace("T", " "); 
        _HISTORY_CACHE.unshift({
           date: nowStr,
           timestamp: nowStr,
           userId: who.id,
           userName: who.name || "",
           code: code,
           itemName: cachedItem.name,
           qty: qty,
           unit: unit,
           type: type,
           note: scannedLotId ? `LOT: ${scannedLotId}` : ""
        });
        
        renderItems(true); // Gunakan mode silent
        renderDashboard(); // Timeline & Dashboard otomatis update
        
        $("#io-qty").value = "";
        $("#io-stock").value = newStock;
        toast(`${typeLabel}: ${code} × ${qty} (在庫: ${newStock})`, "success"); 
        if (typeof playBeep === 'function') playBeep();
      }

      // --- 2. SERVER SYNC ---
      try {
        const r = await api("log", { 
          method: "POST", 
          body: payloadData,
          silent: true 
        });

        if (!r?.ok) throw new Error(r?.error || "サーバー保存失敗"); 
        
        showUndoToast(payloadData, oldStock, cachedItem);

        // FIX: Beri jeda 2 detik sebelum menarik history murni dari Server 
        // agar Google Sheets punya waktu untuk menyimpan barisnya.
        setTimeout(() => {
          api("history", { method: "GET", silent: true }).then(raw => {
             const list = pickRows(raw);
             if(list.length) {
               _HISTORY_CACHE = list;
               const hv = document.getElementById("view-history");
               if (hv && hv.classList.contains("active")) renderHistory();
             }
          });
        }, 2000);

      } catch (err) {
        const isNetworkError = /Failed to fetch|NetworkError|offline|タイムアウト/i.test(err.message);
        if (isNetworkError) {
          let queue = [];
          try { queue = JSON.parse(localStorage.getItem('offline_io_queue') || '[]'); } catch(e){}
          queue.push({ time: new Date().getTime(), payload: payloadData });
          localStorage.setItem('offline_io_queue', JSON.stringify(queue));
          toast(`📡 Sinyal terputus. Data disimpan di HP.`, "warning");
        } else {
          // Batal transaksi jika error dari server (Rollback)
          if (cachedItem) {
            cachedItem.stock = oldStock; 
            _HISTORY_CACHE.shift(); // Hapus history palsu
            renderItems(true);
            renderDashboard();
            $("#io-stock").value = oldStock;
          }
          toast("エラー: " + err.message, "danger"); 
        }
      } finally {
        if (btn) { btn.disabled = false; btn.__busy = false; btn.innerHTML = '<i class="bi bi-check2-circle me-1"></i> 登録'; }
        $("#io-code").focus();
      }
    });

  }

  async function startBackCameraScan(mountId, onScan, boxSize) {
    const isPhone = isMobile();
    const qrboxSize = boxSize ?? (isPhone ? 220 : 240);
    const mount = document.getElementById(mountId);
    if (mount) Object.assign(mount.style, { maxWidth: "420px", margin: "0 auto", aspectRatio: "4/3", position: "relative" });

    if ("BarcodeDetector" in window) {
      try {
        const ok = await (async () => {
          let stream;
          // --- KAIZEN HUD: SCI-FI SCANNER OVERLAY ---
          const video = Object.assign(document.createElement("video"), { playsInline: true, autoplay: true, muted: true });
          Object.assign(video.style, { width: "100%", height: "100%", objectFit: "cover" });
          
          mount.innerHTML = ""; 
          
          // Buat pembungkus relatif
          const scannerContainer = document.createElement('div');
          scannerContainer.id = 'scanner-container';
          scannerContainer.style.position = 'relative';
          scannerContainer.style.width = '100%';
          scannerContainer.style.height = '100%';
          
          // Masukkan Video
          scannerContainer.appendChild(video);
          
          // Buat HUD Overlay
          const hudOverlay = document.createElement('div');
          hudOverlay.className = 'scanner-hud-overlay';
          hudOverlay.innerHTML = `
              <div class="hud-corners top-left"></div>
              <div class="hud-corners top-right"></div>
              <div class="hud-corners bottom-left"></div>
              <div class="hud-corners bottom-right"></div>
              <div class="hud-laser"></div>
              <div class="hud-dot"></div>
              <div class="hud-status">SYSTEM_ACTIVE // SCANNING...</div>
          `;
          
          // Tempelkan Overlay di atas Video
          scannerContainer.appendChild(hudOverlay);
          
          // Tempelkan seluruh container ke layar
          mount.appendChild(scannerContainer);
          // ------------------------------------------

          const devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "videoinput");
          const back = devs.find(d => /back|rear|environment/i.test(d.label)) || devs.at(-1);
          const constraints = {
            audio: false,
            video: {
              deviceId: back ? { exact: back.deviceId } : { ideal: "environment" },
              width: { ideal: 1280 }, height: { ideal: 720 },
              focusMode: "continuous", exposureMode: "continuous"
            }
          };
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          video.srcObject = stream;

          await new Promise(r => setTimeout(r, 500));

          const detector = new BarcodeDetector({ formats: ["qr_code"] });
          let raf = 0, stopped = false;
        const loop = async () => {
            if (stopped) return;
            try {
              const codes = await detector.detect(video);
              if (codes?.length) {
                const txt = codes[0].rawValue || "";
                if (txt) { 
                  onScan(txt); 
                  // FIX: Hapus stop() dan return, ganti dengan jeda 1.5 detik
                  // Ini membiarkan kamera tetap hidup agar kamu bisa lanjut scan produk berikutnya!
                  await new Promise(r => setTimeout(r, 1500)); 
                }
              }
            } catch (e) { }
            raf = requestAnimationFrame(loop);
          };
          const stop = () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks()?.forEach(t => t.stop()); mount.innerHTML = ""; };
          loop();
          return { stop: async () => stop(), clear: () => { try { mount.innerHTML = ""; } catch (e) { } } };
        })();
        if (ok) return ok;
      } catch (e) { console.warn("Native detector gagal → fallback html5-qrcode", e); }
    }

    await ensureHtml5Qrcode();
    const formatsOpt = (window.Html5QrcodeSupportedFormats && Html5QrcodeSupportedFormats.QR_CODE)
      ? { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] }
      : {};
    const cfg = {
      fps: 30,
      qrbox: { width: qrboxSize, height: qrboxSize },
      aspectRatio: 1.33,
      rememberLastUsedCamera: true,
      disableFlip: true,
      videoConstraints: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        focusMode: "continuous",
        exposureMode: "continuous"
      },
      ...formatsOpt
    };
    const scanner = new Html5Qrcode(mountId, { useBarCodeDetectorIfSupported: true });
    async function startWith(source) {
      await scanner.start(source, cfg, txt => onScan(txt));
      try {
        await new Promise(r => setTimeout(r, 600));
        await scanner.applyVideoConstraints({ advanced: [{ focusMode: "continuous" }, { exposureMode: "continuous" }, { zoom: 3 }] }).catch(() => { });
      } catch (e) { }
      return scanner;
    }
    try { return await startWith({ facingMode: "environment" }); }
    catch (e) {
      const cams = await Html5Qrcode.getCameras();
      if (!cams?.length) throw new Error("カメラが見つかりません。権限をご確認ください。");
      const back = cams.find(c => /back|rear|environment/i.test(c.label)) || cams.at(-1);
      return await startWith({ deviceId: { exact: back.id } });
    }
  }

  // Parser QR
  function parseScanText(txt) {
    const s = String(txt || "").trim();

    if (/^ITEM\|/i.test(s)) {
      const code = normalizeCodeDash((s.split("|")[1] || "").trim());
      return { kind: "item", code };
    }
    if (/^LOT\|/i.test(s)) {
      const [, codeRaw, qtyRaw, lotRaw] = s.split("|");
      const code = normalizeCodeDash(codeRaw || "");
      const qty  = Number(qtyRaw || 0) || 0;
      const lot  = (lotRaw || "").trim();
      if (code && qty > 0) return { kind: "lot", code, qty, lot };
    }
    try {
      const o = JSON.parse(s);
      if ((o.t === "item" || o.type === "item") && o.code) {
        return { kind: "item", code: normalizeCodeDash(String(o.code)) };
      }
      if ((o.t === "lot" || o.type === "lot") && o.code && Number(o.qty || 0) > 0) {
        return { kind: "lot", code: normalizeCodeDash(String(o.code)), qty: Number(o.qty), lot: String(o.lot || "") };
      }
    } catch (e) {}
    return null;
  }

  // IO lookup form

async function findItemIntoIO(codeRaw) {
  const code = normalizeCodeDash(String(codeRaw || "")).trim();
  
  // 1. Ambil elemen input di layar
  const nameEl  = document.getElementById("io-name");
  const priceEl = document.getElementById("io-price");
  const stockEl = document.getElementById("io-stock");

  // 2. Kosongkan dulu layar
  if (nameEl) nameEl.value = "";
  if (priceEl) priceEl.value = "";
  if (stockEl) stockEl.value = "";

  // 3. Cari di memori (cache)
  let item = _ITEMS_CACHE.find(x => String(x.code) === code);
  
  // 4. Jika tidak ada di memori, tanya ke server
  if (!item) {
    try {
      const r = await api("itemByCode", { method: "POST", body: { code }, silent: true });
      if (r?.ok && r.item) item = r.item;
    } catch (e) {
      console.error("Gagal mengambil data item dari server:", e);
    }
  }

// JIKA ITEM KETEMU (Di dalam fungsi findItemIntoIO)
  if (item) {
    if (nameEl)  nameEl.value  = item.name || "";
    if (priceEl) priceEl.value = Number(item.price || 0);
    if (stockEl) stockEl.value = Number(item.stock || 0);
    
    // Suara Jepang Natural
    const msg = `OK。${item.name}。現在庫、${item.stock}`;
    speakJP(msg);
    
    // --- KAIZEN UI POST-SCAN: Pancing mata operator ke input Jumlah ---
    const qtyInput = document.getElementById("io-qty");
    if (qtyInput) {
        qtyInput.classList.remove("input-scan-highlight");
        void qtyInput.offsetWidth; // Trigger reflow agar animasi bisa diulang
        qtyInput.classList.add("input-scan-highlight");
        qtyInput.focus();
        qtyInput.select();
    }
    
 
    
    return item;
  } else {
    // 6. JIKA GAGAL
    if (code !== "") {
       toast("未登録の商品です: " + code, "warning");
       
       // HP bicara: "Peringatan. Barang belum terdaftar."
       speakJP("ご注意ください。未登録の商品です。");
    }
  }
}
  /* -------------------- Stocktake (棚卸) -------------------- */
  let SHELF_SCANNER = null;
  const ST = { rows: new Map() };

  const ST_DRAFT_KEY = "shelfDraftV1";
  function saveShelfDraft(){
    try{
      const arr = [...ST.rows.values()];
      const data = { at: new Date().toISOString(), rows: arr };
      localStorage.setItem(ST_DRAFT_KEY, JSON.stringify(data));
      toast("下書きを保存しました");
    }catch(e){ toast("保存失敗: " + (e?.message || e)); }
  }
  function loadShelfDraft(){
    try{
      const raw = localStorage.getItem(ST_DRAFT_KEY);
      if(!raw){ return toast("下書きがありません"); }
      const data = JSON.parse(raw||"{}");
      const map = new Map();
      (data.rows||[]).forEach(r => {
        const book = Number(r.book||0), qty=Number(r.qty||0);
        map.set(String(r.code), { code:String(r.code), name:r.name, department:(r.department||""), book, qty, diff: qty - book });
      });
      ST.rows = map;
      renderShelfTable();
      toast("下書きを読み込みました");
    }catch(e){ toast("読込失敗: " + (e?.message || e)); }
  }
  function clearShelfDraft(){
    try{ localStorage.removeItem(ST_DRAFT_KEY); toast("下書きを削除しました"); }catch (e) {}
  }

  window.ST = ST;

  async function addOrUpdateStocktake(code, realQty) {
    if (!code) return;
    let item = _ITEMS_CACHE.find(x => String(x.code) === String(code));
    if (!item) { const r = await api("itemByCode", { method: "POST", body: { code } }); if (r?.ok) item = r.item; }
    if (!item) return toast("アイテムが見つかりません: " + code);
    const book = Number(item.stock || 0);
    const qty = Number(realQty ?? book);
    const diff = qty - book;
    ST.rows.set(code, { code, name: item.name, department: (item.department || ""), book, qty, diff });
    renderShelfTable();
  }
  async function addOrIncStocktake(code, delta) {
    if (!code || !delta) return;
    let item = _ITEMS_CACHE.find(x => String(x.code) === String(code));
    if (!item) { const r = await api("itemByCode", { method: "POST", body: { code } }); if (r?.ok) item = r.item; }
    if (!item) return toast("アイテムが見つかりません: " + code);

    const row = ST.rows.get(code);
    const book = Number(item.stock || 0);
    const currentQty = row ? Number(row.qty || 0) : book;
    const newQty = currentQty + Number(delta);
    ST.rows.set(code, { code, name: item.name, department: (item.department || ""), book, qty: newQty, diff: newQty - book });
    renderShelfTable();
  }

/* =========================================================
     PERBAIKAN 1: renderShelfTable (Dengan Smart Alert Selisih Jauh)
     ========================================================= */
  function renderShelfTable() {
    const tbody = $("#tbl-stocktake"); if (!tbody) return;
    const isadmin = isAdmin();
    const arr = [...ST.rows.values()]; // Ambil data dari draft

    // Render baris tabel
    tbody.innerHTML = arr.map(r => {
      // --- KODE LOGIKA BARU: Deteksi Selisih Ekstrem ---
      // Anggap ekstrem jika selisih > 50 pcs ATAU selisih lebih dari 50% dari stok buku
      const isExtreme = Math.abs(r.diff) >= 50 || (r.book > 0 && Math.abs(r.diff) / r.book >= 0.5);
      
      // Jika ekstrem, baris dikasih warna background kuning muda (warning)
      const rowBgClass = isExtreme ? "bg-warning bg-opacity-10" : "";
      const diffIcon = isExtreme ? `<i class="bi bi-exclamation-triangle-fill text-warning me-1" title="Selisih terlalu jauh! Cek kembali"></i>` : "";
      // -------------------------------------------------

      return `
      <tr data-code="${escapeAttr(r.code)}" class="${rowBgClass}">
        <td>
          <div class="fw-bold">${escapeHtml(r.code)}</div>
          <div class="small text-muted">${escapeHtml(r.name)}</div>
        </td>
        <td class="text-end" style="vertical-align:middle">
          <span class="text-muted small">帳簿:</span> ${fmt(r.book)}
        </td>
        <td class="text-end" style="width:100px;">
          <input type="tel" inputmode="numeric" pattern="[0-9]*" 
                 class="form-control form-control-sm st-qty text-end fw-bold ${isExtreme ? 'border-warning' : ''}" 
                 style="font-size:1.1rem;"
                 value="${r.qty}" 
                 onclick="this.select()">
        </td>
        <td class="text-end align-middle">
          ${diffIcon}
          <span class="${r.diff !== 0 ? 'text-danger fw-bold' : 'text-success'}">
            ${r.diff > 0 ? '+' : ''}${fmt(r.diff)}
          </span>
        </td>
        <td class="text-end align-middle">
          <button class="btn btn-sm btn-outline-danger btn-st-del"><i class="bi bi-x-lg"></i></button>
        </td>
      </tr>
    `}).join("");

    // Hitung Summary di bawah tabel
    const sumEl = $("#st-summary");
    if (sumEl) {
      const total = arr.length;
      const diffRows = arr.filter(x => (x.diff||0) !== 0).length;
      const diffSum = arr.reduce((a,b)=>a+Number(b.diff||0),0);
      sumEl.innerHTML = `
        <div class="d-flex justify-content-between border-top pt-2 mt-2">
          <span>件数: <b>${total}</b></span>
          <span>差異あり: <b class="text-danger">${diffRows}</b></span>
          <span>差異合計: <b>${fmt(diffSum)}</b></span>
        </div>`;
    }

    // Logic saat user mengetik Qty manual di tabel
    tbody.oninput = (e) => {
      const el = e.target;
      if (!el.classList.contains("st-qty")) return;
      
      const tr = el.closest("tr");
      const code = tr.getAttribute("data-code");
      const rec = ST.rows.get(code); 
      
      if (rec) {
        const val = Number(el.value); // Ambil angka input
        rec.qty = isNaN(val) ? 0 : val; // Update Qty Fisik
        rec.diff = rec.qty - rec.book;  // Hitung Selisih
        
        ST.rows.set(code, rec); // Simpan ke memory
        
        // Panggil render ulang agar warna background langsung berubah saat mengetik
        renderShelfTable(); 
      }
    };

    // Logic Tombol Hapus (X)
    tbody.onclick = (e) => {
      const btn = e.target.closest(".btn-st-del");
      if (btn) {
        const tr = btn.closest("tr");
        const code = tr.getAttribute("data-code");
        if(confirm("リストから削除しますか？")) { 
            ST.rows.delete(code);
            renderShelfTable();
        }
      }
    };
  }
 /* =========================================================
   bindShelf() — FIX (single version, no duplicate blocks)
   ========================================================= */
function bindShelf() {
  // Guard supaya tidak bind berkali-kali
  if (bindShelf.__bound) return;
  bindShelf.__bound = true;

  // 1) Start Scan
// 1) Start Scan
  const btnStart = document.getElementById("btn-start-scan");
  if (btnStart) {
    btnStart.addEventListener("click", async (e) => {
      e.preventDefault();
      document.body.classList.add("zen-mode-active"); // KAIZEN: Nyalakan Zen Mode

      // Pastikan cache item ada

      // Pastikan cache item ada
      if (!_ITEMS_CACHE || _ITEMS_CACHE.length === 0) {
        api("items", { method: "GET", silent: true })
          .then(list => { _ITEMS_CACHE = Array.isArray(list) ? list : (list?.data || []); })
          .catch(()=>{});
      }

      try {
        const area = document.getElementById("scan-area");
        if (area) area.textContent = "カメラ起動中…";

        // Matikan scanner lama dulu biar bisa start ulang tanpa crash
        if (SHELF_SCANNER) {
          try { await SHELF_SCANNER.stop(); } catch(_) {}
          try { SHELF_SCANNER.clear?.(); } catch(_) {}
          SHELF_SCANNER = null;
        }

        SHELF_SCANNER = await startBackCameraScan("scan-area", async (text) => {
          const p = parseScanText(String(text || ""));
          if (!p) return;

          if (p.kind !== "item" && p.kind !== "lot") return;

          // cari item dari cache, kalau tidak ada fallback server
          let item = _ITEMS_CACHE.find(x => String(x.code) === String(p.code));
          if (!item) {
            try {
              const r = await api("itemByCode", { method: "POST", body: { code: p.code }, silent: true });
              if (r?.ok && r.item) item = r.item;
            } catch(_) {}
          }

          if (!item) {
            toast(`未登録商品: ${p.code}`, "warning");
            // Bicara: "Mitoroku desu" (Belum terdaftar)
            speakJP("未登録です"); 
            return;
          }

          // Ganti Beep dengan sebut nama barang + jumlah
          // Contoh: "Obeng, 5 ko"
          const currentQty = ST.rows.get(p.code)?.qty || 0;
          const nextQty = Number(currentQty) + 1;
          
          // Bicara: Nama Barang + Jumlah Baru
          // speakJP(`${item.name}。${nextQty}個`); 
          
          // ATAU Cukup Nama Barang saja (Lebih cepat):
          speakJP(item.name);

          const book  = Number(item.stock || 0);
          const exist = ST.rows.get(p.code);

          // Scan berulang: tambah +1 tiap scan
          const newQty = exist ? (Number(exist.qty || 0) + 1) : 1;

          ST.rows.set(p.code, {
            code: p.code,
            name: item.name || "",
            book: book,
            qty : newQty,
            diff: newQty - book,
            department: item.department || "",
            unit: item.unit || "pcs"
          });

          renderShelfTable();

          // fokus ke input qty baris tersebut (opsional)
          setTimeout(() => {
            const input = document.querySelector(`tr[data-code="${p.code}"] input.st-qty`);
            if (input) input.focus();
          }, 100);
        });

      } catch (err) {
        toast("カメラーエラー: " + (err?.message || err), "danger");
      }
    });
  }

  // 2) Stop Scan
 // 2) Stop Scan
  const btnStop = document.getElementById("btn-stop-scan");
  if (btnStop) {
    btnStop.addEventListener("click", async (e) => {
      e.preventDefault();
      document.body.classList.remove("zen-mode-active"); // KAIZEN: Matikan Zen Mode
      try { await SHELF_SCANNER?.stop?.(); } catch(_) {}
      try { SHELF_SCANNER?.clear?.(); } catch(_) {}
      SHELF_SCANNER = null;

      const area = document.getElementById("scan-area");
      if (area) area.textContent = "カメラ待機中…";
    });
  }

  // 3) Commit (kirim data)
  // 3) Commit (kirim data)
  const btnCommit = document.getElementById("st-commit");
  if (btnCommit) {
    btnCommit.addEventListener("click", async (e) => {
      e.preventDefault();

      const who = getCurrentUser();
      if (!who) return toast("ログインしてください。", "danger");

    const rows = [...ST.rows.values()];
      if (!rows.length) return toast("棚卸データがありません。", "warning");

      // MENGGUNAKAN CUSTOM DIALOG
      const isSure = await showCustomDialog({
        type: 'confirm',
        title: '棚卸確定 (Commit Opname)',
        message: `棚卸データ ${rows.length} 件を確定し、在庫を更新しますか？\n(Yakin ingin memperbarui ${rows.length} data stok ke database?)`,
        confirmText: '確定 (Commit)',
        cancelText: '戻る (Kembali)'
      });

      if (!isSure) return;

      if (btnCommit.__busy) return;
      btnCommit.__busy = true;
      btnCommit.disabled = true;
      btnCommit.textContent = "送信中...";

      try {
        setLoading(true, "最新の在庫データを同期中... (Sinkronisasi stok terbaru...)");

        // =================================================================
        // KODE TAMBAHAN: SINKRONISASI STOK BUKU TERBARU SEBELUM COMMIT
        // =================================================================
        // Tarik data terbaru dari server agar nilai 'book' akurat
        await fetchItemsDelta(true); 
        
        const payloadRows = rows.map(r => {
          // Cari item ini di data terbaru
          const latestItem = _ITEMS_CACHE.find(x => String(x.code) === String(r.code));
          
          // Update nilai buku dengan nilai dari database terbaru
          const currentBook = latestItem ? Number(latestItem.stock || 0) : Number(r.book || 0);
          
          // Hitung ulang selisih berdasarkan fisik vs buku terbaru
          const realQty = Number(r.qty || 0);
          const newDiff = realQty - currentBook;

          return {
            code: r.code,
            name: r.name,
            book: currentBook,   // Gunakan nilai buku terbaru
            qty : realQty,
            diff: newDiff,       // Gunakan selisih terbaru
            unit: r.unit || "pcs",
            department: r.department || ""
          };
        });
        // =================================================================
        // AKHIR KODE TAMBAHAN
        // =================================================================
        
        setLoading(true, "棚卸データを送信中... (Mengirim data...)");

        const res = await api("tanaCommit", {
          method: "POST",
          body: { userId: who.id, userName: who.name || "", rows: payloadRows }
        });

        if (!res?.ok) throw new Error(res?.error || "保存に失敗しました");

        toast(`完了: ${res.updated || payloadRows.length}件 更新`, "success");
        ST.rows = new Map();
        renderShelfTable();
        try { clearShelfDraft(); } catch(_) {}

        await renderItems();
        renderDashboard();

      } catch (err) {
        toast("エラー: " + (err?.message || err), "danger");
      } finally {
        setLoading(false);
        btnCommit.disabled = false;
        btnCommit.__busy = false;
        btnCommit.textContent = "確定 (Commit)";
      }
    });
  }
  // Utility buttons (ikat sekali)
  const btnClear = document.getElementById("st-clear");
  if (btnClear && !btnClear.__bound) {
    btnClear.__bound = true;
    btnClear.addEventListener("click", () => {
      if (!confirm("クリアしますか？")) return;
      ST.rows = new Map();
      renderShelfTable();
      try { clearShelfDraft(); } catch(_) {}
    });
  }

  const btnSave = document.getElementById("st-save");
  if (btnSave && !btnSave.__bound) {
    btnSave.__bound = true;
    btnSave.addEventListener("click", (e) => { e.preventDefault(); saveShelfDraft(); });
  }

  const btnLoad = document.getElementById("st-load");
  if (btnLoad && !btnLoad.__bound) {
    btnLoad.__bound = true;
    btnLoad.addEventListener("click", (e) => { e.preventDefault(); loadShelfDraft(); });
  }

  // Manual add
  const stAddBtn = document.getElementById("st-add");
  if (stAddBtn && !stAddBtn.__bound) {
    stAddBtn.__bound = true;
    stAddBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      const codeInput = document.getElementById("st-code");
      const qtyInput  = document.getElementById("st-qty");
      const code = (codeInput?.value || "").trim();
      const qtyVal = Number(qtyInput?.value || 0);

      if (!code) return toast("コードを入力してください。", "warning");

      let item = _ITEMS_CACHE.find(x => String(x.code) === String(code));
      if (!item) {
        try {
          const r = await api("itemByCode", { method: "POST", body: { code }, silent: true });
          if (r?.ok && r.item) item = r.item;
        } catch(_) {}
      }
      if (!item) return toast("商品が見つかりません。", "danger");

      const book = Number(item.stock || 0);

      ST.rows.set(code, {
        code,
        name: item.name || "",
        book,
        qty : Number.isFinite(qtyVal) ? qtyVal : 0,
        diff: (Number.isFinite(qtyVal) ? qtyVal : 0) - book,
        department: item.department || "",
        unit: item.unit || "pcs"
      });

      renderShelfTable();
      toast("追加しました", "success");
      if (codeInput) codeInput.value = "";
      if (qtyInput) qtyInput.value = "";
    });
  }
}

  /* -------------------- Tanaoroshi List (棚卸一覧) -------------------- */

  const JP_TANA_MAP = {
    period : "棚卸年月",
    date   : "日付",
    code   : "コード",
    name   : "品名",
    qty    : "数量",
    unit   : "単位",
    price  : "単価",
    amount : "金額",
    location   : "場所",
    department : "部門",
    userId     : "担当者",
    note       : "備考"
  };

  let _TANA_ROWS = [];

  function tanaJPHeaders() { return Object.values(JP_TANA_MAP); }

  function formatTanaNote(row) {
    const raw = String(row.note || "");
    let book = row.book;
    let diff = row.diff;

    if (book == null || diff == null) {
      const m = raw.match(/book:\s*(-?\d+)\s+diff:\s*(-?\d+)/i);
      if (m) {
        book = Number(m[1]);
        diff = Number(m[2]);
      }
    }
    if (book != null || diff != null) {
      const b = Number(book || 0);
      const d = Number(diff || 0);
      return `帳簿:${fmt(b)} / 差異:${fmt(d)}`;
    }
    return raw;
  }

  function tanaToJPRow(row) {
    return {
      [JP_TANA_MAP.period]    : row.period || "",
      [JP_TANA_MAP.date]      : row.date || "",
      [JP_TANA_MAP.code]      : row.code || "",
      [JP_TANA_MAP.name]      : row.name || "",
      [JP_TANA_MAP.qty]       : String(row.qty ?? ""),
      [JP_TANA_MAP.unit]      : row.unit || "pcs",
      [JP_TANA_MAP.price]     : row.price != null ? String(row.price) : "",
      [JP_TANA_MAP.amount]    : row.amount != null ? String(row.amount) : "",
      [JP_TANA_MAP.location]  : row.location || "",
      [JP_TANA_MAP.department]: row.department || "",
      [JP_TANA_MAP.userId]    : row.userId || "",
      [JP_TANA_MAP.note]      : formatTanaNote(row)
    };
  }

  function renderTanaTable() {
    const tbl = document.getElementById("tbl-tana");
    if (!tbl) return;

    const heads        = tanaJPHeaders();
    const headsWithOps = [...heads, "操作"];

    const monthSel = document.getElementById("tana-month");
    const month    = (monthSel?.value || "").trim();

    const data = month
      ? _TANA_ROWS.filter(r => r.period === month)
      : _TANA_ROWS.slice();

    // header
    tbl.innerHTML =
      "<thead><tr>" +
      headsWithOps.map(h => `<th>${h}</th>`).join("") +
      "</tr></thead>";

    if (!data.length) {
      tbl.insertAdjacentHTML(
        "beforeend",
        `<tbody><tr><td colspan="${headsWithOps.length}" class="text-muted py-4 text-center">データはありません</td></tr></tbody>`
      );
      updateTanaSummary();
      bindTanaTableEvents();
      return;
    }

    let totalAmount = 0;

    const bodyHtml =
      "<tbody>" +
      data.map((row) => {
        const jpRow = tanaToJPRow(row);
        const code  = jpRow[JP_TANA_MAP.code] || "";

        totalAmount += Number(row.amount || 0);

        const tds = heads.map(h => {
          const v = jpRow[h] ?? "";
          if (h === JP_TANA_MAP.price || h === JP_TANA_MAP.amount) {
            const num = Number(v || 0);
            return `<td class="text-end">${num ? "¥" + fmt(num) : ""}</td>`;
          }
          if (h === JP_TANA_MAP.qty) {
            return `<td class="text-end">${fmt(v)}</td>`;
          }
          return `<td>${escapeHtml(v)}</td>`;
        }).join("");

       // KAIZEN: Maker-Checker UI (Approval System)
        const isPending = (row.note || "").includes('【要承認】');
        const isAdminUser = isAdmin();
        
        let actionButtons = `<button class="btn btn-sm btn-outline-primary btn-tana-edit mb-1">編集 (Edit)</button>`;
        
        // Jika butuh persetujuan dan yang buka adalah Admin, tampilkan tombol Centang & Silang
        if (isPending && isAdminUser) {
           actionButtons = `
             <div class="d-flex gap-1 justify-content-end">
               <button class="btn btn-sm btn-success btn-tana-approve px-2 shadow-sm" title="承認 (Setujui)"><i class="bi bi-check-lg fw-bold"></i></button>
               <button class="btn btn-sm btn-danger btn-tana-reject px-2 shadow-sm" title="却下 (Tolak)"><i class="bi bi-x-lg fw-bold"></i></button>
             </div>
           `;
        } else if (isPending && !isAdminUser) {
           actionButtons = `<span class="badge bg-warning text-dark"><i class="bi bi-hourglass-split"></i> 承認待ち (Menunggu Admin)</span>`;
        } else if ((row.note || "").includes('【承認済】')) {
           actionButtons = `<span class="badge bg-success"><i class="bi bi-check-all"></i> 完了 (Selesai)</span>`;
        } else if ((row.note || "").includes('【却下】')) {
           actionButtons = `<span class="badge bg-danger"><i class="bi bi-x-circle"></i> 却下 (Ditolak)</span>`;
        }

        return `
          <tr data-idx="${row.idx}" data-code="${escapeAttr(code)}">
            ${tds}
            <td class="text-end align-middle">
              ${actionButtons}
            </td>
          </tr>`;
      }).join("") +
      "</tbody>";

    const idxAmount = heads.indexOf(JP_TANA_MAP.amount);
    const leftSpan  = idxAmount;
    const rightSpan = headsWithOps.length - idxAmount - 1;

    const tfootHtml = `
      <tfoot>
        <tr>
          <td colspan="${leftSpan}" class="text-end fw-bold">合計金額</td>
          <td class="text-end fw-bold">¥${fmt(totalAmount)}</td>
          <td colspan="${rightSpan}"></td>
        </tr>
      </tfoot>`;

    tbl.insertAdjacentHTML("beforeend", bodyHtml + tfootHtml);

    updateTanaSummary();
    bindTanaTableEvents();
  }

  function updateTanaSummary() {
    const host = document.getElementById("tana-summary");
    if (!host) return;
    if (!_TANA_ROWS.length) {
      host.textContent = "";
      return;
    }

    const agg = new Map();
    for (const r of _TANA_ROWS) {
      const key = r.period || "不明";
      const cur = agg.get(key) || { qty: 0, amount: 0 };
      cur.qty    += Number(r.qty || 0);
      cur.amount += Number(r.amount || 0);
      agg.set(key, cur);
    }

    const rows = [...agg.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    const html =
      '<div class="fw-semibold mb-1">月別集計（全データ）</div>' +
      '<div class="table-responsive"><table class="table table-sm mb-0">' +
      '<thead><tr><th>棚卸年月</th><th class="text-end">数量合計</th><th class="text-end">金額合計</th></tr></thead>' +
      '<tbody>' +
      rows.map(([period, v]) => `
        <tr>
          <td>${escapeHtml(period)}</td>
          <td class="text-end">${fmt(v.qty)}</td>
          <td class="text-end">¥${fmt(v.amount)}</td>
        </tr>`).join("") +
      '</tbody></table></div>';

    host.innerHTML = html;
  }

  function bindTanaFilterUI() {
    const monthSel = document.getElementById("tana-month");
    if (monthSel && !monthSel.__bound) {
      monthSel.__bound = true;
      monthSel.addEventListener("change", () => renderTanaTable());
    }
    const clearBtn = document.getElementById("tana-month-clear");
    if (clearBtn && !clearBtn.__bound) {
      clearBtn.__bound = true;
      clearBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (monthSel) monthSel.value = "";
        renderTanaTable();
      });
    }
  }

  function bindTanaTableEvents() {
    const tbl = document.getElementById("tbl-tana");
    if (!tbl || tbl.__tanaBound) return;
    tbl.__tanaBound = true;

    tbl.addEventListener("click", async (ev) => {
      const tr = ev.target.closest("tr");
      if (!tr) return;
      const idx = Number(tr.getAttribute("data-idx") || "-1");
      const row = _TANA_ROWS.find(r => r.idx === idx);
      if (!row) return;

      const btnEdit = ev.target.closest(".btn-tana-edit");
      if (btnEdit) {
        openTanaEditModal(row);
        return;
      }

      // KAIZEN: Handle Approve & Reject
      const btnApprove = ev.target.closest(".btn-tana-approve");
      const btnReject = ev.target.closest(".btn-tana-reject");

      if (btnApprove || btnReject) {
         const isApprove = !!btnApprove;
         const actionName = isApprove ? "tanaApprove" : "tanaReject";
         const actionTitle = isApprove ? "承認 (Setujui)" : "却下 (Tolak)";
         const confirmMsg = isApprove 
            ? `「${row.name}」の棚卸結果を承認し、在庫を更新しますか？\n(Yakin menyetujui opname ini dan mengubah stok database menjadi ${row.qty}?)` 
            : `この棚卸結果を却下しますか？\n(Yakin menolak opname ini? Stok tidak akan diubah.)`;

         const isSure = await showCustomDialog({
            type: 'confirm',
            title: `棚卸${actionTitle}`,
            message: confirmMsg,
            confirmText: 'はい (Ya)',
            cancelText: 'キャンセル (Batal)'
         });

         if (!isSure) return;

         try {
            setLoading(true, "処理中... (Memproses...)");
            const res = await api(actionName, {
               method: "POST",
               body: { date: row.date, code: row.code, qty: row.qty, diff: row.diff, name: row.name }
            });

            if (res && res.ok) {
               showCustomDialog({ title: '成功 (Berhasil)', message: res.message, type: 'alert' });
               loadTanaList(); // Refresh tabel
               fetchItemsDelta(true); // Sync master stok di background
            } else {
               showCustomDialog({ title: 'エラー', message: res?.error || 'Gagal memproses', type: 'alert' });
            }
         } catch (e) {
            showCustomDialog({ title: 'エラー', message: e.message, type: 'alert' });
         } finally {
            setLoading(false);
         }
      }
    });
  }

  function openTanaEditModal(row) {
    const who = getCurrentUser();
    if (!who) return toast("ログイン情報がありません。");

    const wrap = document.createElement("div");
    wrap.className = "modal fade";
    wrap.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header"><h5 class="modal-title">棚卸数量の編集</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
          <div class="modal-body">
            <div class="mb-2 small text-muted">コード・名称などは変更不可です。数量のみ編集できます。</div>
            <div class="row g-3">
              <div class="col-md-6"><label class="form-label">コード</label>
                <input class="form-control" value="${escapeAttr(row.code)}" readonly></div>
              <div class="col-md-6"><label class="form-label">品名</label>
                <input class="form-control" value="${escapeAttr(row.name || "")}" readonly></div>
              <div class="col-md-4"><label class="form-label">棚卸年月</label>
                <input class="form-control" value="${escapeAttr(row.period || "")}" readonly></div>
              <div class="col-md-4"><label class="form-label">単価</label>
                <input class="form-control" value="${fmt(row.price || 0)}" readonly></div>
              <div class="col-md-4"><label class="form-label">数量</label>
                <input id="tana-edit-qty" type="number" class="form-control" min="0" value="${row.qty}"></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">キャンセル</button>
            <button class="btn btn-primary" id="tana-edit-save">保存</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    const modal = new bootstrap.Modal(wrap); modal.show();

    $("#tana-edit-save", wrap)?.addEventListener("click", async () => {
      const qtyVal = Number($("#tana-edit-qty", wrap).value || 0);
      if (!Number.isFinite(qtyVal) || qtyVal < 0) {
        return toast("数量を正しく入力してください。");
      }

      const oldQty = Number(row.qty || 0);
      const delta  = qtyVal - oldQty;

      let book = row.book;
      let oldDiff = row.diff;
      if (book == null || oldDiff == null) {
        const m = String(row.note || "").match(/book:\s*(-?\d+)\s+diff:\s*(-?\d+)/i);
        if (m) {
          book    = Number(m[1]);
          oldDiff = Number(m[2]);
        }
      }
      if (book == null) {
        book = oldQty - (oldDiff || 0);
      }
      const newDiff = qtyVal - book;

      try {
        if (delta !== 0) {
          const type = delta > 0 ? "IN" : "OUT";
          const qty  = Math.abs(delta);
          await api("log", {
            method: "POST",
            body: {
              userId: who.id,
              code  : row.code,
              qty,
              unit  : row.unit || "pcs",
              type,
              note  : "棚卸修正"
            }
          });
        }

        await api("tanaSave", {
          method: "POST",
          body: {
            code      : row.code,
            name      : row.name,
            qty       : qtyVal,
            unit      : row.unit || "pcs",
            location  : row.location || "",
            department: row.department || "",
            userId    : row.userId || who.id,
            note      : `book:${book} diff:${newDiff}`
          }
        });

        toast("棚卸数量を保存しました。");
        modal.hide();
        wrap.remove();
        loadTanaList();
      } catch (e) {
        console.error(e);
        toast("保存に失敗しました。");
      }
    });

    wrap.addEventListener("hidden.bs.modal", () => wrap.remove(), { once: true });
  }

  async function loadTanaList() {
    try {
      const [res, itemsRaw] = await Promise.all([
        api("tanaList", { method: "GET" }),
        api("items",   { method: "GET", silent: true }).catch(() => [])
      ]);

      const rowsRaw =
        Array.isArray(res)        ? res :
        Array.isArray(res?.rows) ? res.rows :
        Array.isArray(res?.data) ? res.data : [];

      const items =
        Array.isArray(itemsRaw) ? itemsRaw :
        Array.isArray(itemsRaw?.data) ? itemsRaw.data : [];

      const mapItems = new Map(items.map(it => [String(it.code), it]));

      _TANA_ROWS = rowsRaw.map((r, idx) => {
        const date   = r.date || "";
        const period = date ? String(date).slice(0, 7) : "";
        const code   = r.code || "";
        const item   = mapItems.get(String(code)) || {};

        const qty   = Number(r.qty || 0);
        const unit  = r.unit || "pcs";
        const price = (r.price != null)
          ? Number(r.price || 0)
          : Number(item.price || 0);
        const amount = qty * price;

        const location   = r.location   || item.location   || "";
        const department = r.department || item.department || "";

        return {
          idx,
          period,
          date,
          code,
          name      : r.name || item.name || "",
          qty,
          unit,
          price,
          amount,
          location,
          department,
          userId    : r.userId || "",
          note      : r.note || "",
          book      : (typeof r.book !== "undefined") ? Number(r.book || 0) : null,
          diff      : (typeof r.diff !== "undefined") ? Number(r.diff || 0) : null
        };
      });

      renderTanaTable();
      bindTanaFilterUI();
      ensureViewAutoMenu("shelf-list", "#view-shelf-list .items-toolbar .right");
    } catch (e) {
      console.error("loadTanaList error", e);
      const tbl = document.getElementById("tbl-tana");
      if (tbl) {
        tbl.innerHTML =
          '<tbody><tr><td colspan="5" class="text-danger py-4">取得に失敗しました</td></tr></tbody>';
      }
      const host = document.getElementById("tana-summary");
      if (host) host.textContent = "取得に失敗しました。";
      ensureViewAutoMenu("shelf-list", "#view-shelf-list .items-toolbar .right");
    }
  }

  // CSV Export / Import untuk 棚卸一覧 (per bulan)
  $("#tana-exp")?.addEventListener("click", (e)=> {
    e.preventDefault();
    if (!_TANA_ROWS.length) {
      alert("データがありません。");
      return;
    }

    const month = (document.getElementById("tana-month")?.value || "").trim();
    const rows  = month
      ? _TANA_ROWS.filter(r => r.period === month)
      : _TANA_ROWS.slice();

    if (!rows.length) {
      alert("該当するデータがありません。");
      return;
    }

    const heads = tanaJPHeaders();
    const csvRows = rows.map(r => {
      const jp = tanaToJPRow(r);
      return heads.map(h => {
        let v = jp[h] ?? "";
        v = String(v).replace(/,/g, " ");
        return v;
      }).join(",");
    });

    const fname = month ? `棚卸_${month}.csv` : "棚卸.csv";
    const csv   = [heads.join(",")].concat(csvRows).join("\n");
    downloadCSV_JP(fname, csv);
  });
$("#tana-exp-year")?.addEventListener("click", (e)=> {
  e.preventDefault();

  if (!_TANA_ROWS.length) {
    alert("データがありません。");
    return;
  }

  let year = "";

  // 1) Kalau kamu punya select <select id="tana-year">, pakai dulu itu
  const ySel = document.getElementById("tana-year");
  if (ySel && ySel.value) {
    year = String(ySel.value).trim();
  } else {
    // 2) Kalau user sudah pilih month (YYYY-MM), ambil tahunnya
    const mVal = (document.getElementById("tana-month")?.value || "").trim();
    if (mVal && /^\d{4}-\d{2}$/.test(mVal)) {
      year = mVal.slice(0, 4); // "2025-11" → "2025"
    }
  }

  // 3) Kalau masih kosong → tanya pakai prompt
  if (!year) {
    const nowY  = new Date().getFullYear();
    const input = prompt("出力したい年(YYYY)を入力してください。", String(nowY));
    if (!input) return;
    if (!/^\d{4}$/.test(input)) {
      alert("年は YYYY 形式で入力してください。");
      return;
    }
    year = input;
  }

  // Filter data berdasarkan tahun (period = "YYYY-MM")
  const rows = _TANA_ROWS.filter(r => String(r.period || "").slice(0, 4) === year);
  if (!rows.length) {
    alert("該当するデータがありません。");
    return;
  }

  const heads = tanaJPHeaders();
  const csvRows = rows.map(r => {
    const jp = tanaToJPRow(r);
    return heads.map(h => {
      let v = jp[h] ?? "";
      v = String(v).replace(/,/g, " ");  // amankan koma
      return v;
    }).join(",");
  });

  const fname = `棚卸_${year}.csv`;
  const csv   = [heads.join(",")].concat(csvRows).join("\n");
  downloadCSV_JP(fname, csv);
});

 $("#input-tana-imp")?.addEventListener("change", async (ev)=> {
    const file = ev.target.files?.[0]; if(!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setLoading(true, "CSVをインポート中..."); // Tampilkan loading
        
        const text = e.target.result;
        // Encode teks UTF-8 ke Base64 dengan aman agar Kanji tidak hancur
        const b64 = btoa(unescape(encodeURIComponent(text)));
        
        const resp = await api("tanaImportCSV", { method:'POST', body:{ csvBase64: b64 } });
        
        if(!resp || !resp.ok) {
          alert('インポート失敗: ' + (resp?.error || 'Gagal memproses'));
        } else {
          toast(`インポート成功: ${resp.imported} 行 (Berhasil!)`, "success");
          loadTanaList(); // Refresh tabel setelah upload
        }
      } catch (err) {
        alert('エラー: Format CSV tidak didukung.');
      } finally {
        setLoading(false);
      }
    };
    
    // Excel di Jepang biasanya menggunakan Shift-JIS. 
    // Jika CSV Anda murni UTF-8, ganti 'Shift_JIS' menjadi 'UTF-8'
    reader.readAsText(file, 'Shift_JIS'); 
    
    ev.target.value = ''; // Reset input agar file yang sama bisa diupload lagi
  });

  /* -------------------- Auto-refresh UI helpers -------------------- */
  function itemsAuto_refreshLabel(sec){
    const btn = document.getElementById("btn-items-auto");
    if (!btn) return;
    if (!sec) btn.textContent = "Auto: Off";
    else if (sec >= 60) btn.textContent = `Auto: ${Math.round(sec/60)}分`;
    else btn.textContent = `Auto: ${sec}秒`;
  }
function itemsAuto_extendMenu(){
    const btn = document.getElementById("btn-items-auto");
    const menu = btn?.parentElement?.querySelector(".dropdown-menu");
    if (!menu) return;
    // FIX: Tambahkan opsi 10 detik (Realtime)
    if (!menu.querySelector('[data-autorefresh="10"]')) {
      menu.innerHTML = ""; // Bersihkan menu lama
      menu.insertAdjacentHTML("beforeend", `
        <li><a class="dropdown-item" data-autorefresh="10">10秒（リアルタイム - Realtime）</a></li>
        <li><a class="dropdown-item" data-autorefresh="30">30秒</a></li>
        <li><a class="dropdown-item" data-autorefresh="60">60秒（1分）</a></li>
        <li><a class="dropdown-item" data-autorefresh="300">300秒（5分）</a></li>
      `);
    }
    menu.querySelectorAll("[data-autorefresh]").forEach(a => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const sec = Number(a.getAttribute("data-autorefresh") || "0");
        itemsAuto_refreshLabel(sec);
        setLiveRefresh(sec);
      });
    });
    const saved = Number(localStorage.getItem(LIVE_KEY) || "30");
    itemsAuto_refreshLabel(saved);
  }

  function ensureViewAutoMenu(viewKey, toolbarRightSel){
    const host = document.querySelector(toolbarRightSel); if (!host) return;
    const BTN_ID = `btn-auto-${viewKey}`;
    const WRAP_ID = `auto-wrap-${viewKey}`;
    const saved = Number(localStorage.getItem(LIVE_KEY) || "30");
    
    if (document.getElementById(BTN_ID)) {
      const btn = document.getElementById(BTN_ID);
      if (btn) btn.textContent = !saved ? "Auto: Off" : (saved >= 60 ? `Auto: ${Math.round(saved/60)}分` : `Auto: ${saved}秒`);
      return;
    }
    const wrap = document.createElement("div");
    wrap.id = WRAP_ID;
    wrap.className = "btn-group";
    wrap.innerHTML = `
      <button id="${BTN_ID}" class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">Auto</button>
      <ul class="dropdown-menu dropdown-menu-end">
        <li><a class="dropdown-item" data-autorefresh="10">10秒（リアルタイム - Realtime）</a></li>
        <li><a class="dropdown-item" data-autorefresh="30">30秒</a></li>
        <li><a class="dropdown-item" data-autorefresh="60">60秒（1分）</a></li>
        <li><a class="dropdown-item" data-autorefresh="300">300秒（5分）</a></li>
      </ul>`;
    host.appendChild(wrap);
    wrap.querySelectorAll("[data-autorefresh]").forEach(a=>{
      a.addEventListener("click",(e)=>{
        e.preventDefault();
        const sec = Number(a.getAttribute("data-autorefresh") || "0");
        setLiveRefresh(sec);
        const btn = document.getElementById(BTN_ID);
        if (!btn) return;
        btn.textContent = !sec ? "Auto: Off" : (sec >= 60 ? `Auto: ${Math.round(saved/60)}分` : `Auto: ${sec}秒`);
      });
    });
    const btn = document.getElementById(BTN_ID);
    if (btn) btn.textContent = !saved ? "Auto: Off" : (saved >= 60 ? `Auto: ${Math.round(saved/60)}分` : `Auto: ${saved}秒`);
  }

  function openEditItem(code) {
    if (!isAdmin()) return toast("Akses ditolak (admin only)");
    const it = _ITEMS_CACHE.find(x => String(x.code) === String(code)); if (!it) return;
    const wrap = document.createElement("div");
    wrap.className = "modal fade";
    wrap.innerHTML = `
<div class="modal-dialog">
  <div class="modal-content">
    <div class="modal-header"><h5 class="modal-title">商品編集</h5>
      <button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
    <div class="modal-body">
      <div class="row g-3">
        <div class="col-md-6"><label class="form-label">コード</label><input id="md-code" class="form-control" value="${escapeAttr(it.code)}" readonly></div>
        <div class="col-md-6"><label class="form-label">名称</label><input id="md-name" class="form-control" value="${escapeAttr(it.name)}"></div>
        <div class="col-md-4"><label class="form-label">価格</label><input id="md-price" type="number" class="form-control" value="${Number(it.price || 0)}"></div>
        <div class="col-md-4"><label class="form-label">在庫</label><input id="md-stock" type="number" class="form-control" value="${Number(it.stock || 0)}"></div>
        <div class="col-md-4"><label class="form-label">最小</label><input id="md-min" type="number" class="form-control" value="${Number(it.min || 0)}"></div>
        <div class="col-md-8"><label class="form-label">画像URL</label><input id="md-img" class="form-control" value="${escapeAttr(it.img || "")}"></div>
        <div class="col-md-4"><label class="form-label">置場</label>
          <input id="md-location" class="form-control text-uppercase" value="${escapeAttr(it.location || "")}" placeholder="A-01-03"></div>
        <div class="col-md-4"><label class="form-label">部門</label>
          <input id="md-department" class="form-control" value="${escapeAttr(it.department || "")}" placeholder="製造/品質/倉庫など"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-bs-dismiss="modal">閉じる</button>
      <button class="btn btn-primary" id="md-save">保存</button>
    </div>
  </div>
</div>`;
    document.body.appendChild(wrap);
    const modal = new bootstrap.Modal(wrap); modal.show();

    $("#md-location", wrap)?.addEventListener("input", (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""); });

    $("#md-save", wrap)?.addEventListener("click", async () => {
      try {
        const payload = {
          code: $("#md-code", wrap).value,
          name: $("#md-name", wrap).value,
          price: Number($("#md-price", wrap).value || 0),
          stock: Number($("#md-stock", wrap).value || 0),
          min: Number($("#md-min", wrap).value || 0),
          img: $("#md-img", wrap).value,
          location: ($("#md-location", wrap).value || "").toUpperCase().trim(),
          department: ($("#md-department", wrap).value || "").trim(),
          overwrite: true
        };
        const r = await api("updateItem", { method: "POST", body: payload });
        if (r?.ok) { modal.hide(); wrap.remove(); renderItems(); renderShelfTable(); }
        else toast(r?.error || "保存失敗");
      } catch (e) { toast("保存失敗: " + (e?.message || e)); }
    });

    wrap.addEventListener("hidden.bs.modal", () => wrap.remove(), { once: true });
  }

  function openNewItem() {
    if (!isAdmin()) return toast("Akses ditolak (admin only)");
    const wrap = document.createElement("div");
    wrap.className = "modal fade";
    wrap.innerHTML = `
<div class="modal-dialog">
  <div class="modal-content">
    <div class="modal-header"><h5 class="modal-title">新規商品</h5>
      <button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
    <div class="modal-body">
      <div class="row g-3">
        <div class="col-md-6"><label class="form-label">コード</label><input id="nw-code" class="form-control" placeholder="SKU-001"></div>
        <div class="col-md-6"><label class="form-label">名称</label><input id="nw-name" class="form-control"></div>
        <div class="col-md-4"><label class="form-label">価格</label><input id="nw-price" type="number" class="form-control" value="0"></div>
        <div class="col-md-4"><label class="form-label">在庫</label><input id="nw-stock" type="number" class="form-control" value="0"></div>
        <div class="col-md-4"><label class="form-label">最小</label><input id="nw-min" type="number" class="form-control" value="0"></div>
        <div class="col-md-8"><label class="form-label">画像URL</label><input id="nw-img" class="form-control"></div>
        <div class="col-md-4"><label class="form-label">置場</label><input id="nw-location" class="form-control text-uppercase" placeholder="A-01-03"></div>
        <div class="col-md-4"><label class="form-label">部門</label>
          <input id="nw-department" class="form-control" placeholder="製造/品質/倉庫など">
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-bs-dismiss="modal">閉じる</button>
      <button class="btn btn-primary" id="nw-save">作成</button>
    </div>
  </div>
</div>`;
    document.body.appendChild(wrap);
    const modal = new bootstrap.Modal(wrap); modal.show();
    $("#nw-location", wrap)?.addEventListener("input", (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""); });
    $("#nw-save", wrap)?.addEventListener("click", async () => {
      try {
        const payload = {
          code: ($("#nw-code", wrap).value || "").trim(),
          name: $("#nw-name", wrap).value,
          price: Number($("#nw-price", wrap).value || 0),
          stock: Number($("#nw-stock", wrap).value || 0),
          min: Number($("#nw-min", wrap).value || 0),
          img: $("#nw-img", wrap).value,
          location: ($("#nw-location", wrap).value || "").toUpperCase().trim(),
          department: ($("#nw-department", wrap).value || "").trim(),
          overwrite: false
        };
        if (!payload.code) return toast("コードを入力してください。");
        const r = await api("updateItem", { method: "POST", body: payload });
        if (r?.ok) { modal.hide(); wrap.remove(); renderItems(); toast("作成しました"); }
        else toast(r?.error || "作成失敗");
      } catch (e) { toast("作成失敗: " + (e?.message || e)); }
    });
    wrap.addEventListener("hidden.bs.modal", () => wrap.remove(), { once: true });
  }

  // === LOT QR modal ===
  function openLotQRModal(item) {
    if (!item) return;
    const wrap = document.createElement("div");
    wrap.className = "modal fade";
    wrap.innerHTML = `
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header"><h5 class="modal-title">Lot/箱 QR ラベル</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
      <div class="modal-body">
        <div class="row g-3">
          <div class="col-md-6"><label class="form-label">コード</label><input class="form-control" value="${escapeAttr(item.code)}" readonly></div>
          <div class="col-md-6"><label class="form-label">名称</label><input class="form-control" value="${escapeAttr(item.name || "")}" readonly></div>
          <div class="col-md-4"><label class="form-label">1箱の数量</label><input id="lot-qty" type="number" min="1" class="form-control" value="10"></div>
          <div class="col-md-8"><label class="form-label">ロットID（任意）</label><input id="lot-id" class="form-control" placeholder="LOT-2025-11-A"></div>
        </div>
        <div class="mt-3 d-flex align-items-center gap-3">
          <div id="lotqr-box"></div>
          <div class="small text-muted" id="lot-caption"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline-secondary" data-bs-dismiss="modal">閉じる</button>
        <button class="btn btn-outline-primary" id="lot-preview">プレビュー</button>
        <button class="btn btn-primary" id="lot-dl">DL</button>
      </div>
    </div>
  </div>`;
    document.body.appendChild(wrap);
    const modal = new bootstrap.Modal(wrap); modal.show();

    const box = $("#lotqr-box", wrap);

    async function renderQR() {
      const qty = Math.max(1, Number($("#lot-qty", wrap).value || 0) || 1);
      const lot = ($("#lot-id", wrap).value || "").trim();
      const codeNorm = normalizeCodeDash(item.code);
      const text = lot ? `LOT|${codeNorm}|${qty}|${lot}` : `LOT|${codeNorm}|${qty}`;

      const cap = $("#lot-caption", wrap);
      if (cap) cap.textContent = `コード: ${codeNorm} / 数量: ${qty}` + (lot ? ` / ロット: ${lot}` : "");

      box.innerHTML = "";
      try {
        await ensureQRCode();
        new QRCode(box, { text, width: 140, height: 140, correctLevel: QRCode.CorrectLevel.M });
      } catch {
        box.textContent = text; // fallback teks
      }
    }

    $("#lot-qty", wrap)?.addEventListener("input", renderQR);
    $("#lot-id", wrap)?.addEventListener("input", renderQR);
    renderQR();

    $("#lot-preview", wrap)?.addEventListener("click", async ()=> {
      const qty = Math.max(1, Number($("#lot-qty", wrap).value || 0) || 1);
      const lot = ($("#lot-id", wrap).value || "").trim();
      const url = await makeLotLabelDataURL(item, qty, lot);
      openPreview(url);
    });

    $("#lot-dl", wrap)?.addEventListener("click", async ()=>{
      const qty = Math.max(1, Number($("#lot-qty", wrap).value || 0) || 1);
      const lot = ($("#lot-id", wrap).value || "").trim();
      const url = await makeLotLabelDataURL(item, qty, lot);
      const lotSafe  = lot ? `_${sanitizeFilename(lot)}` : "";
      const codeSafe = sanitizeFilename(item.code);
      const a = document.createElement("a");
      a.href = url; a.download = `LOT_${codeSafe}${lotSafe}_${qty}.png`; a.click();
    });

    wrap.addEventListener("hidden.bs.modal", () => wrap.remove(), { once: true });
  }

  // --- Expose core helpers for global preview block ---
   // --- Expose core helpers for global preview block ---
  window.__INV_APP__ = window.__INV_APP__ || {};
  Object.assign(window.__INV_APP__, {
    fmt,
    api,
    getHistoryCache: () => _HISTORY_CACHE, // KAIZEN: Buka akses memori riwayat
    generateQrDataUrl,
    makeItemLabelDataURL,
    openEditItem,

    // ⬇ biar bisa dipanggil dari initSidebar (global)
    renderDashboard,
    renderItems,
    renderUsers,
    renderHistory,
    renderShelfTable,
    loadTanaList
  });
// --- KODE BARU: Mesin Antrean Offline (Offline Queue) ---
async function processOfflineQueue() {
  // Hanya jalan jika internet aktif
  if (!navigator.onLine) return; 

  let queue = [];
  try { queue = JSON.parse(localStorage.getItem('offline_io_queue') || '[]'); } catch(e){}
  if (!queue.length) return;

  const failed = [];
  let successCount = 0;

  for (let q of queue) {
    try {
      // Tembakkan data yang tertunda secara diam-diam
      const r = await api("log", { method: "POST", body: q.payload, silent: true });
      if (r && r.ok) {
        successCount++;
      } else {
        failed.push(q); // Gagal dari server (misal stok minus), simpan lagi
      }
    } catch(e) {
      failed.push(q); // Gagal jaringan, antrekan lagi
    }
  }

  // Update sisa antrean di HP
  localStorage.setItem('offline_io_queue', JSON.stringify(failed));
  
  if (successCount > 0) {
    toast(`📡 Sinyal pulih! ${successCount} data scan offline berhasil dikirim ke server.`, "success");
    await fetchItemsDelta(true); // Update stok di layar
    renderItems();
  }
}

// Pasang pendeteksi sinyal (Otomatis kirim saat HP kembali online)
window.addEventListener('online', processOfflineQueue);
setInterval(processOfflineQueue, 15000); // Cek antrean tiap 15 detik
// --------------------------------------------------------
  
function keepBackendWarm(){
    if (!CONFIG?.FEATURES?.HEALTH_PING) return;
    const ms = Number(CONFIG.HEALTH_PING_MS || 15000);
    setInterval(() => { api('ping', { method:'GET', silent:true }).catch(()=>{}); }, ms);
  }

  // =========================================================
  // FITUR BARU: INVENTORY CONTROL REPORTS BINDING
  // =========================================================
  function bindReports() {
    const btnDeadStock = document.getElementById('btn-run-deadstock');
    const btnAudit = document.getElementById('btn-run-audit');
    const btnSmartMin = document.getElementById('btn-run-smartmin'); // ★ FITUR BARU
    const btnArchive = document.getElementById('btn-run-archive');   // ★ FITUR BARU

    const runReport = async (actionName, btnEl, btnText) => {
      if (!isAdmin()) return showCustomDialog({ title: 'Akses Ditolak', message: 'Hanya Admin yang dapat menjalankan laporan ini.', type: 'alert', confirmText: 'OK' });
      
      btnEl.disabled = true;
      btnEl.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>処理中...';
      
      try {
        const r = await api(actionName, { method: 'POST' });
        if (r && r.ok) {
          showCustomDialog({ title: '成功 (Berhasil)', message: r.message, type: 'alert', confirmText: 'OK' });
        } else {
          showCustomDialog({ title: 'エラー (Error)', message: r?.error || 'Gagal menjalankan laporan.', type: 'alert', confirmText: 'OK' });
        }
      } catch (e) {
        showCustomDialog({ title: '通信エラー (Network Error)', message: e.message, type: 'alert', confirmText: 'OK' });
      } finally {
        btnEl.disabled = false;
        btnEl.textContent = btnText;
      }
    };

   if (btnDeadStock) btnDeadStock.addEventListener('click', () => runReport('runDeadStock', btnDeadStock, '実行'));
    if (btnAudit) btnAudit.addEventListener('click', () => runReport('runAudit', btnAudit, '監査実行 (Audit)'));
    if (btnSmartMin) btnSmartMin.addEventListener('click', () => runReport('runSmartMin', btnSmartMin, '分析実行 (Analisis)')); // ★ FITUR BARU
    if (btnArchive) btnArchive.addEventListener('click', () => runReport('runArchive', btnArchive, '整理実行 (Arsip Data)'));     // ★ FITUR BARU
  }

  /* -------------------- Boot -------------------- */
window.addEventListener("DOMContentLoaded", () => {
    const logo = document.getElementById("brand-logo");
    if (logo && window.CONFIG && CONFIG.LOGO_URL) {
      logo.src = CONFIG.LOGO_URL; logo.alt = "logo";
      logo.onerror = () => { logo.style.display = "none"; };
    }

    // [👇 TAMBAHKAN KODE INI] Fitur Klik Logo ke Home
    const brandContainer = document.querySelector('.brand');
    if (brandContainer) {
      brandContainer.style.cursor = 'pointer'; // Ubah kursor jadi tangan
      brandContainer.title = 'ホームに戻る (Kembali ke Home)';
      brandContainer.addEventListener('click', (e) => {
        // Jangan aktifkan jika yang diklik adalah tombol burger menu
        if (e.target.closest('[data-burger]')) return; 
        
        e.preventDefault();
        const homeLink = document.querySelector('a[data-view="view-dashboard"]');
        if (homeLink) homeLink.click();
      });
    }
  
// --- FITUR DARK MODE ---
    const btnTheme = document.getElementById("btn-theme");
    const body = document.body;
    
    // Cek preferensi tersimpan
    if (localStorage.getItem("theme") === "dark") {
       body.setAttribute("data-theme", "dark");
       if(btnTheme) btnTheme.innerHTML = '<i class="bi bi-sun-fill text-warning"></i>';
    }

    if (btnTheme) {
      btnTheme.addEventListener("click", () => {
        if (body.getAttribute("data-theme") === "dark") {
          body.removeAttribute("data-theme");
          localStorage.setItem("theme", "light");
          btnTheme.innerHTML = '<i class="bi bi-moon-stars-fill"></i>';
        } else {
          body.setAttribute("data-theme", "dark");
          localStorage.setItem("theme", "dark");
          btnTheme.innerHTML = '<i class="bi bi-sun-fill text-warning"></i>';
        }
      });
    }
    const newItemBtn = $("#btn-open-new-item");
    const newUserBtn = $("#btn-open-new-user");
    if (newItemBtn) { newItemBtn.classList.toggle("d-none", !isAdmin()); newItemBtn.addEventListener("click", openNewItem); }
    if (newUserBtn) { newUserBtn.classList.toggle("d-none", !isAdmin()); newUserBtn.addEventListener("click", openNewUser); }

    hydrateCurrentUser();
    bindIO();
    bindShelf();
    bindHistoryFilterUI(); 
    bindHistoryExportUI();
    bindReports();
    updateWelcomeBanner();
    // ✨ Chart.js global style
    if (window.Chart) {
      Chart.defaults.font.family = '"Noto Sans JP", system-ui';
      Chart.defaults.color = "#4b5563";
      Chart.defaults.plugins.legend.labels.usePointStyle = true;
    }
    renderDashboard();
    bindDashboardDrilldown();
    bindPrintAllLabels();
    bindPrintSelectedLabels();
    keepBackendWarm();
// =================================================================
    // KODE TAMBAHAN: LOGIKA DOWNLOAD CSV STOK BARANG
    // =================================================================
    const btnExportStock = document.getElementById("btn-items-export-csv");
    if (btnExportStock) {
   // =================================================================
    // FITUR BARU: IMPORT MASTER DATA (CSV)
    // =================================================================
    const inputItemsImport = document.getElementById("input-items-import");
    if (inputItemsImport) {
      inputItemsImport.addEventListener("change", async (ev) => {
        const file = ev.target.files?.[0]; 
        if (!file) return;
        
        // Peringatan sebelum eksekusi
        const isSure = await showCustomDialog({
          type: 'confirm',
          title: '一括登録 (Import CSV)',
          message: `${file.name} を読み込みますか？\n(Yakin ingin mengimpor master data dari file ini?)`,
          confirmText: 'インポート (Import)',
          cancelText: 'キャンセル (Batal)'
        });

        if (!isSure) {
           ev.target.value = ''; // Reset input file
           return;
        }
        
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            setLoading(true, "CSVをインポート中... (Mengunggah data...)");
            
            const text = e.target.result;
            // Encode teks UTF-8 ke Base64 dengan aman agar Kanji tidak hancur
            const b64 = btoa(unescape(encodeURIComponent(text)));
            
            const resp = await api("importItemsCSV", { method: 'POST', body: { csvBase64: b64 } });
            
            if (!resp || !resp.ok) {
              showCustomDialog({ title: 'エラー', message: resp?.error || 'Gagal memproses CSV', type: 'alert' });
            } else {
              showCustomDialog({ 
                title: '完了 (Selesai)', 
                message: `新規登録: ${resp.imported} 件\n更新: ${resp.updated} 件\n(Baru: ${resp.imported} | Diperbarui: ${resp.updated})`, 
                type: 'alert' 
              });
              // Refresh data di layar
              await fetchItemsDelta(false);
              renderItems(); 
              renderDashboard();
            }
          } catch (err) {
            showCustomDialog({ title: 'エラー', message: 'Format CSV tidak didukung atau file terlalu besar.', type: 'alert' });
          } finally {
            setLoading(false);
          }
        };
        
        // Baca file sebagai UTF-8 (Ubah ke 'Shift_JIS' jika file dari Excel Jepang versi lama)
        reader.readAsText(file, 'UTF-8'); 
        ev.target.value = ''; // Reset input agar file yang sama bisa diupload lagi
      });
    }
      btnExportStock.addEventListener("click", () => {
        // 1. Cek apakah data barang ada
        if (!_ITEMS_CACHE || _ITEMS_CACHE.length === 0) {
          toast("ダウンロードするデータがありません (Tidak ada data).", "warning");
          return;
        }

        // 2. Buat Header (Judul Kolom)
        const headers = ["コード(Kode)", "品名(Nama)", "在庫(Stok)", "最小在庫(Min)", "価格(Harga)", "部門(Dept)", "置場(Lokasi)"];
        
        // 3. Looping data barang dan ubah formatnya ke CSV
        const csvRows = _ITEMS_CACHE.map(it => {
          return [
            it.code || "",
            it.name || "",
            it.stock || 0,
            it.min || 0,
            it.price || 0,
            it.department || "",
            it.location || ""
          ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','); // Dibungkus tanda kutip ganda agar aman dari karakter koma di dalam nama barang
        });

        // 4. Gabungkan Header dan Isi, lalu download
        const csvString = [headers.join(',')].concat(csvRows).join('\n');
        
        // Buat nama file berdasarkan tanggal hari ini
        const today = new Date();
        const dateStr = `${today.getFullYear()}${(today.getMonth()+1).toString().padStart(2,'0')}${today.getDate().toString().padStart(2,'0')}`;
        
        downloadCSV_JP(`現在の在庫_${dateStr}.csv`, csvString); 
        toast("CSVをダウンロードしました", "success");
      });
    }
    // =================================================================
    // AKHIR KODE TAMBAHAN
    // =================================================================
    $("#btn-logout")?.addEventListener("click", logout);

    // Preload QR lib & aktifkan Preview
    ensureQRCode()
      .catch(()=>{})
      .finally(()=>{ try{ bindPreviewButtons(); }catch(e){} });
// =========================================================
  // FITUR BARU: DYNAMIC CONTEXTUAL HELP (Bantuan Per Menu)
  // =========================================================
  const HELP_CONTENT = {
    "view-dashboard": `
      <h6 class="fw-bold text-primary"><i class="bi bi-speedometer2"></i> ダッシュボード</h6>
      <p class="text-muted small">在庫状況を一目で確認できるメイン画面です。</p>
      <ul class="small">
        <li><strong>AI 枯渇予測レーダー:</strong> 過去30日間の出庫ペースを分析し、今後14日以内に在庫切れになる可能性のある商品を予測・警告します。</li>
        <li><strong>ABC分析:</strong> 出庫頻度に応じて商品を自動分類します（A: 高回転、B: 標準、C: 低回転・不動在庫）。</li>
      </ul>
    `,
    "view-io": `
      <h6 class="fw-bold text-primary"><i class="bi bi-box-seam"></i> 入出庫 (In/Out)</h6>
      <p class="text-muted small">商品の入庫・出庫を記録するメニューです。</p>
      <ul class="small">
        <li><strong>開始</strong>ボタンを押すと、スマートフォンのカメラがバーコードスキャナーとして起動します。</li>
        <li>スキャン後、数量を入力して<strong>即時登録</strong>を押すか、<strong>リストに追加</strong>して複数の商品を後で一括登録できます。</li>
        <li>誤ってスキャン・登録した場合は、画面右下に10秒間表示される<strong>元に戻す (Undo)</strong>ボタンで取り消しが可能です。</li>
      </ul>
    `,
    "view-shelf": `
      <h6 class="fw-bold text-primary"><i class="bi bi-clipboard-check"></i> 棚卸 (Stocktake)</h6>
      <p class="text-muted small">システム上の在庫と実際の物理在庫を照合するメニューです。</p>
      <ul class="small">
        <li>商品をスキャンし、実際の在庫数を<strong>実在</strong>の入力欄に入力します。</li>
        <li>システムが帳簿との差異を自動計算します。作業完了後、在庫データを更新するために必ず<strong class="text-success">確定</strong>を押してください。</li>
        <li>作業を一時中断する場合は、<strong>保存</strong>を押して入力中のデータを端末に一時保存できます。</li>
      </ul>
    `,
    "view-items": `
      <h6 class="fw-bold text-primary"><i class="bi bi-boxes"></i> 商品一覧 (Items)</h6>
      <p class="text-muted small">商品マスターデータの閲覧と管理を行います。</p>
      <ul class="small">
        <li>上部の<strong>検索</strong>ボックスで、コードや品名から商品をすばやく探せます。</li>
        <li>各行の右端にある<strong>操作メニュー (︙)</strong>から、QRラベルのダウンロードやロットQRの発行が行えます。</li>
        <li><strong class="text-danger">管理者 (Admin)</strong>のみ、新規商品の追加やCSVインポートを実行できます。</li>
      </ul>
    `,
    "view-history": `
      <h6 class="fw-bold text-primary"><i class="bi bi-clock-history"></i> 履歴 (History)</h6>
      <p class="text-muted small">過去の入出庫、移動、棚卸などの全ての取引ログです。</p>
      <ul class="small">
        <li>システムの動作を高速に保つため、最新の400件のみを表示します（全件はCSV出力可能）。</li>
        <li>入力ミスがあった場合、<strong class="text-danger">管理者 (Admin)</strong>のみが表示される<strong>修正 (Edit)</strong>ボタンからデータを修正できます。</li>
      </ul>
    `
  };

  const btnHelp = document.getElementById("btn-help");
  if (btnHelp) {
    btnHelp.addEventListener("click", () => {
      const activeSection = document.querySelector("main section.active");
      const activeId = activeSection ? activeSection.id : "view-dashboard";
      const modalBody = document.getElementById("helpModalBody");
      const modalTitle = document.getElementById("helpModalTitle");
      
      // Ambil konten berdasarkan menu yang aktif, atau tampilkan default jika tidak ditemukan
      const content = HELP_CONTENT[activeId] || `<h6 class="fw-bold">ヘルプ</h6><p class="small text-muted">このページのヘルプはまだありません。</p>`;
      
      if (modalBody) modalBody.innerHTML = content;
      if (modalTitle) {
         // Mengubah judul modal agar dinamis
         const menuName = document.getElementById("page-title")?.textContent || "ヘルプ";
         modalTitle.innerHTML = `<i class="bi bi-info-circle-fill me-2 text-primary"></i>${menuName} のヘルプ`;
      }
    });
  }

  
    startLiveReload();
  });

})();   // <-- PENUTUP IIFE UTAMA



/* -------------------- Preview Modal & Preview helpers -------------------- */
(function () {
  "use strict";

  // escapeHtml lokal (modul preview berdiri sendiri dari IIFE utama)
  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[m]));
  }

  // Bridge ke helper inti di dalam IIFE utama (lihat window.__INV_APP__)
  function __invCore() { return window.__INV_APP__ || {}; }

  function fmt(n) {
    const core = __invCore();
    if (typeof core.fmt === "function") {
      return core.fmt(n);
    }
    try { return new Intl.NumberFormat("ja-JP").format(Number(n || 0)); }
    catch { return String(n || 0); }
  }

  async function invApi(action, opts) {
    const core = __invCore();
    if (typeof core.api !== "function") {
      throw new Error("API helper not ready");
    }
    return core.api(action, opts);
  }

  async function invGenerateQr(text, size) {
    const core = __invCore();
    if (typeof core.generateQrDataUrl !== "function") {
      throw new Error("QR helper not ready");
    }
    return core.generateQrDataUrl(text, size);
  }

  async function invMakeItemLabel(item) {
    const core = __invCore();
    if (typeof core.makeItemLabelDataURL !== "function") {
      throw new Error("Label helper not ready");
    }
    return core.makeItemLabelDataURL(item);
  }


  function invOpenEditItem(code) {
    const core = __invCore();
    if (typeof core.openEditItem !== "function") {
      throw new Error("Edit helper not ready");
    }
    return core.openEditItem(code);
  }

  function ensurePreviewModal() {
    if (document.getElementById("preview-modal")) return;
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="modal fade" id="preview-modal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title"><i class="bi bi-search me-2"></i>商品プレビュー</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="閉じる"></button>
            </div>
            <div class="modal-body">
              <div class="d-flex gap-3 align-items-start flex-wrap">
                <div>
                  <div id="pv-qr" class="rounded p-2 border bg-light"></div>
                  <div class="small text-muted mt-1">QR を印刷ラベルと同一サイズ比で生成</div>
                </div>
                <div class="flex-grow-1">
                  <div class="d-flex align-items-center gap-2 flex-wrap">
                    <span id="pv-name" class="fw-semibold fs-5"></span>
                    <span id="pv-status" class="badge"></span>
                  </div>
                  <div class="text-muted mt-1">
                    <span class="me-3">コード: <span id="pv-code"></span></span>
                    <span class="me-3">部門: <span id="pv-dept"></span></span>
                    <span>置場: <span id="pv-loc"></span></span>
                  </div>
                 <div class="mt-2">
                    <span class="me-3">価格: <span id="pv-price"></span></span>
                    <span class="me-3">在庫: <span id="pv-stock"></span></span>
                    <span>最小: <span id="pv-min"></span></span>
                  </div>
                  
                  <div class="mt-3 w-100 p-2 rounded" style="background-color: #f1f5f9; border: 1px dashed #cbd5e1;">
                     <div class="small fw-bold text-secondary mb-2"><i class="bi bi-geo-alt-fill text-danger"></i> ロケーションマップ</div>
                     <div id="pv-warehouse-map" class="d-flex gap-2 justify-content-between">
                        </div>
                  </div>
                  </div>
                <div class="ms-auto">
                  <img id="pv-img" alt="" style="max-height:120px;max-width:180px;object-fit:contain;border:1px solid var(--bs-border-color);border-radius:.5rem;display:none">
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button id="pv-edit" type="button" class="btn btn-primary btn-sm">
                <i class="bi bi-pencil me-1"></i>編集
              </button>
             <button id="pv-print" type="button" class="btn btn-outline-secondary btn-sm">
                <i class="bi bi-printer me-1"></i>ラベル印刷
              </button>
              <button id="pv-transfer" type="button" class="btn btn-outline-info btn-sm">
                <i class="bi bi-arrow-left-right me-1"></i>移動
              </button>
              <button type="button" class="btn btn-light btn-sm" data-bs-dismiss="modal">閉じる</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrap);
  }

  function ensurePreviewHistoryArea() {
    ensurePreviewModal();
    const modal = document.getElementById("preview-modal");
    if (!modal) return;
    if (modal.querySelector("#pv-history")) return;

    const body = modal.querySelector(".modal-body") || modal;
    const panel = document.createElement("div");
    panel.id = "pv-history";
    panel.className = "mt-3";
   panel.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-1">
        <div class="fw-semibold text-primary"><i class="bi bi-bar-chart-line-fill me-1"></i>入出庫トレンド (Tren Transaksi)</div>
      </div>
      <div style="height: 120px; width: 100%; margin-bottom: 20px;">
        <canvas id="pv-trend-chart"></canvas>
      </div>
      
      <div class="fw-semibold mb-1"><i class="bi bi-clock-history me-1"></i>履歴（最新10件）</div>
      <div class="table-responsive">
        <table class="table table-sm mb-0">
          <thead>
            <tr>
              <th style="white-space:nowrap">日時</th>
              <th style="white-space:nowrap">ユーザー</th>
              <th style="white-space:nowrap">種別</th>
              <th class="text-end" style="white-space:nowrap">数量</th>
              <th style="white-space:nowrap">備考</th>
            </tr>
          </thead>
          <tbody id="pv-history-body">
            <tr><td colspan="5" class="text-muted">読み込み中…</td></tr>
          </tbody>
        </table>
      </div>`;
    body.appendChild(panel);
  }

async function loadItemHistory(code) {
    try {
      ensurePreviewHistoryArea();
      const tb = document.getElementById("pv-history-body");
      if (tb) {
        tb.innerHTML = `<tr><td colspan="5" class="text-muted py-3 text-center"><div class="spinner-border spinner-border-sm text-primary me-2"></div>読み込み中…</td></tr>`;
      }

      // --- KAIZEN FIX: SMART LOCAL FILTER ---
      // Ambil riwayat langsung dari memori lokal (Super Cepat & Pasti Akurat)
      const core = window.__INV_APP__ || {};
      let rows = [];
      
      if (typeof core.getHistoryCache === "function") {
         const allHist = core.getHistoryCache() || [];
         // Saring khusus untuk barang yang diklik, lalu ambil 10 terbaru
         rows = allHist.filter(h => String(h.code) === String(code)).slice(0, 10);
      }

      // Fallback jika memori lokal kosong (misal baru buka halaman)
      if (rows.length === 0) {
         const res = await invApi("historyByCode", {
           method: "POST",
           body: { code, limit: 10 },
           silent: true
         });
         rows = (res && res.ok && Array.isArray(res.rows)) ? res.rows : [];
      }
      // --------------------------------------

      if (!rows.length) {
        if (tb) tb.innerHTML = `<tr><td colspan="5" class="text-muted text-center py-3">この商品の履歴はありません<br><small>(Belum ada transaksi)</small></td></tr>`;
        // Hapus grafik jika tidak ada data
        if (window.pvChartInstance) { window.pvChartInstance.destroy(); window.pvChartInstance = null; }
        return;
      }

      // Render Tabel dengan UI yang lebih rapi (Ada indikator plus/minus & warna)
      if (tb) {
        tb.innerHTML = rows.map(r => {
          let dStr = r.date || r.timestamp || "";
          try { 
             const d = new Date(dStr.replace(' ', 'T')); 
             if(!isNaN(d)) dStr = `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; 
          } catch(e){}
          
          const isIN = (r.type === 'IN');
          const typeColor = isIN ? 'success' : 'danger';
          const typeSign = isIN ? '+' : '-';

          return `
          <tr>
            <td style="font-size:0.85rem">${escapeHtml(dStr)}</td>
            <td>${escapeHtml(r.userName || r.userId || "")}</td>
            <td><span class="badge bg-${typeColor} bg-opacity-10 text-${typeColor} border border-${typeColor} border-opacity-25 px-2 py-1">${escapeHtml(r.type || "")}</span></td>
            <td class="text-end fw-bold text-${typeColor}">${typeSign}${fmt(r.qty || 0)}</td>
            <td class="text-truncate small text-muted" style="max-width:120px" title="${escapeHtml(r.note || "")}">${escapeHtml(r.note || "-")}</td>
          </tr>`;
        }).join("");
      }

      // --- KAIZEN: MENGGAMBAR GRAFIK MINI (SPARKLINE) ---
      const ctxTrend = document.getElementById("pv-trend-chart");
      if (ctxTrend && window.Chart) {
        if (window.pvChartInstance) window.pvChartInstance.destroy(); 
        
        const chartData = [...rows].reverse();
        
        window.pvChartInstance = new Chart(ctxTrend, {
          type: "bar",
          data: {
            labels: chartData.map(r => {
               const d = new Date(String(r.date || r.timestamp).replace(' ', 'T'));
               return isNaN(d) ? "" : `${d.getMonth()+1}/${d.getDate()}`;
            }),
            datasets: [
              {
                label: "IN (Masuk)",
                data: chartData.map(r => r.type === "IN" ? r.qty : 0),
                backgroundColor: "rgba(16, 185, 129, 0.85)", // Hijau
                borderRadius: 4
              },
              {
                label: "OUT (Keluar)",
                data: chartData.map(r => r.type === "OUT" ? r.qty : 0),
                backgroundColor: "rgba(239, 68, 68, 0.85)", // Merah
                borderRadius: 4
              }
            ]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            scales: { 
              x: { stacked: true, grid: {display: false}, ticks: {font: {size: 10}} }, 
              y: { stacked: true, display: false } 
            },
            plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } }
          }
        });
      }
    } catch (e) {
      const tb = document.getElementById("pv-history-body");
      if (tb) tb.innerHTML = `<tr><td colspan="5" class="text-danger text-center py-2">履歴の取得に失敗</td></tr>`;
    }
  }
function extractRowData(tr) {
    const get = sel => tr.querySelector(sel);
    const codeCell = get("td:nth-child(3) .small, td:nth-child(3)");
    const code = (tr.getAttribute("data-code") ||
                 (codeCell ? codeCell.textContent : "") ||
                 "").trim();
    const name = (get(".td-name")?.textContent || "").trim();
    const imgEl = get("td:nth-child(4) img");
    const priceText = (get("td:nth-child(5)")?.textContent || "").trim();
    const stockText = (get("td:nth-child(6)")?.textContent || "0").replace(/[^0-9.-]/g, "");
    const minText   = (get("td:nth-child(7)")?.textContent || "0").replace(/[^0-9.-]/g, "");
    const dept  = (get("td:nth-child(8)")?.textContent || "").trim();
    const loc   = (get("td:nth-child(9)")?.textContent || "").trim();
    
    return {
      code,
      name,
      img: imgEl?.getAttribute("src") || "",
      price: priceText,
      stock: Number(stockText || 0),
      min: Number(minText || 0),
      department: dept,
      location: loc
    };
  }
  function showItemPreview(item) {
    try {
      ensurePreviewModal();

      const d = {
        code: String(item?.code || "").trim(),
        name: String(item?.name || "").trim(),
        dept: String(item?.department || item?.dept || "").trim(),
        loc : String(item?.location || item?.loc || "").trim(),
        priceNum: Number(item?.price || 0),
        stock: Number(item?.stock || 0),
        min  : Number(item?.min || 0),
        img  : item?.img || ""
      };

      const elCode  = document.getElementById("pv-code");
      const elName  = document.getElementById("pv-name");
      const elDept  = document.getElementById("pv-dept");
      const elLoc   = document.getElementById("pv-loc");
      const elPrice = document.getElementById("pv-price");
      const elStock = document.getElementById("pv-stock");
      const elMin   = document.getElementById("pv-min");
      const elImg   = document.getElementById("pv-img");
      const elStatus= document.getElementById("pv-status");
      const qrBox   = document.getElementById("pv-qr");

      if (elCode)  elCode.textContent  = d.code || "-";
      if (elName)  elName.textContent  = d.name || "(名称未設定)";
      if (elDept)  elDept.textContent  = d.dept || "-";
      if (elLoc)   elLoc.textContent   = d.loc  || "-";
      if (elPrice) elPrice.textContent = "¥" + fmt(d.priceNum || 0);
    if (elStock) elStock.textContent = String(d.stock);
      if (elMin)   elMin.textContent   = String(d.min);

      // --- KAIZEN: RENDER WAREHOUSE MAP RADAR ---
      const mapContainer = document.getElementById("pv-warehouse-map");
      if (mapContainer) {
         // Ambil huruf pertama dari lokasi sebagai "ZONA" (Contoh: "A-01" jadi "A")
         const locCode = (d.loc || "UNKNOWN").toUpperCase();
         const zone = locCode.charAt(0); 
         
         // Daftar Zona Gudang Utama Anda (Bisa disesuaikan, misalnya A, B, C, D)
         const zones = ['A', 'B', 'C', 'D'];
         
         let mapHtml = "";
         let foundZone = false;

         zones.forEach(z => {
            const isHere = (z === zone);
            if (isHere) foundZone = true;
            
            // Jika lokasi barang ada di zona ini, buat dia menyala berkedip!
            const bgClass = isHere ? "bg-danger text-white border-danger" : "bg-white text-muted border-secondary border-opacity-25";
            const pulse = isHere ? "animation: pulseOut 1.5s infinite;" : "";
            const shadow = isHere ? "box-shadow: 0 4px 10px rgba(239,68,68,0.4);" : "box-shadow: none;";
            
            mapHtml += `
              <div class="rounded-3 d-flex flex-column align-items-center justify-content-center ${bgClass}" 
                   style="flex: 1; height: 50px; border: 2px solid; ${pulse} ${shadow} transition: all 0.3s;">
                 <span class="small" style="font-size:0.65rem; opacity:0.8;">Zone</span>
                 <span class="fw-bold fs-5" style="line-height:1;">${z}</span>
              </div>`;
         });

         // Jika lokasinya di luar zona standar (Misal: "OFFICE" atau "WH-2")
         if (!foundZone && locCode !== "UNKNOWN") {
            mapHtml += `
              <div class="rounded-3 d-flex flex-column align-items-center justify-content-center bg-dark text-white border-dark" 
                   style="flex: 1.5; height: 50px; border: 2px solid; animation: pulseOut 1.5s infinite; box-shadow: 0 4px 10px rgba(0,0,0,0.4);">
                 <span class="small" style="font-size:0.65rem;">Ekstra</span>
                 <span class="fw-bold fs-6 text-truncate w-100 text-center px-1">${locCode}</span>
              </div>`;
         }

         mapContainer.innerHTML = mapHtml;
      }
      // ------------------------------------------

      if (elStatus) {
        elStatus.className = "badge";
        if (d.stock <= 0) {
          elStatus.classList.add("bg-secondary");
          elStatus.textContent = "在庫ゼロ";
        } else if (d.stock <= d.min) {
          elStatus.classList.add("bg-danger");
          elStatus.textContent = "要補充";
        } else {
          elStatus.classList.add("bg-success");
          elStatus.textContent = "十分";
        }
      }

      if (elImg) {
        if (d.img) {
          elImg.src = d.img;
          elImg.style.display = "";
        } else {
          elImg.style.display = "none";
        }
      }

      if (qrBox) {
        qrBox.innerHTML = "";
        (async () => {
          try {
            const url = await invGenerateQr(`ITEM|${d.code}`, 128);
            if (url) {
              const im = new Image();
              im.src = url;
              im.width = 128;
              im.height = 128;
              im.alt = d.code;
              qrBox.appendChild(im);
            } else {
              qrBox.textContent = d.code || "(QR)";
            }
          } catch {
            qrBox.textContent = d.code || "(QR)";
          }
        })();
      }

      const btnEdit  = document.getElementById("pv-edit");
      const btnPrint = document.getElementById("pv-print");

      if (btnEdit) {
        btnEdit.onclick = () => {
          try { invOpenEditItem(d.code); }
          catch (e) { alert("編集を開けませんでした"); }
        };
      }

      if (btnPrint) {
        btnPrint.onclick = async () => {
          try {
            const url = await invMakeItemLabel(item);
            const w = window.open("", "_blank", "width=900,height=700");
            if (!w) {
              alert("ポップアップがブロックされました。");
              return;
            }
            w.document.write("<meta charset='utf-8'><title>ラベル印刷</title>");
            w.document.write("<style>body{margin:0;padding:16px;font-family:sans-serif} img{max-width:100%;display:block;margin:0 auto} @media print{img{page-break-inside:avoid;}}</style>");
            w.document.write(`<img src="${url}" alt="${d.code}">`);
            w.document.close();
            w.focus();
            setTimeout(() => { try { w.print(); } catch (_) {} }, 500);
          } catch (e) {
            alert("ラベル生成に失敗しました");
          }
        };
      }

// --- FITUR BARU: Logika Tombol Transfer Lokasi ---
      const btnTransfer = document.getElementById("pv-transfer");
      if (btnTransfer) {
        btnTransfer.onclick = async () => {
          const currentLoc = d.loc || "未設定";
          
          // KAIZEN: PANDUAN ZONA SAAT TRANSFER
          const newLoc = await showCustomDialog({
            type: 'prompt',
            title: '置場移動 (Transfer Antar Zona)',
            message: `「${d.name}」の新しい置場を入力してください。\n(Masukkan kode lokasi rak baru)\n\n現在の置場 (Saat ini): ${currentLoc}\n標準ゾーン (Zona Standar): A, B, C, D`,
            inputPlaceholder: '例: B-02',
            confirmText: '移動 (Pindah)'
          });
          
          if (!newLoc || newLoc.toUpperCase() === d.loc.toUpperCase()) return; // Batal jika kosong/sama
          
          try {
             // Panggil API Backend
             const r = await invApi("transferLoc", { 
               method: "POST", 
               body: { code: d.code, newLoc: newLoc.trim() } 
             });
             
             if (r && r.ok) {
               alert(`✅ 移動完了 (Berhasil Dipindah)\n${currentLoc} ➔ ${r.newLoc}`);
               
               // Tutup Modal dan Refresh Tabel agar data terbaru langsung terlihat
               const modal = window.bootstrap.Modal.getInstance(document.getElementById("preview-modal"));
               if (modal) modal.hide();
               
               if (typeof window.__INV_APP__.renderItems === "function") {
                  window.__INV_APP__.renderItems(); // Refresh tabel
               }
             } else {
               alert(`❌ 移動失敗 (Gagal): ${r?.error || "Unknown error"}`);
             }
          } catch (e) {
             alert(`❌ Error: ${e.message}`);
          }
        };
      }
      // ------------------------------------------------
      const modalEl = document.getElementById("preview-modal");
      if (window.bootstrap && window.bootstrap.Modal && modalEl) {
        window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
      } else if (modalEl) {
        modalEl.style.display = "block";
      }

      try { loadItemHistory(d.code); } catch (_e) {}

    } catch (e) {
      console.error("showItemPreview()", e);
      alert("プレビューを開けませんでした。");
    }
  }

  function openPreview(url) {
    try {
      ensurePreviewModal();
      const modalEl = document.getElementById("preview-modal");
      if (!modalEl) return;

      const imgEl   = modalEl.querySelector("#pv-img");
      const qrBox   = modalEl.querySelector("#pv-qr");
      const nameEl  = modalEl.querySelector("#pv-name");
      const codeEl  = modalEl.querySelector("#pv-code");
      const deptEl  = modalEl.querySelector("#pv-dept");
      const locEl   = modalEl.querySelector("#pv-loc");
      const priceEl = modalEl.querySelector("#pv-price");
      const stockEl = modalEl.querySelector("#pv-stock");
      const minEl   = modalEl.querySelector("#pv-min");
      const statusEl= modalEl.querySelector("#pv-status");

      if (nameEl)  nameEl.textContent  = "";
      if (codeEl)  codeEl.textContent  = "";
      if (deptEl)  deptEl.textContent  = "";
      if (locEl)   locEl.textContent   = "";
      if (priceEl) priceEl.textContent = "";
      if (stockEl) stockEl.textContent = "";
      if (minEl)   minEl.textContent   = "";
      if (statusEl) { statusEl.className = "badge"; statusEl.textContent = ""; }
      if (qrBox)   qrBox.innerHTML     = "";

      if (imgEl) {
        imgEl.src = url || "";
        imgEl.style.display = url ? "block" : "none";
      }

      if (window.bootstrap && window.bootstrap.Modal) {
        window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
      } else {
        modalEl.style.display = "block";
      }
    } catch (e) {
      console.error("openPreview failed:", e);
      alert("プレビューを開けませんでした。");
    }
  }

  function bindPreviewButtons() {
    const tbl = document.getElementById("tbl-items");
    if (!tbl || tbl.__pvBound) return;
    tbl.__pvBound = true;

    ensurePreviewModal();

    tbl.addEventListener("click", (ev) => {
      const btn = ev.target.closest(".btn-preview");
      if (!btn) return;
      ev.preventDefault();
      const tr = btn.closest("tr");
      if (!tr) return;
      const data = extractRowData(tr);
      showItemPreview(data);
    });

    tbl.addEventListener("click", (ev) => {
      const a = ev.target.closest(".link-item");
      if (!a) return;
      ev.preventDefault();
      const tr = a.closest("tr");
      if (!tr) return;
      const data = extractRowData(tr);
      showItemPreview(data);
    });

    tbl.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-action='detail'], [data-role='preview']");
      if (!btn) return;
      ev.preventDefault();
      const tr = btn.closest("tr");
      if (!tr) return;
      const data = extractRowData(tr);
      showItemPreview(data);
    });
  }

document.addEventListener("click", (e) => {
    const a = e.target.closest(".js-filter");
    if (!a) return;

    // --- KODE TAMBAHAN: Efek menyala pada tombol yang diklik ---
    document.querySelectorAll('.js-filter').forEach(btn => btn.classList.remove('active'));
    a.classList.add('active');
    // ------------------------------------------------------------

    const f = a.dataset.f;
    const rows = document.querySelectorAll("#tbl-items tr[data-code]");
    
    rows.forEach(tr => {
      // FIX: Ambil data langsung dari elemen TR karena extractRowData ada di modul lain
      const stockText = (tr.querySelector("td:nth-child(6)")?.textContent || "0").replace(/[^0-9.-]/g, "");
      const minText   = (tr.querySelector("td:nth-child(7)")?.textContent || "0").replace(/[^0-9.-]/g, "");
      const imgEl     = tr.querySelector("td:nth-child(4) img");
      
      const stock = Number(stockText || 0);
      const min = Number(minText || 0);
      
      let show = true;
      if (f === "low")  show = stock > 0 && stock <= min;
      if (f === "zero") show = stock <= 0;
      if (f === "img")  show = !!imgEl;
      if (f === "all")  show = true;
      
    tr.style.display = show ? "" : "none";
    });
  });

  window.showItemPreview    = showItemPreview;
  window.openPreview        = openPreview;
  window.bindPreviewButtons = bindPreviewButtons;
  window.loadItemHistory    = loadItemHistory; 

})();



/* =========================================================
 * TOP SCROLLBAR — sinkronisasi dengan tabel items
 * =======================================================*/
function setupTopScrollbar(){
  const top  = document.getElementById("items-scroll-top");
  const wrap = document.getElementById("items-table-wrap");
  if (!top || !wrap) return;

  // pastikan ada inner bar
  let inner = top.firstElementChild;
  if (!inner) { inner = document.createElement("div"); top.appendChild(inner); }
  inner.style.height = "1px";

  const getTableWidth = () => {
    const tbl = wrap.querySelector("table");
    // fallback ke scrollWidth wrap kalau tabel belum ada
    return (tbl?.scrollWidth || wrap.scrollWidth || 0);
  };

  const syncSize = () => {
    inner.style.width = getTableWidth() + "px";
    // Samakan posisi scroll
    if (Math.abs(top.scrollLeft - wrap.scrollLeft) > 1) {
      top.scrollLeft = wrap.scrollLeft;
    }
  };

  // Bi-directional scroll
  if (!wrap.__topSyncBound) {
    wrap.__topSyncBound = true;
    wrap.addEventListener("scroll", () => { top.scrollLeft = wrap.scrollLeft; }, { passive: true });
  }
  if (!top.__wrapSyncBound) {
    top.__wrapSyncBound = true;
    top.addEventListener("scroll", () => { wrap.scrollLeft = top.scrollLeft; }, { passive: true });
  }

  // Resize & DOM changes observer → auto-resize saat isi berubah
  top.__resizeObs?.disconnect?.();
  top.__mutObs?.disconnect?.();

  const ro = new ResizeObserver(syncSize);
  ro.observe(wrap);
  const tbl = wrap.querySelector("table");
  if (tbl) ro.observe(tbl);
  top.__resizeObs = ro;

  const mo = new MutationObserver((muts) => {
    // kalau ada perubahan baris/kolom, resync
    let need = false;
    for (const m of muts) {
      if (m.type === "childList" || m.type === "attributes") { need = true; break; }
    }
    if (need) syncSize();
  });
  mo.observe(wrap, { childList: true, subtree: true, attributes: true });
  top.__mutObs = mo;

  // init
  syncSize();
  setTimeout(syncSize, 0);
  if (!top.__winResizeBound) {
    window.addEventListener("resize", syncSize);
    top.__winResizeBound = true;
  }

  // helper publik untuk dipanggil setelah render page
  window.__resyncTopScroll = syncSize;
}
// === KAIZEN IDE 1: iOS SMART WIDGET (TANGGAL + CUACA) ===
function updateTodayBox() {
  const elMonth = document.getElementById('widget-month');
  const elDate = document.getElementById('widget-date');
  if (!elMonth || !elDate) return;

  const now = new Date();
  const m = String(now.getMonth() + 1);
  const d = String(now.getDate()).padStart(2, '0');
  
  elMonth.textContent = `${m}月`;
  elDate.textContent = d;
}

async function updateWeatherBox() {
  const elTemp = document.getElementById('widget-temp');
  const elDesc = document.getElementById('widget-w-desc');
  const elIcon = document.getElementById('widget-w-icon');
  if (!elTemp) return;

  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=35.6895&longitude=139.6917&current_weather=true&timezone=Asia%2FTokyo';
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    
    const data = await res.json();
    const cw = data.current_weather;
    const temp = Math.round(cw.temperature);
    const code = cw.weathercode;

    elTemp.textContent = `${temp}℃`;
    
    // Logika Icon & Teks Interaktif
    let iconClass = 'bi-cloud-sun';
    let desc = '天気';
    
    if (code === 0) { desc = '快晴 (Cerah)'; iconClass = 'bi-sun-fill text-warning'; }
    else if (code === 1 || code === 2) { desc = '晴れ'; iconClass = 'bi-cloud-sun-fill text-warning'; }
    else if (code === 3) { desc = 'くもり'; iconClass = 'bi-clouds-fill text-secondary'; }
    else if (code >= 51 && code <= 67) { desc = '雨'; iconClass = 'bi-cloud-drizzle-fill text-info'; }
    else if (code >= 71 && code <= 77) { desc = '雪'; iconClass = 'bi-snow text-info'; }
    else if (code >= 80 && code <= 82) { desc = '雨'; iconClass = 'bi-cloud-rain-fill text-primary'; }
    else if (code >= 95) { desc = '雷雨'; iconClass = 'bi-cloud-lightning-rain-fill text-danger'; }

    if (elDesc) elDesc.textContent = desc;
    if (elIcon) elIcon.className = `bi ${iconClass} fs-2`;
  } catch (err) {
    if (elDesc) elDesc.textContent = 'エラー (Error)';
  }
}

// mapping sederhana weather code → JP
function weatherCodeToJa(code) {
  // kode Open-Meteo (disederhanakan)
  if (code === 0) return '快晴';
  if (code === 1 || code === 2) return '晴れ';
  if (code === 3) return 'くもり';
  if (code >= 51 && code <= 67) return '雨（霧雨）';
  if (code >= 71 && code <= 77) return '雪';
  if (code >= 80 && code <= 82) return '雨';
  if (code >= 95) return '雷雨';
  return '天気';
}

// Jalankan setelah DOM siap
document.addEventListener('DOMContentLoaded', () => {
  updateTodayBox();
  updateWeatherBox();
});


// ===============================
// Sidebar + View Switch ala app
// ===============================
function initSidebar() {
  const body      = document.body;
  const sidebar   = document.getElementById('sb');
  const backdrop  = document.getElementById('sb-backdrop');
  const burgerBtn = document.querySelectorAll('[data-burger]');
  const links     = sidebar ? sidebar.querySelectorAll('a[data-view]') : [];
  const pageTitle = document.getElementById('page-title');

  // akses helper / render dari IIFE utama
  const app = window.__INV_APP__ || {};

  if (!sidebar) return;

  const mqDesktop = window.matchMedia('(min-width: 992px)');

  const openSidebar = () => {
    if (!mqDesktop.matches) body.classList.add('sb-open');
  };
  const closeSidebar = () => {
    body.classList.remove('sb-open');
  };
  const toggleSidebar = () => {
    if (mqDesktop.matches) return; // desktop: sidebar selalu tampil
    body.classList.toggle('sb-open');
  };

  // Burger (icon kiri atas + tombol "メニュー" di HP)
  burgerBtn.forEach(btn => {
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      toggleSidebar();
    });
  });

  // Backdrop klik untuk tutup
  if (backdrop) {
    backdrop.addEventListener('click', () => {
      closeSidebar();
    });
  }

  // ESC juga nutup di mobile
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      closeSidebar();
    }
  });

  // Kalau resize ke desktop, pastikan class sb-open dibersihkan
  mqDesktop.addEventListener('change', (e) => {
    if (e.matches) {
      body.classList.remove('sb-open');
    }
  });

  // Fungsi ganti view
  function activateViewById(viewId, linkEl) {
    if (!viewId) return;

    // Nav: set active
    links.forEach(a => a.classList.remove('active'));
    if (linkEl) linkEl.classList.add('active');

    // Section: show/hide
    document.querySelectorAll('main section[id^="view-"]').forEach(sec => {
      if (sec.id === viewId) {
        sec.classList.remove('d-none');
        sec.classList.add('active');
     } else {
        sec.classList.add('d-none');
        sec.classList.remove('active');
      }
    });

    // KAIZEN: Pancing ulang animasi tabel (Cascade) setiap kali ganti menu
    const tables = document.querySelectorAll(`#${viewId} tbody tr, #${viewId} .history-row, #${viewId} #io-cart-list li`);
    tables.forEach(tr => { tr.style.animation = 'none'; tr.offsetHeight; tr.style.animation = null; });

    // Judul halaman = text di sidebar
    if (pageTitle && linkEl) {
      pageTitle.textContent = linkEl.textContent.trim();
    }
    // Panggil renderer per view (kalau ada)
    switch (viewId) {
      case 'view-dashboard':
        app.renderDashboard && app.renderDashboard();
        break;
      case 'view-items':
        app.renderItems && app.renderItems();
        break;
      case 'view-users':
        app.renderUsers && app.renderUsers();
        break;
      case 'view-history':
        app.renderHistory && app.renderHistory();
        break;
      case 'view-shelf':
        app.renderShelfTable && app.renderShelfTable();
        break;
      case 'view-shelf-list':
        app.loadTanaList && app.loadTanaList();
        break;
    }

    // Tutup sidebar setelah pilih menu (di HP)
    if (!mqDesktop.matches) {
      closeSidebar();
    }

    // [👇 FIX BUG] Paksa menu selalu tertutup di mobile/tablet untuk mencegah bug nyangkut
    document.body.classList.remove('sb-open');

    // Scroll ke atas dikit biar rapi
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // [👇 INI ADALAH KODE YANG TIDAK SENGAJA TERHAPUS SEBELUMNYA]
  // Klik menu sidebar
  links.forEach(link => {
    link.addEventListener('click', (ev) => {
      ev.preventDefault();
      const viewId = link.getAttribute('data-view');
      activateViewById(viewId, link);
    });
  });

  // Desktop: pakai yang .active di HTML
  // Mobile: kalau ada menu IO, langsung buka IO
  let firstLink = sidebar.querySelector('a[data-view].active') || links[0] || null;
  let firstView = firstLink ? firstLink.getAttribute('data-view') : 'view-dashboard';

  // Di mobile, kalau ada menu IO, jadikan itu default
  const isMobileUA = /Android|iPhone|iPad/i.test(navigator.userAgent);
  const ioLink = sidebar.querySelector('a[data-view="view-io"]');

  if (isMobileUA && ioLink) {
    firstLink = ioLink;
    firstView = 'view-io';
  }

  if (firstLink && firstView) {
    activateViewById(firstView, firstLink);
  }
}
/* =========================================================
   BOOT & GLOBAL LISTENERS (FINAL FIXED VERSION)
   ========================================================= */

// 1. Boot Sidebar & Scanner saat elemen HTML sudah 100% siap
document.addEventListener('DOMContentLoaded', () => {
  
  // Panggil initSidebar hanya sekali di sini
  if (typeof initSidebar === 'function') {
    initSidebar();
  }

  // 2. Logika Tombol Scanner Universal (Floating Button)
  // --- PERBAIKAN: Masuk ke dalam DOMContentLoaded ---
  setTimeout(() => {
    const btnUniv = document.getElementById('btn-universal-scan');
    if (btnUniv) {
      const newBtn = btnUniv.cloneNode(true);
      if(btnUniv.parentNode) btnUniv.parentNode.replaceChild(newBtn, btnUniv);

      newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const activeSection = document.querySelector('main section.active') || 
                              document.querySelector('main section:not(.d-none)');
        const viewId = activeSection ? activeSection.id : '';

        if(navigator.vibrate) navigator.vibrate(20);

        if (viewId === 'view-io') {
          const btn = document.getElementById('btn-io-scan');
          if(btn) btn.click();
        } 
        else if (viewId === 'view-shelf' || viewId === 'view-shelf-list') {
          const btn = document.getElementById('btn-start-scan');
          if(btn) btn.click();
        } 
        else {
          const link = document.querySelector('a[data-view="view-io"]') || 
                       document.querySelector('a[onclick*="view-io"]');
          if (link) {
            link.click(); 
            setTimeout(() => {
              const btn = document.getElementById('btn-io-scan');
              if(btn) btn.click();
            }, 400);
          }
        }
      });
    }
  }, 200);

}); // <-- Penutup DOMContentLoaded
