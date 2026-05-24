/* =====================================================================
   Operator Assessment Certificate Generator  (v2)
   Changes in this version:
   - Font is Univers (with Helvetica/Arial fallback) everywhere
   - Name is NOT bold
   - 7 assessors with signatures (auto-loaded from assets/signatures/)
   - Right signatory: editable name + role dropdown (Asst Manager / Team
     Lead), NO signature drawn for it
   - Photo upload + crop (Cropper.js)
   - "Paste Excel Row" auto-fills the fields
   - QR generated on-site from the Excel-style multi-line prompt
   - Editable fields limited to: Name, Certificate No, Id No, Company,
     Qualification, Venue, Assessment Date, Valid Until
   ===================================================================== */

const PAGE_W = 595.32, PAGE_H = 841.92;       // A4 in points
const SCALE = 2;
const canvas = document.getElementById('certCanvas');
canvas.width  = Math.round(PAGE_W * SCALE);
canvas.height = Math.round(PAGE_H * SCALE);
const ctx = canvas.getContext('2d');

/* The Univers font stack used by the canvas preview. */
const FONT_STACK = "'Univers','Univers LT Std','UniversLTStd','Helvetica Neue','Arial',sans-serif";

/* =====================================================================
   ASSESSOR  ->  SIGNATURE FILE   (edit here if a pairing is wrong)
   Files live in assets/signatures/ . To swap a signature, just change
   the filename on the right.
   ===================================================================== */
const ASSESSORS = [
  { name: 'Murali Rudra',          file: 'murali_rudra.png' },
  { name: 'Suhail K.A',            file: 'suhail_ka.png' },
  { name: 'Afzal Ahammed',         file: 'afzal_ahammed.png' },
  { name: 'Abdulrahman Al Rashdi', file: 'abdulrahman_al_rashdi.png' },
  { name: 'Ali Rashid Al Hajri',   file: 'ali_rashid_al_hajri.png' },
  { name: 'Habib Al Rawahi',       file: 'habib_al_rawahi.png' },
  { name: 'Selvaganapathi V',      file: 'selvaganapathi_v.png' },
];

const assets = { bg: null, photo: null, qr: null };
const sigCache = {};   // filename -> Image

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
  name:        document.getElementById('f_name'),
  certno:      document.getElementById('f_certno'),
  idno:        document.getElementById('f_idno'),
  company:     document.getElementById('f_company'),
  qual:        document.getElementById('f_qual'),
  venue:       document.getElementById('f_venue'),
  adate:       document.getElementById('f_adate'),
  vdate:       document.getElementById('f_vdate'),
  assessor:    document.getElementById('f_assessor'),
  managerName: document.getElementById('f_managerName'),
  managerRole: document.getElementById('f_managerRole'),
};

/* Populate assessor dropdown */
ASSESSORS.forEach((a, i) => {
  const o = document.createElement('option');
  o.value = a.name; o.textContent = a.name;
  if (i === 0) o.selected = true;
  F.assessor.appendChild(o);
});

/* ---------------- Date helpers ---------------- */
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function ordinal(n){ if(n>=11&&n<=13)return 'th'; switch(n%10){case 1:return 'st';case 2:return 'nd';case 3:return 'rd';default:return 'th';} }
function formatDate(iso){
  if(!iso) return '';
  const [y,m,d] = iso.split('-').map(Number);
  if(!y||!m||!d) return iso;
  return { day:d, sup:ordinal(d), rest:` ${MONTHS[m-1]} ${y}` };
}
/* dd.mm.yyyy used in the QR validity (matches your Excel) */
function dotDate(iso){
  if(!iso) return '';
  const [y,m,d] = iso.split('-');
  if(!y||!m||!d) return iso;
  return `${d}.${m}.${y}`;
}
/* parse various date strings (dd.mm.yyyy, dd/mm/yyyy, yyyy-mm-dd) -> iso */
function toISO(str){
  if(!str) return '';
  str = String(str).trim();
  let m;
  if((m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  if((m = str.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/))) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  return '';
}
function pad(n){ return String(n).padStart(2,'0'); }

/* ---------------- QR content (Excel-style multi-line) ----------------
   If a row is pasted, we use the Excel "QR Prompt" column verbatim.
   Otherwise we build the same multi-line text from the current fields. */
let qrPromptOverride = '';   // set from the pasted Excel "QR Prompt" column
function qrContent(){
  if (qrPromptOverride && qrPromptOverride.trim()) return qrPromptOverride;
  return [
    `Company: ${F.company.value}`,
    `Certificate No: ${F.certno.value}`,
    `Qualification: ${F.qual.value}`,
    `Name: ${F.name.value}`,
    `Validity: ${dotDate(F.vdate.value)}`
  ].join('\n');
}
/* Venue always ends with " – Sultanate of Oman"; the field holds just the city */
function venueText(){
  const city = (F.venue.value || '').trim();
  const suffix = '– Sultanate of Oman';
  if (!city) return 'Sultanate of Oman';
  return `${city} ${suffix}`;
}

/* ===================================================================== */
/*                              CANVAS PREVIEW                           */
/* ===================================================================== */
function drawCanvas(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const s = SCALE;

  if (assets.bg) ctx.drawImage(assets.bg, 13.3*s, 13.0*s, (580.9-13.3)*s, (859.3-13.0)*s);
  else { ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); }

  ctx.textBaseline = 'alphabetic';

  /* Title */
  ctx.fillStyle = '#1f7ec4';
  ctx.font = `400 ${44*s}px ${FONT_STACK}`;
  ctx.fillText('Certificate', 48.8*s, 92*s);

  /* Photo box */
  const pX=387.4*s, pY=145.9*s, pW=(510.8-387.4)*s, pH=(281.2-145.9)*s;
  if (assets.photo) drawCover(ctx, assets.photo, pX, pY, pW, pH);
  else {
    ctx.fillStyle='#dfe6ee'; ctx.fillRect(pX,pY,pW,pH);
    ctx.fillStyle='#9aa7b4'; ctx.font=`500 ${9*s}px ${FONT_STACK}`; ctx.textAlign='center';
    ctx.fillText('PHOTO', pX+pW/2, pY+pH/2); ctx.textAlign='left';
  }

  /* Intro */
  ctx.fillStyle='#1d1d1b'; ctx.font=`400 ${13*s}px ${FONT_STACK}`;
  ctx.fillText('This is to certify that', 129.6*s, 277*s);

  /* Rows — NOTE: Name is NOT bold now (all values weight 400) */
  const LABEL='#5f6b78', VALUE='#1d1d1b';
  const rows = [
    ['Name:',           123.5, 303, F.name.value,    16],
    ['Certificate No:', 123.5, 332, F.certno.value,  13],
    ['Id No.:',         123.5, 361, F.idno.value,    13],
    ['Company:',        123.5, 390, F.company.value, 13],
  ];
  rows.forEach(([lab,lx,ly,val,vs])=>{
    ctx.textAlign='right'; ctx.fillStyle=LABEL; ctx.font=`400 ${8.5*s}px ${FONT_STACK}`;
    ctx.fillText(lab, lx*s, ly*s);
    ctx.textAlign='left'; ctx.fillStyle=VALUE; ctx.font=`400 ${vs*s}px ${FONT_STACK}`;
    ctx.fillText(val, 129.6*s, ly*s);
  });

  /* Address row (fixed "Sultanate of Oman" — present on the original) */
  drawLabelValue('Address:', 123.5, 419, 'Sultanate of Oman', 13, s, LABEL, VALUE);

  /* Has attended line */
  ctx.textAlign='left'; ctx.fillStyle=VALUE; ctx.font=`400 ${13*s}px ${FONT_STACK}`;
  ctx.fillText('Has Attended and successfully completed', 129.6*s, 447*s);

  drawLabelValue('Qualification:', 123.5, 474, F.qual.value, 13, s, LABEL, VALUE);
  drawLabelValue('Venue:',         123.5, 500, venueText(), 13, s, LABEL, VALUE);

  drawDateRow('Assessment date:', 123.5, 528, formatDate(F.adate.value), s, LABEL, VALUE);
  drawDateRow('Valid until:',     123.5, 557, formatDate(F.vdate.value), s, LABEL, VALUE);

  ctx.textAlign='left'; ctx.fillStyle=VALUE; ctx.font=`400 ${10*s}px ${FONT_STACK}`;
  ctx.fillText('Note: This assessment certificate is not a driving license.', 129.6*s, 578*s);

  /* Footer address */
  ctx.fillStyle=VALUE; ctx.font=`400 ${9.5*s}px ${FONT_STACK}`;
  [['TÜV Rheinland LLC',630],['P.O. Box 1918, Postal Code 133,',643],
   ['Muscat, Sultanate of Oman',656],['Lifting@om.tuv.com',669],['+968 2448 7851',682]]
   .forEach(([t,y])=>ctx.fillText(t,128.7*s,y*s));
  ctx.fillStyle=LABEL; ctx.font=`400 ${8.5*s}px ${FONT_STACK}`;
  ctx.fillText('MS-0044958',128.7*s,699*s);

  /* Assessor signature (left signatory only) — centred above the
     "Murali Rudra / Assessor" caption, matching the original. */
  const sig = currentSig();
  if (sig) {
    fitInto(ctx, sig, 268*s, 628*s, 94*s, 46*s);
  }

  /* Signatory captions */
  ctx.textAlign='center'; ctx.fillStyle=VALUE; ctx.font=`400 ${10.5*s}px ${FONT_STACK}`;
  ctx.fillText(F.assessor.value, 315*s, 681*s);
  ctx.fillText('Assessor', 315*s, 695*s);
  ctx.fillText(F.managerName.value, 498*s, 681*s);
  ctx.fillText(F.managerRole.value, 498*s, 695*s);
  ctx.textAlign='left';

  /* QR */
  if (assets.qr) ctx.drawImage(assets.qr, 367.5*s, 603.6*s, (454.6-367.5)*s, (690.8-603.6)*s);
}

function drawLabelValue(label, lx, baseline, val, vs, s, LABEL, VALUE){
  ctx.textAlign='right'; ctx.fillStyle=LABEL; ctx.font=`400 ${8.5*s}px ${FONT_STACK}`;
  ctx.fillText(label, lx*s, baseline*s);
  ctx.textAlign='left'; ctx.fillStyle=VALUE; ctx.font=`400 ${vs*s}px ${FONT_STACK}`;
  ctx.fillText(val, 129.6*s, baseline*s);
}

function drawDateRow(label, lx, baseline, parts, s, LABEL, VALUE){
  ctx.textAlign='right'; ctx.fillStyle=LABEL; ctx.font=`400 ${8.5*s}px ${FONT_STACK}`;
  ctx.fillText(label, lx*s, baseline*s);
  ctx.textAlign='left'; ctx.fillStyle=VALUE;
  let x = 129.6*s;
  if (typeof parts === 'string'){ ctx.font=`400 ${13*s}px ${FONT_STACK}`; ctx.fillText(parts,x,baseline*s); return; }
  ctx.font=`400 ${13*s}px ${FONT_STACK}`; ctx.fillText(String(parts.day), x, baseline*s);
  x += ctx.measureText(String(parts.day)).width;
  ctx.font=`400 ${8*s}px ${FONT_STACK}`; ctx.fillText(parts.sup, x, (baseline-5)*s);
  x += ctx.measureText(parts.sup).width;
  ctx.font=`400 ${13*s}px ${FONT_STACK}`; ctx.fillText(parts.rest, x, baseline*s);
}

function drawCover(c,img,x,y,w,h){
  const ir=img.width/img.height, br=w/h; let sx,sy,sw,sh;
  if(ir>br){ sh=img.height; sw=sh*br; sx=(img.width-sw)/2; sy=0; }
  else { sw=img.width; sh=sw/br; sx=0; sy=(img.height-sh)/2; }
  c.drawImage(img,sx,sy,sw,sh,x,y,w,h);
}
/* fit (contain) an image inside a box, centred */
function fitInto(c,img,x,y,w,h){
  const ir=img.width/img.height, br=w/h; let dw,dh;
  if(ir>br){ dw=w; dh=w/ir; } else { dh=h; dw=h*ir; }
  c.drawImage(img, x+(w-dw)/2, y+(h-dh)/2, dw, dh);
}

function currentSig(){
  const a = ASSESSORS.find(x=>x.name===F.assessor.value);
  if(!a) return null;
  return sigCache[a.file] || null;
}

/* ---------------- QR generation ---------------- */
function generateQR(text){
  return new Promise((resolve)=>{
    const holder=document.getElementById('qrHolder'); holder.innerHTML='';
    if(!text || typeof QRCode==='undefined'){ assets.qr=null; resolve(); return; }
    new QRCode(holder,{ text, width:300, height:300, colorDark:'#000', colorLight:'#fff', correctLevel:QRCode.CorrectLevel.M });
    setTimeout(()=>{
      const cnv=holder.querySelector('canvas'), im=holder.querySelector('img');
      const src = cnv ? cnv.toDataURL('image/png') : (im?im.src:null);
      if(!src){ assets.qr=null; resolve(); return; }
      loadImage(src).then(q=>{ assets.qr=q; resolve(); });
    },70);
  });
}

/* ===================================================================== */
/*                              PDF EXPORT                               */
/* ===================================================================== */
async function exportPDF(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:'pt', format:'a4', compress:true });

  /* Embed the real Univers font (provided by the user) so the downloaded
     PDF renders in true Univers. Falls back to Helvetica if not found. */
  let FONT = 'helvetica';
  try {
    const r = await fetch('fonts/Univers.ttf.b64');
    if (r.ok) {
      const b64 = (await r.text()).trim();
      doc.addFileToVFS('Univers.ttf', b64);
      doc.addFont('Univers.ttf', 'Univers', 'normal');
      FONT = 'Univers';
      try {
        const rb = await fetch('fonts/Univers-Bold.ttf.b64');
        if (rb.ok) { const bb=(await rb.text()).trim(); doc.addFileToVFS('Univers-Bold.ttf', bb); doc.addFont('Univers-Bold.ttf','Univers','bold'); }
      } catch(e){}
    }
  } catch(e){ /* no custom font; use helvetica */ }

  const setF = (size)=>{ doc.setFont(FONT,'normal'); doc.setFontSize(size); };

  if (assets.bg){
    const c=document.createElement('canvas'); c.width=assets.bg.width; c.height=assets.bg.height;
    c.getContext('2d').drawImage(assets.bg,0,0);
    doc.addImage(c.toDataURL('image/jpeg',0.92),'JPEG',13.3,13.0,580.9-13.3,859.3-13.0);
  }

  doc.setTextColor(31,126,196); setF(44);
  doc.text('Certificate',48.8,92);

  if (assets.photo){
    const pW=510.8-387.4, pH=281.2-145.9;
    const pc=coverCanvas(assets.photo, pW*3, pH*3);
    doc.addImage(pc.toDataURL('image/jpeg',0.92),'JPEG',387.4,145.9,pW,pH);
  }

  doc.setTextColor(29,29,27); setF(13);
  doc.text('This is to certify that',129.6,277);

  const L=[95,107,120], V=[29,29,27];
  const lab=(t,xr,y)=>{ setF(8.5); doc.setTextColor(...L); doc.text(t,xr,y,{align:'right'}); };
  const val=(t,y,size)=>{ setF(size); doc.setTextColor(...V); doc.text(t,129.6,y); };

  // Name is NOT bold
  lab('Name:',123.5,303);           val(F.name.value,303,16);
  lab('Certificate No:',123.5,332); val(F.certno.value,332,13);
  lab('Id No.:',123.5,361);         val(F.idno.value,361,13);
  lab('Company:',123.5,390);        val(F.company.value,390,13);
  lab('Address:',123.5,419);        val('Sultanate of Oman',419,13);

  val('Has Attended and successfully completed',447,13);
  lab('Qualification:',123.5,474);  val(F.qual.value,474,13);
  lab('Venue:',123.5,500);          val(venueText(),500,13);

  pdfDate(doc,FONT,'Assessment date:',123.5,528,formatDate(F.adate.value));
  pdfDate(doc,FONT,'Valid until:',123.5,557,formatDate(F.vdate.value));

  val('Note: This assessment certificate is not a driving license.',578,10);

  setF(9.5); doc.setTextColor(...V);
  [['TÜV Rheinland LLC',630],['P.O. Box 1918, Postal Code 133,',643],
   ['Muscat, Sultanate of Oman',656],['Lifting@om.tuv.com',669],['+968 2448 7851',682]]
   .forEach(([t,y])=>doc.text(t,128.7,y));
  setF(8.5); doc.setTextColor(...L); doc.text('MS-0044958',128.7,699);

  // Assessor signature
  const sig=currentSig();
  if (sig){
    const box={x:268,y:628,w:94,h:46};
    const ir=sig.width/sig.height, br=box.w/box.h; let dw,dh;
    if(ir>br){dw=box.w;dh=box.w/ir;}else{dh=box.h;dw=box.h*ir;}
    const sc=document.createElement('canvas'); sc.width=sig.width; sc.height=sig.height;
    sc.getContext('2d').drawImage(sig,0,0);
    doc.addImage(sc.toDataURL('image/png'),'PNG', box.x+(box.w-dw)/2, box.y+(box.h-dh)/2, dw, dh);
  }

  setF(10.5); doc.setTextColor(...V);
  doc.text(F.assessor.value,315,681,{align:'center'});
  doc.text('Assessor',315,695,{align:'center'});
  doc.text(F.managerName.value,498,681,{align:'center'});
  doc.text(F.managerRole.value,498,695,{align:'center'});

  if (assets.qr){
    const qc=document.createElement('canvas'); qc.width=assets.qr.width; qc.height=assets.qr.height;
    qc.getContext('2d').drawImage(assets.qr,0,0);
    doc.addImage(qc.toDataURL('image/png'),'PNG',367.5,603.6,454.6-367.5,690.8-603.6);
  }

  const safe=(F.certno.value||'certificate').replace(/[^\w\-]+/g,'_');
  doc.save(`${safe}.pdf`);
  showToast('PDF downloaded ✓');
}

function pdfDate(doc,FONT,label,lx,baseline,parts){
  doc.setFont(FONT,'normal'); doc.setFontSize(8.5); doc.setTextColor(95,107,120);
  doc.text(label,lx,baseline,{align:'right'});
  doc.setTextColor(29,29,27);
  let x=129.6;
  if(typeof parts==='string'){ doc.setFontSize(13); doc.text(parts,x,baseline); return; }
  doc.setFontSize(13); doc.text(String(parts.day),x,baseline);
  x += doc.getTextWidth(String(parts.day));
  doc.setFontSize(8); doc.text(parts.sup,x,baseline-4);
  x += doc.getTextWidth(parts.sup);
  doc.setFontSize(13); doc.text(parts.rest,x,baseline);
}

function coverCanvas(img,w,h){
  const c=document.createElement('canvas'); c.width=w; c.height=h; const cc=c.getContext('2d');
  const ir=img.width/img.height, br=w/h; let sx,sy,sw,sh;
  if(ir>br){sh=img.height;sw=sh*br;sx=(img.width-sw)/2;sy=0;}else{sw=img.width;sh=sw/br;sx=0;sy=(img.height-sh)/2;}
  cc.drawImage(img,sx,sy,sw,sh,0,0,w,h); return c;
}

/* ===================================================================== */
/*                         PASTE EXCEL ROW                               */
/* ===================================================================== */
/* Column order in Sheet1:
   0 SI.No | 1 Company | 2 Certificate Number | 3 Category(Qualification)
   4 Issue To(Name) | 5 Emp Number(ID) | 6 Issue Date | 7 Valid Till
   8 PIC | 9 Name Text | 10 CAPS | 11 QR Prompt | 12 QR CODE */

/* Excel copies a row as TAB-separated values. A cell containing line breaks
   (the QR Prompt) is wrapped in double quotes and may span several lines. */
function parseTSVRow(text){
  text = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n');
  const cells=[]; let cur='', inQ=false;
  for (let i=0;i<text.length;i++){
    const ch=text[i];
    if (inQ){
      if (ch==='"'){ if(text[i+1]==='"'){cur+='"';i++;} else inQ=false; }
      else cur+=ch;
    } else {
      if (ch==='"') inQ=true;
      else if (ch==='\t'){ cells.push(cur); cur=''; }
      else if (ch==='\n'){ break; }
      else cur+=ch;
    }
  }
  cells.push(cur);
  return cells;
}

function importRow(raw){
  if (!raw.trim()) return;
  let cells = raw.includes('\t') ? parseTSVRow(raw) : raw.split(/ {2,}|\n/);
  cells = cells.map(c=>String(c).trim());
  const get = (i)=> (cells[i] !== undefined ? cells[i] : '');

  if (get(1)) F.company.value = get(1);
  if (get(2)) F.certno.value  = get(2);
  if (get(3)) F.qual.value    = get(3);
  if (get(4)) F.name.value    = get(4);
  if (get(5)) F.idno.value    = get(5);
  const aiso = toISO(get(6)); if (aiso) F.adate.value = aiso;
  const viso = toISO(get(7)); if (viso) F.vdate.value = viso;

  // QR Prompt column (L = index 11). Literal "\n" -> real newlines.
  let qp = get(11);
  if (qp){ qrPromptOverride = qp.replace(/\\n/g,'\n'); }
  else   { qrPromptOverride = ''; }

  scheduleQR(); refresh();
  showToast('Row imported ✓');
}

document.getElementById('pasteRow').addEventListener('input', (e)=> importRow(e.target.value));

/* ===================================================================== */
/*                         PHOTO + CROP                                  */
/* ===================================================================== */
let cropper = null;
let lastPhotoDataUrl = null;
const cropModal = document.getElementById('cropModal');
const cropImg = document.getElementById('cropImg');

function openCropper(dataUrl){
  lastPhotoDataUrl = dataUrl;
  cropImg.src = dataUrl;
  cropModal.classList.add('show');
  if (cropper){ cropper.destroy(); cropper = null; }
  // wait for image to render in modal
  setTimeout(()=>{
    if (typeof Cropper === 'undefined'){
      // No cropper lib (offline) — just use the image as-is
      applyPhoto(dataUrl); cropModal.classList.remove('show'); return;
    }
    cropper = new Cropper(cropImg, {
      aspectRatio: (510.8-387.4)/(281.2-145.9),  // match the photo box ratio
      viewMode: 1, autoCropArea: 1, background:false, responsive:true,
    });
  }, 80);
}

async function applyPhoto(dataUrl){
  assets.photo = await loadImage(dataUrl);
  const thumb=document.getElementById('photoThumb');
  thumb.src=dataUrl; thumb.style.display='block';
  document.getElementById('btnRecrop').style.display='inline-block';
  refresh();
}

document.getElementById('f_photo').addEventListener('change',(e)=>{
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=(ev)=> openCropper(ev.target.result);
  reader.readAsDataURL(file);
});

document.getElementById('btnRecrop').addEventListener('click',()=>{
  if (lastPhotoDataUrl) openCropper(lastPhotoDataUrl);
});

document.getElementById('cropApply').addEventListener('click', async ()=>{
  if (cropper){
    const c = cropper.getCroppedCanvas({ width:600, height:Math.round(600*(281.2-145.9)/(510.8-387.4)) });
    await applyPhoto(c.toDataURL('image/jpeg',0.92));
  } else if (lastPhotoDataUrl){
    await applyPhoto(lastPhotoDataUrl);
  }
  cropModal.classList.remove('show');
});
document.getElementById('cropCancel').addEventListener('click',()=>{
  cropModal.classList.remove('show');
  if (cropper){ cropper.destroy(); cropper=null; }
});

/* ===================================================================== */
/*                         EVENTS / INIT                                 */
/* ===================================================================== */
let qrTimer=null;
function refresh(){ drawCanvas(); }
function scheduleQR(){
  clearTimeout(qrTimer);
  qrTimer=setTimeout(async()=>{ await generateQR(qrContent()); drawCanvas(); },250);
}

['name','certno','idno','company','qual','venue','adate','vdate','managerName'].forEach(k=>{
  F[k].addEventListener('input', ()=>{
    if(['company','certno','qual','name','vdate'].includes(k)){ qrPromptOverride=''; scheduleQR(); }
    refresh();
  });
});
F.managerRole.addEventListener('change', refresh);
F.assessor.addEventListener('change', async ()=>{
  await ensureSig(F.assessor.value); refresh();
});

async function ensureSig(name){
  const a = ASSESSORS.find(x=>x.name===name); if(!a) return;
  if (sigCache[a.file]) return;
  try { sigCache[a.file] = await loadImage('assets/signatures/'+a.file); }
  catch(e){ console.warn('signature missing:', a.file); }
}

document.getElementById('btnPdf').addEventListener('click', async ()=>{
  const btn=document.getElementById('btnPdf'); btn.disabled=true; const old=btn.innerHTML; btn.textContent='Generating…';
  try { await exportPDF(); } catch(err){ console.error(err); showToast('Error generating PDF'); }
  btn.disabled=false; btn.innerHTML=old;
});
document.getElementById('btnReset').addEventListener('click',()=>{ if(confirm('Reset all fields?')) location.reload(); });

function showToast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200); }

(async function init(){
  try { assets.bg = await loadImage('assets/background.jpg'); } catch(e){ console.warn('bg missing',e); }
  try { await ensureSig(ASSESSORS[0].name); } catch(e){}
  try { await generateQR(qrContent()); } catch(e){}
  try { if(document.fonts&&document.fonts.ready) await document.fonts.ready; } catch(e){}
  drawCanvas();
})();
