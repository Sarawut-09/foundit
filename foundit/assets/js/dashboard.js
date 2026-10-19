/* ==========================================================================
   FoundIt — Dashboard (ภาพรวมระบบ) และ ประกาศของฉัน
   ========================================================================== */
(function () {
  'use strict';
  const FI = window.FI, { $, $$, esc } = FI, icon = FI.icon;

  /* ---------------------------- Dashboard ---------------------------- */
  function initDashboard() {
    const u = FI.currentUser();
    $('#greetName').textContent = u.name;
    const items = FI.store.all();
    const lost = items.filter(i => i.type === 'lost').length, found = items.filter(i => i.type === 'found').length;
    const returned = items.filter(i => i.status === 'returned').length;
    FI.countUp($('#sLost'), lost); FI.countUp($('#sFound'), found); FI.countUp($('#sReturned'), returned); FI.countUp($('#sTotal'), items.length);

    // รายการสถานะประกาศ
    const total = items.length || 1;
    $('#statusList').innerHTML = ['searching', 'found', 'returned'].map(s => {
      const n = items.filter(i => i.status === s).length, m = FI.STATUS[s];
      return '<div class="status-row"><div class="row-top">' + FI.statusBadge(s) + '<strong>' + n + ' รายการ <span class="text-muted" style="font-weight:400">(' + Math.round(n / total * 100) + '%)</span></strong></div>' +
        '<div class="progress tone-' + (m.tone === 'primary' ? 'primary' : m.tone) + '" role="progressbar" aria-valuenow="' + n + '" aria-valuemin="0" aria-valuemax="' + items.length + '" aria-label="' + m.label + '"><span style="width:0" data-w="' + Math.round(n / total * 100) + '%"></span></div></div>';
    }).join('');
    requestAnimationFrame(() => $$('#statusList .progress > span').forEach(b => { b.style.width = b.dataset.w; }));

    // ตารางรายการล่าสุด
    const latest = FI.filterItems(items, { sort: 'new' }).slice(0, 6);
    $('#recentBody').innerHTML = latest.map(it =>
      '<tr><td data-label="สิ่งของ" class="cell-first"><div class="cell-item"><span class="mini-thumb">' + FI.thumb(it) + '</span><div><a href="item-detail.html?id=' + encodeURIComponent(it.id) + '">' + esc(it.title) + '</a><small>' + esc(it.id) + ' · ' + esc(it.category) + '</small></div></div></td>' +
      '<td data-label="ประเภท">' + FI.typeTag(it.type) + '</td><td data-label="สถานที่">' + esc(it.location) + '</td><td data-label="วันที่">' + FI.fmtDate(it.date) + '</td><td data-label="สถานะ">' + FI.statusBadge(it.status) + '</td></tr>').join('');

    // กราฟ
    const c1 = $('#monthlyChart'), c2 = $('#categoryChart');
    if (!FI.chartsReady()) { FI.chartFallback(c1.parentElement); FI.chartFallback(c2.parentElement); FI.icons(); return; }
    FI.chartSetup();
    const months = FI.lastMonths(6);
    const cnt = t => months.map(m => items.filter(i => i.type === t && i.date.slice(0, 7) === m.key).length);
    new Chart(c1, {
      type: 'bar',
      data: { labels: months.map(m => m.label), datasets: [{ label: 'ของหาย', data: cnt('lost'), backgroundColor: '#DC2626', borderRadius: 6, maxBarThickness: 28 }, { label: 'ของที่พบ', data: cnt('found'), backgroundColor: '#3157D5', borderRadius: 6, maxBarThickness: 28 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#EEF0F4' }, border: { display: false } }, x: { grid: { display: false } } } }
    });
    const cats = FI.countBy(items.filter(i => i.type === 'found'), i => i.category);
    const keys = Object.keys(cats).sort((a, b) => cats[b] - cats[a]);
    new Chart(c2, {
      type: 'doughnut',
      data: { labels: keys, datasets: [{ data: keys.map(k => cats[k]), backgroundColor: FI.PALETTE, borderWidth: 2, borderColor: '#fff' }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom' } } }
    });
    window.addEventListener('foundit:synced', () => initDashboard(), { once: true });
  }

  /* ---------------------------- ประกาศของฉัน / จัดการระบบ (Admin) ---------------------------- */
  function initMyReports() {
    const isAdmin = FI.isAdmin();
    const scopeSelect = $('#myScope');
    if (isAdmin && scopeSelect) {
      scopeSelect.style.display = 'inline-block';
      const h1 = document.querySelector('.page-head h1');
      if (h1) h1.innerHTML = 'จัดการประกาศ <span class="badge badge-warning" style="font-size:.8rem;vertical-align:middle">Admin</span>';
      const sub = document.querySelector('.page-head p');
      if (sub) sub.textContent = 'ดู แก้ไข เปลี่ยนสถานะ หรือลบประกาศทั้งหมดในระบบ';
    }

    const state = { q: '', status: 'all', type: 'all', scope: (isAdmin ? 'all' : 'mine') };
    const body = $('#myBody');

    function stats(list) {
      FI.countUp($('#mTotal'), list.length);
      FI.countUp($('#mSearching'), list.filter(i => i.status === 'searching').length);
      FI.countUp($('#mFound'), list.filter(i => i.status === 'found').length);
      FI.countUp($('#mReturned'), list.filter(i => i.status === 'returned').length);
    }
    let first = true;
    let claimsByItem = {};
    async function loadItemClaims() {
      try {
        const uEmail = (FI.user() && FI.user().email) || '';
        const res = await FI.api('notifications.php?email=' + encodeURIComponent(uEmail));
        if (res.success && Array.isArray(res.notifications)) {
          claimsByItem = {};
          res.notifications.forEach(n => {
            if (!claimsByItem[n.item_id]) claimsByItem[n.item_id] = [];
            claimsByItem[n.item_id].push(n);
          });
          render();
        }
      } catch (e) {}
    }
    loadItemClaims();

    function render() {
      const all = (isAdmin && state.scope === 'all') ? FI.store.all() : FI.store.mine();
      if (first) { stats(all); first = false; } else { $('#mTotal').textContent = all.length; $('#mSearching').textContent = all.filter(i => i.status === 'searching').length; $('#mFound').textContent = all.filter(i => i.status === 'found').length; $('#mReturned').textContent = all.filter(i => i.status === 'returned').length; }
      const toks = state.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const list = FI.filterItems(all, { sort: 'new', type: state.type }).filter(it => {
        if (state.status !== 'all' && it.status !== state.status) return false;
        const hay = [it.title, it.id, it.category, it.location, it.color, it.contact_name, it.contact_phone].join(' ').toLowerCase();
        return toks.every(t => hay.includes(t));
      });
      $('#myCount').textContent = list.length + ' จาก ' + all.length + ' รายการ';
      const empty = $('#myEmpty'), wrap = $('#myTableWrap');
      if (!list.length) {
        wrap.hidden = true; empty.hidden = false; body.innerHTML = '';
        empty.innerHTML = all.length
          ? FI.emptyState({ icon: 'search', title: 'ไม่พบประกาศที่ตรงกับเงื่อนไข', text: 'ลองเปลี่ยนคำค้นหาหรือสถานะที่กรอง', action: '<button type="button" class="btn btn-outline" id="myClear">ล้างตัวกรอง</button>' })
          : FI.emptyState({ icon: 'clipboard-list', title: 'ยังไม่มีรายการประกาศ', text: 'เริ่มแจ้งของหายหรือแจ้งพบสิ่งของเพื่อให้ทุกอย่างกลับสู่เจ้าของ', action: '<div class="success-actions"><a class="btn btn-primary" href="report-lost.html">แจ้งของหาย</a><a class="btn btn-outline" href="report-found.html">แจ้งพบสิ่งของ</a></div>' });
        FI.icons(); return;
      }
      wrap.hidden = false; empty.hidden = true;
      body.innerHTML = list.map(it => {
        const id = encodeURIComponent(it.id);
        const contactPreview = it.contact_phone ? (' · โทร: ' + esc(it.contact_phone)) : '';
        const cList = claimsByItem[it.id] || [];
        const claimBadge = cList.length > 0
          ? '<div style="margin-top:4px"><button type="button" class="btn btn-sm btn-primary" data-act="claims" style="padding:2px 8px;font-size:.78rem;display:inline-flex;align-items:center;gap:4px">' + icon('inbox') + '<span>ดูคำขอรับของ (' + cList.length + ')</span></button></div>'
          : '';
        return '<tr data-id="' + esc(it.id) + '"><td data-label="ประกาศ" class="cell-first"><div class="cell-item"><span class="mini-thumb">' + FI.thumb(it) + '</span><div><a href="item-detail.html?id=' + id + '">' + esc(it.title) + '</a><small>' + esc(it.id) + ' · ' + esc(it.category) + ' · สี' + esc(it.color) + contactPreview + '</small>' + claimBadge + '</div></div></td>' +
          '<td data-label="ประเภท">' + FI.typeTag(it.type) + '</td><td data-label="สถานที่">' + esc(it.location) + '</td><td data-label="วันที่">' + FI.fmtDate(it.date) + '</td><td data-label="สถานะ">' + FI.statusBadge(it.status) + '</td>' +
          '<td class="actions"><div class="row-actions">' +
          '<a class="btn-icon primary" href="item-detail.html?id=' + id + '" aria-label="ดูรายละเอียด ' + esc(it.title) + '" title="ดูรายละเอียด">' + icon('eye') + '</a>' +
          '<a class="btn-icon primary" href="edit-report.html?id=' + id + '" aria-label="แก้ไข ' + esc(it.title) + '" title="แก้ไข">' + icon('pencil') + '</a>' +
          '<button type="button" class="btn-icon primary" data-act="status" aria-label="เปลี่ยนสถานะ ' + esc(it.title) + '" title="เปลี่ยนสถานะ">' + icon('refresh-cw') + '</button>' +
          '<button type="button" class="btn-icon danger" data-act="delete" aria-label="ลบ ' + esc(it.title) + '" title="ลบ">' + icon('trash-2') + '</button></div></td></tr>';
      }).join('');
      FI.icons();
    }

    if (scopeSelect) {
      scopeSelect.addEventListener('change', e => { state.scope = e.target.value; render(); });
    }
    $('#mySearch').addEventListener('input', FI.debounce(e => { state.q = e.target.value; render(); }, 180));
    $('#myStatus').addEventListener('change', e => { state.status = e.target.value; render(); });
    $('#myType').addEventListener('change', e => { state.type = e.target.value; render(); });
    $('#myEmpty').addEventListener('click', e => {
      if (e.target.closest('#myClear')) { state.q = ''; state.status = 'all'; state.type = 'all'; $('#mySearch').value = ''; $('#myStatus').value = 'all'; $('#myType').value = 'all'; render(); }
    });

    body.addEventListener('click', async e => {
      const btn = e.target.closest('[data-act]'); if (!btn) return;
      const id = btn.closest('tr').dataset.id, it = FI.store.get(id); if (!it) return;
      if (btn.dataset.act === 'delete') {
        const ok = await FI.confirm({ title: 'ลบประกาศ', icon: 'trash-2', tone: 'danger', confirmText: 'ลบประกาศ', message: 'ต้องการลบประกาศ <strong>' + esc(it.title) + '</strong> ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้' });
        if (ok) { FI.store.remove(id); render(); FI.toast('ลบประกาศ “' + it.title + '” แล้ว', 'success'); }
      } else if (btn.dataset.act === 'claims') {
        const cList = claimsByItem[id] || [];
        FI.modal({
          title: 'คำขอรับของสำหรับ: ' + esc(it.title),
          body: '<p style="margin-bottom:14px;color:var(--text-muted)">รายการคำขอยืนยันความเป็นเจ้าของและเบาะแสที่ผู้อื่นส่งมา:</p>' +
            '<div class="stack" style="gap:12px">' +
            cList.map(c => {
              const sender = c.claimant_name ? esc(c.claimant_name) : 'ผู้ใช้ในระบบ';
              const contact = c.contact_info ? ('<div style="margin-top:4px;font-size:.85rem"><strong>ช่องทางติดต่อกลับ:</strong> <span style="color:var(--primary)">' + esc(c.contact_info) + '</span></div>') : '';
              return '<div class="card" style="padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
                '<strong style="color:var(--text)">' + icon(c.notif_type === 'claim' ? 'package-check' : 'message-circle') + ' ' + (c.notif_type === 'claim' ? 'คำขอรับของ' : 'เบาะแส') + ' จาก ' + sender + '</strong>' +
                '<small style="color:var(--text-muted)">' + (c.created_at ? c.created_at.slice(0, 16) : '') + '</small></div>' +
                '<div style="font-size:.9rem;color:#334155;background:#fff;padding:8px 12px;border-radius:6px;border:1px solid #e2e8f0;margin-top:6px">' +
                '<strong>รายละเอียดที่ส่งมา:</strong><br>' + esc(c.claim_text) + '</div>' +
                contact +
                '</div>';
            }).join('') + '</div>',
          actions: [{ label: 'ปิด', cls: 'btn-primary' }]
        });
        FI.icons();
      } else {
        const choices = it.type === 'lost' ? ['searching', 'found', 'returned'] : ['found', 'returned'];
        FI.modal({
          title: 'เปลี่ยนสถานะประกาศ', size: 'sm',
          body: '<p style="margin-bottom:12px">เลือกสถานะใหม่ของ <strong style="color:var(--text)">' + esc(it.title) + '</strong></p><div class="radio-list">' +
            choices.map(s => '<label class="radio-item"><input type="radio" name="newStatus" value="' + s + '"' + (it.status === s ? ' checked' : '') + '>' + FI.statusBadge(s) + '</label>').join('') + '</div>',
          actions: [{ label: 'ยกเลิก', cls: 'btn-outline' }, {
            label: 'บันทึก', cls: 'btn-primary', onClick: () => {
              const v = document.querySelector('input[name=newStatus]:checked').value;
              if (v === it.status) return;
              FI.store.update(id, { status: v }); render();
              FI.toast('เปลี่ยนสถานะเป็น “' + FI.STATUS[v].label + '” แล้ว', 'success');
            }
          }]
        });
      }
    });
    render();
    window.addEventListener('foundit:synced', () => render());
  }

  FI.ready(() => {
    const page = document.body.dataset.page;
    if (page === 'dashboard') initDashboard();
    if (page === 'my-reports') initMyReports();
  });
})();
