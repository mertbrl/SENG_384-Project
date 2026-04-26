# ClinBridge Co-Creation Platform

SENG 384 projesi icin sifirdan kurulan full-stack uygulama iskeleti.

## Teknoloji Secimi

- Frontend: React + Vite
- Backend: Express
- Dev veri katmani: JSON tabanli kalici store
- Hedef deploy mimarisi: Docker Compose + PostgreSQL

## Baslangic

```bash
npm install
npm run dev
```

Frontend `http://localhost:5173`, backend `http://localhost:5000` adresinde calisir.

## Demo Hesaplari

- Admin: `admin@healthai.edu` / `Admin123!`
- Engineer: `engineer@hacettepe.edu.tr` / `Engineer123!`
- Healthcare: `doctor@ankaramed.edu.tr` / `Doctor123!`

## Not

Docker Desktop su anda bu ortamda kurulu gorunmedigi icin uygulama once yerel gelistirme modunda calisacak sekilde hazirlandi. `docker-compose.yml` ve Dockerfile'lar sonraki adimda dogrudan tamamlanabilecek yapida eklendi.
