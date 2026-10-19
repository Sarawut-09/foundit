/* ==========================================================================
   FoundIt — แบบฟอร์มทั้งหมด: Login, Register, แจ้งของหาย/พบของ, แก้ไขประกาศ, โปรไฟล์
   ทุกอย่างเป็นการจำลองฝั่ง Frontend: ไม่มีการส่งข้อมูลออกไปยังเซิร์ฟเวอร์ และไม่บันทึกรหัสผ่าน
   ========================================================================== */
(function () {
  'use strict';
  const FI = window.FI, { $, $$, esc } = FI, icon = FI.icon;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* ---------- Validation helpers ---------- */
  function errEl(input) {
    const f = input.closest('.field');
    let e = f.querySelector('.field-error');
    if (!e) { e = document.createElement('p'); e.className = 'field-error'; e.id = (input.id || input.name) + '-error'; e.setAttribute('role', 'alert'); f.appendChild(e); }
    return e;
  }
  function setError(input, msg) {
    const f = input.closest('.field'), e = errEl(input);
    if (msg) {
      f.classList.add('has-error'); input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', e.id);
      e.innerHTML = icon('alert-circle') + '<span>' + esc(msg) + '</span>'; e.hidden = false;
    } else {
      f.classList.remove('has-error'); input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby');
      e.hidden = true; e.textContent = '';
    }
  }
  /* rules: [{el, check: () => 'ข้อความผิดพลาด' | ''}] → คืนฟังก์ชัน validateAll() */
  function makeValidator(rules) {
    const run = r => { const m = r.check(); setError(r.el, m); return !m; };
    rules.forEach(r => {
      r.el.addEventListener('blur', () => run(r));
      const ev = (r.el.type === 'checkbox' || r.el.tagName === 'SELECT' || r.el.type === 'date' || r.el.type === 'file') ? 'change' : 'input';
      r.el.addEventListener(ev, () => { if (r.el.closest('.field').classList.contains('has-error')) { run(r); FI.icons(); } });
    });
    return () => {
      let first = null;
      rules.forEach(r => { if (!run(r) && !first) first = r.el; });
      FI.icons();
      if (first) first.focus();
      return !first;
    };
  }
  const required = (el, msg) => () => (el.value.trim() ? '' : msg);
  const emailCheck = el => () => (!el.value.trim() ? 'กรุณากรอกอีเมล' : EMAIL_RE.test(el.value.trim()) ? '' : 'รูปแบบอีเมลไม่ถูกต้อง เช่น name@university.ac.th');
  const alertBox = (form, show) => { const a = $('.form-alert', form); if (a) a.hidden = !show; };

  function bindPasswordToggles() {
    $$('[data-toggle-password]').forEach(btn => btn.addEventListener('click', () => {
      const inp = document.getElementById(btn.dataset.togglePassword), show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      btn.setAttribute('aria-pressed', String(show)); btn.setAttribute('aria-label', show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน');
      btn.innerHTML = icon(show ? 'eye-off' : 'eye'); FI.icons();
    }));
  }
  function strength(p) {
    let s = 0;
    if (p.length >= 8) s++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    if (p.length < 8) s = Math.min(s, 1);
    return s;
  }
  const passwordCheck = el => () => {
    const p = el.value;
    if (!p) return 'กรุณากรอกรหัสผ่าน';
    if (p.length < 8) return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
    if (strength(p) < 2) return 'รหัสผ่านง่ายเกินไป ลองผสมตัวพิมพ์เล็ก-ใหญ่ ตัวเลข หรือสัญลักษณ์';
    return '';
  };

  /* ---------- Login ---------- */
  function initLogin() {
    const form = $('#loginForm'), email = $('#email'), pw = $('#password');
    bindPasswordToggles();
    try { const r = localStorage.getItem('foundit_remember_email'); if (r) { email.value = r; $('#remember').checked = true; } } catch (e) { /* ignore */ }
    const validate = makeValidator([
      { el: email, check: emailCheck(email) },
      { el: pw, check: () => (!pw.value ? 'กรุณากรอกรหัสผ่าน' : pw.value.length < 6 ? 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' : '') }
    ]);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!validate()) { alertBox(form, true); return; }
      alertBox(form, false);
      const btn = $('button[type=submit]', form); FI.setBusy(btn, true);
      try { if ($('#remember').checked) localStorage.setItem('foundit_remember_email', email.value.trim()); else localStorage.removeItem('foundit_remember_email'); } catch (e2) { /* ignore */ }

      try {
        const res = await FI.api('auth.php?action=login', {
          method: 'POST',
          body: JSON.stringify({ email: email.value.trim(), password: pw.value })
        });
        FI.setBusy(btn, false);
        if (res.success && res.user) {
          FI.setUser(res.user);
          FI.toast(res.message || 'เข้าสู่ระบบสำเร็จ', 'success');
          const target = (res.user.role === 'admin' || res.user.email === 'admin@foundit.example') ? 'dashboard.html' : 'my-reports.html';
          setTimeout(() => { location.href = target; }, 600);
        } else {
          FI.toast(res.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'error');
          alertBox(form, true);
        }
      } catch (err) {
        FI.setBusy(btn, false);
        FI.toast('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ', 'error');
      }
    });
  }

  /* ---------- Register ---------- */
  function initRegister() {
    const form = $('#registerForm');
    const name = $('#fullname'), email = $('#email'), sid = $('#studentId'), pw = $('#password'), pw2 = $('#confirm'), terms = $('#terms');
    bindPasswordToggles();
    const meter = $('#strength'), label = $('#strengthLabel');
    pw.addEventListener('input', () => {
      const s = pw.value ? Math.max(1, strength(pw.value)) : 0;
      meter.dataset.level = s; label.textContent = ['', 'อ่อนมาก', 'อ่อน', 'ปานกลาง', 'แข็งแรง'][s] || '';
    });
    const validate = makeValidator([
      { el: name, check: () => (name.value.trim().length < 2 ? 'กรุณากรอกชื่อ-นามสกุล' : '') },
      { el: email, check: emailCheck(email) },
      { el: sid, check: () => (sid.value.trim() && !/^\d{13}$/.test(sid.value.trim()) ? 'รหัสนักศึกษาต้องเป็นตัวเลข 13 หลัก' : '') },
      { el: pw, check: passwordCheck(pw) },
      { el: pw2, check: () => (!pw2.value ? 'กรุณายืนยันรหัสผ่าน' : pw2.value !== pw.value ? 'รหัสผ่านไม่ตรงกัน' : '') },
      { el: terms, check: () => (terms.checked ? '' : 'กรุณายอมรับเงื่อนไขการใช้งานก่อนสมัครสมาชิก') }
    ]);
    pw.addEventListener('input', () => { if (pw2.value) { pw2.dispatchEvent(new Event('input')); } });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!validate()) { alertBox(form, true); return; }
      alertBox(form, false);
      const btn = $('button[type=submit]', form); FI.setBusy(btn, true);

      try {
        const res = await FI.api('auth.php?action=register', {
          method: 'POST',
          body: JSON.stringify({
            name: name.value.trim(),
            email: email.value.trim(),
            studentId: sid.value.trim(),
            password: pw.value
          })
        });
        FI.setBusy(btn, false);
        if (res.success && res.user) {
          FI.setUser(res.user);
          FI.toast(res.message || 'สมัครสมาชิกสำเร็จ กำลังพาไปยังหน้าประกาศของคุณ', 'success');
          setTimeout(() => { location.href = 'my-reports.html'; }, 800);
        } else {
          FI.toast(res.message || 'ไม่สามารถสมัครสมาชิกได้', 'error');
        }
      } catch (err) {
        FI.setBusy(btn, false);
        FI.toast('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ', 'error');
      }
    });
  }

  /* ---------- แบบฟอร์มสิ่งของ (แจ้งของหาย / แจ้งพบ / แก้ไข) ---------- */
  const T = {
    lost: { date: 'วันที่สูญหาย', place: 'สถานที่ที่คาดว่าทำหาย', submit: 'ส่งประกาศแจ้งของหาย', ph: 'เช่น กระเป๋าเป้สีแดง', desc: 'ลักษณะที่สังเกตได้ เช่น ยี่ห้อ ขนาด ตำหนิ หรือจุดสังเกต (อย่าใส่เลขบัตรหรือข้อมูลส่วนตัว)' },
    found: { date: 'วันที่พบ', place: 'สถานที่ที่พบ', submit: 'ส่งประกาศแจ้งพบสิ่งของ', ph: 'เช่น หูฟังไร้สายสีขาว', desc: 'ลักษณะภายนอกที่เห็นได้ชัด และที่ฝากสิ่งของไว้ (เก็บรายละเอียดเฉพาะที่ใช้ยืนยันเจ้าของไว้ถามภายหลัง)' }
  };
  const opts = (list, sel, ph) => '<option value="">' + ph + '</option>' + list.map(v => '<option value="' + esc(v) + '"' + (v === sel ? ' selected' : '') + '>' + esc(v) + '</option>').join('');

  function formHTML(type, item, edit) {
    const t = T[type];
    const statusOpts = type === 'lost' ? ['searching', 'found', 'returned'] : ['found', 'returned'];
    return '<form id="itemForm" class="card" novalidate>' +
      '<div class="form-section"><h2 class="form-section-title">ข้อมูลสิ่งของ</h2><p class="form-section-sub">ช่องที่มีเครื่องหมาย <span class="req">*</span> จำเป็นต้องกรอก</p>' +
      '<div class="field"><label for="f-title">ชื่อสิ่งของ <span class="req">*</span></label><input class="input" id="f-title" name="title" maxlength="60" autocomplete="off" placeholder="' + t.ph + '" value="' + esc(item ? item.title : '') + '"><p class="hint">ตั้งชื่อสั้น ๆ ที่ระบุประเภทและสี เพื่อให้ค้นหาง่าย</p></div>' +
      '<div class="form-grid"><div class="field"><label for="f-category">หมวดหมู่ <span class="req">*</span></label><select class="select" id="f-category" name="category">' + opts(FI.CATEGORIES, item && item.category, 'เลือกหมวดหมู่') + '</select><input class="input" id="f-category-other" placeholder="ระบุหมวดหมู่อื่น ๆ" style="margin-top:6px;display:none"></div>' +
      '<div class="field"><label for="f-color">สี <span class="req">*</span></label><select class="select" id="f-color" name="color">' + opts(FI.COLORS, item && item.color, 'เลือกสี') + '</select><input class="input" id="f-color-other" placeholder="ระบุสีอื่น ๆ" style="margin-top:6px;display:none"></div>' +
      '<div class="field"><label for="f-date">' + t.date + ' <span class="req">*</span></label><input class="input" type="date" id="f-date" name="date" max="' + FI.todayISO() + '" value="' + esc(item ? item.date : '') + '"></div>' +
      '<div class="field"><label for="f-location">' + t.place + ' <span class="req">*</span></label><select class="select" id="f-location" name="location">' + opts(FI.LOCATIONS, item && item.location, 'เลือกสถานที่') + '</select><input class="input" id="f-location-other" placeholder="ระบุสถานที่อื่น ๆ" style="margin-top:6px;display:none"></div></div>' +
      '<div class="field"><label for="f-desc">รายละเอียดเพิ่มเติม</label><textarea class="textarea" id="f-desc" name="description" maxlength="400" placeholder="' + t.desc + '">' + esc(item ? item.description : '') + '</textarea><div class="counter"><span id="descCount">0</span>/400</div></div>' +
      (edit ? '<div class="field" style="max-width:320px"><label for="f-status">สถานะ</label><select class="select" id="f-status" name="status">' + statusOpts.map(s => '<option value="' + s + '"' + (item.status === s ? ' selected' : '') + '>' + FI.STATUS[s].label + '</option>').join('') + '</select></div>' : '') +
      '</div>' +
      '<div class="form-section"><h2 class="form-section-title">รูปภาพ <span class="text-muted" style="font-weight:400;font-size:.9rem">(ไม่บังคับ)</span></h2><p class="form-section-sub">รูปช่วยให้ระบุสิ่งของได้ง่ายขึ้น รองรับไฟล์ภาพไม่เกิน 5 MB (ระบบจะย่อขนาดให้อัตโนมัติ)</p>' +
      '<div class="field"><div class="dropzone" id="dropzone"><div class="dropzone-label-wrap" id="dzEmpty"><label class="dropzone-label" for="f-image"><span class="dz-icon">' + icon('upload-cloud') + '</span><strong>คลิกเพื่อเลือกรูป หรือลากไฟล์มาวางที่นี่</strong><small>JPG, PNG, WEBP · ไม่เกิน 5 MB</small></label></div>' +
      '<input class="sr-only" type="file" id="f-image" name="image" accept="image/*">' +
      '<div class="preview" id="dzPreview" hidden><img id="previewImg" alt="ตัวอย่างรูปภาพที่เลือก"><div class="preview-info"><strong id="previewName">รูปภาพ</strong><small>ตัวอย่างก่อนส่งประกาศ</small></div><div class="quick-actions"><label class="btn btn-outline btn-sm" for="f-image">เปลี่ยนรูป</label><button type="button" class="btn btn-ghost btn-sm" id="removeImg">' + icon('trash-2') + 'ลบรูป</button></div></div></div></div></div>' +
      '<div class="form-notice-wrap" style="padding:24px 28px 8px">' +
      '<div class="notice notice-warning">' + icon('shield-alert') + '<div>' + (type === 'lost'
        ? '<strong>โปรดอย่าเปิดเผยข้อมูลสำคัญต่อสาธารณะ</strong> เช่น เลขบัตรประชาชน เลขบัตรนักศึกษาเต็ม หรือรหัสผ่านของอุปกรณ์ ประกาศนี้ทุกคนมองเห็นได้'
        : '<strong>เก็บรายละเอียดที่ยืนยันเจ้าของไว้</strong> ไม่ควรระบุลักษณะเฉพาะที่มีเพียงเจ้าของจริงเท่านั้นที่ทราบ เช่น ของที่อยู่ภายใน เพื่อใช้ตรวจสอบเมื่อมีผู้มาอ้างสิทธิ์') + '</div></div></div>' +
      '<div class="form-section"><h2 class="form-section-title">ข้อมูลติดต่อผู้โพสต์</h2><p class="form-section-sub">ระบุเบอร์โทรหรือช่องทางโซเชียลเพื่อให้ผู้อื่นติดต่อขอรับของหรือส่งคืนได้โดยตรง (แสดงเฉพาะผู้ที่เข้าสู่ระบบ)</p>' +
      '<div class="form-grid" style="align-items:start">' +
      '<div class="field"><label for="f-cname">ชื่อผู้ติดต่อ <span class="req">*</span></label><input class="input" id="f-cname" name="contact_name" maxlength="100" placeholder="ชื่อ-นามสกุล หรือชื่อเรียก" value="' + esc(item && item.contact_name ? item.contact_name : (FI.currentUser().name || '')) + '"></div>' +
      '<div class="field"><label for="f-cphone">เบอร์โทรศัพท์ <span class="req">*</span></label><input class="input" id="f-cphone" name="contact_phone" type="tel" maxlength="20" placeholder="เช่น 0812345678" value="' + esc(item ? (item.contact_phone || '') : (FI.currentUser().phone || '')) + '"></div>' +
      '</div>' +
      '<div class="form-grid" style="grid-template-columns:repeat(3,1fr);align-items:start">' +
      '<div class="field"><label for="f-cline">LINE ID <span class="text-muted" style="font-weight:400;font-size:.9rem">(แนะนำ)</span></label><input class="input" id="f-cline" name="contact_line" maxlength="100" placeholder="เช่น @mylineid" value="' + esc(item ? (item.contact_line || '') : (FI.currentUser().line_id || '')) + '"></div>' +
      '<div class="field"><label for="f-cfb">Facebook <span class="text-muted" style="font-weight:400;font-size:.9rem">(แนะนำ)</span></label><input class="input" id="f-cfb" name="contact_facebook" maxlength="100" placeholder="ชื่อบัญชีหรือลิงก์โปรไฟล์" value="' + esc(item ? (item.contact_facebook || '') : '') + '"></div>' +
      '<div class="field"><label for="f-cig">Instagram <span class="text-muted" style="font-weight:400;font-size:.9rem">(แนะนำ)</span></label><input class="input" id="f-cig" name="contact_instagram" maxlength="100" placeholder="@username" value="' + esc(item ? (item.contact_instagram || '') : '') + '"></div>' +
      '</div>' +
      '</div>' +
      '<div class="form-actions"><button type="button" class="btn btn-outline" id="cancelBtn">ยกเลิก</button><button type="submit" class="btn btn-primary">' + icon(edit ? 'save' : 'send') + (edit ? 'บันทึกการแก้ไข' : t.submit) + '</button></div></form>';
  }

  async function initItemForm() {
    const mount = $('#itemFormMount'), mode = mount.dataset.mode;
    let item = null, type = mode;
    if (mode === 'edit') {
      const id = new URLSearchParams(location.search).get('id') || '';
      item = FI.store.get(id);
      if (!item) {
        try {
          const res = await FI.api('items.php?id=' + encodeURIComponent(id));
          if (res && res.success && res.item) item = res.item;
        } catch (e) {}
      }
      if (!item || (!item.mine && !FI.isAdmin())) {
        mount.innerHTML = FI.emptyState({ icon: 'search', tone: 'danger', title: 'ไม่พบประกาศที่ต้องการแก้ไข', text: 'ประกาศอาจถูกลบไปแล้ว หรือไม่ใช่ประกาศของคุณ', action: '<a class="btn btn-primary" href="my-reports.html">กลับไปประกาศของฉัน</a>' });
        FI.icons(); return;
      }
      type = item.type;
      const tag = $('#editTypeTag'); if (tag) tag.innerHTML = FI.typeTag(type) + ' <span class="text-muted">รหัส ' + esc(item.id) + '</span>';
    }
    mount.innerHTML = formHTML(type, item, mode === 'edit');
    FI.icons();

    // --- "อื่น ๆ" custom input logic ---
    const otherFields = [
      { sel: $('#f-category'), inp: $('#f-category-other') },
      { sel: $('#f-color'),    inp: $('#f-color-other') },
      { sel: $('#f-location'), inp: $('#f-location-other') }
    ];
    otherFields.forEach(({ sel, inp }) => {
      const toggle = () => {
        const show = sel.value === 'อื่น ๆ';
        inp.style.display = show ? '' : 'none';
        if (!show) inp.value = '';
        else inp.focus();
      };
      sel.addEventListener('change', toggle);
      // ถ้าตอน edit มีค่าที่ไม่ตรงกับ list → แสดง custom input ด้วย
      if (item) toggle();
    });

    const form = $('#itemForm'), f = form.elements;
    let image = item ? item.image : null, dirty = false;
    const desc = f.description, counter = $('#descCount');
    const updCount = () => { counter.textContent = desc.value.length; };
    updCount(); desc.addEventListener('input', updCount);
    form.addEventListener('input', () => { dirty = true; });

    const showPreview = (src, name) => {
      $('#dzEmpty').hidden = !!src; $('#dzPreview').hidden = !src;
      if (src) { $('#previewImg').src = src; $('#previewName').textContent = name || 'รูปภาพสิ่งของ'; }
    };
    showPreview(image, item && item.image ? 'รูปภาพเดิมของประกาศ' : '');

    const dz = $('#dropzone'), fileInput = f.image;
    async function handleFile(file) {
      if (!file) return;
      const fld = fileInput.closest('.field');
      try {
        image = await FI.readImage(file); dirty = true;
        setError(fileInput, ''); showPreview(image, file.name);
      } catch (err) {
        setError(fileInput, err.message === 'size' ? 'ไฟล์ใหญ่เกิน 5 MB กรุณาเลือกรูปที่เล็กกว่านี้' : err.message === 'type' ? 'ไฟล์ที่เลือกไม่ใช่รูปภาพ' : 'ไม่สามารถอ่านไฟล์รูปภาพนี้ได้');
        FI.icons(); FI.toast('อัปโหลดรูปภาพไม่สำเร็จ', 'error');
      }
      fileInput.value = ''; void fld;
    }
    fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));
    ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
    dz.addEventListener('drop', e => handleFile(e.dataTransfer && e.dataTransfer.files[0]));
    $('#removeImg').addEventListener('click', () => { image = null; dirty = true; showPreview(null); FI.toast('ลบรูปภาพแล้ว', 'info', 2000); });

    const t = T[type];
    const validate = makeValidator([
      { el: f.title, check: () => (f.title.value.trim().length < 3 ? 'กรุณากรอกชื่อสิ่งของอย่างน้อย 3 ตัวอักษร' : '') },
      { el: f.category, check: required(f.category, 'กรุณาเลือกหมวดหมู่') },
      { el: f.color, check: required(f.color, 'กรุณาเลือกสี') },
      { el: f.date, check: () => (!f.date.value ? 'กรุณาเลือก' + t.date : f.date.value > FI.todayISO() ? 'วันที่ต้องไม่เป็นวันในอนาคต' : '') },
      { el: f.location, check: required(f.location, 'กรุณาเลือกสถานที่') },
      { el: f.contact_name, check: () => (!f.contact_name.value.trim() ? 'กรุณาระบุชื่อผู้ติดต่อ' : '') },
      { el: f.contact_phone, check: () => (!f.contact_phone.value.trim() && !f.contact_line.value.trim() ? 'กรุณาระบุเบอร์โทรศัพท์หรือ LINE ID อย่างน้อย 1 ช่องทาง' : '') }
    ]);

    $('#cancelBtn').addEventListener('click', async () => {
      const go = () => { location.href = mode === 'edit' ? 'my-reports.html' : (FI.user() ? (FI.isAdmin() ? 'dashboard.html' : 'my-reports.html') : 'index.html'); };
      if (!dirty) return go();
      if (await FI.confirm({ title: 'ยกเลิกการกรอกข้อมูล', icon: 'alert-triangle', tone: 'danger', confirmText: 'ยกเลิกและออก', cancelText: 'กรอกต่อ', message: 'ข้อมูลที่กรอกไว้จะไม่ถูกบันทึก ต้องการออกจากหน้านี้หรือไม่?' })) go();
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!validate()) { FI.toast('กรุณาตรวจสอบข้อมูลที่กรอกให้ครบถ้วน', 'error'); return; }
      const btn = $('button[type=submit]', form); FI.setBusy(btn, true);
      const getVal = (sel, inp) => sel.value === 'อื่น ๆ' && inp.value.trim() ? inp.value.trim() : sel.value;
      const data = {
        title: f.title.value.trim(),
        category: getVal($('#f-category'), $('#f-category-other')),
        color:    getVal($('#f-color'),    $('#f-color-other')),
        date: f.date.value,
        location: getVal($('#f-location'), $('#f-location-other')),
        description: f.description.value.trim(), image,
        contact_name:      (f.contact_name      && f.contact_name.value.trim())      || undefined,
        contact_phone:     (f.contact_phone     && f.contact_phone.value.trim())     || undefined,
        contact_line:      (f.contact_line      && f.contact_line.value.trim())      || undefined,
        contact_facebook:  (f.contact_facebook  && f.contact_facebook.value.trim())  || undefined,
        contact_instagram: (f.contact_instagram && f.contact_instagram.value.trim()) || undefined,
      };
      dirty = false;
      if (mode === 'edit') {
        FI.store.update(item.id, Object.assign(data, { status: f.status.value }));
        FI.toast('บันทึกการแก้ไขเรียบร้อยแล้ว', 'success');
        setTimeout(() => { location.href = 'my-reports.html'; }, 900);
        return;
      }
      const r = FI.store.add(Object.assign(data, { type, status: type === 'lost' ? 'searching' : 'found' }));
      FI.toast('ส่งประกาศเรียบร้อยแล้ว', 'success');
      mount.innerHTML = '<div class="card success-panel"><span class="empty-icon">' + icon('check-circle-2') + '</span><h2>ส่งประกาศเรียบร้อยแล้ว</h2>' +
        '<p>เพิ่ม “' + esc(r.item.title) + '” ลงในระบบแล้ว ' + (type === 'lost' ? 'หากมีผู้พบสิ่งของที่ตรงกัน จะสามารถโทรหรือทัก LINE ติดต่อคุณได้โดยตรง' : 'ขอบคุณที่ช่วยส่งสิ่งของกลับคืนเจ้าของ เจ้าของสามารถโทรหรือทัก LINE นัดรับของกับคุณได้โดยตรง') + '</p>' +
        '<div class="success-actions"><a class="btn btn-primary" href="item-detail.html?id=' + encodeURIComponent(r.item.id) + '">ดูประกาศ</a><a class="btn btn-outline" href="my-reports.html">ประกาศของฉัน</a><a class="btn btn-ghost" href="' + (type === 'lost' ? 'report-lost' : 'report-found') + '.html">แจ้งรายการอื่น</a></div></div>';
      FI.icons(); window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- Profile ---------- */
  function initProfile() {
    const u = FI.currentUser();
    const name = $('#pf-name'), email = $('#pf-email'), sid = $('#pf-sid'), phone = $('#pf-phone'), lineId = $('#pf-line');
    const profileForm = $('#profileForm'), editBtn = $('#editProfile'), saveBtn = $('#saveProfile'), cancelBtn = $('#cancelEdit');
    const fields = [name, email, sid, phone, lineId].filter(Boolean);
    let current = Object.assign({}, u);
    const paint = () => {
      name.value = current.name || ''; email.value = current.email || ''; sid.value = current.studentId || '';
      if (phone) phone.value = current.phone || '';
      if (lineId) lineId.value = current.line_id || current.lineId || '';
      $('#pfAvatar').textContent = FI.initial(current.name); $('#pfTitle').textContent = current.name; $('#pfMail').textContent = current.email;
    };
    const setEditing = on => {
      fields.forEach(f => { f.readOnly = !on; });
      editBtn.hidden = on; saveBtn.hidden = !on; cancelBtn.hidden = !on;
      if (on) name.focus();
    };
    paint(); setEditing(false);
    editBtn.addEventListener('click', () => setEditing(true));
    cancelBtn.addEventListener('click', () => { fields.forEach(f => setError(f, '')); paint(); setEditing(false); });
    const validate = makeValidator([
      { el: name, check: () => (name.value.trim().length < 2 ? 'กรุณากรอกชื่อ-นามสกุล' : '') },
      { el: email, check: emailCheck(email) },
      { el: sid, check: () => (sid.value.trim() && !/^\d{13}$/.test(sid.value.trim()) ? 'รหัสนักศึกษาต้องเป็นตัวเลข 13 หลัก' : '') }
    ]);
    profileForm.addEventListener('submit', async e => {
      e.preventDefault();
      if (!validate()) return;
      current = {
        name: name.value.trim(),
        email: email.value.trim(),
        studentId: sid.value.trim(),
        phone: phone ? phone.value.trim() : '',
        line_id: lineId ? lineId.value.trim() : ''
      };
      try {
        const res = await FI.api('auth.php?action=update_profile', {
          method: 'POST',
          body: JSON.stringify(current)
        });
        if (res.success && res.user) {
          FI.setUser(res.user);
          current = res.user;
          paint(); setEditing(false);
          FI.toast(res.message || 'บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว', 'success');
        } else {
          FI.toast(res.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
        }
      } catch (err) {
        FI.setUser(current); paint(); setEditing(false);
        FI.toast('บันทึกข้อมูลเรียบร้อยแล้ว', 'success');
      }
    });

    // การแจ้งเตือน
    const PREF = 'foundit_prefs_v1';
    let prefs = { match: true, status: true };
    try { prefs = Object.assign(prefs, JSON.parse(localStorage.getItem(PREF) || '{}')); } catch (e) { /* ignore */ }
    $$('#notifForm input[type=checkbox]').forEach(c => { c.checked = !!prefs[c.name]; });
    $('#notifForm').addEventListener('submit', e => {
      e.preventDefault();
      $$('#notifForm input[type=checkbox]').forEach(c => { prefs[c.name] = c.checked; });
      try { localStorage.setItem(PREF, JSON.stringify(prefs)); } catch (e2) { /* ignore */ }
      FI.toast('บันทึกการตั้งค่าการแจ้งเตือนแล้ว', 'success');
    });
  }

  FI.ready(() => {
    const page = document.body.dataset.page;
    if (page === 'login') initLogin();
    if (page === 'register') initRegister();
    if (['report-lost', 'report-found', 'edit-report'].includes(page)) initItemForm();
    if (page === 'profile') initProfile();
  });
})();
