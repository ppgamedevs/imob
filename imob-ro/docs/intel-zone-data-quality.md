# Zone intel: data quality vs „lipsuri” (refactor)

## Before vs after (logic)

| Before | After |
|--------|--------|
| Lista „Lipsuri zona” + „Impact ridicat” pe baza mesaje de tip „0 magazine în OSM” | Secțiune **„Calitatea datelor despre zona”** + badge **Calitate date zona: Scăzută/Medie/Ridicată** |
| `redFlags[]` cu texte defensive lungi | `redFlags` rămâne gol (compat API); nu mai afișăm concluzii negative din lipsă OSM |
| Scoruri foarte joase la POI puține (pedepsire imobil) | **LOW_DATA_MODE**: înmuiere spre neutru + etichetă **„Estimare incertă”** pe comoditate/familie/walkability |
| Clasificare zonă folosea `redFlags.length` pentru „stagnantă” | Eliminat; ajustare încredere când `lowDataMode` |

## LOW_DATA_MODE — detecție

În `computeZoneDataQuality(categoryCounts)` (`intelScoring.ts`):

- `totalPois` = suma POI pe toate categoriile în raza cerută.
- `emptyCategoryCount` = categorii cu 0 rezultate (din cele 8 standard).

`lowDataMode = true` dacă:

- `totalPois < 10`, **sau**
- `emptyCategoryCount >= 5`, **sau**
- `totalPois < 22` și `emptyCategoryCount >= 4`, **sau**
- `totalPois < 16` și `emptyCategoryCount >= 3`.

**Nivel calitate** (`scazuta` / `medie` / `ridicata`): derivat din `totalPois` și `emptyCategoryCount` (praguri în același helper).

## UI (tab „Scoruri” / `IntelScoreCards`)

1. Titlu: **Calitatea datelor despre zona** + rezumat numeric (puncte totale, categorii populate).
2. Carduri scor: pentru comoditate / familii / walkability, dacă `uncertainScores.*`, afișăm **„Estimare incerta”** în loc să sugerăm precizie falsă.
3. Dacă **LOW_DATA_MODE**: panou **„Vizibilitate redusa asupra zonei”**, badge **Date limitate**, bullet-uri scurte (ce înseamnă / ce poți face).
4. Dacă acoperire **puternică** (`strongCoverageMode`): **„Facilitati identificate in zona”** cu număr POI pe categorii + max. 2 insight-uri pozitive.
5. Altfel: o singură linie neutră (OSM parțial).

## Scoring / încredere (efecte laterale)

- `softenUncertainScore`: amestec `raw` cu 50 pentru comoditate, familii, walkability când `lowDataMode`.
- `nightlifeRisk` **nu** este marcat incert (semnal invers: lipsă baruri = liniște, rămâne interpretabil).
- `classifyZone`: fără penalizare „0 școli” dacă `lowDataMode`; coborâre treaptă încredere dacă date slabe; avertisment deschis despre tip zonă orientativ.

## Eliminat

- Panoul „Lipsuri zona”, badge-uri „Impact ridicat/mediu/redus” legate de `redFlags`.
- Generarea mesajelor `computeRedFlags` (liste „0 X în OSM”).
- Bonus stagnanță pe `redFlags.length`.
- Comparație A/B pe „Lipsuri zona” → înlocuită cu **„Acoperire POI (OSM)”** (total POI).

## Cache API

- Cheie snapshot `intel-v2` → `intel-v2b` pentru a invalida payload-uri vechi fără `zoneDataQuality`.

## Încredere produs

Separăm explicit: **„nu știm din hartă”** vs **„zona e rea”**; nu mai prezentăm incertitudinea ca verdict negativ despre proprietate.
