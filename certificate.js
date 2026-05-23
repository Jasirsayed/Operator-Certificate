/* =====================================================================
   Operator Assessment Certificate Generator
   - Live canvas preview + jsPDF export
   - Coordinates are in PDF points (A4 = 595.32 x 841.92), taken directly
     from the original TRO-OP-26-0017 template so output matches the original.
   ===================================================================== */

const PAGE_W = 595.32;   // A4 width  in points
const PAGE_H = 841.92;   // A4 height in points

/* Canvas renders at higher resolution for a crisp preview.
   SCALE maps PDF points -> canvas pixels. */
const SCALE = 2;
const canvas = document.getElementById('certCanvas');
canvas.width  = Math.round(PAGE_W * SCALE);
canvas.height = Math.round(PAGE_H * SCALE);
const ctx = canvas.getContext('2d');

/* ---- Asset loading ---- */
const assets = { bg: null, sig: null, photo: null };

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/* ---- Field references ---- */
const F = {
  name:     document.getElementById('f_name'),
  certno:   document.getElementById('f_certno'),
  idno:     document.getElementById('f_idno'),
  company:  document.getElementById('f_company'),
  address:  document.getElementById('f_address'),
  qual:     document.getElementById('f_qual'),
  venue:    document.getElementById('f_venue'),
  adate:    document.getElementById('f_adate'),
  vdate:    document.getElementById('f_vdate'),
  assessor: document.getElementById('f_assessor'),
  manager:  document.getElementById('f_manager'),
  qrdata:   document.getElementById('f_qrdata'),
};

/* ---------------------------------------------------------------------
   Layout definition — every text item with its PDF-point coordinates.
   x        : left edge (pt)
   baseline : text baseline measured from TOP of page (pt)
   These were measured from the original certificate.
   --------------------------------------------------------------------- */
const LABEL_COLOR = '#5f6b78';
const VALUE_COLOR = '#1d1d1b';

/* Helper to format an ISO date (YYYY-MM-DD) -> "14th January 2026" */
function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const suffix = (n) => {
    if (n >= 11 && n <= 13) return 'th';
    switch (n % 10) { case 1: return 'st'; case 2: return 'nd'; case 3: return 'rd'; default: return 'th'; }
  };
  return { day: d, sup: suffix(d), rest: ` ${months[m-1]} ${y}` };
}

/* ---------------------------------------------------------------------
   DRAW — shared routine used by both the canvas preview and (logically)
   mirrored by the PDF builder. Coordinates expressed in points then
   multiplied by `s` (scale) and `unit` handled by caller.
   --------------------------------------------------------------------- */
function drawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const s = SCALE;

  // Background (full-bleed template). Original image bbox: x13.3 y13.0 -> x580.9 y859.3
  if (assets.bg) {
    ctx.drawImage(assets.bg, 13.3*s, 13.0*s, (580.9-13.3)*s, (859.3-13.0)*s);
  } else {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.textBaseline = 'alphabetic';

  /* ---- Title "Certificate" ---- */
  ctx.fillStyle = '#1f7ec4';
  ctx.font = `400 ${44*s}px Archivo, sans-serif`;
  ctx.fillText('Certificate', 48.8*s, 92*s);

  /* ---- Photo box (original bbox x387.4 y145.9 -> x510.8 y281.2) ---- */
  const pX = 387.4*s, pY = 145.9*s, pW = (510.8-387.4)*s, pH = (281.2-145.9)*s;
  if (assets.photo) {
    // cover-fit the photo into the box
    drawCover(ctx, assets.photo, pX, pY, pW, pH);
  } else {
    ctx.fillStyle = '#dfe6ee';
    ctx.fillRect(pX, pY, pW, pH);
    ctx.fillStyle = '#9aa7b4';
    ctx.font = `500 ${9*s}px Archivo, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('PHOTO', pX + pW/2, pY + pH/2);
    ctx.textAlign = 'left';
  }

  /* ---- Intro line ---- */
  ctx.fillStyle = VALUE_COLOR;
  ctx.font = `400 ${13*s}px Archivo, sans-serif`;
  ctx.fillText('This is to certify that', 129.6*s, 277*s);

  /* ---- Field rows: [labelRight x, labelBaseline, label, valueX, valueBaseline, value, valueSize, bold] ---- */
  const rows = [
    ['Name:',           123.5, 303,  F.name.value,    129.6, 303,  16, true],
    ['Certificate No:', 123.5, 332,  F.certno.value,  129.6, 332,  13, false],
    ['Id No.:',         123.5, 361,  F.idno.value,    129.6, 361,  13, false],
    ['Company:',        123.5, 390,  F.company.value, 129.6, 390,  13, false],
    ['Address:',        123.5, 419,  F.address.value, 129.6, 419,  13, false],
  ];

  rows.forEach(([lab, lx, ly, val, vx, vy, vs, bold]) => {
    ctx.textAlign = 'right';
    ctx.fillStyle = LABEL_COLOR;
    ctx.font = `400 ${8.5*s}px Archivo, sans-serif`;
    ctx.fillText(lab, lx*s, ly*s);
    ctx.textAlign = 'left';
    ctx.fillStyle = VALUE_COLOR;
    ctx.font = `${bold ? 600 : 400} ${vs*s}px Archivo, sans-serif`;
    ctx.fillText(val, vx*s, vy*s);
  });

  /* ---- "Has Attended..." line ---- */
  ctx.fillStyle = VALUE_COLOR;
  ctx.font = `400 ${13*s}px Archivo, sans-serif`;
  ctx.fillText('Has Attended and successfully completed', 129.6*s, 447*s);

  /* ---- Qualification / Venue / Dates ---- */
  const rows2 = [
    ['Qualification:', 123.5, 474, F.qual.value,  129.6, 474],
    ['Venue:',         123.5, 500, F.venue.value, 129.6, 500],
  ];
  rows2.forEach(([lab, lx, ly, val, vx, vy]) => {
    ctx.textAlign = 'right';
    ctx.fillStyle = LABEL_COLOR;
    ctx.font = `400 ${8.5*s}px Archivo, sans-serif`;
    ctx.fillText(lab, lx*s, ly*s);
    ctx.textAlign = 'left';
    ctx.fillStyle = VALUE_COLOR;
    ctx.font = `400 ${13*s}px Archivo, sans-serif`;
    ctx.fillText(val, vx*s, vy*s);
  });

  /* Dates with superscript ordinal */
  drawDateRow('Assessment date:', 123.5, 528, formatDate(F.adate.value), s);
  drawDateRow('Valid until:',     123.5, 557, formatDate(F.vdate.value), s);

  /* ---- Note line ---- */
  ctx.textAlign = 'left';
  ctx.fillStyle = VALUE_COLOR;
  ctx.font = `400 ${10*s}px Archivo, sans-serif`;
  ctx.fillText('Note: This assessment certificate is not a driving license.', 129.6*s, 578*s);

  /* ---- Footer block: TUV Rheinland LLC address ---- */
  ctx.fillStyle = VALUE_COLOR;
  ctx.font = `400 ${9.5*s}px Archivo, sans-serif`;
  const footLines = [
    ['TÜV Rheinland LLC', 630],
    ['P.O. Box 1918, Postal Code 133,', 643],
    ['Muscat, Sultanate of Oman', 656],
    ['Lifting@om.tuv.com', 669],
    ['+968 2448 7851', 682],
  ];
  footLines.forEach(([t, y]) => ctx.fillText(t, 128.7*s, y*s));
  ctx.fillStyle = '#5f6b78';
  ctx.font = `400 ${8.5*s}px Archivo, sans-serif`;
  ctx.fillText('MS-0044958', 128.7*s, 699*s);

  /* ---- Signature image (original bbox x264.9 y622.9 -> x366.2 y679.9) ---- */
  if (assets.sig) {
    ctx.drawImage(assets.sig, 264.9*s, 622.9*s, (366.2-264.9)*s, (679.9-622.9)*s);
  }

  /* ---- Signatory names ---- */
  ctx.textAlign = 'center';
  ctx.fillStyle = VALUE_COLOR;
  ctx.font = `400 ${10.5*s}px Archivo, sans-serif`;
  // Assessor centered under signature (~ x315), names baseline y681
  ctx.fillText(F.assessor.value, 315*s, 681*s);
  ctx.fillText('Assessor', 315*s, 695*s);
  // Manager block (right) centered ~ x498
  ctx.fillText(F.manager.value, 498*s, 681*s);
  ctx.fillText('Asst Manager', 498*s, 695*s);
  ctx.textAlign = 'left';

  /* ---- QR code (original bbox x367.5 y603.6 -> x454.6 y690.8) ---- */
  if (assets.qr) {
    ctx.drawImage(assets.qr, 367.5*s, 603.6*s, (454.6-367.5)*s, (690.8-603.6)*s);
  }
}

/* Draw a date row with superscript ordinal (e.g. 14th) */
function drawDateRow(label, lx, baseline, parts, s) {
  ctx.textAlign = 'right';
  ctx.fillStyle = LABEL_COLOR;
  ctx.font = `400 ${8.5*s}px Archivo, sans-serif`;
  ctx.fillText(label, lx*s, baseline*s);

  ctx.textAlign = 'left';
  ctx.fillStyle = VALUE_COLOR;
  let x = 129.6*s;
  if (typeof parts === 'string') {
    ctx.font = `400 ${13*s}px Archivo, sans-serif`;
    ctx.fillText(parts, x, baseline*s);
    return;
  }
  // day number
  ctx.font = `400 ${13*s}px Archivo, sans-serif`;
  ctx.fillText(String(parts.day), x, baseline*s);
  x += ctx.measureText(String(parts.day)).width;
  // superscript suffix
  ctx.font = `400 ${8*s}px Archivo, sans-serif`;
  ctx.fillText(parts.sup, x, (baseline-5)*s);
  x += ctx.measureText(parts.sup).width;
  // rest
  ctx.font = `400 ${13*s}px Archivo, sans-serif`;
  ctx.fillText(parts.rest, x, baseline*s);
}

/* Cover-fit an image into a box (like CSS object-fit: cover) */
function drawCover(c, img, x, y, w, h) {
  const ir = img.width / img.height;
  const br = w / h;
  let sx, sy, sw, sh;
  if (ir > br) { sh = img.height; sw = sh * br; sx = (img.width - sw)/2; sy = 0; }
  else { sw = img.width; sh = sw / br; sx = 0; sy = (img.height - sh)/2; }
  c.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/* ---------------------------------------------------------------------
   QR CODE generation -> returns an <img> once ready
   --------------------------------------------------------------------- */
function generateQR(text) {
  return new Promise((resolve) => {
    const holder = document.getElementById('qrHolder');
    holder.innerHTML = '';
    if (!text) { assets.qr = null; resolve(); return; }
    if (typeof QRCode === 'undefined') {
      console.warn('QRCode library not loaded yet');
      assets.qr = null; resolve(); return;
    }
    /* eslint-disable no-undef */
    new QRCode(holder, {
      text: text,
      width: 240, height: 240,
      colorDark: '#000000', colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
    // qrcodejs draws to a canvas or img; grab whichever appears
    setTimeout(() => {
      const cnv = holder.querySelector('canvas');
      const im = holder.querySelector('img');
      const src = cnv ? cnv.toDataURL('image/png') : (im ? im.src : null);
      if (!src) { assets.qr = null; resolve(); return; }
      loadImage(src).then((qimg) => { assets.qr = qimg; resolve(); });
    }, 60);
  });
}

/* ---------------------------------------------------------------------
   PDF EXPORT — rebuilds the same layout with jsPDF (vector text).
   jsPDF uses points by default; baseline option lets us position by top.
   --------------------------------------------------------------------- */
async function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });

  // Helper: jsPDF text positioned by baseline-from-top
  const T = (txt, x, yBaseline, opts = {}) => {
    doc.text(txt, x, yBaseline, opts);
  };

  // Background
  if (assets.bg) {
    const c = document.createElement('canvas');
    c.width = assets.bg.width; c.height = assets.bg.height;
    c.getContext('2d').drawImage(assets.bg, 0, 0);
    doc.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG',
      13.3, 13.0, 580.9-13.3, 859.3-13.0);
  }

  // Title
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(31, 126, 196);
  doc.setFontSize(44);
  T('Certificate', 48.8, 92);

  // Photo
  const pX=387.4, pY=145.9, pW=510.8-387.4, pH=281.2-145.9;
  if (assets.photo) {
    const pc = coverCanvas(assets.photo, pW*3, pH*3);
    doc.addImage(pc.toDataURL('image/jpeg', 0.92), 'JPEG', pX, pY, pW, pH);
  }

  doc.setTextColor(29,29,27);
  doc.setFontSize(13);
  T('This is to certify that', 129.6, 277);

  const labelColor = [95,107,120];
  const valueColor = [29,29,27];
  const drawLabel = (txt, xRight, y) => {
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
    doc.setTextColor(...labelColor);
    T(txt, xRight, y, { align: 'right' });
  };
  const drawValue = (txt, x, y, size, bold) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size);
    doc.setTextColor(...valueColor);
    T(txt, x, y);
  };

  const rows = [
    ['Name:',123.5,303, F.name.value,129.6,303,16,true],
    ['Certificate No:',123.5,332, F.certno.value,129.6,332,13,false],
    ['Id No.:',123.5,361, F.idno.value,129.6,361,13,false],
    ['Company:',123.5,390, F.company.value,129.6,390,13,false],
    ['Address:',123.5,419, F.address.value,129.6,419,13,false],
  ];
  rows.forEach(([lab,lx,ly,val,vx,vy,vs,bold]) => { drawLabel(lab,lx,ly); drawValue(val,vx,vy,vs,bold); });

  drawValue('Has Attended and successfully completed', 129.6, 447, 13, false);

  drawLabel('Qualification:',123.5,474); drawValue(F.qual.value,129.6,474,13,false);
  drawLabel('Venue:',123.5,500); drawValue(F.venue.value,129.6,500,13,false);

  pdfDateRow(doc,'Assessment date:',123.5,528,formatDate(F.adate.value));
  pdfDateRow(doc,'Valid until:',123.5,557,formatDate(F.vdate.value));

  drawValue('Note: This assessment certificate is not a driving license.', 129.6, 578, 10, false);

  // Footer address
  doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(...valueColor);
  [['TÜV Rheinland LLC',630],['P.O. Box 1918, Postal Code 133,',643],
   ['Muscat, Sultanate of Oman',656],['Lifting@om.tuv.com',669],['+968 2448 7851',682]]
   .forEach(([t,y]) => T(t,128.7,y));
  doc.setFontSize(8.5); doc.setTextColor(...labelColor);
  T('MS-0044958',128.7,699);

  // Signature
  if (assets.sig) {
    const sc = document.createElement('canvas');
    sc.width = assets.sig.width; sc.height = assets.sig.height;
    sc.getContext('2d').drawImage(assets.sig, 0, 0);
    doc.addImage(sc.toDataURL('image/png'), 'PNG', 264.9, 622.9, 366.2-264.9, 679.9-622.9);
  }

  // Signatories
  doc.setFont('helvetica','normal'); doc.setFontSize(10.5); doc.setTextColor(...valueColor);
  T(F.assessor.value, 315, 681, { align:'center' });
  T('Assessor', 315, 695, { align:'center' });
  T(F.manager.value, 498, 681, { align:'center' });
  T('Asst Manager', 498, 695, { align:'center' });

  // QR
  if (assets.qr) {
    const qc = document.createElement('canvas');
    qc.width = assets.qr.width; qc.height = assets.qr.height;
    qc.getContext('2d').drawImage(assets.qr, 0, 0);
    doc.addImage(qc.toDataURL('image/png'), 'PNG', 367.5, 603.6, 454.6-367.5, 690.8-603.6);
  }

  const safe = (F.certno.value || 'certificate').replace(/[^\w\-]+/g,'_');
  doc.save(`${safe}.pdf`);
  showToast('PDF downloaded ✓');
}

function pdfDateRow(doc, label, lx, baseline, parts) {
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(95,107,120);
  doc.text(label, lx, baseline, { align:'right' });
  doc.setTextColor(29,29,27);
  let x = 129.6;
  if (typeof parts === 'string') { doc.setFontSize(13); doc.text(parts, x, baseline); return; }
  doc.setFontSize(13); doc.text(String(parts.day), x, baseline);
  x += doc.getTextWidth(String(parts.day));
  doc.setFontSize(8); doc.text(parts.sup, x, baseline-4);
  x += doc.getTextWidth(parts.sup);
  doc.setFontSize(13); doc.text(parts.rest, x, baseline);
}

function coverCanvas(img, w, h) {
  const c = document.createElement('canvas'); c.width=w; c.height=h;
  const cc = c.getContext('2d');
  const ir = img.width/img.height, br = w/h;
  let sx,sy,sw,sh;
  if (ir>br){ sh=img.height; sw=sh*br; sx=(img.width-sw)/2; sy=0; }
  else { sw=img.width; sh=sw/br; sx=0; sy=(img.height-sh)/2; }
  cc.drawImage(img, sx,sy,sw,sh, 0,0,w,h);
  return c;
}

/* ---------------------------------------------------------------------
   Events
   --------------------------------------------------------------------- */
let qrTimer = null;
function refresh() { drawCanvas(); }

function scheduleQR() {
  clearTimeout(qrTimer);
  qrTimer = setTimeout(async () => {
    await generateQR(F.qrdata.value.trim());
    drawCanvas();
  }, 250);
}

Object.values(F).forEach((el) => {
  el.addEventListener('input', () => {
    if (el === F.qrdata) scheduleQR();
    refresh();
  });
});

document.getElementById('f_photo').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    assets.photo = await loadImage(ev.target.result);
    const thumb = document.getElementById('photoThumb');
    thumb.src = ev.target.result; thumb.style.display = 'block';
    refresh();
  };
  reader.readAsDataURL(file);
});

document.getElementById('btnPdf').addEventListener('click', async () => {
  const btn = document.getElementById('btnPdf');
  btn.disabled = true; const old = btn.innerHTML; btn.textContent = 'Generating…';
  try { await exportPDF(); }
  catch (err) { console.error(err); showToast('Error generating PDF'); }
  btn.disabled = false; btn.innerHTML = old;
});

document.getElementById('btnReset').addEventListener('click', () => {
  if (!confirm('Reset all fields to the default example?')) return;
  location.reload();
});

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------------------------------------------------------------------
   Init
   --------------------------------------------------------------------- */
(async function init() {
  try {
    assets.bg  = await loadImage('assets/background.jpg');
  } catch (e) { console.warn('background not loaded', e); }
  try {
    assets.sig = await loadImage('assets/signature.png');
  } catch (e) { console.warn('signature not loaded', e); }
  try {
    await generateQR(F.qrdata.value.trim());
  } catch (e) { console.warn('QR init failed', e); }
  // Ensure web fonts are ready so canvas measures correctly
  try {
    if (document.fonts && document.fonts.ready) { await document.fonts.ready; }
  } catch (e) { /* ignore */ }
  drawCanvas();
})();
