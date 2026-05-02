# ClinBridge Co-Creation Platform

SENG 384 projesi icin sifirdan kurulan full-stack uygulama iskeleti.

## Teknoloji Secimi

- Frontend: React + Vite
- Backend: Express
- Veri katmani: PostgreSQL + Prisma ORM
- Yerel / deploy: Docker Compose (opsiyonel), `docker-compose.yml`

## Baslangic

Kok dizinde:

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:5173` (Vite; `/api` istekleri Vite proxy ile backend’e gider).
- Backend portu: `backend/.env` icindeki `PORT` (ornek: `5000` veya `5001`). Frontend proxy’sinin bu portla eslesmesi gerekir (`frontend/vite.config.js`).

PostgreSQL ayakta olmali; baglanti `backend/.env` icindeki `DATABASE_URL` ile yapilir. Docker kullaniyorsan ornek: `docker compose up -d db`, ardindan migration:

```bash
cd backend
npm run db:migrate
npm run db:seed
```

## Demo Hesaplari

`npm run db:seed` ile olusturulan kullanicilar (`backend/prisma/seed.js`):

- Admin: `admin@healthai.edu.tr` / `Admin123!`
- Engineer: `engineer@itu.edu.tr` / `Engineer123!`
- Healthcare: `doctor@hacettepe.edu.tr` / `Doctor123!`

## Veritabani ve Kayitlarin Kaliciligi

- Normal gelistirmede **uygulama her acilista veritabanini silmez**; kayit olan kullanicilar, ilanlar ve audit loglar PostgreSQL’de kalir.
- Semaya yeni migration eklerken: `cd backend && npm run db:migrate` (`prisma migrate dev`).
- Uretim benzeri ortamda sadece: `npm run db:migrate:prod` (`prisma migrate deploy`).

**Tam veritabani silme (dikkat):** Eski `npm run db:reset` script’i **bilerek kaldirildi**; yanlislikla tum veriyi silmeyi zorlastirmak icin. Yine de sifirdan kurulum veya bozuk migration durumunda, bilincli olarak terminalden `npx prisma migrate reset` calistirilabilir — bu komut **tum tablolari bosaltip** migration’lari bastan uygular (kayitlar ve loglar **kalici olarak silinir**). Sunum veya gercek veri oncesinde bu komutu kullanmayin; gerekirse once `pg_dump` ile yedek alin.

## Not

`docker-compose.yml` ile veritabani ve istege bagli tum stack ayaga kaldirilabilir. Docker kullanmiyorsan yerel PostgreSQL + yukaridaki `DATABASE_URL` yeterlidir.

## Sorun giderme

### Vite: `Failed to resolve import "react-hot-toast"`

`package.json` icinde paket varsa bile, **Docker imaji** eski kalmissa veya `node_modules` senkron degilse bu hata cikabilir.

- Yerel: `cd frontend && npm install`
- Docker: frontend servisini yeniden derle: `docker compose build frontend --no-cache` (veya kok dizinde compose dosyaniza gore), sonra `docker compose up -d frontend`

### E-posta dogrulama: “User not found” / token calismiyor

- **Veritabani resetlendiyse** o kullanici ve token silinmistir; eski maildeki link veya token **gecersiz**dir. Ayni e-posta ile **yeniden kayit** ol veya **Resend token** ile yeni mail al.
- **Resend** kullandiktan sonra onceki maildeki link **iptal** olur; her zaman en son gelen maildeki link veya tokeni kullan.
- Tokeni yapistirirken bas/sonda bosluk veya satir sonu gelmesin diye uygulama tokeni normalize eder; yine de **tam 64 karakterlik** hex tokeni kopyaladiginizdan emin olun.

Dogrulama linki `BACKEND_PUBLIC_URL` + `/api/auth/verify-email?token=...` uzerinden calisir; maildeki host’un calisan backend ile **aynı veritabanina** isabet ettiginden emin olun (yerel / Docker karisikligi).
