Extension packaging / domain placeholder

- The extension and bookmarklet currently include the placeholder `YOUR_DOMAIN` for the production endpoint.
- Before packaging or publishing the extension, replace `YOUR_DOMAIN` with your real domain (or update `host_permissions` and the endpoint in `inject.js`).

Quick steps to prepare for release:

1. Replace `YOUR_DOMAIN` with your real domain in:
   - `extensions/chrome/manifest.json` (host_permissions, name/description if desired)
   - `extensions/chrome/inject.js` (the `endpoint` constant)
   - `public/bookmarklet.txt` (the fetch URL inside the bookmarklet)

2. Build a zip of `extensions/chrome/` and upload to the Chrome Web Store (or load unpacked for testing).

3. Optionally set `NEXT_PUBLIC_ANALYZE_ENDPOINT` in your webapp hosting to the same endpoint so client code can reuse it via `src/lib/config.ts`.
