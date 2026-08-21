# Nivaran AI Frontend — Intelligent Civic Resolution
### SW-15 — AI-Powered Citizen Grievance Resolution Platform

**Teen dashboards, ek app, ek shared state.** Citizen jo karta hai wo officer ke board pe
aur admin ke leaderboard pe turant dikhta hai — role switch karke live prove kar sakte ho.

---

## Chalao

```bash
npm install
npm run dev          # http://localhost:5173
```

Fully offline chalta hai. No backend, no API key, no wallet, **no login**.
Navbar ke top-right me `Switch Role` dropdown hai — Citizen / Ground Officer / City Commissioner.

> Node 18+. **`npm install` venue jaane se pehle ghar pe chala lena.**

---

## Teen dashboards

### 1 · Citizen Portal — `/citizen` 🟢
Mobile-first. Desktop pe bhi **phone frame ke andar** render hota hai, so judge ko turant samajh
aata hai ki ye public ka app hai. Inspect-element karke mobile view banane ki zarurat nahi.

- Bada mic button — Chrome me **real Web Speech API** (hi-IN), baaki browsers me simulated dictation
- Photo upload with geotag chip
- 8-stage AI pipeline live chalti hai
- `/citizen/track` — **My Grievances** + the trap: *"Nahi hua — Re-open & Escalate"*

### 2 · Ground Officer — `/officer` 🟠
Kanban board: **To-Do / In Progress / Done**.

- SLA countdown har card pe — *"Breaches in 4h"*, red jab breach ho jaye
- **Start work** → **Mark resolved + proof** (photo upload modal)
- Resolve karne pe status `closed_unverified` hota hai — **closed nahi**
- Reopened tickets To-Do me wapas aate hain red *"Reopened by citizen"* badge ke saath

### 3 · City Commissioner "God Mode" — `/admin` 🔵
Aapka 70% pitch time yahan.

- Cluster map (MapLibre) — same problem ke complaints ek badi dot ban jaate hain
- **`Show Blind Spots` toggle** — ek click me map un wards ko red kar deta hai jahan se
  complaints aa hi nahi rahi. **8 blind-spot wards** synthetic data me intentionally daale hain
  (Musakhedi 86%, Khajrana 83%, Banganga 82%, Chandan Nagar 75%…)
- **Officer Integrity Leaderboard** — worst-first sorted. Jiski tickets citizens baar-baar
  reopen karte hain, wo top pe red me
- `/admin/silence` — full equity analysis · `/admin/assets` — repeat-failure graph ·
  `/admin/chain` — on-chain audit (is session ke events *"this session"* badge ke saath highlight hote hain)

---

## Demo script — 3 minutes, role switching is the spine

**Ye exact order chalao. Har step ka asar agle role me pehle se maujood hoga.**

1. **Citizen** (`/citizen`) — mic dabao, bolo:
   > *"Mere ghar ke paas transformer jal gaya hai, spark bhi ho raha hai"*

   Pipeline chalti hai → ticket ban jaata hai, asset se bind, officer ko routed. **~8 seconds.**

2. **Switch Role → Ground Officer.** Wahi ticket **To-Do** column me sabse upar pinned hai.
   `Start work` → `Mark resolved + proof` → koi bhi photo upload karke submit.
   Bolo: *"Har dusra system yahan ruk jaata hai aur ticket closed maan leta hai."*

3. **Switch Role → Citizen → My Grievances.** Verification pehle se wait kar rahi hai.
   Tap: **"Nahi hua — Re-open & Escalate"**

   Turant dikhta hai: ticket reopen, priority CRITICAL, Zonal Officer ko escalate,
   recycled proof photo detect, officer ka integrity score gira.

4. **Switch Role → City Commissioner.** Leaderboard me wo officer ab neeche gir chuka hai.
   Bolo: *"Officer ka apna record officer edit nahi kar sakta. Ye chain pe hai."*

5. **`Show Blind Spots` toggle dabao.** Ye closer hai:
   > *"Yahan har team sabse zyada shor karne walon ke liye optimize kar rahi hai.
   > Hamara system unhe dhoondhta hai jinhone shikayat karna hi chhod diya."*

6. (Sirf agar judge pooche *"blockchain kyun?"*) → `/admin/chain` → `escalate()` dikhao.
   No `onlyOwner`, no `pause()`. SLA toota to escalation ko **koi bhi** trigger kar sakta hai —
   hum bhi nahi rok sakte.

**Step 5 ki transition practice karo.** Wahi jeetne wala moment hai.

---

## Backend jodna (jab ready ho)

UI kabhi bhi mock data ko directly import nahi karta — sab kuch `src/lib/api.js` se jaata hai.

```bash
cp .env.example .env    # VITE_DATA_MODE=live
```

| Method | Route | Returns |
|---|---|---|
| `GET`  | `/api/grievances?ward=&category=&priority=&status=` | `Grievance[]` |
| `GET`  | `/api/wards/silence` | `Ward[]` with `expected`, `actual`, `gap`, `status` |
| `GET`  | `/api/officers` | `Officer[]` |
| `GET`  | `/api/assets` | `Asset[]` |
| `GET`  | `/api/chain/log` | `ChainEvent[]` |
| `GET`  | `/api/stats` | KPIs + `trend[]` + `categorySplit[]` |
| `POST` | `/api/grievances` | full pipeline → created `Grievance` |
| `POST` | `/api/grievances/:id/close` | officer resolves → `closed_unverified` |
| `POST` | `/api/grievances/:id/verify` | citizen callback → `verified_resolved` \| `reopened` |

Object shapes `src/lib/mockData.js` me hain — **usko hi API schema maano.**
Vite already `/api` → `http://localhost:4000` proxy karta hai.
**Ek-ek route karke migrate karo** — baaki mock pe chalte rahenge.

Tumhare plan ke hisab se Python microservice ki zarurat nahi:
Whisper/Groq aur Claude dono ko Node se hi HTTP call kar lo, MongoDB me save karo.

---

## Architecture — ye lines pitch me bolna

- **MongoDB state hai, chain notary hai.** UI kabhi chain se app data nahi padhta.
- **Atlas do kaam karta hai** — `$geoNear` geo-clustering ke liye *aur* `$vectorSearch`
  semantic dedup ke liye. Ek hi query: *"is complaint jaisi shikayatein, 200m ke andar, pichhle 72 ghante me."*
  Wahi tumhara incident-clustering feature hai. Pinecone/PostGIS ki zarurat nahi.
- **Harm score auditable hai**, LLM ka "high" nahi: category base harm × school/hospital
  proximity (OSM) × time of day × reporting velocity × asset recurrence.
- **Chain pe zero PII** — sirf hashes. Off-chain record delete karo, on-chain hash 32
  bekaar bytes ban jaata hai. Isi se DPDP Act ka right-to-erasure satisfy hota hai.
  **Judge ke poochne se pehle ye bolna** — maturity dikhti hai.
- **Basemap pe koi API token nahi** (Carto free style) — demo ke beech kuch expire nahi hoga.

---

## Time khatam ho raha ho to

Kaato is order me: **blockchain → SLA prediction → asset graph.**

**Kabhi mat kaatna:** voice intake, incident clustering, Silence Detector, ghost-resolution catch.
Yahi chaar cheezein poori pitch hain.

---

## Structure

```
src/
├── store/AppStore.jsx      # teeno dashboards ka shared state — demo ki reedh ki haddi
├── roles.js                # role switcher config (no auth, by design)
├── lib/
│   ├── mockData.js         # synthetic corpus + silence model — yahi API schema hai
│   ├── api.js              # UI sirf yahan se data leta hai. mock ↔ live switch yahan.
│   └── utils.js
├── components/
│   ├── Layout.jsx          # navbar + Switch Role dropdown + cross-role toast
│   ├── PhoneFrame.jsx      # citizen ko phone me render karta hai
│   ├── MapView.jsx         # IncidentMap (clusters) + WardMap (blind spots)
│   └── ui.jsx
└── pages/
    ├── citizen/            # CitizenPortal, CitizenTrack
    ├── officer/            # OfficerBoard (kanban)
    └── admin/              # GodMode, SilenceDetector, AssetIntelligence, ChainAudit
```

Squid Hack ke liye banaya, 22 Aug 2026.
