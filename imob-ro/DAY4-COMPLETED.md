Ziua 4 — Extensie Chrome + Bookmarklet

- Am adăugat un scaffold pentru extensia Chrome (Manifest V3):
  - `extensions/chrome/manifest.json` — MV3 manifest cu `action.default_icon` și `host_permissions` pentru `https://YOUR_DOMAIN/*` și `http://localhost:3000/*`.
  - `extensions/chrome/background.js` — service worker care injectează scriptul în pagină când se apasă butonul extensiei.
  - `extensions/chrome/inject.js` — content script care extrage titlu, preț, suprafață, camere, etaj, anul construcției, adresă, coordonate și imagini; trimite un POST JSON la `/api/analyze/client-push`.

- Am creat bookmarklet-ul minimificat în `public/bookmarklet.txt` care execută același extractor și postează la `https://YOUR_DOMAIN/api/analyze/client-push` (placeholder endpoint).

- Server: `src/app/api/analyze/client-push/route.ts` — endpoint care primește payload-ul client, upsertează `ExtractedListing` și creează/atașează un `Analysis` dacă este nevoie.

- Alte schimbări:
  - `extensions/chrome/icon.svg` — icon placeholder adăugat și referit în manifest.
  - mici corecții de lint/format pe scripturile injectate.

Status: Completed — bookmarklet updated to production endpoint and extension manifest updated to include icon and host permissions. Next: Ziua 5.
