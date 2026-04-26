# ClinBridge - Project Scope and Roadmap

## 1. Projenin Gercek Amaci

Bu proje bir AI model egitme projesi degil. Esas urun:

- muhendisler ile saglik profesyonellerini bulusturan,
- guvenli ilk temas saglayan,
- fikir detaylarini kontrollu bicimde koruyan,
- toplanti organizasyonunu yapilandirilmis hale getiren,
- partner bulundugunda ilani kapatan

bir web platformudur.

## 2. In-Scope

Zorunlu cekirdek moduller:

- Kurumsal e-posta ile kayit
- E-posta dogrulama
- Role-based access control
- Post olusturma, draft kaydetme, publish etme, duzenleme
- Post lifecycle: draft, active, meeting_scheduled, partner_found, expired
- Search ve filtering
- City-based matching
- Meeting request + NDA kabul + time slot akisi
- Admin paneli
- Activity logs + CSV export
- Profile edit
- Account deletion
- Data export
- Notifications

## 3. Out-of-Scope

Acikca yapilmamasi gerekenler:

- patient data saklamak
- teknik dosya yuklemek
- file repository mantigi
- platform icinde Zoom/Teams benzeri gorusme yapmak
- contract management
- payment veya finansal akis
- medical advice uretmek

## 4. Kullanici Rolleri

### Engineer

- post acar
- healthcare partner arar
- gelen ilgiyi ve meeting requestleri yonetir
- partner bulunca postu kapatir

### Healthcare Professional

- post acabilir
- engineer postlarini inceleyebilir
- ilgi gosterebilir
- toplanti surecini baslatabilir

### Admin

- kullanicilari gorur
- postlari moderasyon eder
- activity loglari ve istatistikleri gorur
- CSV export alir



Kurulan teknoloji:

- React + Vite frontend
- Express backend
- JSON tabanli dev persistence
- Docker Compose hazirligi
- PostgreSQL hedef mimarisi

Ilk calisan MVP ozellikleri:

- register / verify / login akisi
- role bazli demo kullanicilari
- post feed
- filtreleme
- post create / edit / status change
- meeting request gonderme
- owner tarafinda kabul / red / confirm
- profile update
- data export
- account delete flow
- admin users / posts / logs / CSV export
- notifications

## 7. Hemen Sonraki Iterasyon

Siradaki en mantikli teknik adimlar:

1. JSON store yerine PostgreSQL katmanina gecmek
2. API modullerini route / service / repository olarak ayirmak
3. Form validasyonunu guclendirmek
4. Auth tarafinda gercek session veya JWT yapmak
5. Admin dashboard istatistiklerini genisletmek
6. Notification akisini zenginlestirmek
7. SRS_V1 ve SDD_V1 dokumanlarini bu kodla esit hale getirmek
