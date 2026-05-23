# Operator Assessment Certificate Generator

A static website that generates **TÜV Rheinland–style operator assessment certificates** as downloadable PDFs. You fill in a form, the certificate updates live, and you click **Download PDF** to get a print-ready A4 certificate.

No server or database is required — everything runs in the browser, so it can be hosted for free on **GitHub Pages**.

---

## ✨ Features

- **Live preview** — the certificate redraws as you type.
- **Pixel-faithful template** — uses the original TÜV Rheinland background, watermark, logo and signature.
- **Editable fields** — name, certificate no., ID, company, address, qualification, venue, dates, assessor & manager names.
- **Photo upload** — drop in the trainee's passport-style photo.
- **Auto QR code** — regenerates from any text/URL you enter.
- **Vector-text PDF** — text stays crisp at any zoom; output is a true A4 page.

---

## 📁 Project structure

```
.
├── index.html          # The form + live preview UI
├── certificate.js      # Rendering engine + PDF export logic
├── .nojekyll           # Tells GitHub Pages to serve /assets as-is
├── assets/
│   ├── background.jpg   # Official certificate template (full page)
│   └── signature.png    # Assessor signature (transparent PNG)
└── README.md
```

---

## 🚀 Deploy to GitHub Pages (step by step)

1. **Create a new repository** on GitHub, e.g. `operator-certificate`.
2. **Upload all the files** in this folder (keep the `assets/` folder and `.nojekyll`).
   - Easiest way: on the repo page click **Add file → Upload files**, drag everything in, and commit.
   - Or with git:
     ```bash
     git init
     git add .
     git commit -m "Certificate generator"
     git branch -M main
     git remote add origin https://github.com/<your-username>/operator-certificate.git
     git push -u origin main
     ```
3. In the repo, go to **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**.
5. Select branch **`main`** and folder **`/ (root)`**, then **Save**.
6. Wait ~1 minute. Your site will be live at:
   ```
   https://<your-username>.github.io/operator-certificate/
   ```

That's it. Open the link, fill the form, and download certificates.

---

## 🖊️ Customising

| What | Where |
|------|-------|
| Default field values | `index.html` — the `value="..."` on each input |
| Field positions / fonts | `certificate.js` — coordinates are in **PDF points** (A4 = 595.32 × 841.92) measured from the original |
| Background template | replace `assets/background.jpg` (keep same dimensions for best fit) |
| Signature | replace `assets/signature.png` |
| QR code content | the **QR Code Content** field in the form |

### Make the QR code link to a verification page

Right now the QR encodes whatever text you type (default = the certificate number).
To make it a verification URL, just type a full URL in the **QR Code Content** field, e.g.:
```
https://<your-username>.github.io/operator-certificate/verify.html?id=TRO-OP-26-0017
```

---

## 🔧 Run locally

Because the page loads image files, open it through a small web server (not by double-clicking the file):

```bash
# Python 3
cd operator-certificate
python3 -m http.server 8000
# then open http://localhost:8000
```

---

## 📦 Libraries used (loaded from CDN, no install needed)

- [jsPDF](https://github.com/parallax/jsPDF) — PDF generation
- [qrcodejs](https://github.com/davidshimjs/qrcodejs) — QR code generation

These load automatically from a CDN when the page is online (including on GitHub Pages).

---

## ⚠️ Note on usage

This tool reproduces an official TÜV Rheinland certificate layout. Only use it to issue
certificates you are authorised to issue. The template and TÜV Rheinland marks remain the
property of their owner.
