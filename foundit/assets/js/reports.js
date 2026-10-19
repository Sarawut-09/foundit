/* ==========================================================================
   FoundIt — รายงานสถิติ (3 รายงาน) + ส่งออก CSV + พิมพ์
   ========================================================================== */
(function () {
  'use strict';
  const FI = window.FI, { $, $$, esc } = FI;
  const charts = {};

  function toCSV(rows) {
    return '\ufeff' + rows.map(r => r.map(v => { v = String(v == null ? '' : v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(',')).join('\r\n');
  }
  function download(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 800);
  }

  function initReports() {
    const fFrom = $('#rFrom'), fTo = $('#rTo'), fType = $('#rType');
    const d0 = new Date(); d0.setDate(d0.getDate() - 180);
    fFrom.value = FI.toISO(d0); fTo.value = FI.todayISO(); fTo.max = FI.todayISO();
    let tables = { monthly: [], category: [], location: [] };

    function monthKeys(from, to) {
      const out = []; let [y, m] = from.slice(0, 7).split('-').map(Number); const [ey, em] = to.slice(0, 7).split('-').map(Number);
      while ((y < ey || (y === ey && m <= em)) && out.length < 24) { out.push(y + '-' + String(m).padStart(2, '0')); m++; if (m > 12) { m = 1; y++; } }
      return out.slice(-12);
    }
    function mkChart(key, canvas, cfg) {
      if (charts[key]) charts[key].destroy();
      charts[key] = new Chart(canvas, cfg);
    }

    function render() {
      const from = fFrom.value, to = fTo.value, type = fType.value;
      const err = $('#rDateErr');
      if (!from || !to || from > to) {
        err.hidden = false; err.textContent = !from || !to ? 'กรุณาเลือกช่วงวันที่ให้ครบ' : 'วันที่เริ่มต้นต้องไม่อยู่หลังวันที่สิ้นสุด';
        return;
      }
      err.hidden = true;
      const inRange = FI.store.all().filter(i => i.date >= from && i.date <= to);
      const items = type === 'all' ? inRange : inRange.filter(i => i.type === type);
      const lostN = items.filter(i => i.type === 'lost').length, foundN = items.filter(i => i.type === 'found').length;
      const ret = items.filter(i => i.status === 'returned').length;
      $('#rTotal').textContent = items.length; $('#rLost').textContent = lostN; $('#rFound').textContent = foundN;
      $('#rRate').textContent = items.length ? Math.round(ret / items.length * 100) + '%' : '0%';
      $('#printRange').textContent = 'ช่วงวันที่ ' + FI.fmtDate(from) + ' – ' + FI.fmtDate(to) + ' · ประเภท: ' + (type === 'all' ? 'ทั้งหมด' : FI.TYPE[type]);

      // รายงาน 1: รายเดือน
      const keys = monthKeys(from, to);
      const m = keys.map(k => ({ key: k, label: FI.monthLabel(k), lost: items.filter(i => i.type === 'lost' && i.date.slice(0, 7) === k).length, found: items.filter(i => i.type === 'found' && i.date.slice(0, 7) === k).length }));
      tables.monthly = m;
      $('#t1Body').innerHTML = m.map(r => '<tr><td>' + r.label + '</td><td class="num">' + r.lost + '</td><td class="num">' + r.found + '</td><td class="num">' + (r.lost + r.found) + '</td></tr>').join('') || '<tr><td colspan="4">ไม่มีข้อมูล</td></tr>';
      $('#t1Foot').innerHTML = '<tr><td>รวม</td><td class="num">' + m.reduce((s, r) => s + r.lost, 0) + '</td><td class="num">' + m.reduce((s, r) => s + r.found, 0) + '</td><td class="num">' + m.reduce((s, r) => s + r.lost + r.found, 0) + '</td></tr>';

      // รายงาน 2: หมวดหมู่ที่สูญหายมากที่สุด (เฉพาะของหายในช่วงวันที่)
      const lostItems = inRange.filter(i => i.type === 'lost');
      const cc = FI.countBy(lostItems, i => i.category);
      const ck = Object.keys(cc).sort((a, b) => cc[b] - cc[a]);
      tables.category = ck.map((k, i) => ({ rank: i + 1, name: k, count: cc[k], pct: Math.round(cc[k] / lostItems.length * 1000) / 10 }));
      $('#t2Body').innerHTML = tables.category.map(r => '<tr><td>' + r.rank + '</td><td>' + esc(r.name) + '</td><td class="num">' + r.count + '</td><td class="num">' + r.pct.toFixed(1) + '%</td></tr>').join('') || '<tr><td colspan="4">ไม่มีข้อมูลในช่วงวันที่นี้</td></tr>';

      // รายงาน 3: สถานที่
      const loc = {};
      items.forEach(i => { loc[i.location] = loc[i.location] || { lost: 0, found: 0 }; loc[i.location][i.type]++; });
      const lk = Object.keys(loc).sort((a, b) => (loc[b].lost + loc[b].found) - (loc[a].lost + loc[a].found)).slice(0, 8);
      tables.location = lk.map(k => ({ name: k, lost: loc[k].lost, found: loc[k].found, total: loc[k].lost + loc[k].found }));
      $('#t3Body').innerHTML = tables.location.map((r, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(r.name) + '</td><td class="num">' + r.lost + '</td><td class="num">' + r.found + '</td><td class="num">' + r.total + '</td></tr>').join('') || '<tr><td colspan="5">ไม่มีข้อมูล</td></tr>';

      if (!FI.chartsReady()) { ['c1', 'c2', 'c3'].forEach(id => FI.chartFallback($('#' + id).parentElement)); return; }
      FI.chartSetup();
      const grid = { color: '#EEF0F4' };
      mkChart('c1', $('#c1'), { type: 'bar', data: { labels: m.map(r => r.label), datasets: [{ label: 'ของหาย', data: m.map(r => r.lost), backgroundColor: '#DC2626', borderRadius: 6, maxBarThickness: 30 }, { label: 'ของที่พบ', data: m.map(r => r.found), backgroundColor: '#3157D5', borderRadius: 6, maxBarThickness: 30 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid, border: { display: false } }, x: { grid: { display: false } } } } });
      mkChart('c2', $('#c2'), { type: 'doughnut', data: { labels: ck, datasets: [{ data: ck.map(k => cc[k]), backgroundColor: FI.PALETTE, borderWidth: 2, borderColor: '#fff' }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '58%', plugins: { legend: { position: 'bottom' } } } });
      mkChart('c3', $('#c3'), { type: 'bar', data: { labels: lk, datasets: [{ label: 'ของหาย', data: lk.map(k => loc[k].lost), backgroundColor: '#DC2626', borderRadius: 4 }, { label: 'ของที่พบ', data: lk.map(k => loc[k].found), backgroundColor: '#3157D5', borderRadius: 4 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { x: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, grid }, y: { stacked: true, grid: { display: false } } } } });
    }

    const headers = {
      monthly: [['เดือน', 'ของหาย', 'ของที่พบ', 'รวม'], r => [r.label, r.lost, r.found, r.lost + r.found], 'รายงานที่ 1 จำนวนประกาศแยกตามเดือน'],
      category: [['อันดับ', 'หมวดหมู่', 'จำนวนที่สูญหาย', 'สัดส่วน (%)'], r => [r.rank, r.name, r.count, r.pct], 'รายงานที่ 2 หมวดหมู่ที่สูญหายมากที่สุด'],
      location: [['อันดับ', 'สถานที่', 'ของหาย', 'ของที่พบ', 'รวม'], (r, i) => [i + 1, r.name, r.lost, r.found, r.total], 'รายงานที่ 3 สถานที่ที่มีการแจ้งบ่อยที่สุด']
    };
    function exportOne(key) {
      const [head, row] = headers[key];
      const rows = [head].concat(tables[key].map(row));
      if (rows.length === 1) { FI.toast('ไม่มีข้อมูลให้ส่งออกในช่วงวันที่นี้', 'warning'); return; }
      download('foundit-' + key + '-' + FI.todayISO() + '.csv', toCSV(rows));
      FI.toast('ส่งออกไฟล์ CSV เรียบร้อยแล้ว', 'success');
    }
    function exportAll() {
      let rows = [['FoundIt — รายงานสถิติ'], [$('#printRange').textContent]];
      let any = false;
      Object.keys(headers).forEach(k => {
        const [head, row, title] = headers[k];
        rows.push([], [title], head);
        tables[k].forEach((r, i) => { rows.push(row(r, i)); any = true; });
      });
      if (!any) { FI.toast('ไม่มีข้อมูลให้ส่งออกในช่วงวันที่นี้', 'warning'); return; }
      download('foundit-reports-' + FI.todayISO() + '.csv', toCSV(rows));
      FI.toast('ส่งออกรายงานทั้งหมดเป็น CSV แล้ว', 'success');
    }

    [fFrom, fTo, fType].forEach(el => el.addEventListener('change', render));
    $$('[data-export]').forEach(b => b.addEventListener('click', () => exportOne(b.dataset.export)));
    $('#exportAll').addEventListener('click', exportAll);
    $('#printBtn').addEventListener('click', () => window.print());
    $('#rReset').addEventListener('click', () => {
      fFrom.value = FI.toISO(d0); fTo.value = FI.todayISO(); fType.value = 'all';
      render();
    });
    render();
    window.addEventListener('foundit:synced', () => render());
  }

  FI.ready(() => { if (document.body.dataset.page === 'reports') initReports(); });
})();
