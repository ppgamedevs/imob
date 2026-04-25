# Real listing extraction — manual QA matrix (RO portals)

Folosește **URL-uri reale, stabile, introduse manual** (nu le comita în repo). Scop: verifici că pipeline-ul (extract → `POST /api/analyze` → raport) se comportă ok pe fiecare portal suportat.

## Cum testezi (placeholder)

1. Alege câte o pagină de detaliu de vânzare – apartament, pentru fiecare portal.
2. Completează tabelul de mai jos (HTTP status, măsori lungimea HTML salvată local, etc.).
3. Rulează analiza; notează `analysisId`, status, `comp` și încrederea din raport.
4. Verifică **sellability** / **risc** în admin:  
   - `/admin/report-quality` (comercial)  
   - `/admin/data-quality` (agregate)

## Sugestie de comanda `curl` (localhost)

Setează `URL_ANUNT` în shell (nu în fișier). Exemplu:

```bash
# PowerShell: $env:URL_ANUNT = "https://www.example.com/..."
# bash: export URL_ANUNT="https://www.example.com/..."

curl -sS -X POST "http://localhost:3000/api/analyze" ^
  -H "Content-Type: application/json" ^
  -d "{\"url\": \"%URL_ANUNT%\"}"
```

(În `bash` folosește un singur rând fără `^` și cu ghilimele potrivite.)

Răspunsul tipic conține `analysisId` sau redirect către coadă; deschide `/report/{analysisId}` după ce statusul e `done`.

## Matrice

| Portal | Test URL (placeholder) | Tip așteptat | HTTP | html length | title | preț | suprafață | camere | poze | lat/lng | status analiză | comp count | confidență | sellability | note |
|--------|------------------------|--------------|------|---------------|-------|------|-----------|--------|------|---------|---------------|------------|------------|------------|------|
| imobiliare.ro | `SET_MANUALLY` | vânzare apartament, detaliu | | | | | | | | | | | | | |
| storia.ro | `SET_MANUALLY` | vânzare apartament, detaliu | | | | | | | | | | | | | |
| olx.ro | `SET_MANUALLY` | vânzare apartament, detaliu | | | | | | | | | | | | | |
| publi24.ro | `SET_MANUALLY` | vânzare apartament, detaliu | | | | | | | | | | | | | |
| lajumate.ro | `SET_MANUALLY` | vânzare apartament, detaliu | | | | | | | | | | | | | |
| homezz.ro | `SET_MANUALLY` | vânzare apartament, detaliu | | | | | | | | | | | | | |

## Note

- Dacă un portal schimbă des structura HTML, păstrați acest document ca **sablon** și păstrați URL-urile de test doar local sau în notițe private.
- Pentru comparații automate în CI, preferă snapshot-uri de HTML salvate **în artefacte de build securizate**, nu în git.
