/* ==========================================================================
   FoundIt — หน้าแรก, ค้นหาสิ่งของ, รายละเอียดสิ่งของ
   ========================================================================== */
(function () {
  'use strict';
  const FI = window.FI, { $, $$, esc } = FI, icon = FI.icon;

  /* ---------------------------- หน้าแรก ---------------------------- */
  function initIndex() {
    function renderLatest() {
      const items = FI.store.all();
      FI.countUp($('#statLost'), items.filter(i => i.type === 'lost').length);
      FI.countUp($('#statFound'), items.filter(i => i.type === 'found').length);
      FI.countUp($('#statReturned'), items.filter(i => i.status === 'returned').length);

      const latest = FI.filterItems(items, { sort: 'new' }).slice(0, 6);
      const container = $('#latestItems');
      if (container) {
        container.innerHTML = latest.length > 0
          ? latest.map(FI.cardHTML).join('')
          : '<div class="empty-state" style="grid-column: 1 / -1; padding: 40px 16px; text-align: center;"><span class="empty-icon">' + icon('clipboard-list') + '</span><h3>ยังไม่มีรายการประกาศ</h3><p>เริ่มแจ้งของหายหรือแจ้งพบสิ่งของเพื่อให้ทุกอย่างกลับสู่เจ้าของ</p></div>';
      }
      FI.icons();
    }
    renderLatest();
    window.addEventListener('foundit:synced', renderLatest);

    $('#heroSearch').addEventListener('submit', e => {
      e.preventDefault();
      const p = new URLSearchParams();
      const q = $('#heroQ').value.trim(), t = $('#heroType').value;
      if (q) p.set('q', q);
      if (t !== 'all') p.set('type', t);
      location.href = 'search.html' + (p.toString() ? '?' + p : '');
    });

    const mk = (cat, color, title) => ({ category: cat, color, title });
    $('#heroVisual').innerHTML = '<div class="hv-stage">' +
      '<div class="hv-card hv-main"><div class="hv-art">' + FI.art(mk('กระเป๋า', 'แดง')) + '</div><div class="hv-info"><span class="badge badge-primary">มีผู้พบสิ่งของ</span><strong>กระเป๋าเป้สีแดง</strong><small>อาคารเรียน A · วันนี้</small></div></div>' +
      '<div class="hv-card hv-sm hv-a"><div class="hv-art">' + FI.art(mk('อิเล็กทรอนิกส์', 'ขาว')) + '</div></div>' +
      '<div class="hv-card hv-sm hv-b"><div class="hv-art">' + FI.art(mk('กุญแจ', 'อื่น ๆ')) + '</div></div></div>';
    FI.icons();
  }

  /* ---------------------------- ค้นหา ---------------------------- */
  function initSearch() {
    const PAGE_SIZE = 9;
    const form = $('#filterForm'), results = $('#results');
    const DEFAULT = { q: '', type: 'all', category: 'all', color: 'all', location: 'all', from: '', to: '', sort: 'new' };
    const state = Object.assign({}, DEFAULT, { page: 1, view: 'grid' });
    try { state.view = sessionStorage.getItem('foundit_view') || 'grid'; } catch (e) { /* ignore */ }

    const fillSelect = (sel, list, allLabel) => { sel.innerHTML = '<option value="all">' + allLabel + '</option>' + list.map(v => '<option value="' + esc(v) + '">' + esc(v) + '</option>').join(''); };
    fillSelect($('#category'), FI.CATEGORIES, 'ทั้งหมด');
    fillSelect($('#location'), FI.LOCATIONS, 'ทุกสถานที่');
    $('#colorGroup').innerHTML = [['all', 'ทั้งหมด']].concat(FI.COLORS.map(c => [c, c])).map((c, i) =>
      '<label class="chip"><input type="radio" name="color" value="' + esc(c[0]) + '"' + (i === 0 ? ' checked' : '') + '>' + (c[0] !== 'all' ? FI.dot(c[0]) : '') + '<span>' + esc(c[1]) + '</span></label>').join('');
    $('#to').max = $('#from').max = FI.todayISO();

    // อ่านพารามิเตอร์จาก URL (เช่น มาจากช่องค้นหาหน้าแรก)
    const sp = new URLSearchParams(location.search);
    ['q', 'type', 'category', 'color', 'location', 'from', 'to', 'sort'].forEach(k => { if (sp.get(k)) state[k] = sp.get(k); });
    if (!['all', 'lost', 'found'].includes(state.type)) state.type = 'all';

    function writeForm() {
      form.elements.q.value = state.q;
      form.elements.category.value = state.category; if (form.elements.category.value !== state.category) state.category = 'all';
      form.elements.location.value = state.location; if (form.elements.location.value !== state.location) state.location = 'all';
      form.elements.from.value = state.from; form.elements.to.value = state.to; form.elements.sort.value = state.sort;
      $$('input[name=type]', form).forEach(r => { r.checked = r.value === state.type; });
      $$('input[name=color]', form).forEach(r => { r.checked = r.value === state.color; });
      if (!$$('input[name=color]', form).some(r => r.checked)) { state.color = 'all'; $$('input[name=color]', form)[0].checked = true; }
    }
    function readForm() {
      const fd = new FormData(form);
      state.q = (fd.get('q') || '').trim(); state.type = fd.get('type') || 'all';
      state.category = fd.get('category'); state.color = fd.get('color') || 'all'; state.location = fd.get('location');
      state.from = fd.get('from') || ''; state.to = fd.get('to') || ''; state.sort = fd.get('sort');
    }
    writeForm();

    function activeCount() {
      return ['q', 'type', 'category', 'color', 'location', 'from', 'to'].filter(k => state[k] !== DEFAULT[k]).length;
    }
    function syncURL() {
      const p = new URLSearchParams();
      Object.keys(DEFAULT).forEach(k => { if (state[k] !== DEFAULT[k]) p.set(k, state[k]); });
      try { history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '')); } catch (e) { /* ไฟล์ภายในเครื่องอาจไม่รองรับ */ }
    }

    function render() {
      let s = state;
      const dateErr = $('#dateError');
      if (s.from && s.to && s.from > s.to) {
        dateErr.hidden = false; dateErr.textContent = 'วันที่เริ่มต้นต้องไม่อยู่หลังวันที่สิ้นสุด';
        s = Object.assign({}, state, { from: '', to: '' });
      } else dateErr.hidden = true;

      const list = FI.filterItems(FI.store.all(), s);
      const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
      if (state.page > pages) state.page = pages;
      const slice = list.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);

      $('#resultCount').innerHTML = 'พบ <strong>' + list.length.toLocaleString('th-TH') + '</strong> รายการ';
      const n = activeCount(); const badge = $('#filterBadge'); badge.hidden = !n; badge.textContent = n;
      $('#clearInline').hidden = !n;
      results.className = state.view === 'list' ? 'items-list' : 'items-grid';
      $$('.view-toggle button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === state.view)));

      if (!list.length) {
        results.innerHTML = '';
        $('#emptyState').innerHTML = FI.emptyState({ icon: 'search', title: 'ไม่พบสิ่งของที่ตรงกับการค้นหา', text: 'ลองเปลี่ยนคำค้นหา หรือลดตัวกรองบางส่วนลง หากยังไม่พบ คุณสามารถแจ้งของหายไว้ให้ผู้พบช่วยติดต่อกลับได้', action: '<div class="success-actions"><button type="button" class="btn btn-outline" data-clear>ล้างตัวกรอง</button><a class="btn btn-primary" href="report-lost.html">แจ้งของหาย</a></div>' });
        $('#emptyState').hidden = false; $('#pagination').innerHTML = '';
      } else {
        $('#emptyState').hidden = true;
        results.innerHTML = slice.map(FI.cardHTML).join('');
        renderPager(pages);
      }
      FI.icons(); syncURL();
    }

    function renderPager(pages) {
      const el = $('#pagination');
      if (pages <= 1) { el.innerHTML = ''; return; }
      const cur = state.page, nums = [];
      for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - cur) <= 1) nums.push(i);
      let html = '<button type="button" class="page-btn" data-page="' + (cur - 1) + '" aria-label="หน้าก่อนหน้า"' + (cur === 1 ? ' disabled' : '') + '>' + icon('chevron-left') + '</button>';
      let last = 0;
      nums.forEach(n => {
        if (n - last > 1) html += '<span class="page-gap" aria-hidden="true">…</span>';
        html += '<button type="button" class="page-btn" data-page="' + n + '"' + (n === cur ? ' aria-current="page"' : '') + ' aria-label="หน้า ' + n + '">' + n + '</button>';
        last = n;
      });
      html += '<button type="button" class="page-btn" data-page="' + (cur + 1) + '" aria-label="หน้าถัดไป"' + (cur === pages ? ' disabled' : '') + '>' + icon('chevron-right') + '</button>';
      el.innerHTML = html;
    }

    function clearAll() {
      Object.assign(state, DEFAULT, { page: 1 });
      writeForm(); render();
      FI.toast('ล้างตัวกรองทั้งหมดแล้ว', 'info', 2200);
    }
    function change() { readForm(); state.page = 1; render(); }

    form.addEventListener('input', FI.debounce(change, 200));
    form.addEventListener('change', change);
    form.addEventListener('submit', e => {
      e.preventDefault(); change();
      $('#filters').classList.remove('open'); $('#filterToggle').setAttribute('aria-expanded', 'false');
      $('#resultsTop').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $('#sort').addEventListener('change', change);
    $('#clearBtn').addEventListener('click', clearAll);
    $('#clearInline').addEventListener('click', clearAll);
    document.addEventListener('click', e => { if (e.target.closest('[data-clear]')) clearAll(); });
    $('#pagination').addEventListener('click', e => {
      const b = e.target.closest('[data-page]'); if (!b || b.disabled) return;
      state.page = Number(b.dataset.page); render();
      $('#resultsTop').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $$('.view-toggle button').forEach(b => b.addEventListener('click', () => {
      state.view = b.dataset.view; try { sessionStorage.setItem('foundit_view', state.view); } catch (e) { /* ignore */ }
      render();
    }));
    $('#filterToggle').addEventListener('click', () => {
      const o = $('#filters').classList.toggle('open'); $('#filterToggle').setAttribute('aria-expanded', String(o));
    });

    // Skeleton ระหว่างโหลดครั้งแรก
    results.className = 'items-grid';
    results.innerHTML = Array(6).fill('<div class="skeleton" aria-hidden="true"><div class="sk-img"></div><div class="sk-line short"></div><div class="sk-line"></div><div class="sk-line short"></div></div>').join('');
    results.setAttribute('aria-busy', 'true');
    setTimeout(() => { results.removeAttribute('aria-busy'); render(); }, 380);
    window.addEventListener('foundit:synced', () => render());
  }

  /* ---------------------------- รายละเอียด ---------------------------- */
  async function initDetail() {
    const mount = $('#detailMount');
    const id = new URLSearchParams(location.search).get('id') || '';
    if (!id) {
      mount.innerHTML = '<div class="container" style="padding-block:64px">' + FI.emptyState({ icon: 'search', tone: 'danger', title: 'ไม่พบประกาศที่ต้องการ', text: 'ไม่ได้ระบุรหัสประกาศที่ต้องการดู', action: '<a class="btn btn-primary" href="search.html">กลับไปค้นหาสิ่งของ</a>' }) + '</div>';
      FI.icons(); return;
    }

    let it = FI.store.get(id);
    if (!it) {
      try {
        const res = await FI.api('items.php?id=' + encodeURIComponent(id));
        if (res && res.success && res.item) {
          it = res.item;
        }
      } catch (e) {}
    }

    if (!it) {
      mount.innerHTML = '<div class="container" style="padding-block:64px">' + FI.emptyState({ icon: 'search', tone: 'danger', title: 'ไม่พบประกาศที่ต้องการ', text: 'ประกาศนี้อาจถูกลบไปแล้ว หรือรหัสประกาศไม่ถูกต้อง', action: '<a class="btn btn-primary" href="search.html">กลับไปค้นหาสิ่งของ</a>' }) + '</div>';
      FI.icons(); return;
    }
    document.title = it.title + ' | FoundIt';
    const canClaim = it.type === 'found' && it.status === 'found';
    const typeWord = it.type === 'lost' ? 'ที่คาดว่าทำหาย' : 'ที่พบ';
    const claims = (() => { try { return JSON.parse(localStorage.getItem('foundit_claims_v1') || '[]'); } catch (e) { return []; } })();
    const claimed = claims.some(c => c.id === it.id);

    const similar = FI.store.all().filter(x => x.id !== it.id).map(x => ({
      x, s: (x.category === it.category ? 3 : 0) + (x.color === it.color ? 2 : 0) + (x.type !== it.type ? 1 : 0) + (x.location === it.location ? 1 : 0)
    })).filter(o => o.s >= 3).sort((a, b) => b.s - a.s || (a.x.date < b.x.date ? 1 : -1)).slice(0, 3).map(o => o.x);

    mount.innerHTML = '<div class="container"><nav class="breadcrumb" aria-label="เส้นทางหน้า"><a href="index.html">หน้าแรก</a>' + icon('chevron-right') + '<a href="search.html">ค้นหาสิ่งของ</a>' + icon('chevron-right') + '<span aria-current="page">' + esc(it.title) + '</span></nav>' +
      '<div class="detail-grid"><div class="card detail-media"><div class="media-frame">' + FI.thumb(it) + '</div><div class="media-cap">' + icon('info') + (it.image ? 'รูปภาพที่ผู้ประกาศอัปโหลด' : 'ภาพสัญลักษณ์ตามหมวดหมู่และสีของสิ่งของ') + '</div></div>' +
      '<div class="detail-main"><div class="detail-badges">' + FI.typeTag(it.type) + FI.statusBadge(it.status) + '</div>' +
      '<h1>' + esc(it.title) + '</h1><p class="detail-sub">รหัสประกาศ ' + esc(it.id) + ' · ลงประกาศเมื่อ ' + FI.fmtDate(it.postedAt) + '</p>' +
      '<dl class="info-grid">' +
      '<div><dt>' + icon('tag') + 'หมวดหมู่</dt><dd>' + esc(it.category) + '</dd></div>' +
      '<div><dt>' + icon('palette') + 'สี</dt><dd>' + FI.dot(it.color) + esc(it.color) + '</dd></div>' +
      '<div><dt>' + icon('calendar') + (it.type === 'lost' ? 'วันที่สูญหาย' : 'วันที่พบ') + '</dt><dd>' + FI.fmtDate(it.date) + '</dd></div>' +
      '<div><dt>' + icon('map-pin') + 'สถานที่' + typeWord + '</dt><dd>' + esc(it.location) + '</dd></div></dl>' +
      '<div class="detail-desc"><h2>รายละเอียดประกาศ</h2><p>' + esc(it.description || 'ไม่มีรายละเอียดเพิ่มเติม') + '</p></div>' +
      /* ---------- poster box + contact ---------- */
      (function () {
        const u = FI.user();
        const isLoggedIn = !!u;
        const isAdmin = FI.isAdmin();
        const hasPhone = it.contact_phone && it.contact_phone.trim();
        const hasLine  = it.contact_line  && it.contact_line.trim();
        const hasCName = it.contact_name  && it.contact_name.trim();
        const displayName = hasCName ? esc(it.contact_name) : (it.mine ? 'ประกาศของคุณ' : 'ผู้ลงประกาศ');
        
        let contactHtml = '';
        if (isLoggedIn) {
          // เข้าสู่ระบบแล้ว -> แสดงข้อมูลติดต่อโดยตรง
          if (hasPhone || hasLine) {
            contactHtml += '<div class="contact-info-box direct-contact">' +
              '<p class="contact-label">' + icon('phone-call') + '<strong>ช่องทางติดต่อผู้โพสต์โดยตรง</strong></p>' +
              '<p class="contact-sub-text">คุณสามารถโทรหรือทัก LINE เพื่อนัดรับสิ่งของหรือสอบถามรายละเอียดได้ทันที</p>' +
              '<div class="contact-btns">';
            if (hasPhone) {
              contactHtml += '<a class="btn btn-contact btn-phone" href="tel:' + esc(it.contact_phone) + '" aria-label="โทรหาผู้โพสต์">' +
                icon('phone-call') + '<span>โทร: ' + esc(it.contact_phone) + '</span></a>';
            }
            if (hasLine) {
              contactHtml += '<a class="btn btn-contact btn-line" href="https://line.me/R/ti/p/~' + encodeURIComponent(it.contact_line.replace(/^@/,'')) + '" target="_blank" rel="noopener" aria-label="ติดต่อผ่าน LINE">' +
                icon('message-circle') + '<span>LINE: ' + esc(it.contact_line) + '</span></a>';
            }
            contactHtml += '</div></div>';
          } else if (!it.mine) {
            contactHtml = '<div class="contact-none">' + icon('info') + 'ผู้โพสต์ไม่ได้ระบุช่องทางติดต่อไว้ — สามารถใช้ปุ่ม "ติดต่อเจ้าของโพสต์" ด้านล่าง</div>';
          }
        } else {
          // ยังไม่ได้เข้าสู่ระบบ -> แสดงข้อความล็อกอินเพื่อความปลอดภัยและป้องกันสแปม
          contactHtml += '<div class="contact-login-prompt">' +
            '<div class="clp-icon">' + icon('lock') + '</div>' +
            '<div class="clp-body">' +
              '<strong>เข้าสู่ระบบเพื่อดูช่องทางติดต่อผู้โพสต์</strong>' +
              '<p>เบอร์โทรศัพท์และ LINE ID ของผู้โพสต์จะแสดงเฉพาะสมาชิกที่เข้าสู่ระบบแล้ว เพื่อความปลอดภัยและป้องกันสแปม</p>' +
              '<a class="btn btn-primary btn-sm" href="login.html?redirect=' + encodeURIComponent('item-detail.html?id=' + it.id) + '">' + icon('log-in') + 'เข้าสู่ระบบเพื่อดูข้อมูลติดต่อ</a>' +
            '</div></div>';
        }

        // แถบสิทธิ์ Admin
        let adminBanner = '';
        if (isAdmin) {
          adminBanner = '<div class="admin-badge-strip">' +
            '<div class="admin-badge-head">' + icon('shield-alert') + '<span><strong>โหมดผู้ดูแลระบบ (Admin)</strong>: คุณสามารถจัดการประกาศนี้ได้</span></div>' +
            '<div class="admin-btns">' +
              '<a class="btn btn-sm btn-outline" href="edit-report.html?id=' + encodeURIComponent(it.id) + '">' + icon('pencil') + 'แก้ไขประกาศ</a>' +
              '<button type="button" class="btn btn-sm btn-outline" id="adminStatusBtn">' + icon('refresh-cw') + 'เปลี่ยนสถานะ</button>' +
              '<button type="button" class="btn btn-sm btn-danger" id="adminDeleteBtn">' + icon('trash-2') + 'ลบประกาศ</button>' +
            '</div>' +
          '</div>';
        }

        return adminBanner +
          '<div class="poster-box"><span class="avatar">' + icon('user') + '</span><div><strong>' + displayName + '</strong>' +
          '<small>' + (it.mine ? 'นี่คือประกาศของคุณ' : (it.creator_name ? 'ผู้ลงประกาศ: ' + esc(it.creator_name) : 'ผู้ลงประกาศในระบบ FoundIt')) + '</small></div></div>' +
          contactHtml;
      })() +
      (it.status === 'returned'
        ? '<div class="notice notice-warning" style="margin-top:16px">' + icon('clock') + '<div><strong>ประกาศนี้ส่งคืนเรียบร้อยแล้ว:</strong> ระบบจะลบโพสต์นี้ออกจากหน้าเว็บโดยอัตโนมัติเมื่อครบ 30 วัน เพื่อความสะอาดของหน้าเว็บและลดภาระผู้ดูแลระบบ</div></div>'
        : '') +
      '<div class="notice notice-info">' + icon('shield-check') + '<div><strong>คำแนะนำความปลอดภัย:</strong> ติดต่อผู้โพสต์โดยตรงเพื่อนัดหมายส่งมอบสิ่งของ แนะนำให้นัดพบในสถานที่สาธารณะที่มีผู้คนสัญจร เช่น โรงอาหาร หรือใต้อาคารเรียน และตรวจสอบสิ่งของร่วมกันก่อนส่งมอบ</div></div>' +
      '<div class="detail-actions" id="detailActions">' +
      (canClaim ? '<button type="button" class="btn btn-primary btn-lg" id="claimBtn"' + (claimed ? ' disabled' : '') + '>' + icon('badge-check') + (claimed ? 'ส่งคำขอแล้ว' : 'ฉันคิดว่านี่คือสิ่งของของฉัน') + '</button>' : '') +
      '<button type="button" class="btn ' + (canClaim ? 'btn-outline' : 'btn-primary') + ' btn-lg" id="infoBtn">' + icon('message-circle') + 'ติดต่อเจ้าของโพสต์</button>' +
      (it.mine ? '<a class="btn btn-soft btn-lg" href="edit-report.html?id=' + encodeURIComponent(it.id) + '">' + icon('pencil') + 'แก้ไขประกาศ</a>' : '') +
      '</div></div></div>' +
      '<section class="section" style="padding-bottom:0"><div class="section-head"><div><h2>สิ่งของที่คล้ายกัน</h2><p>ประกาศที่มีหมวดหมู่หรือสีใกล้เคียง อาจช่วยให้คุณพบสิ่งที่ตามหา</p></div><a class="btn btn-outline" href="search.html?category=' + encodeURIComponent(it.category) + '">ดูทั้งหมดในหมวดนี้</a></div>' +
      (similar.length ? '<div class="items-grid">' + similar.map(FI.cardHTML).join('') + '</div>' : FI.emptyState({ icon: 'inbox', title: 'ยังไม่มีสิ่งของที่คล้ายกัน', text: 'เมื่อมีประกาศใหม่ที่ใกล้เคียง จะแสดงในส่วนนี้' })) + '</section></div>';
    FI.icons();

    // ปุ่มแอดมิน: เปลี่ยนสถานะ และ ลบประกาศ
    const adminDeleteBtn = $('#adminDeleteBtn');
    if (adminDeleteBtn) {
      adminDeleteBtn.addEventListener('click', async () => {
        const ok = await FI.confirm({ title: 'ลบประกาศโดยแอดมิน', icon: 'trash-2', tone: 'danger', confirmText: 'ลบประกาศ', message: 'ต้องการลบประกาศ <strong>' + esc(it.title) + '</strong> (รหัส ' + esc(it.id) + ') ใช่หรือไม่?' });
        if (ok) {
          FI.store.remove(it.id);
          FI.toast('แอดมินลบประกาศ “' + it.title + '” แล้ว', 'success');
          setTimeout(() => { location.href = 'search.html'; }, 800);
        }
      });
    }
    const adminStatusBtn = $('#adminStatusBtn');
    if (adminStatusBtn) {
      adminStatusBtn.addEventListener('click', () => {
        const choices = it.type === 'lost' ? ['searching', 'found', 'returned'] : ['found', 'returned'];
        FI.modal({
          title: 'เปลี่ยนสถานะประกาศ (Admin)', size: 'sm',
          body: '<p style="margin-bottom:12px">เลือกสถานะใหม่ของ <strong style="color:var(--text)">' + esc(it.title) + '</strong></p><div class="radio-list">' +
            choices.map(s => '<label class="radio-item"><input type="radio" name="adminNewStatus" value="' + s + '"' + (it.status === s ? ' checked' : '') + '>' + FI.statusBadge(s) + '</label>').join('') + '</div>',
          actions: [{ label: 'ยกเลิก', cls: 'btn-outline' }, {
            label: 'บันทึก', cls: 'btn-primary', onClick: () => {
              const checked = document.querySelector('input[name=adminNewStatus]:checked');
              if (!checked || checked.value === it.status) return;
              FI.store.update(it.id, { status: checked.value });
              FI.toast('แอดมินเปลี่ยนสถานะเป็น “' + FI.STATUS[checked.value].label + '” แล้ว', 'success');
              setTimeout(() => { location.reload(); }, 600);
            }
          }]
        });
      });
    }

    const claimBtn = $('#claimBtn');
    if (claimBtn) claimBtn.addEventListener('click', () => {
      FI.modal({
        title: 'ยืนยันความเป็นเจ้าของและติดต่อขอรับของ',
        body: '<p style="margin-bottom:14px">กรุณาระบุรายละเอียดเพื่อยืนยันความเป็นเจ้าของ เช่น ของที่อยู่ภายใน รอยตำหนิ หรือรูปทรงเฉพาะ พร้อมช่องทางติดต่อของคุณ</p>' +
          '<div class="field"><label for="claimText">รายละเอียดที่ใช้ยืนยัน <span class="req">*</span></label><textarea class="textarea" id="claimText" maxlength="500" placeholder="เช่น ภายในกระเป๋ามีสมุดสีฟ้า และพวงกุญแจหมี"></textarea><p class="field-error" id="claimErr" hidden></p></div>' +
          '<div class="field"><label for="claimContact">เบอร์โทรศัพท์หรือ LINE ของคุณ (เพื่อให้ผู้โพสต์ติดต่อกลับได้สะดวก)</label><input class="input" id="claimContact" placeholder="เช่น 081-234-5678 หรือ @myline" value="' + esc((FI.user() && FI.user().phone) || '') + '"></div>',
        actions: [{ label: 'ยกเลิก', cls: 'btn-outline' }, {
          label: 'ส่งคำขอรับของ', cls: 'btn-primary', onClick: async () => {
            const v = $('#claimText').value.trim(), err = $('#claimErr');
            const contactInfo = ($('#claimContact') ? $('#claimContact').value.trim() : '');
            if (v.length < 10) { err.hidden = false; err.textContent = 'กรุณากรอกรายละเอียดอย่างน้อย 10 ตัวอักษร'; $('#claimText').focus(); return false; }
            claims.push({ id: it.id, at: new Date().toISOString() });
            try { localStorage.setItem('foundit_claims_v1', JSON.stringify(claims)); } catch (e) { /* ignore */ }
            claimBtn.disabled = true; claimBtn.innerHTML = icon('badge-check') + 'ส่งคำขอแล้ว'; FI.icons();

            // ส่งข้อมูลไปยัง API
            try {
              await FI.api('claims.php', {
                method: 'POST',
                body: JSON.stringify({ item_id: it.id, claim_text: v, contact_info: contactInfo })
              });
            } catch (e) {}

            FI.toast('ส่งคำขอยืนยันความเป็นเจ้าของเรียบร้อยแล้ว คุณสามารถโทรหรือทัก LINE ผู้โพสต์ได้โดยตรง', 'success', 5000);
          }
        }]
      });
    });
    $('#infoBtn').addEventListener('click', () => {
      FI.modal({
        title: 'ติดต่อเจ้าของโพสต์',
        body: '<p style="margin-bottom:14px">หากคุณมีข้อมูลหรือพบเห็นสิ่งของนี้ สามารถส่งข้อความพร้อมระบุช่องทางติดต่อของคุณเพื่อให้ผู้โพสต์ติดต่อกลับได้</p>' +
          '<div class="field"><label for="infoText">ข้อความ <span class="req">*</span></label><textarea class="textarea" id="infoText" maxlength="500" placeholder="เช่น เห็นสิ่งของนี้ที่หน้าห้องสมุดเมื่อเช้านี้"></textarea><p class="field-error" id="infoErr" hidden></p></div>' +
          '<div class="field"><label for="infoContact">ช่องทางติดต่อของคุณ (เบอร์โทรหรือ LINE - ถ้ามี)</label><input class="input" id="infoContact" placeholder="เช่น 081-234-5678 หรือ @myline" value="' + esc((FI.user() && FI.user().phone) || '') + '"></div>',
        actions: [{ label: 'ยกเลิก', cls: 'btn-outline' }, {
          label: 'ส่งข้อความ', cls: 'btn-primary', onClick: async () => {
            const v = $('#infoText').value.trim(), err = $('#infoErr');
            const contactInfo = ($('#infoContact') ? $('#infoContact').value.trim() : '');
            if (v.length < 5) { err.hidden = false; err.textContent = 'กรุณากรอกข้อความอย่างน้อย 5 ตัวอักษร'; $('#infoText').focus(); return false; }

            // ส่งเบาะแสไปยัง API
            try {
              await FI.api('claims.php?action=clue', {
                method: 'POST',
                body: JSON.stringify({ item_id: it.id, message: v, contact_info: contactInfo })
              });
            } catch (e) {}

            FI.toast('ส่งข้อความแจ้งข้อมูลเรียบร้อยแล้ว', 'success');
          }
        }]
      });
    });
  }

  FI.ready(() => {
    const page = document.body.dataset.page;
    if (page === 'index') initIndex();
    if (page === 'search') initSearch();
    if (page === 'item-detail') initDetail();
  });
})();
