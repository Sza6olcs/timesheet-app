# Időnyilvántartó és jóváhagyó rendszer — teljes verzió

Ez a csomag egy valódi, futtatható rendszer: külön **backend** (Node.js + Express +
SQLite, jelszavas bejelentkezéssel, JWT-vel) és **frontend** (React + Vite), amelyek
valós HTTP API-n keresztül kommunikálnak.

```
timesheet-app/
  backend/     ← REST API + SQLite adatbázis
  frontend/    ← React felület (Vite)
```

## 1. Backend elindítása

```bash
cd backend
npm install
cp .env.example .env
```

Nyisd meg a `.env` fájlt, és:
- állíts be egy hosszú, véletlenszerű `JWT_SECRET` értéket,
- igény szerint módosítsd a `SEED_ADMIN_PASSWORD` értéket (ez lesz az admin kezdő jelszava).

Ezután hozd létre az adatbázist és az induló felhasználókat:

```bash
npm run seed
```

Ez létrehoz 8 mintafelhasználót (1 admin, 2 csoportvezető, 5 dolgozó). A pontos
bejelentkezési adatokat a script kiírja a terminálba, alapértelmentetten:

| Kód     | Szerepkör       | Jelszó           |
|---------|-----------------|-------------------|
| E-1001  | Admin           | a `.env`-ben megadott |
| E-1002  | Csoportvezető   | `supervisor123`  |
| E-1003  | Csoportvezető   | `supervisor123`  |
| E-1004…E-1008 | Dolgozó   | `employee123`     |

**Fontos: első bejelentkezés után mindenki változtassa meg a jelszavát** (erre az
API-ban van végpont: `POST /api/auth/change-password`; a felületre később
egyszerűen felvehető egy "jelszóváltás" gomb).

Indítsd el a szervert:

```bash
npm start
```

Az API ekkor a `http://localhost:4000/api` címen érhető el.

## 2. Frontend elindítása

Új terminálban:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

A `.env`-ben a `VITE_API_URL` alapértelmezetten `http://localhost:4000/api` —
ha a backendet más porton vagy szerveren futtatod, itt írd át.

A felület ekkor elérhető: `http://localhost:5173`

## 3. Amit ez a verzió már valóban tud

- **Valós jelszavas bejelentkezés**, bcrypt-tel titkosított jelszavakkal, JWT munkamenettel.
- **Valós SQLite adatbázis** (fájl: `backend/data/timesheet.db`) — nem vész el
  böngésző-bezáráskor, és több felhasználó egyszerre, valóban elkülönítve
  dolgozhat vele.
- **Szerepkör-alapú jogosultság szerveroldalon** — nem csak a felületen van
  elrejtve, hanem az API is elutasítja az illetéktelen kéréseket.
- **Felhasználók hozzáadása/eltávolítása** — admin funkció, jelszóval induló
  fiókot hoz létre; eltávolításkor a felhasználó inaktiválódik (a korábbi
  bejegyzései és az auditnapló megmarad, ahogy egy éles rendszerben elvárt).
- **Szerkeszthető napidíj** — az Export nézetben módosítható, azonnal
  elmentődik az adatbázisba.
- **Auditnapló és jóváhagyás utáni javítás** — szerveroldalon naplózva,
  meghamisíthatatlanul (a kliens nem tudja megkerülni).
- **Havi export CSV/XLSX** — a szerver generálja és küldi a fájlt, nem a böngésző.

## 4. Amit még érdemes hozzátenni éles bevezetés előtt

Ez most egy **teljesen működő, de még nem "production-hardened"** rendszer.
Élesítés előtt javasolt:

1. **HTTPS** — a szervert egy reverse proxy (pl. Nginx, Caddy) mögé érdemes
   tenni TLS-tanúsítvánnyal, hogy a jelszavak és a JWT token ne menjenek
   titkosítatlanul a hálózaton.
2. **Erősebb `JWT_SECRET`** és a `.env` fájl biztonságos tárolása (soha ne
   kerüljön verziókezelőbe).
3. **Jelszó-erősségi szabályok és jelszó-emlékeztető/reset folyamat**
   (jelenleg az admin ad kezdő jelszót, saját jelszóváltásra van végpont,
   de "elfelejtett jelszó" folyamat még nincs).
4. **Adatbázis mentés** — a `backend/data/timesheet.db` fájlt rendszeresen
   biztonsági mentésbe kell tenni (pl. cron + fájlmásolás, vagy átállás
   PostgreSQL-re, ha több szerverpéldány fut egyszerre).
5. **Hosting** — a backend bármilyen Node.js-t futtató szerveren elindítható
   (pl. saját szerver, Render, Railway, Fly.io); a frontendet `npm run build`
   után egy statikus tárhelyre (pl. Vercel, Netlify, vagy ugyanaz a szerver)
   érdemes feltenni.
6. **Monitoring/naplózás** — hibakövetés (pl. Sentry) és szerver-log gyűjtés
   hozzáadása, hogy éles hibák észlelhetők legyenek.

## 5. API áttekintés

| Végpont | Módszer | Kinek | Leírás |
|---|---|---|---|
| `/api/auth/login` | POST | mindenki | bejelentkezés kóddal + jelszóval |
| `/api/auth/change-password` | POST | bejelentkezett | saját jelszó módosítása |
| `/api/employees` | GET | bejelentkezett | felhasználók listája |
| `/api/employees` | POST | admin | új felhasználó felvétele |
| `/api/employees/:id` | DELETE | admin | felhasználó inaktiválása |
| `/api/entries` | GET | bejelentkezett | saját / csapat / összes bejegyzés (szerepkör szerint szűrve) |
| `/api/entries` | POST | dolgozó | új bejegyzés (piszkozat vagy beküldés) |
| `/api/entries/:id` | PATCH | dolgozó (saját) | piszkozat/visszaküldött bejegyzés szerkesztése |
| `/api/entries/:id/approve` | POST | vezető/admin | jóváhagyás |
| `/api/entries/:id/return` | POST | vezető/admin | visszaküldés indoklással |
| `/api/entries/:id/correct` | POST | vezető/admin | jóváhagyás utáni javítás, audit-naplózással |
| `/api/audit-log` | GET | vezető/admin | auditnapló |
| `/api/settings` | GET/PUT | bejelentkezett / admin | napidíj, havi várható óraszám |
| `/api/export/csv`, `/api/export/xlsx` | GET | admin | havi elszámolási export |
