/* ==========================================================================
   FoundIt — Mock Data
   ข้อมูลทั้งหมดเป็นข้อมูลจำลอง เก็บใน localStorage ของเบราว์เซอร์เท่านั้น
   ไม่ได้เชื่อมต่อฐานข้อมูลหรือเซิร์ฟเวอร์ใด ๆ
   ========================================================================== */
(function (global) {
  'use strict';
  const FI = (global.FI = global.FI || {});
  const KEY = 'foundit_items_v2';

  // ล้างแคชข้อมูลตัวอย่างรุ่นเก่าใน browser ทันที
  try {
    localStorage.removeItem('foundit_items_v1');
    localStorage.removeItem('foundit_items_v2');
  } catch (e) {}

  FI.CATEGORIES = ['กระเป๋า', 'อิเล็กทรอนิกส์', 'บัตรและเอกสาร', 'กุญแจ', 'เครื่องเขียน', 'เสื้อผ้าและเครื่องประดับ', 'อื่น ๆ'];
  FI.COLORS = ['แดง', 'ดำ', 'ขาว', 'น้ำเงิน', 'เขียว', 'อื่น ๆ'];
  FI.LOCATIONS = ['อาคารเรียน A', 'อาคารเรียน B', 'โรงอาหาร', 'ห้องสมุด', 'ลานจอดรถ', 'อาคารกิจกรรมนักศึกษา', 'สนามกีฬา', 'หอพักนักศึกษา', 'ศูนย์คอมพิวเตอร์', 'อื่น ๆ'];
  FI.TYPE = { lost: 'ของหาย', found: 'ของที่พบ' };
  FI.STATUS = {
    searching: { label: 'กำลังตามหา', tone: 'warning' },
    found: { label: 'มีผู้พบสิ่งของ', tone: 'primary' },
    returned: { label: 'ส่งคืนแล้ว', tone: 'success' }
  };

  const pad = n => String(n).padStart(2, '0');
  FI.toISO = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  FI.todayISO = () => FI.toISO(new Date());

  const SEED = [];
  function buildSeed() { return []; }

  let cache = null;
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(cache || [])); return true; } catch (e) { return false; }
  }
  function load() {
    if (cache !== null) return cache;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const a = JSON.parse(raw);
        if (Array.isArray(a)) {
          cache = a;
          return cache;
        }
      }
    } catch (e) {}
    cache = [];
    persist();
    return cache;
  }

  FI.api = async function (endpoint, options = {}) {
    try {
      const res = await fetch('api/' + endpoint, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
      });
      return await res.json();
    } catch (e) {
      console.warn('API connection failed:', e);
      return { success: false, message: e.message };
    }
  };

  FI.store = {
    all() { return load().slice(); },
    get(id) { return load().find(i => i.id === id) || null; },
    mine() { return load().filter(i => i.mine); },
    add(data) {
      const list = load();
      const max = list.reduce((m, i) => Math.max(m, parseInt(String(i.id).replace(/\D/g, ''), 10) || 0), 0);
      const item = Object.assign({ mine: true, image: null }, data, {
        id: 'FI-' + String(max + 1).padStart(3, '0'), postedAt: FI.todayISO()
      });
      list.unshift(item);
      let ok = persist(), imageDropped = false;
      if (!ok && item.image) { item.image = null; imageDropped = true; ok = persist(); }

      // ส่งไปยัง MySQL Database ผ่าน API
      FI.api('items.php', {
        method: 'POST',
        body: JSON.stringify(data)
      }).then(res => {
        if (res.success && res.item) {
          const idx = list.findIndex(x => x.id === item.id);
          if (idx >= 0) {
            list[idx] = Object.assign(item, res.item, { mine: true });
            persist();
          }
        }
      });

      return { item, persisted: ok, imageDropped };
    },
    update(id, patch) {
      const it = load().find(i => i.id === id);
      if (!it) return null;
      Object.assign(it, patch);
      let ok = persist(), imageDropped = false;
      if (!ok && patch.image) { it.image = null; imageDropped = true; ok = persist(); }

      // ส่งอัปเดตไปยัง MySQL Database
      FI.api('items.php?action=update&id=' + encodeURIComponent(id), {
        method: 'POST',
        body: JSON.stringify(patch)
      }).then(res => {
        if (res.success && res.item) {
          Object.assign(it, res.item, { mine: true });
          persist();
        }
      });

      return { item: it, persisted: ok, imageDropped };
    },
    remove(id) {
      const list = load(); const i = list.findIndex(x => x.id === id);
      if (i < 0) return false;
      list.splice(i, 1); persist();

      // ลบจาก MySQL Database
      FI.api('items.php?action=delete&id=' + encodeURIComponent(id), {
        method: 'POST'
      });

      return true;
    },
    async sync() {
      try {
        const res = await FI.api('items.php');
        if (res && res.success && Array.isArray(res.items)) {
          cache = res.items;
          persist();
          window.dispatchEvent(new CustomEvent('foundit:synced', { detail: { items: cache } }));
          return cache;
        }
      } catch (e) {}
      return load();
    },
    reset() {
      cache = [];
      persist();
      try { localStorage.removeItem('foundit_claims_v1'); } catch (e) {}
      window.dispatchEvent(new CustomEvent('foundit:synced', { detail: { items: [] } }));
    }
  };

  // ดึงข้อมูลจริงจากฐานข้อมูล MySQL ทันทีที่โหลด
  FI.store.sync();

  /* ตัวกรองหลัก — ทุกเงื่อนไขต้องตรงพร้อมกัน (AND) */
  FI.filterItems = function (items, s) {
    const toks = String(s.q || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    const out = items.filter(it => {
      if (s.type && s.type !== 'all' && it.type !== s.type) return false;
      if (s.category && s.category !== 'all' && it.category !== s.category) return false;
      if (s.color && s.color !== 'all' && it.color !== s.color) return false;
      if (s.location && s.location !== 'all' && it.location !== s.location) return false;
      if (s.from && it.date < s.from) return false;
      if (s.to && it.date > s.to) return false;
      if (toks.length) {
        const hay = [it.title, it.description, it.category, it.color, it.location].join(' ').toLowerCase();
        if (!toks.every(t => hay.includes(t))) return false;
      }
      return true;
    });
    const dir = s.sort === 'old' ? 1 : -1;
    return out.sort((a, b) => {
      const c = a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
      return c ? c * dir : (a.id < b.id ? -1 : 1) * dir;
    });
  };
})(window);
