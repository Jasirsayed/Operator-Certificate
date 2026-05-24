# Operator Assessment Certificate Generator

A static website that generates **TÜV Rheinland–style operator assessment certificates** as downloadable PDFs. Paste a row from your Excel sheet, the certificate fills in automatically, pick the assessor, optionally add and crop a photo, then click **Download PDF**.

No server or database is required — everything runs in the browser, so it can be hosted for free on **GitHub Pages**.

---

## ✨ What it does

- **Paste an Excel row → auto-fill.** Copy any row from **Sheet1** of your workbook and paste it into the box. It fills Name, Certificate No, Id No, Company, Qualification, Assessment Date, Valid Until, and the QR content.
- **Or upload the whole `.xlsx`** and pick a person from a dropdown.
- **7 assessors with real signatures.** Choose the assessor from a dropdown; their signature is placed automatically.
- **Asst Manager / Team Lead.** The right-hand signatory shows either “Asst Manager” or “Team Lead”, with an **optional signature** (signature only — no extra name) that you pick from a dropdown.
- **TÜV stamp** is overlaid automatically near the QR, matching the official certificate.
- **QR code** is sized to sit neatly beside the stamp.
- **Photo upload + crop.** Upload a portrait and crop it to the exact photo-box shape before it goes on the certificate.
- **QR code generated in the browser** from the “QR Prompt” column text (multi-line supported).
- **Name is not bold** and the certificate uses the **Univers** font (with a free fallback — see below).

---

## 🔤 Univers font

The certificate uses **Univers**, TÜV Rheinland’s corporate font. The licensed font you provided is **bundled** in the `fonts/` folder, so both the on-screen preview **and** the downloaded PDF render in true Univers:

- `fonts/Univers.ttf` — regular (used everywhere; Name is **not** bold)
- `fonts/Univers-Bold.ttf` — bold (used where the layout needs it)
- `fonts/Univers.ttf.b64` / `Univers-Bold.ttf.b64` — the same fonts as base64, which jsPDF embeds into the PDF

> Univers is a **licensed/commercial font**. Keep these files private to your own licensed use; don’t publish them in a public repository.

To swap in a different Univers cut later, replace the `.ttf` files and regenerate the `.b64` files (`base64 -w0 Univers.ttf > Univers.ttf.b64`).

---

## ✍️ Assessor signatures

The 7 assessor signatures were extracted from the **Signatures** sheet of your workbook and saved as transparent PNGs in `assets/signatures/`. The dropdown is driven by the `ASSESSORS` list near the top of `certificate.js`.

If any signature is paired with the wrong name, just change the `file:` value next to that name in that list — the filenames are:
`murali_rudra.png`, `suhail_ka.png`, `afzal_ahammed.png`, `abdulrahman_al_rashdi.png`, `ali_rashid_al_hajri.png`, `habib_al_rawahi.png`, `selvaganapathi_v.png`.

---

## 📋 Excel column mapping (Sheet1)

The paste/upload reads these columns by position:

| Excel column | Used for |
|---|---|
| B — Company | Company |
| C — Certificate Number | Certificate No |
| D — Category | Qualification |
| E — Issue To | Name |
| F — Emp Number | Id No |
| G — Issue Date | Assessment Date |
| H — Valid Till | Valid Until |
| L — QR Prompt | QR code content |

> **Venue** is not in Sheet1, so it stays a manual field (default “Ghala – Sultanate of Oman”). Edit it per certificate if needed.

Dates may be `dd.mm.yyyy` (as in your sheet) or `yyyy-mm-dd`; both render as e.g. “14ᵗʰ January 2026”.

---

## 📁 Project structure

```
.
├── index.html              # Form + live preview UI
├── certificate.js          # Rendering engine, Excel parsing, crop, PDF export
├── verify.html             # Optional QR-scan verification page
├── .nojekyll               # Lets GitHub Pages serve /assets and /fonts as-is
├── fonts/                  # (Optional) drop licensed Univers font files here
├── assets/
│   ├── background.jpg       # Official certificate template
│   └── signatures/
│       ├── index.json       # name → signature-file map
│       └── sig_*.png        # the 7 assessor signatures
└── README.md
```

---

## 🚀 Deploy to GitHub Pages

1. Create a new repository, e.g. `operator-certificate`.
2. Upload everything from this folder (keep the `assets/`, `fonts/`, and `.nojekyll`).
3. Repo → **Settings → Pages**.
4. **Source:** Deploy from a branch → branch **`main`**, folder **`/ (root)`** → Save.
5. After ~1 minute it’s live at `https://<your-username>.github.io/<repo>/`.

---

## 🖥️ Run locally

Open it through a small web server (not by double-clicking), because it loads image/JSON files:

```bash
cd operator-certificate
python3 -m http.server 8000
# open http://localhost:8000
```

---

## ➕ Adding or changing assessors

1. Put the signature PNG (transparent background) into `assets/signatures/`, e.g. `sig_new_person.png`.
2. Add a line to `assets/signatures/index.json`:
   ```json
   { "New Person Name": "sig_new_person.png" }
   ```
3. Refresh — they appear in the Assessor dropdown.

---

## 📦 Libraries (loaded from CDN, no install needed)

- [jsPDF](https://github.com/parallax/jsPDF) — PDF generation
- [qrcodejs](https://github.com/davidshimjs/qrcodejs) — QR codes
- [SheetJS](https://sheetjs.com/) — reads uploaded `.xlsx`
- [Cropper.js](https://fengyuanchen.github.io/cropperjs/) — photo cropping

---

## ⚠️ Usage note

This tool reproduces an official TÜV Rheinland certificate layout. Use it only to issue certificates you are authorised to issue. The template and TÜV Rheinland marks remain the property of their owner.
