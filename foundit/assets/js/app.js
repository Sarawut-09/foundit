/* ==========================================================================
   FoundIt — แกนหลักของแอป: Layout (Navbar / Sidebar / Footer), Toast, Modal, Helpers
   ทำงานฝั่งเบราว์เซอร์ล้วน ไม่มี Backend
   ========================================================================== */
(function () {
  'use strict';
  const FI = window.FI;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  FI.$ = $; FI.$$ = $$;

  FI.ready = fn => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn());
  FI.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const esc = FI.esc;
  FI.icon = (name, cls) => '<i data-lucide="' + name + '"' + (cls ? ' class="' + cls + '"' : '') + '></i>';
  FI.icons = () => { if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); };
  FI.debounce = (fn, ms = 220) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const icon = FI.icon;

  FI.fmtDate = iso => {
    if (!iso) return '-';
    const [y, m, d] = String(iso).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  FI.monthLabel = key => {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
  };
  FI.lastMonths = n => {
    const out = []; const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      out.push({ key, label: FI.monthLabel(key) });
    }
    return out;
  };
  FI.countBy = (arr, fn) => arr.reduce((m, x) => { const k = fn(x); m[k] = (m[k] || 0) + 1; return m; }, {});

  FI.countUp = (el, to) => {
    if (!el) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = to.toLocaleString('th-TH'); return; }
    const t0 = performance.now(), dur = 700;
    const tick = t => {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString('th-TH');
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  FI.setBusy = (btn, busy) => { btn.classList.toggle('is-loading', busy); btn.disabled = busy; };

  /* ---------- ผู้ใช้ในระบบ ---------- */
  const USER_KEY = 'foundit_user_v1';
  FI.DEMO_USER = { name: 'สมหญิง ใจดี', email: 'somying.j@student.example.ac.th', studentId: '6612345678' };
  FI.user = () => { try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch (e) { return null; } };
  FI.setUser = u => { try { localStorage.setItem(USER_KEY, JSON.stringify(u)); } catch (e) { /* ignore */ } };
  FI.currentUser = () => FI.user() || FI.DEMO_USER;
  FI.isAdmin = () => { const u = FI.user(); return !!(u && (u.role === 'admin' || u.email === 'admin@foundit.example')); };
  FI.initial = name => { const s = String(name || 'ผ').replace(/^[\sเแโใไ]+/, ''); return (s[0] || 'ผ').toUpperCase(); };
  FI.logout = async () => {
    try { await FI.api('auth.php?action=logout'); } catch (e) { /* ignore */ }
    try { localStorage.removeItem(USER_KEY); } catch (e) { /* ignore */ }
    FI.toast('ออกจากระบบเรียบร้อยแล้ว', 'success');
    setTimeout(() => { location.href = 'login.html'; }, 600);
  };

  /* ---------- Toast ---------- */
  FI.toast = (msg, type = 'success', ms = 3800) => {
    let root = $('#toastRoot');
    if (!root) {
      root = document.createElement('div');
      root.id = 'toastRoot'; root.className = 'toast-root';
      root.setAttribute('role', 'region'); root.setAttribute('aria-live', 'polite'); root.setAttribute('aria-label', 'การแจ้งเตือน');
      document.body.appendChild(root);
    }
    const map = { success: 'check-circle-2', error: 'alert-circle', warning: 'alert-triangle', info: 'info' };
    const t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.innerHTML = '<span class="t-icon">' + icon(map[type] || 'info') + '</span><div class="t-text">' + esc(msg) + '</div>' +
      '<button type="button" class="btn-icon" aria-label="ปิดการแจ้งเตือน">' + icon('x') + '</button>';
    root.appendChild(t); FI.icons();
    const close = () => { t.classList.add('leaving'); setTimeout(() => t.remove(), 220); };
    $('button', t).addEventListener('click', close);
    if (ms) setTimeout(close, ms);
    return t;
  };

  /* ---------- Modal ---------- */
  FI.modal = function (o) {
    const prev = document.activeElement;
    const id = 'm' + Math.random().toString(36).slice(2, 8);
    const back = document.createElement('div');
    back.className = 'modal-backdrop';
    back.innerHTML = '<div class="modal ' + (o.size === 'sm' ? 'modal-sm' : '') + '" role="dialog" aria-modal="true" aria-labelledby="' + id + '-t">' +
      '<div class="modal-head"><h2 class="modal-title" id="' + id + '-t">' + esc(o.title) + '</h2>' +
      '<button type="button" class="btn-icon" data-close aria-label="ปิดหน้าต่าง">' + icon('x') + '</button></div>' +
      '<div class="modal-body"></div>' + (o.actions && o.actions.length ? '<div class="modal-foot"></div>' : '') + '</div>';
    const bodyEl = $('.modal-body', back);
    if (typeof o.body === 'string') bodyEl.innerHTML = o.body; else if (o.body) bodyEl.appendChild(o.body);
    let closed = false;
    const api = {
      el: back, body: bodyEl,
      close() {
        if (closed) return; closed = true;
        back.classList.remove('show');
        setTimeout(() => { back.remove(); if (!$('.modal-backdrop')) document.body.classList.remove('modal-open'); }, 170);
        if (prev && prev.focus) prev.focus();
        if (o.onClose) o.onClose();
      }
    };
    const foot = $('.modal-foot', back);
    (o.actions || []).forEach(a => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn ' + (a.cls || 'btn-outline'); b.textContent = a.label;
      if (a.id) b.id = a.id;
      b.addEventListener('click', () => { const r = a.onClick ? a.onClick(api) : undefined; if (r !== false) api.close(); });
      foot.appendChild(b);
    });
    back.addEventListener('mousedown', e => { if (e.target === back) api.close(); });
    $('[data-close]', back).addEventListener('click', api.close);
    back.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.stopPropagation(); api.close(); return; }
      if (e.key !== 'Tab') return;
      const f = $$('a[href],button:not(:disabled),input:not(:disabled),select,textarea', back).filter(x => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    document.body.appendChild(back); document.body.classList.add('modal-open');
    FI.icons();
    requestAnimationFrame(() => back.classList.add('show'));
    const focusEl = $('[data-autofocus]', back) || $('input:not([type=hidden]),textarea,select', bodyEl) || $('.modal-foot .btn:last-child', back) || $('[data-close]', back);
    setTimeout(() => focusEl && focusEl.focus(), 30);
    return api;
  };

  FI.confirm = o => new Promise(resolve => {
    let ok = false;
    FI.modal({
      title: o.title, size: 'sm',
      body: '<div class="confirm-body"><span class="confirm-icon tone-' + (o.tone || 'primary') + '">' + icon(o.icon || 'help-circle') + '</span><p>' + o.message + '</p></div>',
      actions: [
        { label: o.cancelText || 'ยกเลิก', cls: 'btn-outline' },
        { label: o.confirmText || 'ยืนยัน', cls: o.tone === 'danger' ? 'btn-danger' : 'btn-primary', onClick: () => { ok = true; } }
      ],
      onClose: () => resolve(ok)
    });
  });

  /* ---------- รูปภาพ: อ่านและย่อขนาดก่อนเก็บใน localStorage ---------- */
  FI.readImage = function (file, max = 720) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) return reject(new Error('type'));
      if (file.size > 5 * 1024 * 1024) return reject(new Error('size'));
      const fr = new FileReader();
      fr.onerror = () => reject(new Error('read'));
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('read'));
        img.onload = () => {
          const s = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
          const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.82));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  };

  /* ---------- ภาพประกอบสิ่งของ (SVG ที่สร้างจากหมวดหมู่ + สี) ---------- */
  FI.COLOR_HEX = { 'แดง': '#DC4B4B', 'ดำ': '#2B3441', 'ขาว': '#FFFFFF', 'น้ำเงิน': '#3157D5', 'เขียว': '#2E9E5B', 'อื่น ๆ': '#F0A63A' };
  const TINT = { 'แดง': '#FDECEC', 'ดำ': '#ECEFF4', 'ขาว': '#F1F4FA', 'น้ำเงิน': '#E7ECFB', 'เขียว': '#E5F5EB', 'อื่น ๆ': '#FEF3DF' };
  const GLYPH = {
    'กระเป๋า': (c, bg, h) => '<path d="M84 42v-8a16 16 0 0 1 32 0v8" fill="none" stroke="' + h + '" stroke-width="6" stroke-linecap="round"/><rect x="60" y="40" width="80" height="88" rx="24"/><rect x="76" y="86" width="48" height="30" rx="9" fill="#fff" opacity=".3" stroke="none"/><path d="M76 72h48" stroke="#fff" stroke-opacity=".45" stroke-width="3" stroke-linecap="round"/>',
    'อิเล็กทรอนิกส์': () => '<rect x="74" y="20" width="52" height="106" rx="11"/><rect x="81" y="32" width="38" height="76" rx="4" fill="#fff" opacity=".3" stroke="none"/><circle cx="100" cy="117" r="3.5" fill="#fff" opacity=".6" stroke="none"/>',
    'บัตรและเอกสาร': () => '<rect x="46" y="38" width="108" height="74" rx="10"/><rect x="46" y="50" width="108" height="14" fill="#000" opacity=".16" stroke="none"/><rect x="58" y="76" width="30" height="26" rx="5" fill="#fff" opacity=".38" stroke="none"/><rect x="98" y="78" width="46" height="5" rx="2.5" fill="#fff" opacity=".55" stroke="none"/><rect x="98" y="90" width="32" height="5" rx="2.5" fill="#fff" opacity=".55" stroke="none"/>',
    'กุญแจ': (c, bg) => '<circle cx="68" cy="75" r="26"/><circle cx="68" cy="75" r="9" fill="' + bg + '" stroke="none"/><rect x="88" y="69" width="70" height="13" rx="4"/><rect x="130" y="80" width="10" height="18" rx="2.5"/><rect x="146" y="80" width="10" height="13" rx="2.5"/>',
    'เครื่องเขียน': () => '<g transform="rotate(-35 100 75)"><rect x="46" y="61" width="88" height="28" rx="4"/><rect x="46" y="61" width="16" height="28" fill="#fff" opacity=".35" stroke="none"/><path d="M134 61l32 14-32 14z" fill="#F3D9B1" stroke="none"/><path d="M155 70l11 5-11 5z" fill="#3B3B3B" stroke="none"/></g>',
    'เสื้อผ้าและเครื่องประดับ': () => '<path d="M70 32 36 52l12 24 14-8v52h76V68l14 8 12-24-34-20c-4 10-14 16-30 16S74 42 70 32z"/><path d="M100 48v72" stroke="#fff" stroke-opacity=".45" stroke-width="3" stroke-linecap="round"/>',
    'อื่น ๆ': () => '<path d="M100 28l46 20v52l-46 22-46-22V48z"/><path d="M100 28l46 20-46 22-46-22z" fill="#fff" opacity=".3" stroke="none"/><path d="M100 70v52" stroke="#fff" stroke-opacity=".45" stroke-width="3" stroke-linecap="round"/>'
  };
  FI.art = function (item) {
    const col = item.color in FI.COLOR_HEX ? item.color : 'อื่น ๆ';
    const c = FI.COLOR_HEX[col], bg = TINT[col];
    const white = col === 'ขาว';
    const h = white ? '#B9C1D4' : c;
    const g = (GLYPH[item.category] || GLYPH['อื่น ๆ'])(c, bg, h);
    return '<svg class="art" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' +
      '<rect width="200" height="150" fill="' + bg + '"/><circle cx="172" cy="20" r="46" fill="' + c + '" opacity=".07"/><circle cx="22" cy="134" r="32" fill="' + c + '" opacity=".06"/>' +
      '<g fill="' + c + '" stroke="' + (white ? '#B9C1D4' : 'none') + '" stroke-width="2.5" stroke-linejoin="round">' + g + '</g></svg>';
  };
  FI.thumb = it => (it.image ? '<img src="' + it.image + '" alt="รูปภาพ' + esc(it.title) + '" loading="lazy">' : FI.art(it));
  FI.statusBadge = s => { const m = FI.STATUS[s] || FI.STATUS.searching; return '<span class="badge badge-' + m.tone + '">' + m.label + '</span>'; };
  FI.typeTag = t => '<span class="type-tag type-' + t + '">' + FI.TYPE[t] + '</span>';
  FI.dot = color => '<span class="color-dot" style="--dot:' + (FI.COLOR_HEX[color] || '#98A2B3') + '"></span>';

  FI.cardHTML = function (it) {
    const href = 'item-detail.html?id=' + encodeURIComponent(it.id);
    return '<article class="item-card">' +
      '<a class="item-thumb" href="' + href + '" tabindex="-1" aria-hidden="true">' + FI.thumb(it) + '<span class="type-chip type-' + it.type + '">' + FI.TYPE[it.type] + '</span></a>' +
      '<div class="item-body"><div class="item-row">' + FI.statusBadge(it.status) + '<span class="item-id">' + esc(it.id) + '</span></div>' +
      '<h3 class="item-title"><a href="' + href + '">' + esc(it.title) + '</a></h3>' +
      '<ul class="item-meta">' +
      '<li>' + icon('tag') + '<span>' + esc(it.category) + '</span></li>' +
      '<li>' + FI.dot(it.color) + '<span>สี' + esc(it.color) + '</span></li>' +
      '<li>' + icon('map-pin') + '<span>' + esc(it.location) + '</span></li>' +
      '<li>' + icon('calendar') + '<span>' + FI.fmtDate(it.date) + '</span></li></ul></div></article>';
  };

  FI.emptyState = (o) => '<div class="empty-state"><span class="empty-icon ' + (o.tone ? 'tone-' + o.tone : '') + '">' + icon(o.icon || 'search') + '</span><h3>' + esc(o.title) + '</h3><p>' + esc(o.text || '') + '</p>' + (o.action || '') + '</div>';

  /* ---------- Chart.js helpers (ใช้ร่วมกันใน Dashboard และ Reports) ---------- */
  FI.PALETTE = ['#3157D5', '#6F8DE6', '#A6B8F2', '#16A34A', '#F59E0B', '#DC2626', '#98A2B3'];
  FI.chartsReady = () => typeof window.Chart !== 'undefined';
  FI.chartSetup = () => {
    const C = window.Chart;
    C.defaults.font.family = "'Prompt','IBM Plex Sans Thai',system-ui,sans-serif";
    C.defaults.color = '#667085';
    C.defaults.plugins.legend.labels.usePointStyle = true;
    C.defaults.plugins.legend.labels.boxWidth = 8;
  };
  FI.chartFallback = el => {
    el.innerHTML = FI.emptyState({ icon: 'bar-chart-3', title: 'ไม่สามารถแสดงกราฟได้', text: 'ไม่สามารถโหลดไลบรารีกราฟ (Chart.js) ได้ กรุณาเชื่อมต่ออินเทอร์เน็ตแล้วรีเฟรชหน้า' });
    el.querySelector('.empty-state').classList.add('compact'); FI.icons();
  };

  /* ---------- ข้อมูลหน้าข้อมูลทั่วไป (แสดงใน Modal) ---------- */
  const INFO = {
    about: { title: 'เกี่ยวกับ FoundIt', html: '<p>FoundIt คือศูนย์กลางแจ้งของหายและค้นหาสิ่งของที่พบภายในมหาวิทยาลัย เพื่อให้นักศึกษา อาจารย์ และบุคลากรช่วยกันส่งสิ่งของกลับคืนสู่เจ้าของได้สะดวกขึ้น</p><h4>ระบบนี้</h4><p>รองรับการแจ้งของหายและพบของ พร้อมระบบติดต่อผู้โพสต์โดยตรงผ่านเบอร์โทร LINE Facebook และ Instagram</p>' },
    contact: { title: 'ติดต่อเรา', html: '<p>พัฒนาโดย</p><ul class="bullets"><li>นายสราวุฒิ พรมโคตร — 116710905071-2</li><li>นายปัญจพล สุวรรณรังษี — 116710905063-9</li><li>นายจิรเมธ จุ้ยกำจร — 116710905070-4</li></ul>' },
    privacy: {
      title: 'นโยบายความเป็นส่วนตัวและการติดต่อ',
      html: '<p>FoundIt ช่วยให้การตามหาและส่งคืนสิ่งของเป็นไปอย่างสะดวก รวดเร็ว และปลอดภัย</p>' +
        '<ul class="bullets">' +
        '<li><strong>การดูข้อมูลติดต่อ:</strong> เพื่อความปลอดภัยและป้องกันสแปม เฉพาะสมาชิกที่เข้าสู่ระบบแล้วเท่านั้นจึงจะสามารถดูเบอร์โทรศัพท์และ LINE ID ของผู้โพสต์ได้</li>' +
        '<li><strong>การติดต่อโดยตรง:</strong> ผู้ใช้สามารถโทรศัพท์หรือทัก LINE ติดต่อเพื่อนัดรับส่งสิ่งของกันได้โดยตรง ไม่ต้องผ่านระบบกลาง</li>' +
        '<li><strong>คำแนะนำความปลอดภัย:</strong> ให้นัดพบในพื้นที่สาธารณะที่มีผู้คนสัญจรภายในมหาวิทยาลัย (เช่น โรงอาหาร เคาน์เตอร์ประชาสัมพันธ์ หรือใต้อาคารเรียน) และตรวจสอบสิ่งของร่วมกันก่อนส่งมอบ</li>' +
        '<li><strong>ข้อมูลสำคัญ:</strong> ไม่ควรลงเลขบัตรประชาชน เลขบัญชีธนาคาร หรือรหัสผ่านลงในรายละเอียดประกาศ</li>' +
        '</ul>'
    },
    terms: { title: 'เงื่อนไขการใช้งาน', html: '<ul class="bullets"><li>ลงประกาศด้วยข้อมูลที่เป็นความจริงและเกี่ยวข้องกับสิ่งของที่สูญหายหรือพบเท่านั้น</li><li>ห้ามเปิดเผยข้อมูลส่วนบุคคลของผู้อื่นโดยไม่ได้รับอนุญาต</li><li>ผู้พบสิ่งของควรส่งมอบให้เจ้าของที่ยืนยันตัวตนได้ หรือฝากไว้ที่หน่วยงานของมหาวิทยาลัย</li><li>FoundIt ขอสงวนสิทธิ์ลบประกาศที่ไม่เหมาะสม</li></ul>' }
  };
  FI.showInfo = key => { const i = INFO[key]; if (i) FI.modal({ title: i.title, body: i.html, actions: [{ label: 'ปิด', cls: 'btn-primary' }] }); };

  /* ---------- Layout ---------- */
  const brandMark = '<span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m21 21-5.2-5.2"/><path d="m8 10.6 1.9 1.9L13.3 9"/></svg></span>';
  const NAV = [['index', 'index.html', 'หน้าแรก'], ['search', 'search.html', 'ค้นหาสิ่งของ'], ['report-lost', 'report-lost.html', 'แจ้งของหาย'], ['report-found', 'report-found.html', 'แจ้งพบของ']];

  const NOTIF_READ_KEY = 'foundit_notif_read_v1';

  function getReadIds() {
    try { return JSON.parse(localStorage.getItem(NOTIF_READ_KEY) || '[]'); } catch (e) { return []; }
  }
  function markAllRead(notifs) {
    try {
      const ids = notifs.map(n => n.item_id + '_' + n.notif_type + '_' + (n.created_at || ''));
      localStorage.setItem(NOTIF_READ_KEY, JSON.stringify(ids));
    } catch (e) {}
  }
  function hasUnread(notifs) {
    if (!notifs || notifs.length === 0) return false;
    const read = getReadIds();
    return notifs.some(n => {
      const id = n.item_id + '_' + n.notif_type + '_' + (n.created_at || '');
      return !read.includes(id);
    });
  }

  function showNotifModal(notifs, bellBtn) {
    let bodyHtml = '';
    if (!notifs || notifs.length === 0) {
      bodyHtml = '<div style="text-align:center;padding:32px 16px;color:var(--text-muted)">' +
        '<div style="font-size:2rem;margin-bottom:10px">' + icon('bell') + '</div>' +
        '<strong style="font-size:1.05rem;color:var(--text)">ยังไม่มีการแจ้งเตือนใหม่</strong>' +
        '<p style="font-size:.85rem;margin-top:6px">เมื่อมีผู้ส่งคำขอยืนยันความเป็นเจ้าของหรือเบาะแสเกี่ยวกับประกาศของคุณ จะแจ้งเตือนที่นี่</p>' +
        '</div>';
    } else {
      bodyHtml = '<div class="notif-list">' + notifs.map(n => {
        const isClaim = n.notif_type === 'claim';
        const iconType = isClaim ? 'package-check' : 'message-circle';
        const title = isClaim ? ('มีผู้ส่งคำขอรับของ: "' + esc(n.item_title) + '"') : ('มีผู้ส่งเบาะแส: "' + esc(n.item_title) + '"');
        const senderInfo = n.claimant_name ? esc(n.claimant_name) : 'ผู้ใช้ในระบบ';
        const contactInfo = n.contact_info ? (' · ติดต่อ: ' + esc(n.contact_info)) : '';
        const time = n.created_at ? n.created_at.slice(0, 16) : '';
        return '<a class="notif-item" href="item-detail.html?id=' + encodeURIComponent(n.item_id) + '" style="display:flex;gap:12px;padding:12px 8px;border-bottom:1px solid #edf2f7;text-decoration:none;color:inherit">' +
          '<span class="notif-dot" style="margin-top:2px;flex-shrink:0">' + icon(iconType) + '</span>' +
          '<span><strong style="color:var(--text);display:block;font-size:.95rem">' + title + '</strong>' +
          '<span style="display:block;margin:4px 0;font-size:.88rem;color:#4a5568">"' + esc(n.claim_text) + '"</span>' +
          '<small style="color:#a0aec0;font-size:.78rem">' + senderInfo + contactInfo + (time ? ' · ' + time : '') + '</small>' +
          '</span></a>';
      }).join('') + '</div>';
    }
    FI.modal({
      title: 'การแจ้งเตือน (' + notifs.length + ')',
      body: bodyHtml,
      actions: [{ label: 'ปิด', cls: 'btn-primary' }]
    });
    FI.icons();
    // Mark all as read
    markAllRead(notifs);
    // Remove red dot
    if (bellBtn) {
      const dot = bellBtn.querySelector('.bell-dot');
      if (dot) dot.remove();
    }
  }

  function buildPublic(page) {
    const active = { 'item-detail': 'search' }[page] || page;
    const u = FI.user();
    const h = $('#siteHeader');
    if (h) {
      const adminTag = (u && FI.isAdmin()) ? '<span class="badge badge-warning" style="margin-left:6px;font-size:.7rem;padding:1px 6px">Admin</span>' : '';
      const navLinks = [
        ['index', 'index.html', 'หน้าแรก'],
        ['search', 'search.html', 'ค้นหาสิ่งของ'],
        ['report-lost', 'report-lost.html', 'แจ้งของหาย'],
        ['report-found', 'report-found.html', 'แจ้งพบของ']
      ];
      if (u) {
        navLinks.push(['my-reports', 'my-reports.html', 'ประกาศของคุณ']);
      }
      const bellHtml = u
        ? '<button type="button" class="btn-icon bordered nav-bell-btn" id="navBellBtn" aria-label="การแจ้งเตือน" style="position:relative">' + icon('bell') + '</button>'
        : '';
      h.innerHTML = '<header class="navbar" id="navbar"><div class="container navbar-inner">' +
        '<a class="brand" href="index.html" aria-label="FoundIt หน้าแรก">' + brandMark + '<span>FoundIt</span></a>' +
        '<div class="nav-panel" id="navPanel"><nav class="nav-links" aria-label="เมนูหลัก">' +
        navLinks.map(n => '<a class="nav-link' + (n[0] === active ? ' active' : '') + '" href="' + n[1] + '"' + (n[0] === active ? ' aria-current="page"' : '') + '>' + n[2] + '</a>').join('') + '</nav>' +
        '<div class="nav-actions">' + bellHtml + (u
          ? '<a class="nav-user" href="' + (FI.isAdmin() ? 'dashboard.html' : 'profile.html') + '"><span class="avatar">' + esc(FI.initial(u.name)) + '</span><span>' + (FI.isAdmin() ? 'แดชบอร์ดแอดมิน' : esc(u.name.split(' ')[0] || u.name)) + '</span>' + adminTag + '</a>'
          : '<a class="btn btn-ghost" href="login.html">เข้าสู่ระบบ</a><a class="btn btn-primary" href="register.html">สมัครสมาชิก</a>') +
        '</div></div>' +
        '<button type="button" class="nav-toggle" id="navToggle" aria-label="เปิดเมนู" aria-expanded="false" aria-controls="navPanel">' + icon('menu') + '</button></div></header>';
      const nb = $('#navbar'), tg = $('#navToggle');
      const setOpen = o => { nb.classList.toggle('open', o); tg.setAttribute('aria-expanded', o); tg.setAttribute('aria-label', o ? 'ปิดเมนู' : 'เปิดเมนู'); tg.innerHTML = icon(o ? 'x' : 'menu'); FI.icons(); };
      tg.addEventListener('click', () => setOpen(!nb.classList.contains('open')));
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && nb.classList.contains('open')) { setOpen(false); tg.focus(); } });

      // กระดิ่งแจ้งเตือนใน Navbar (เฉพาะผู้ใช้ที่เข้าสู่ระบบแล้ว)
      const navBell = $('#navBellBtn');
      if (u && navBell) {
        let navNotifs = [];
        async function fetchNavNotifs() {
          try {
            const res = await FI.api('notifications.php?email=' + encodeURIComponent(u.email || ''));
            if (res.success && Array.isArray(res.notifications)) {
              navNotifs = res.notifications;
              if (hasUnread(navNotifs)) {
                let dot = navBell.querySelector('.bell-dot');
                if (!dot) {
                  dot = document.createElement('span');
                  dot.className = 'bell-dot';
                  dot.style.cssText = 'position:absolute;top:6px;right:6px;width:9px;height:9px;background:#ef4444;border-radius:50%;border:2px solid #fff;display:inline-block';
                  navBell.appendChild(dot);
                }
              }
            }
          } catch (e) {}
        }
        fetchNavNotifs();
        navBell.addEventListener('click', () => showNotifModal(navNotifs, navBell));
      }
    }
    const f = $('#siteFooter');
    if (f) {
      f.innerHTML = '<footer class="site-footer"><div class="container"><div class="footer-grid"><div>' +
        '<a class="brand" href="index.html">' + brandMark + '<span>FoundIt</span></a>' +
        '<p>ศูนย์กลางแจ้งของหายและค้นหาสิ่งของที่พบ ติดต่อผู้โพสต์ได้โดยตรงเพื่อส่งคืนสิ่งของ</p></div>' +
        '<div><h4>เมนู</h4><ul>' + NAV.map(n => '<li><a href="' + n[1] + '">' + n[2] + '</a></li>').join('') + '</ul></div>' +
        '<div><h4>เกี่ยวกับ</h4><ul><li><button type="button" class="foot-btn" data-info="about">เกี่ยวกับเรา</button></li><li><button type="button" class="foot-btn" data-info="contact">ติดต่อเรา</button></li><li><button type="button" class="foot-btn" data-info="privacy">นโยบายความเป็นส่วนตัว</button></li><li><button type="button" class="foot-btn" data-info="terms">เงื่อนไขการใช้งาน</button></li></ul></div></div>' +
        '<div class="footer-bottom"><span>© 2026 FoundIt — ระบบแจ้งของหายและสิ่งของที่พบ</span></div></div></footer>';
    }
  }

  function buildApp(page) {
    const active = { 'edit-report': 'my-reports' }[page] || page;
    const u = FI.currentUser();
    const isAdmin = FI.isAdmin();

    // หน้า "ภาพรวม" (dashboard) และ "รายงานสถิติ" (reports) ให้เข้าได้เฉพาะ Admin เท่านั้น
    if (!isAdmin && (page === 'dashboard' || page === 'reports')) {
      location.replace('my-reports.html');
      return;
    }

    const SIDE = isAdmin ? [
      ['home', 'index.html', 'หน้าแรก', 'home'],
      ['dashboard', 'dashboard.html', 'ภาพรวม (Admin)', 'layout-dashboard'],
      ['search', 'search.html', 'ค้นหาสิ่งของ', 'search'],
      ['report-lost', 'report-lost.html', 'แจ้งของหาย', 'alert-circle'],
      ['report-found', 'report-found.html', 'แจ้งพบสิ่งของ', 'package-check'],
      ['my-reports', 'my-reports.html', 'จัดการประกาศ (Admin)', 'shield'],
      ['reports', 'reports.html', 'รายงานสถิติ (Admin)', 'bar-chart-3'],
      ['profile', 'profile.html', 'ตั้งค่าบัญชี', 'settings']
    ] : [
      ['home', 'index.html', 'หน้าแรก', 'home'],
      ['my-reports', 'my-reports.html', 'ประกาศของคุณ', 'clipboard-list'],
      ['search', 'search.html', 'ค้นหาสิ่งของ', 'search'],
      ['report-lost', 'report-lost.html', 'แจ้งของหาย', 'alert-circle'],
      ['report-found', 'report-found.html', 'แจ้งพบสิ่งของ', 'package-check'],
      ['profile', 'profile.html', 'ตั้งค่าบัญชี', 'settings']
    ];
    const sb = $('#appSidebar');
    if (sb) {
      const adminBadge = isAdmin ? '<span class="badge badge-warning" style="margin-left:6px;font-size:.68rem;padding:1px 6px">Admin</span>' : '';
      sb.outerHTML = '<aside class="sidebar" id="sidebar" aria-label="เมนูระบบ"><div class="sidebar-brand"><a class="brand" href="index.html">' + brandMark + '<span>FoundIt</span></a>' +
        '<button type="button" class="btn-icon menu-close" id="sidebarClose" aria-label="ปิดเมนู" style="display:none">' + icon('x') + '</button></div>' +
        '<nav class="side-nav">' + SIDE.map(n => '<a class="side-link' + (n[0] === active ? ' active' : '') + '" href="' + n[1] + '"' + (n[0] === active ? ' aria-current="page"' : '') + '>' + icon(n[3]) + '<span>' + n[2] + '</span></a>').join('') +
        '</nav><div class="sidebar-foot"><a class="user-card" href="profile.html"><span class="avatar">' + esc(FI.initial(u.name)) + '</span><span><strong>' + esc(u.name) + adminBadge + '</strong><small>' + esc(u.email) + '</small></span></a>' +
        '<button type="button" class="side-link danger" data-logout>' + icon('log-out') + '<span>ออกจากระบบ</span></button></div></aside><div class="sidebar-overlay" id="sidebarOverlay"></div>';
    }
    const tb = $('#appTopbar');
    if (tb) {
      tb.outerHTML = '<header class="topbar"><button type="button" class="btn-icon bordered menu-btn" id="sidebarToggle" aria-label="เปิดเมนู" aria-controls="sidebar">' + icon('menu') + '</button>' +
        '<div class="topbar-title">' + esc(document.body.dataset.title || '') + '</div>' +
        '<button type="button" class="btn-icon bordered" id="bellBtn" aria-label="การแจ้งเตือน" style="position:relative">' + icon('bell') + '</button>' +
        '<a class="avatar" href="profile.html" aria-label="โปรไฟล์ของ ' + esc(u.name) + '">' + esc(FI.initial(u.name)) + '</a></header>';
    }
    const body = document.body;
    const set = o => { body.classList.toggle('sidebar-open', o); const t = $('#sidebarToggle'); if (t) t.setAttribute('aria-expanded', o); };
    const t = $('#sidebarToggle'); if (t) t.addEventListener('click', () => set(!body.classList.contains('sidebar-open')));
    const ov = $('#sidebarOverlay'); if (ov) ov.addEventListener('click', () => set(false));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && body.classList.contains('sidebar-open')) set(false); });
    $$('.side-link[href]').forEach(a => a.addEventListener('click', () => set(false)));

    const bell = $('#bellBtn');
    let notifs = [];
    async function fetchNotifs() {
      try {
        const uEmail = (u && u.email) || '';
        const res = await FI.api('notifications.php?email=' + encodeURIComponent(uEmail));
        if (res.success && Array.isArray(res.notifications)) {
          notifs = res.notifications;
          if (bell && hasUnread(notifs)) {
            let dot = bell.querySelector('.bell-dot');
            if (!dot) {
              dot = document.createElement('span');
              dot.className = 'bell-dot';
              dot.style.cssText = 'position:absolute;top:6px;right:6px;width:9px;height:9px;background:#ef4444;border-radius:50%;border:2px solid #fff;display:inline-block';
              bell.appendChild(dot);
            }
          }
        }
      } catch (e) {}
    }
    fetchNotifs();

    if (bell) bell.addEventListener('click', () => showNotifModal(notifs, bell));
  }

  FI.ready(() => {
    const b = document.body, layout = b.dataset.layout, page = b.dataset.page;
    const skip = document.createElement('a'); skip.className = 'skip-link'; skip.href = '#main'; skip.textContent = 'ข้ามไปยังเนื้อหาหลัก';
    b.insertBefore(skip, b.firstChild);
    if (layout === 'public') buildPublic(page);
    if (layout === 'app') buildApp(page);
    document.addEventListener('click', e => {
      const info = e.target.closest('[data-info]'); if (info) { FI.showInfo(info.dataset.info); return; }
      if (e.target.closest('[data-logout]')) { FI.logout(); return; }
      if (e.target.closest('[data-reset-demo]')) {
        FI.confirm({ title: 'รีเซ็ตข้อมูลตัวอย่าง', icon: 'rotate-ccw', tone: 'danger', confirmText: 'รีเซ็ตข้อมูล', message: 'ประกาศที่เพิ่ม แก้ไข หรือลบไว้ทั้งหมดจะถูกแทนที่ด้วยข้อมูลตัวอย่างเริ่มต้น ต้องการดำเนินการต่อหรือไม่?' })
          .then(ok => { if (ok) { FI.store.reset(); FI.toast('รีเซ็ตข้อมูลตัวอย่างเรียบร้อยแล้ว', 'success'); setTimeout(() => location.reload(), 700); } });
      }
    });
    FI.icons();
  });
})();
