This folder contains the licensed Univers font used by the certificate
generator (provided by the site owner).

  Univers.ttf          - regular weight (preview + PDF)
  Univers-Bold.ttf     - bold weight
  Univers.ttf.b64      - base64 of Univers.ttf, embedded into the PDF by jsPDF
  Univers-Bold.ttf.b64 - base64 of Univers-Bold.ttf

Univers is a commercial font. Keep these files within your licensed use
and do not redistribute them publicly.

To replace the font, drop in new .ttf files and regenerate the .b64 files:
  base64 -w0 Univers.ttf > Univers.ttf.b64
  base64 -w0 Univers-Bold.ttf > Univers-Bold.ttf.b64
