# Élesítés — Railway (backend) + Vercel/Netlify (frontend)

Ez az útmutató a legegyszerűbb, kártyaadat-alapú felhő szolgáltatásokkal
számol (nincs saját szerver, nincs IT osztály). Két rész: backend (API +
adatbázis) és frontend (a felület).

> Megjegyzés: a felhő szolgáltatók felülete és árazása időről időre
> változik — ha valami máshol van a Railway/Vercel felületén, mint itt
> leírtam, a lényeg (env változók, volume, build parancsok) ugyanaz marad.

## 0. Előkészület: kód GitHub-ra

Mindkét szolgáltatás GitHub-repóból dolgozik a legegyszerűbben.

```bash
cd timesheet-app
git init
git add .
git commit -m "Kezdeti verzió"
```

Hozz létre egy privát repót a GitHub-on (pl. `timesheet-app`), majd:

```bash
git remote add origin https://github.com/<felhasznalonev>/timesheet-app.git
git push -u origin main
```

## 1. Backend — Railway

1. Regisztrálj a [railway.com](https://railway.com) oldalon, kösd össze a GitHub fiókoddal.
2. **New Project → Deploy from GitHub repo** → válaszd ki a repót.
3. Amikor rákérdez, a **Root Directory**-t állítsd `backend`-re (mivel a repo
   gyökerében van a `frontend` mappa is, a Railway-nek tudnia kell, melyik
   almappát futtassa).
4. **Environment Variables** (Service → Variables fül) — add hozzá:
   - `JWT_SECRET` — hosszú, véletlenszerű string (pl. generáld: `openssl rand -hex 32`)
   - `SEED_ADMIN_PASSWORD` — az admin kezdő jelszava
   - `DB_FILE` — `/data/timesheet.db` (lásd lent, miért ez az útvonal)
   - `CORS_ORIGIN` — egyelőre hagyd üresen, a 3. lépésben töltjük ki
   - a `PORT`-ot NEM kell beállítani, a Railway automatikusan adja, és a
     szerver kódja már ezt olvassa (`process.env.PORT`)
5. **Adattárolás (fontos!):** SQLite-fájlt használunk, ami alapból elveszne
   minden újratelepítéskor. Ezért a Service **Volumes** fülén adj hozzá egy
   Volume-ot, mount path: `/data`. Így a `DB_FILE=/data/timesheet.db` végig
   megmarad.
6. Deploy után nyisd meg a szolgáltatás nyilvános URL-jét (Settings →
   Networking → **Generate Domain**) — ez lesz a backended címe, pl.
   `https://timesheet-backend-production.up.railway.app`.
7. Futtasd le egyszer a seed scriptet a Railway CLI-vel:
   ```bash
   npm install -g @railway/cli
   railway login
   railway link        # válaszd ki a projekted
   railway run npm run seed
   ```
   Ez létrehozza az admin + minta felhasználókat az adatbázisban.

## 2. Frontend — Vercel (vagy Netlify)

1. Regisztrálj a [vercel.com](https://vercel.com) oldalon, GitHub-bal.
2. **Add New → Project** → válaszd ki ugyanazt a repót.
3. **Root Directory**: `frontend`
4. Build beállítások (a Vercel Vite-projektnél alapból felismeri, de ellenőrizd):
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. **Environment Variables**:
   - `VITE_API_URL` = a Railway backend URL-je + `/api`, pl.
     `https://timesheet-backend-production.up.railway.app/api`
6. Deploy. A Vercel ad egy nyilvános URL-t, pl.
   `https://timesheet-app.vercel.app` — ez lesz, amit a kollégák
   megnyitnak.

(Netlify-n ugyanez a logika: Base directory `frontend`, Build command
`npm run build`, Publish directory `frontend/dist`, és ugyanaz az env
változó.)

## 3. Kösd össze a kettőt (CORS)

Most, hogy megvan a frontend végleges URL-je, menj vissza a Railway
projekt **Variables** füléhez, és állítsd be:

```
CORS_ORIGIN=https://timesheet-app.vercel.app
```

Ez biztosítja, hogy az API tényleg csak a saját frontendedről fogadjon
kéréseket. A változtatás után a Railway automatikusan újraindítja a
szolgáltatást.

## 4. Éles ellenőrzőlista

- [ ] Minden alapértelmezett jelszó (admin, vezetők, dolgozók) meg lett
      változtatva az első bejelentkezés után
- [ ] `JWT_SECRET` valóban hosszú, véletlenszerű, és nincs verziókezelőben
- [ ] `CORS_ORIGIN` be van állítva a tényleges frontend-URL-re
- [ ] A Railway Volume létrejött, és a `DB_FILE` arra mutat
- [ ] Kipróbáltad az egész folyamatot: bejelentkezés → napi bejegyzés →
      jóváhagyás → export — élesben, nem csak helyben
- [ ] Van valamilyen mentési terv az adatbázisra (lásd lent)

## 5. Adatmentés (backup)

SQLite-fájllal dolgozunk, ami egyetlen fájl — ez egyszerűsíti a mentést,
de neked kell megoldanod, mert a Railway nem készít automatikus mentést
belőle. Két egyszerű lehetőség:

- **Kézi mentés időnként:** Railway CLI-vel bármikor letöltheted a volume
  tartalmát (`railway volume` parancsok, vagy a dashboardról).
- **Automatikus mentés:** egy kis "cron service" a Railway-en, ami
  naponta lemásolja a `.db` fájlt egy külső tárhelyre (pl. S3-kompatibilis
  tárolóba). Szólj, ha ezt szeretnéd, és összerakom.

Ha a csapat mérete/az adat fontossága indokolja, hosszabb távon érdemes
lehet SQLite helyett Railway managed PostgreSQL-re váltani — az
automatikus mentéssel, jobb konkurenciakezeléssel jár. Ez nem sürgős
most, de jelezd, ha ezt az utat választanátok, és átalakítom hozzá a
backendet.
