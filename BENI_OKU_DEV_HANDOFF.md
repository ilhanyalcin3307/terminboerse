# TerminBoerse.at - DEV HANDOFF (Mola Sonrasi Buradan Devam)

Son guncelleme: 2026-08-13
Durum: Aktif, production canli (Meistgesuchte Ärzte ranking + Supabase view-counter persistence deploy edildi)

## 0) Son Session Delta (2026-08-19) - Live-Ranking Duzeltmesi
- Problem: Ana sayfadaki "Live-Ranking" toplam profil goruntulemelerine gore siralaniyor, eski kayitlari ve profil degisikliklerinden onceki ad/adres bilgisini gosterebiliyordu.
- Duzeltme:
   - Ranking artik yalnizca son 24 saatteki gercek profil goruntulemelerini siraliyor.
   - Liste goruntulenmeleri ranking zamanini yenilemiyor.
   - Ranking API, doktor detay ve liste sayfalariyla ayni custom-profile merge mantigini kullaniyor; kayitli yeni ad/adres gorunuyor.
   - Ana sayfa etiketi "Letzte 24 Stunden" olarak netlestirildi.
- Dosyalar: lib/doctorCommunity.ts, app/api/doctors/top-viewed/route.ts, components/landing/LandingPage.tsx

## 1) Proje Ozeti
- Proje: TerminBoerse.at
- Stack: Next.js 16 (App Router), TypeScript, Tailwind v4
- Paket yoneticisi: npm
- Ana kaynak veri: data/doctors.json (Wien GeoJSON)
- Ana alan: /arzt (doktor rehberi)

## 2) Canli Ortam / Deploy Bilgisi
- Production domain: https://www.terminboerse.at
- Vercel project name: terminboerse
- Vercel project id: prj_wspXcpimBVQf6kl8DGeuBc2QO46J
- Vercel org id: team_ftvVcjINKJpbanL2F2bWH0um
- GitHub repo: https://github.com/ilhanyalcin3307/terminboerse
- Aktif branch: main
- Son commit (bu not yazilirken): 0280cd5

## 3) Calistirma / Test Komutlari
- Local dev: npm run dev
- Lint: npm run lint
- Build: npm run build
- Production deploy: vercel --prod --yes

## 4) Mimari (Su Anki)
### 4.1 Ortak Header/Footer
- Tum sayfalarda tek shell kullaniliyor.
- Dosya: components/layout/SiteShell.tsx
- Root layout icinde global sarim var.
- Dosya: app/layout.tsx

### 4.2 Doktor Listeleme Performans Refactor'u
- Eskiden tum doktorlar browser'a tek seferde geliyordu.
- Simdi server-side filtreleme + pagination var.
- API: app/api/doctors/route.ts
- Client liste: components/arzt/ArztDirectory.tsx

Su anki API davranisi:
- Query paramlari: q, district, specialty, page, pageSize
- Varsayilan pageSize: 24
- Maksimum pageSize: 60
- Donen yapi: doctors + pagination + facets + stats

### 4.3 Arama/Filtre Mantigi
- Smart parse mevcut (ornek: 03. Bezirk, Orthopaedie/Ortopedi)
- Tokenized text search mevcut
- Input'a yeni metin yazinca dropdownlar Alle'ye donuyor

## 5) Onemli Dosyalar (Nerede Ne Var)
- Ana sayfa: app/page.tsx
- Landing UI: components/landing/LandingPage.tsx
- Doktor liste sayfasi: app/arzt/page.tsx
- Doktor detail: app/arzt/[id]/page.tsx
- Doktor verisi normalize/helper: lib/doctors.ts
- Doktor API (filtre/pagination): app/api/doctors/route.ts
- Lead API (mail): app/api/lead/route.ts
- Mock lead API: app/api/leads/route.ts
- Analytics helper: lib/analytics.ts

## 6) Env Degiskenleri (Bilinen)
- RESEND_API_KEY
- RESEND_FROM_EMAIL
- LEAD_FALLBACK_EMAIL
- NEXT_PUBLIC_SITE_URL

Not:
- RESEND_API_KEY yoksa app/api/lead simulated response doner (email atmaz, log atar).

## 7) Son Tamamlanan Isler
1. /arzt performans iyilestirme
   - Server-side filtering
   - Pagination
   - Daha dusuk payload + daha az DOM yükü
2. Tum sayfalarda tek header/footer
3. Landing hero sade metin + secime gore doktor sayisi
4. Filtre bug fix (default Alle, smart parse, tokenized match)
5. UI Almanca lokalizasyon duzeltmesi
   - Ekrandaki metinlerde oe/ae/ue yazimlari uygun sekilde ö/ä/ü/ß olarak guncellendi
   - Branding gorunumu TerminBoerse.at yerine Terminbörse.at olacak sekilde duzeltildi
   - URL ve teknik degisken adlari (terminboerse.at) bilincli olarak ayni birakildi
6. Homepage SEO + conversion genisletmeleri
   - Beliebte Suchen in Wien (Quick Links) bolumu eklendi
   - Termin-Alarm lead capture kutusu eklendi
   - B2B banner (Für Ärztinnen & Ärzte) eklendi
   - 4 maddelik FAQ bolumu + FAQPage JSON-LD eklendi
7. SEO title + AI discoverability guclendirme
   - Baslik guncellendi: "Arzttermin Wien: Kurzfristige Termine heute | Terminbörse.at"
   - Metadata guclendirildi: canonical, OpenGraph, Twitter, keywords, robots
   - JSON-LD eklendi: Organization + WebSite (SearchAction) + WebPage + FAQPage
8. Google Search Console HTML verification eklendi
   - app/layout.tsx icinde metadata.verification.google tanimlandi
   - Token canliya deploy edildi
9. Search Console dogrulama hatasi root-cause analizi tamamlandi
   - Domain Property yontemi icin DNS TXT zorunlu oldugu teyit edildi
   - Mevcut HTML meta tag yontemi URL-Prefix property icin dogru ve canli
10. Sitemap implementasyonu tamamlandi ve canliya alindi
   - Dosya: app/sitemap.ts
   - Icerik: statik sayfalar + dinamik /arzt/[id] URL'leri
   - Canli endpoint: https://www.terminboerse.at/sitemap.xml
11. SEO odakli doktor URL migration tamamlandi
   - Eski format: /arzt/ARZTOGD.20467685
   - Yeni format: /arzt/dr-wolfgang-knogler-hausarzt-allgemeinmedizin-10-bezirk-arztogd-20467685
   - Link uretimi: components/arzt/ArztDirectory.tsx
   - Slug helper + resolver: lib/doctors.ts
   - Doktor detail canonical metadata: app/arzt/[id]/page.tsx
   - Sitemap doktor URL'leri yeni slug formatina gecti: app/sitemap.ts
12. Doktor Community (Rating + Views + Son 3 Yorum) MVP eklendi
   - UI komponenti: components/arzt/DoctorCommunityPanel.tsx
   - API endpoint: app/api/doctor-community/[doctorId]/route.ts
   - Community helper/store: lib/doctorCommunity.ts
   - Doktor detay sayfasina entegre edildi: app/arzt/[id]/page.tsx
   - Not: Su an yorum/rating gonderimi login beklediginden pasif butonlu
   - Not: View artisi su an process-memory tabanli (MVP), kalici DB/KV baglantisi sonraki adim
13. Lead claim link SEO slug ile uyumlu hale getirildi
   - app/api/lead/route.ts icindeki claim URL yeni slug formatina guncellendi
14. Arztbereich MVP route + panel eklendi
   - Route: app/arztbereich/page.tsx
   - UI: components/arztbereich/ArztDashboard.tsx
15. Header'daki Arztbereich girisi gecici olarak inaktif yapildi
   - Dosya: components/layout/SiteShell.tsx
16. Arztbereich paneli sekmeli yapıya tasindi (Phase 1 baslandi)
   - Sekmeler: Profil / Randevu / Anfragen
   - Profil: Hakkinda, uzmanliklar, diller, sigorta modelleri, acil not + temel iletisim
   - Randevu: slot suresi, buffer, iptal siniri, yeni hasta kabul, online randevu, randevu tipleri
   - Not: Google Calendar baglantisi placeholder olarak eklendi (sonraki adimda entegrasyon)

## 8) Bekleyen / Sonraki Isler
1. Google Places API entegrasyonu (SONRA YAPILACAK)
   - Hedef: doktor puani + calisma saatleri almak
   - Onerilen model: bir kere backfill + place_id saklama + secmeli/periyodik refresh
2. Maliyet ve policy uyumlu refresh stratejisi
   - Aylik kismi guncelleme veya sadece aktif doktorlar
3. (Opsiyonel) Domain Property icin DNS TXT kaydi eklemek
   - Kayit: google-site-verification=vrWQo-G7ko2w-_8-4LOGewb4h2e7890ZeETG8HaGYzw
   - Not: Bu adim sadece Domain Property kullanilacaksa gerekli
4. Arztbereich roadmap (oncelikli)
   - Phase 1 (tamamlanan): Sekmeli temel panel + localStorage tabanli kayitlar
   - Phase 2 (siradaki): Login baglantisi + doktor bazli yetkilendirme + kayitlari API/DB'ye tasima
   - Phase 3: Randevu akisi backend + durum yonetimi + basit takvim gorunumu
   - Phase 4: Google Calendar entegrasyonu (oauth, event sync, availability sync)
   - Phase 5: Bildirimler (mail), audit log, daha gelismis analizler

## 9) Devam Ederken Dikkat
- Iliskisiz degisiklikleri geri alma (rollback) yapma.
- Deploy once lint+build calistir.
- Buyuk degisikliklerde once app/api/doctors/route.ts ve components/arzt/ArztDirectory.tsx uyumunu kontrol et.

## 10) Kaldigimiz Yer (Net)
- Sistem canli ve stabil.
- Sitemap canli ve Search Console'a gonderime hazir durumda.
- Doktor detay URL'leri SEO slug standardina tasindi ve canli.
- Search Console icin URL-Prefix verification teknik olarak hazir; Domain Property icin DNS TXT gerekir.
- Sonraki ana odak Arztbereich Phase 2 (login + persistent storage) ve sonrasinda Google Calendar hazirligi.

## 11) Mola Sonrasi Hizli Baslangic Checklist
1. git pull
2. npm install (gerekirse)
3. npm run lint
4. npm run build
5. BENI_OKU_DEV_HANDOFF.md dosyasini oku
6. Search Console'da sitemap durumunu kontrol et (islenme/hatali URL var mi)
7. Domain Property kullanilacaksa DNS TXT durumunu dogrula
8. Google Places entegrasyon task'ina gec

## 12) Son Session Delta (2026-08-07)
- Commit: 8670ddf -> Google Search Console verification meta eklendi (app/layout.tsx)
- Commit: 4cd5d09 -> app/sitemap.ts eklendi, sitemap.xml canliya alindi
- Production alias dogrulandi: https://www.terminboerse.at

## 13) Son Session Delta (2026-08-08)
- Commit: ad9c19d -> doktor detay URL'leri SEO slug formatina gecirildi
- Canli sitemap dogrulamasi: doktor URL'leri artik slug tabanli listeleniyor

## 14) Son Session Delta (2026-08-08)
- Commit: 80a5dd2 -> doktor detay sayfasina community panel eklendi (rating/views/son 3 yorum)
- Yeni API: /api/doctor-community/[doctorId]
- Community write aksiyonlari login sonrasi aktive edilecek sekilde pasif birakildi

## 15) Son Session Delta (2026-08-08)
- Commit: 8807d12 -> Arztbereich MVP route + panel eklendi
- Commit: 8bdefe4 -> /arztbereich rotasi /artztbereich olarak degisti
- Commit: 14cac9b -> Header Arztbereich butonu gecici olarak inaktif yapildi

## 16) Son Session Delta (2026-08-08)
- Commit: 0280cd5 -> Arztbereich tabli Phase-1 uygulandi (Profil/Randevu/Anfragen)

## 17) Son Session Delta (2026-08-09)
- Arztbereich gecici olarak devre disi tutuldu (navbar inaktif + /arztbereich bilgilendirme sayfasi)
- Supabase migration hazirligi baslatildi:
   - Supabase dependency eklendi: @supabase/supabase-js
   - Server admin client helper eklendi: lib/supabaseAdmin.ts
   - SQL schema eklendi: supabase/migrations/20260809_arztbereich_init.sql
   - Step2 SQL eklendi: supabase/migrations/20260809_arztbereich_step2.sql
   - Env template eklendi: .env.supabase.example
   - Uygulama adimlari dokumani eklendi: SUPABASE_NEXT_STEPS.md

## 18) Son Session Delta (2026-08-10) - Arztbereich Kalender / Terminboard Krizi
- Problem (kullanici bildirimi):
   - Google baglantisi yapildiktan sonra dashboard geri donuyor ancak `Termine > Terminboard` hala `deaktiviert` kaliyor.
   - Bazi akislarda sistem tekrar takvim mail/ID girmeyi istiyor gibi davraniyor.

- Bu session'da yapilan teknik degisiklikler:
   - OAuth callback doctor context iyilestirmesi:
      - Redirect su an `doctorId` query ile donuyor.
      - Dosya: app/api/arztbereich/google-calendar/callback/route.ts
   - Dashboard doctor restore:
      - Query'den gelen `doctorId` secime uygulanip URL temizleniyor.
      - Dosya: components/arztbereich/ArztDashboardLite.tsx
   - Scheduling status hesaplama iyilestirmesi:
      - `not_onboarded` branch'inde de mevcut sakli alanlar (calendarConnected/calendarId/schedulingEnabled) korunuyor.
      - Dosya: lib/doctorSchedulingStatus.ts
   - 5 dk otomatik slot refresh:
      - Kullanici sayfada kaldigi surece Termine tabinda 5 dk'da bir slot reload.
      - Dosya: components/arztbereich/ArztDashboardLite.tsx
   - Secili doktor persistence (reload sonrasi kaybolmamasi icin):
      - localStorage uzerinden selected doctor geri yukleniyor.
      - Dosya: components/arztbereich/ArztDashboardLite.tsx

## 19) Son Session Delta (2026-08-10) - Manual Slot MVP (Google Sync Deaktiv)
- Google Calendar entegrasyonu silinmedi; panelde ayri sekme olarak pasif/"deaktiv" tutuldu.
- Termine paneli, doktorun manuel "bos slot" (tarih+saat+dakika) girmesi modeline cekildi.
- 3 gun kurali eklendi: sadece sonraki 72 saat icindeki slotlar kaydedilebilir.
- Yeni API: app/api/arztbereich/manual-slots/route.ts
   - GET: token+doctorId ile doktorun slotlarini listeler
   - POST: yeni manuel slot olusturur
   - DELETE: slot siler
- Yeni store/service: lib/manualDoctorSlots.ts
   - Supabase table `arzt_manual_slots` uzerinden kalici kayit
   - Slot cakisma kontrolu + 3 gun validasyonu
- Yeni migration: supabase/migrations/20260810_manual_slots.sql
- Public slot feed manual sisteme baglandi:
   - lib/googleCalendarAvailability.ts artik manuel slot listesini donuyor
   - app/api/doctors/[id]/slots route bu feed'i kullanmaya devam ediyor
- Booking gate guncellendi:
   - lib/doctorSchedulingStatus.ts icinde online booking artik calendar baglantisina degil `profileUpdated + schedulingEnabled` durumuna bagli
- Hasta tarafi gorunurluk:
   - Doktor detayinda slotlar manuel kayitlardan geliyor (app/arzt/[id]/page.tsx)
   - Arama kartlarindaki "Nächster Slot" alani manuel slotlardan besleniyor (app/api/doctors/route.ts)

## 20) Son Session Delta (2026-08-10) - Slot Booking + 3-Gun Filter
- Hasta tarafinda slot-secimli randevu talebi eklendi:
   - Modal icinde opsiyonel serbest slot secimi (components/arzt/AppointmentRequestModal.tsx)
   - Secili slot varsa once atomik rezervasyon yapiliyor, sonra lead mail gonderiliyor
- Public slot API'ye booking endpoint eklendi:
   - POST /api/doctors/[id]/slots -> slotId ile `free -> booked`
   - Dosya: app/api/doctors/[id]/slots/route.ts
- Slot rezervasyon atomigi store katmanina eklendi:
   - reserveManualDoctorSlot() (Supabase + memory fallback)
   - Dosya: lib/manualDoctorSlots.ts
- Lead email icerigine secilen slot saat araligi eklendi:
   - Dosya: app/api/lead/route.ts
- Arzt panelinde Termine board icin hizli gun filtresi eklendi:
   - Alle / Heute / Morgen / Übermorgen
   - Dosya: components/arztbereich/ArztDashboardLite.tsx
   - KV yoksa Supabase fallback persistence:
      - Scheduling store + Google connection store'a Supabase fallback eklendi.
      - Dosyalar: lib/arztbereichSchedulingStore.ts, lib/googleCalendarConnectionStore.ts

## 21) Son Session Delta (2026-08-11) - Profil/Community Cleanup + 3-Gun Slot Vitrini + Deploy
- Kullanici istek listesine gore profile/community cleanup tamamlandi:
   - Uydurma rating/yorum gorunumleri kaldirildi (card + profil odakli sade gosterim).
   - Doktor detailde `Aktuell ausgebucht` metni kaldirildi.
   - Doktor email varsa detail sayfasina direkt `mailto:` tabanli `Direkt fragen` CTA eklendi.
- Arztbereich profile UX sadeleştirildi:
   - Ust durum stripi kaldirildi.
   - Doktor rolunde `Termine` tab'i kaldirildi.
   - Profilübersicht altina bugun/yarin/obur gun icin hizli slot ekleme alani eklendi.
- 3 gun slotlarin public gorunurlugu tamamlandi:
   - Yeni feed API: app/api/doctors/upcoming-slots/route.ts
   - Store helper genisletmesi: lib/manualDoctorSlots.ts (`getUpcomingManualSlotsByDoctorIds`)
   - Landing section eklendi: components/landing/LandingPage.tsx
      - Baslik: `Freie Termine in den nächsten 3 Tagen`
      - Doktor bazli 3 slot chip'i + profil linki
- Build dogrulama:
   - `npm run build` basarili (Next.js 16.3.0, tum route'lar derlendi).
- Production deploy:
   - Deployment: https://terminboerse-2n2mrncfa-ilhanyalcin3307s-projects.vercel.app

## 22) Son Session Delta (2026-08-17) - Arztprofil Admin-Speicherung
- Root cause: Arztbereich-Profiländerungen wurden bisher nur in `localStorage` gespeichert; öffentliche Suche und Detailseite lasen weiterhin ausschließlich `data/doctors.json`.
- Profil-Update-API ergänzt: `app/api/arztbereich/profile/update/route.ts`
- Admin/doctor profil override wird über `arzt_custom_profiles` bzw. KV/in-memory fallback gespeichert.
- Öffentliche Arztsuche und Detailseite mergen gespeicherte Overrides mit dem OGD-Bestand.
- Gleiche `doctorId` wird in der Adminsuche dedupliziert.
- Validierung: `npx tsc --noEmit` und `git diff --check` erfolgreich.
- `npm run lint` enthält bereits bestehende, task-fremde Fehler in Login-Routes und React-Effect-Regeln.
   - Alias: https://www.terminboerse.at

## 22) Kalan Onerilen Minik Kontrol Listesi
1. Canlida `/` ana sayfada `Freie Termine in den nächsten 3 Tagen` bolumunu dogrula.
2. Canlida `/arzt/[slug]` detailde `Direkt fragen` butonunu (email olan doktorda) dogrula.
3. Arztbereich profilde yeni 3-gun slot panelinden slot ekle/sil akisini smoke-test et.

## 23) Son Session Delta (2026-08-11) - SEO + AI Discovery + Sitemap Refresh
- Global metadata (title/description/keywords/OG/Twitter) guncellendi:
   - Dosya: app/layout.tsx
   - Odak: Arzttermine Wien + 3-gun slotlar + Apotheke arama + Arztbereich
- Homepage schema/FAQ metinleri guncellendi:
   - Dosya: app/page.tsx
   - Eski Termin-Alarm ifadesi kaldirildi, Apotheke arama uyumu eklendi
- Footer SEO/discovery linkleri genisletildi:
   - Dosya: components/layout/SiteShell.tsx
   - Yeni linkler: Arzttermine Wien, Apotheken Wien (anchor), Arztbereich
- Homepage Apotheke bolumune anchor eklendi:
   - Dosya: components/landing/LandingPage.tsx
   - Anchor: `#apotheken-wien`
- AI/crawler discovery dosyalari eklendi:
   - robots.txt route: app/robots.ts
   - llms.txt route: app/llms.txt/route.ts
- Sitemap kapsamı guncellendi:
   - Dosya: app/sitemap.ts
   - Eklendi: /arztbereich, /login, /profil
- Production deploy:
   - Deployment: https://terminboerse-cnc0i907m-ilhanyalcin3307s-projects.vercel.app
   - Alias: https://www.terminboerse.at

## 24) Son Session Delta (2026-08-11) - Landing, Auth UI ve Yasal Sayfalar Finalizasyonu
- Landing ana sayfa UX/content guncellemeleri:
   - `Freie Termine in den nächsten 3 Tagen` bolumu eski Storno-Ticker konumuna alindi ve ayni yesil kart diline cekildi.
   - `Kein passender Termin frei?`/Termin-Alarm bolumu kaldirildi; yerine OGD tabanli Apotheke arama bolumu eklendi.
   - Yeni data kaynagi: `data/APOTHEKEOGD.json` (name/adres arama + bezirk filtresi + Anrufen/Route/Website aksiyonlari).
   - `Profil kostenlos beanspruchen` CTA linki `/arztbereich` olarak degistirildi.
- Login/Arztbereich giris UI sadeleştirme:
   - User login sayfasinda Google ile devam butonlari kaldirildi.
   - Arztbereich login/register ekranindaki `Mit Google` ve `Registrierung mit Google` butonlari kaldirildi.
   - Header'daki Login butonu tekrar aktif hale getirildi (guest -> `/login`).
- SEO/AI discovery son durum:
   - Metadata + schema mevcut urun kapsamina göre guncellendi.
   - `robots.txt` ve `llms.txt` endpointleri canli.
   - Sitemap `/arztbereich`, `/login`, `/profil` ile guncel.
- Impressum ve Datenschutz tamamen revize edildi:
   - Gercek iletisim bilgileri eklendi:
      - Ilhan Yalcin
      - Kiningergasse, 1120 Wien
      - kontakt@terminboerse.at
      - 004369919050017
   - Non-commercial/public-benefit pozisyonlama aciklandi.
   - data.gv.at / OGD veri kaynagi, sorumluluk sinirlari ve DSGVO haklari netlestirildi.
   - Acil durumda 144 notu eklendi.
- Son production deploy (en guncel):
   - https://terminboerse-bdfhpwnv3-ilhanyalcin3307s-projects.vercel.app
   - Alias: https://www.terminboerse.at

## 25) Devam Icin Net Baslangic Noktasi
1. Search Console'da sitemap yeniden gonderildi mi kontrol et (`/sitemap.xml`).
2. Homepage Apotheke arama bolumunde performans/artirma gereksinimi var mi degerlendir (gerekirse API route'a tasima).
3. Hukuki metinler avukat review'e gidecekse son metin freeze etmeden once adres/isim yazimini tekrar teyit et.
      - Migration: supabase/migrations/20260810_calendar_persistence.sql
   - Env/secret robustness:
      - Supabase/KV env degerleri trimleniyor.
      - Token crypto decrypt tarafi eski/yeni secret formatlari ile geriye donuk calisacak sekilde sertlestirildi.
      - Dosyalar: lib/supabaseAdmin.ts, lib/secureTokenCrypto.ts, ilgili store dosyalari
   - Missing refresh token toleransi:
      - OAuth callback refresh token gelmezse baglanti tamamen dusurulmuyor.
      - Connection store sentinel yaklasimi ile DB uyumlulugu saglandi.
      - Dosyalar: app/api/arztbereich/google-calendar/callback/route.ts, lib/googleCalendarConnectionStore.ts, lib/googleCalendarAvailability.ts, lib/googleCalendarEvents.ts
   - Kalender input UX iyilestirmesi:
      - Termine Einstellungen'da email/kalender-id tekrar tekrar zorunlu yazdirma azaltildi (doctor bazli local persistence + fallback prefill).
      - Dosya: components/arztbereich/ArztDashboardLite.tsx
   - Terminboard gate auto-heal denemesi:
      - `calendarConnected` varsa board'u acmaya yardimci mantik + `schedulingEnabled` auto-heal effect eklendi.
      - Dosya: components/arztbereich/ArztDashboardLite.tsx

- Runtime dogrulama notlari (onemli):
   - Production env'lerde kritik bos degerler vardi; session icinde panodan tekrar girilerek dolduruldu:
      - NEXT_PUBLIC_SUPABASE_URL
      - NEXT_PUBLIC_SUPABASE_ANON_KEY
      - SUPABASE_SERVICE_ROLE_KEY
      - GOOGLE_OAUTH_CLIENT_SECRET
   - Son kontrol: bu 4 deger non-empty ve newline'siz gorundu.
   - Supabase tablo varlik kontrolu:
      - arzt_accounts: OK
      - arzt_account_doctors: OK
      - arzt_scheduling_status: OK (count 0)
      - arzt_google_calendar_connections: OK (count 0)

- Mevcut durum (session kapanis anindaki gercek):
   - Kullaniciya gore Terminboard hala deaktiviert gorunuyor.
   - Yani issue production'da hala tam kapanmamis; bir sonraki adimda live diagnostics zorunlu.

- Sonraki oturumda ilk yapilacaklar (sira ile):
1. `components/arztbereich/ArztDashboardLite.tsx` icine gecici ama net bir debug panel ekle (yalnizca admin/doctor panelde gorunsun):
    - selectedDoctorId
    - schedulingStatus.doctorId
    - schedulingStatus.calendarConnected
    - schedulingStatus.schedulingEnabled
    - schedulingStatus.reason
    - calendarHealth.googleEmail / accessTokenState
2. `/api/arztbereich/scheduling-status` response'una debug alanlari ekle:
    - storagePath: `kv|supabase|memory`
    - foundSchedulingEntry: boolean
    - foundGoogleConnection: boolean
    - resolvedDoctorId
3. Connect callback sonrasinda ayni doctorId icin write-read smoke log ekle:
    - upsert sonra immediate read back ve fark varsa explicit error log.
4. Gating'i nihai olarak tek kaynaga bagla:
    - `isTermineEnabled` icin final karar mantigi netlestir (server status + fallback) ve UI/checkbox tutarliligini sabitle.

- Not:
   - Kullanici ara verdi; geri donuste ilk hedef sadece bu bug'i kapatmak.
   - Yeni ozellik yok, sadece runtime truth ile sorunu bitirme odagi.

## 26) Session Delta (2026-08-13) - Meistgesuchte Ärzte (Top-5 Live Ranking)
- Istek: Landing sayfada `Freie Termine in den nächsten 3 Tagen` bolumunun hemen ustune, en cok goruntulenen 5 doktoru gosteren canli bir ranking eklendi. Alev/flame ikon bilinçli kullanilmadi, `TrendingUp` (lucide-react) tercih edildi.
- Yeni kod:
   - `lib/doctorCommunity.ts`: `getTopViewedDoctorIds(limit)` eklendi.
   - `app/api/doctors/top-viewed/route.ts`: top-5 doktoru isim/branş/bölge ile donen yeni endpoint.
   - `components/landing/LandingPage.tsx`: client-side fetch + 5 kartlik ranking bolumu (veri yoksa bolum otomatik gizleniyor).
- Kritik root-cause bulgusu: View sayaçlari (`profileViews`/`listImpressions`) production'da **Vercel KV hic konfigure edilmemis** oldugu icin sadece process-memory'de tutuluyordu ve her cold start/istekte sifirlaniyordu. Bu yuzden ranking hep bos gorunuyordu.
   - Kalici cozum: Sayaç depolama katmani Supabase'e tasindi (proje zaten Supabase kullaniyor, KV hicbir zaman set edilmemisti).
   - Yeni tablo: `supabase/migrations/20260813_doctor_view_counters.sql` (`doctor_view_counters`: doctor_id, profile_views, list_impressions, updated_at).
   - `lib/doctorCommunity.ts` icinde `hasSupabaseConfig()` -> Supabase varsa oncelikli, yoksa eski KV/in-memory fallback korunuyor (geriye donuk uyumluluk icin).
- Onemli davranis notu: Profil goruntuleme sayaci sadece **POST** `/api/doctor-community/[doctorId]` cagrisinda (`event: "view"`) artiyor; GET sadece okuma yapiyor, sayaci artirmiyor.
- Dogrulama (production'da manuel test edildi):
   - `POST /api/doctor-community/ARZTOGD.20467685` `{"event":"view"}` -> `viewsCount: 1`
   - `GET /api/doctors/top-viewed` -> ayni doktoru dondurdu.
   - Test verisi 1 adet gercek olmayan view birakti; kullanici isterse Supabase Table Editor'den `doctor_view_counters` tablosunda `ARZTOGD.20467685` satirini silebilir (opsiyonel, zararsiz).
- Kullanicinin yapmasi gereken tek adim (tamamlandi): Supabase SQL Editor'de migration SQL'i calistirildi, tablo canlida mevcut ve dogrulandi.
- Deploy edilen commitler: `37002b1` (ranking UI), `a4ba560` (Supabase persistence fix). Son production alias: https://www.terminboerse.at
- Sonraki oturumda devam noktasi: Ozellik tamamlandi ve dogrulandi, ek is bekleniyor degil. Kullanici molaya cikti, "devam edecegiz" dedi -- yeni talep gelene kadar baska degisiklik yapilmadi.

## 27) Planlanan Is - Admin Dashboard Yenilemesi (Kullanici "Basla" Demeden Uygulama Yapma)

### Hedef
- Mevcut teknik sekme yapisini operasyon odakli bir admin paneline donusturmek.
- Basvuru onayi, doktor-hesap eslestirmesi, yonetilen profiller ve doktor detay yonetimini birbirinden net ayirmak.
- Mevcut onayli doktorun hesabi, profil duzenleme yetkisi ve manual slot akisi kesintisiz calismaya devam etmeli.

### Mevcut Sorunlar
- `Freischaltungen` ekraninda talep edilen ve eslesen doktor gorunuyor; ancak admin doktoru ad/adres/uzmanlik ile arayip secerek eslestiremiyor.
- `Zuordnung bearbeiten` mevcut durumda yalnizca doktor ID bilgisine indirgendi; admin icin anlamli profil onizlemesi veya secim akisi yok.
- `Verwaltete Profile` merkezi operasyon listesi degil; secili doktorun `Profil / Termine / Bewertungen` detay sekmelerine karisiyor.
- Profil degisiklikleri icin kritik alanlarda admin inceleme/onay kuyrugu ve audit gecmisi yok.

### Guvenli Uygulama Prensipleri
- Mevcut Supabase hesap -> doktor ID eslestirmeleri korunacak; veri migrasyonu veya toplu reset yapilmayacak.
- Yeni eslestirme arayuzu sadece yeni basvurularda veya admin bilincli olarak `Eşleşmeyi değiştir` dediginde kullanilacak.
- Hesap kaldirma yerine once `pasiflestir` uygulanacak; public doktor kaydi silinmeyecek.
- Uygulama oncesi veri kontrolu: her aktif hesap icin e-posta -> doktor ID -> doktor kaydi eslesmesi dogrulanacak.
- Ilk gercek doktor (ARZTOGD.20468871) ile login, profil duzenleme ve manual slot regresyon testi yapilacak.

### Sürüm 1 - Operasyon Temeli (Tahmini 3-4 Is Gunu)
1. `Freischaltungen / Başvurular`
   - Doktor adi, uzmanlik ve adres ile arama yapilabilen gercek eslestirme secicisi.
   - Talep edilen doktor ve secilen doktor icin profil onizlemesi.
   - `Onayla`, `Reddet`, `Düzeltme iste` aksiyonlari.
2. Merkezi `Doktorlar / Yönetilen Profiller` listesi
   - Sutunlar: doktor adi, uzmanlik, adres, hesap e-postasi, aktif/pasif durum, profil doluluk, son giris, son profil degisikligi, acik slot sayisi.
   - Filtreler: aktif/pasif, eksik profil, slotu olmayan, uzun suredir giris yapmayan, onay bekleyen.
   - Satir aksiyonlari: `Profili aç`, `Eşleşmeyi değiştir`, `Yönetimi durdur`, `Hesabı devre dışı bırak`.
3. Secili doktor detay ekrani
   - `Profil / Termine / Bewertungen / Konto ve erişim` alt sekmeleri.
   - Mevcut `Profil / Termine / Bewertungen` burada kalacak; ana admin navigasyonundan ayrilacak.
4. Temel profil doluluk ve aktivite verisi
   - Profil yuzdesi ve eksik alanlar.
   - Son profil degisikligi, son slot yayini, son giris icin veri modeli/ekran altyapisi.

### Sürüm 2 - Kalite Kontrolü (Tahmini 2-4 Is Gunu)
1. `Profil Değişikliği İnceleme` kuyrugu
   - Kritik alanlarda eski/yeni deger karsilastirmasi: isim, uzmanlik, adres, telefon, e-posta, web sitesi.
   - `Onayla`, `Reddet`, `Notla geri gönder` akisi.
   - Onaylanana kadar public profilin son dogrulanmis bilgiyi gostermesi.
2. Audit gecmisi
   - Onaylayan admin, tarih/saat, degisen alanlar ve red/düzeltme notlari.
3. Operasyon ozeti
   - Aktif doktor, bekleyen basvuru, eksik profil, son 7 gun slot yayinlamayan doktor ve takvim baglanti durumu.

### Dogrulama ve Canliya Alma
- Her dilim sonrasinda: `npm run lint`, `npm run build`, mevcut onayli doktorla login/profil/slot smoke testi.
- Sürüm 1 once preview ortaminda kontrol edilip sonra production'a alinacak.
- Sürüm 2, Sürüm 1 production'da stabil olduktan sonra ayri deploy edilecek.
- Toplam tahmin: Sürüm 1 + Sürüm 2 ile 5-8 is gunu; mevcut sistemin bozulmasi beklenmez, ancak her asamada regresyon testi zorunlu.

## 28) Planlanan Is - Yeni Hasta Kabul Durumu (Kullanici "Yap" Demeden Uygulama Yapma)

### Hedef
- Hastalarin yeni hasta kabul eden doktorlari arama sonucunda dogrudan bulabilmesi.
- Doktorun profil ayarindaki veri, liste filtreleri, kart rozeti ve detay profilinde tek kaynak olarak tutarli kullanilmali.

### Uygulama Karari
1. Veri modeli uc durumlu olmali:
   - `Ja, neue Patienten willkommen`
   - `Derzeit keine neuen Patienten`
   - `Keine Angabe`
2. `/arzt` arama sayfasina filtre ekle:
   - Checkbox/toggle etiketi: `Nur Ärzte, die neue Patienten aufnehmen`.
   - Yalnizca ilk durumdaki doktorlari gosterir.
3. Arama sonucundaki kucuk doktor kartina, yalnizca ilk durumda yesil rozet ekle:
   - `Neue Patienten willkommen`
   - `Derzeit keine neuen Patienten` icin negatif rozet gostermemek; gerekirse detay profilde not olarak birakmak.
4. Doktor detay sayfasinda mevcut `Neue Patienten` bilgisini gorunur, tutarli bir durum rozeti ile sunmak.
5. Ana sayfada ayri liste ilk asamada eklenmeyecek.
   - Yeterli sayida aktif doktor olustugunda opsiyonel `Neue Patienten willkommen` secili liste degerlendirilebilir.

### Dogrulama
- Doktor panelinden uc durumu kaydetme testi.
- API filtre testi ve `/arzt` sonucunda dogru doktor sayisi.
- Kart/detay ekraninda rozet tutarliligi.
- Mevcut doktorlar icin `Keine Angabe` geriye donuk uyumluluk kontrolu.

## 29) Planlanan Is - Doktor Hesap Ayarlari ve Guvenlik (Kullanici "Yap" Demeden Uygulama Yapma)

### Problem
- `Kundenkonto > Profil` mevcut durumda isim ve e-postayi sadece gosterebiliyor; hesap sahibi bunlari duzenleyemiyor.
- Sifre degistirme ve sifre sifirlama akisi yok.
- Public doktor profilinin iletisim e-postasi ile giris e-postasi birbirinden ayrilmali.

### Hedef Akis
1. Arztbereich doktor detayinda `Konto & Sicherheit` alt sekmesi ekle.
2. Doktorun kendisi icin:
   - Giris e-postasini goruntuleme ve guvenli degistirme.
   - Sifre degistirme: mevcut sifre, yeni sifre, yeni sifre tekrar.
   - `Şifremi unuttum` / e-posta tabanli reset akisi.
   - Aktif oturumdan cikis.
3. Public profil e-postasi ayri kalir; public iletisim bilgisi degisikligi giris kimligini degistirmez.
4. Admin `Konto & erişim` gorunumunde:
   - Hesabi pasiflestirme/yeniden aktiflestirme.
   - Erisimi kaldirma.
   - Parolayi gormeden, gerekirse guvenli reset e-postasi tetikleme.
5. Guvenlik:
   - Parola asla istemciye veya admin ekranina donmez.
   - E-posta/parola degisikligi sonrasinda oturum yenileme veya diger oturumlari sonlandirma karari netlestirilir.
   - Degisiklikler audit kaydina yazilir.

### Oncelik ve Dogrulama
- Ilk gercek doktor hesabinin aktif kullanimi nedeniyle yuksek oncelik.
- Uygulama sonrasi: e-posta degistirme, mevcut sifreyle degistirme, hatali sifre, sifre reseti, eski/yeni giris bilgileri ve pasif hesap regresyon testleri.

## 30) Planlanan Is - Leistungen ile Doktor Aramasi (Kullanici "Yap" Demeden Uygulama Yapma)

### Problem ve Hedef
- Doktorlar profilinde `Leistungen` ekleyebiliyor ancak hasta aramasi esas olarak isim, uzmanlik, adres ve bezirk bilgisini kullaniyor.
- Hizmet odakli aramalarin (ornek: `HIV PrEP`, `Reisemedizin`, `Vorsorgeuntersuchung`, `sexuelle Gesundheit`) ilgili doktoru bulmasi saglanmali.

### Uygulama Karari
1. `/api/doctors` arama indexine `services.title` ve `services.description` alanlarini ekle.
2. Mevcut normalize/tokenized arama davranisini bu alanlarda da kullan:
   - `PrEP` / `HIV-PrEP`, umlaut ve yazim farklari tutarli eslesmeli.
3. Sonuc kartinda arama hizmet alanindan eslestiyse kucuk bir satir/rozet goster:
   - `Passende Leistung: Reisemedizin`
4. Doktor detay sayfasinda Leistungen bolumunun public gorunurlugu kontrol edilmeli; yoksa eklenmeli.
5. Ilk asamada ayri `Leistung` filtresi eklenmeyecek; serbest metin arama yeterli.

### Dogrulama
- Gercek profil hizmetleriyle API arama testleri: `HIV PrEP`, `Reisemedizin`, `Vorsorge`.
- Eslestigi halde isim/uzmanlik/adreste gecmeyen hizmetin sonucu getirdigi kontrol edilir.
- Karttaki eslesen hizmet etiketi ve public detay profilinin tutarliligi kontrol edilir.

## 31) Planlanan Is - Talep Formu Uzerinden Doktora Aracili Iletim (Kullanici "Yap" Demeden Uygulama Yapma)

### Niyet
- Hasta, doktora dogrudan e-posta adresi gormeden talep birakabilsin.
- Talep, sistem tarafindan doktora iletilsin; hem olculen lead akisi hem de doktorlar icin reklam/deger yaratilsin.

### Uygulama Karari (MVP)
1. Hasta tarafi
   - Doktor karti/detayinda `Talep gönder` aksiyonu.
   - Form alanlari: ad-soyad, iletisim (e-posta/telefon), konu, talep detayi, tercih edilen zaman.
2. Sistem davranisi
   - Talep once sistemde lead kaydi olarak tutulur.
   - Sonra doktorun iletisim kanalina (e-posta) sistem araciligiyla iletilir.
   - Doktora gelen iletide kaynak/lead id bilgisi bulunur.
3. E-posta kaynak modeli
   - `verified_doctor_email`: doktor tarafindan dogrulanmis e-posta (canli iletim icin birincil kaynak).
   - `candidate_doctor_email`: dis kaynaktan gelen aday e-posta (dogrulanmadan canli iletime acilmaz).
4. Dashboard
   - Doktor panelinde `Gelen Talepler` bolumu.
   - Admin tarafinda iletim basari/hatasi ve tekrar gonderim takibi.

### Uyum ve Guvenlik
- Form metninde acik bilgilendirme: talebin ilgili saglik kurulusuna iletilecegi.
- Dis kaynak e-postalarin kullaniminda ToS/robots ve DSGVO uyum kontrolu tamamlanmadan toplu canli kullanim yok.
- Public profildeki iletisim e-postasi ile giris e-postasi ayri veri alanlari olarak korunur.

### Is Modeli / Ticarilestirme (Sonraki Faz)
- Ucretsiz temel lead iletimi.
- Ucretli paketler: oncelikli gorunum, hizli bildirim, donusum raporlari, otomatik cevap sablonlari.

### Dogrulama
- Uctan uca test: form -> lead kaydi -> doktor e-postasina iletim -> dashboard gorunurlugu.
- Hata senaryolari: gecersiz e-posta, iletim hatasi, duplicate talep, rate-limit.

## 32) Session Delta (2026-09-01) - Admin Dashboard Yenilemesi, Sürüm 1 Temeli
- Merkezi `Verwaltete Profile` sekmesi operasyon listesine dönüştürüldü.
   - Yeni admin API: `app/api/arztbereich/managed-profiles/route.ts`
   - Aktif doktor hesabı, eşleştirilen profil, branş/adres ve sonraki 3 gündeki boş slot sayısı tek listede gösteriliyor.
   - Filtreler: tümü, aktif, inaktif, boş slotu olmayan.
   - `Profil öffnen` mevcut profil editörüne güvenli biçimde geçiyor.
- Hesap yönetimi eklendi:
   - Yeni admin API: `app/api/arztbereich/managed-profiles/status/route.ts`
   - Hesap silinmeden aktif/pasif yapılabiliyor; yalnız admin token ile erişilebilir.
- `Freischaltungen > Zuordnung bearbeiten` iyileştirildi:
   - Ham doktor ID yazımı yerine ad, uzmanlık veya bezirk ile arama ve profil önizlemeli seçim eklendi.
   - Mevcut eşleştirme verileri korunuyor; yalnız admin seçip kaydederse değişiyor.
- Doğrulama: `npx tsc --noEmit` ve `npm run build` başarılı.
- Kalan Sürüm 1 işleri (uygulanmadı): merkezi listede profil doluluk/son giriş/son profil değişikliği alanları için kalıcı activity veri modeli ve gerekirse daha ayrıntılı doktor detay ekranı.

## 33) Session Delta (2026-09-01) - Admin Arztliste ve Güvenli Profil Kaldırma
- Admin dashboard'a yeni `Arztliste` sekmesi eklendi.
   - Tüm OGD ve custom doktor profilleri 50'şerli sayfalama ve ad/branş/bezirk/adres araması ile görüntüleniyor.
   - Her kaydın OGD veya kendi oluşturulmuş profil olduğu, ayrıca public veya gizli olduğu açıkça gösteriliyor.
- OGD profilleri kalıcı olarak silinmez; admin `Ausblenden` ile public görünürlükten kaldırabilir ve `Wiederherstellen` ile geri açabilir.
   - Gizlenen profil `/arzt` listesinden, profil URL'sinden, sitemap'ten ve public boş-slot vitrininden çıkar.
   - Böylece OGD kaynak güncellendiğinde kaydın geri gelmesi veya Google'da gereksiz 404 oluşması engellenir.
- Yalnız `custom-*` profiller için `Endgültig löschen` eklendi.
   - Onay penceresi vardır.
   - Manual slotlar, scheduling/calendar verileri, görüntüleme sayacı, hesap-doktor eşleştirmesi, gizleme kaydı ve custom profil kaydı birlikte temizlenir.
- Yeni endpointler:
   - `app/api/arztbereich/doctor-list/route.ts`
   - `app/api/arztbereich/doctor-list/action/route.ts`
- Yeni migration (production'a geçmeden önce Supabase SQL Editor'de çalıştırılmalı):
   - `supabase/migrations/20260901_hidden_doctor_profiles.sql`
   - Tablo: `arzt_hidden_profiles`
- Doğrulama: `npx tsc --noEmit` ve `npm run build` başarılı.

## 34) Session Delta (2026-09-01) - Arztliste Profil Kalitesi ve Aktivite
- `Arztliste` artık her doktor satırında operasyon için gerekli sinyalleri gösteriyor:
   - Profil doluluk yüzdesi (isim, branş, bezirk, adres, telefon, e-posta, web sitesi, Über mich).
   - Doktor hesabının son giriş zamanı; hiç giriş yoksa `Noch nie`.
   - Son manual slot yayın zamanı; hiç slot yoksa `Noch keiner`.
- `Details` ile açılır satır görünümü eklendi:
   - Profil ID, hesap e-postası/aktiflik durumu ve eksik profil alanları.
   - `Profil bearbeiten` mevcut admin profil editörüne geçer.
- Son giriş bilgisi yalnız server-side Supabase Admin API ile okunur; public endpointlerde sunulmaz.
- Doğrulama: `npx tsc --noEmit`, `npm run build` ve editor diagnostics başarılı.

## 35) Session Delta (2026-09-01) - Admin Operasyon Özeti
- Admin dashboard üstüne tıklanabilir operasyon sayacı eklendi:
   - Aktif doktor hesapları.
   - Açık freischaltung başvuruları.
   - Eksik profil bilgisi bulunan yönetilen profiller.
   - Açık slotu olmayan yönetilen profiller.
   - Public görünümden gizlenmiş profil sayısı.
- Yeni admin-only endpoint: `app/api/arztbereich/operations-summary/route.ts`.
- Kalite ve slot sayaçları tüm OGD havuzunu değil, yalnız aktif doktor hesabına bağlı yönetilen profilleri kapsar; böylece günlük admin aksiyonu için anlamlı kalır.
- Sayaçlar ilgili sekmeye yönlendirir (`Freischaltungen`, `Verwaltete Profile`, `Arztliste`).
- Doğrulama: `npx tsc --noEmit`, `npm run build` ve editor diagnostics başarılı.

## 36) Session Delta (2026-09-01) - Doktor Konto & Sicherheit
- Doktor dashboard'una `Konto & Sicherheit` sekmesi eklendi.
   - Mevcut parola doğrulamasıyla giriş parolası değiştirilebilir.
   - Mevcut parola doğrulamasıyla giriş e-postası değiştirilebilir.
   - Public doktor profilindeki iletişim e-postası, giriş e-postasından bağımsız kalır.
   - E-posta veya parola değişiminden sonra Arztbereich session localStorage'dan temizlenir ve yeniden giriş istenir.
- Güvenli parola reset akışı eklendi:
   - Doktor kendi hesabına tek kullanımlık Supabase reset e-postası gönderebilir.
   - `/login?recovery=doctor` recovery oturumunu algılar, yeni parolayı kaydeder ve Arztbereich'e geri yönlendirir.
   - Admin `Verwaltete Profile` listesinden aktif doktor hesabına reset e-postası gönderebilir; parola hiçbir noktada admin'e gösterilmez.
- Yeni endpoint: `app/api/arztbereich/account-security/route.ts`.
- Supabase Authentication URL Configuration içinde `https://www.terminboerse.at/login?recovery=doctor` redirect URL olarak izinli olmalı; aksi halde reset e-postası dönüşü çalışmaz.
- Doğrulama: `npx tsc --noEmit`, `npm run build` ve editor diagnostics başarılı.

## 37) Session Delta (2026-09-01) - Meistgesuchte Ärzte Günlük Cache
- Ana sayfadaki `Meistgesuchte Ärzte` listesi tekrar aktifleştirildi; `Freie Termine in den nächsten 3 Tagen` bölümünün üstünde gösterilir.
- Ranking yalnız profil görüntülemelerine göre hesaplanır; gizlenmiş profiller listeden çıkarılır.
- `app/api/doctors/top-viewed/route.ts` yanıtı Vercel CDN'de 24 saat cache'lenir (`s-maxage=86400`, 1 saat stale-while-revalidate).
   - İlk istekte Supabase ranking sorgusu yapılır, sonraki ana sayfa ziyaretleri günlük cached snapshot'ı kullanır.
   - Yeni tablo veya cron gerekli değildir; yük çok düşük tutulur.
- `components/landing/LandingPage.tsx` endpointi force-cache ile çağırır; veri yoksa bölüm otomatik gizlenir.
- Doğrulama: `npx tsc --noEmit` ve `npm run build` başarılı.

## 38) Session Delta (2026-09-01) - SEO Branş Landing Sayfaları
- Google organik görünürlüğü için kalıcı, statik branş + Wien landing URL'leri eklendi:
   - `/arzttermin-wien/hausarzt`
   - `/arzttermin-wien/hautarzt`
   - `/arzttermin-wien/frauenarzt`
   - `/arzttermin-wien/zahnarzt`
   - `/arzttermin-wien/kinderarzt`
- Her URL kendi title/description/canonical/OpenGraph metadata'sına, breadcrumb JSON-LD şemasına ve branşa uygun özgün giriş metnine sahip.
- Sayfalar mevcut gerçek `/api/doctors` filtresini kullanır; oluşturma anında statik HTML (SSG) üretilir.
- `sitemap.xml` içine eklendiler ve ana sayfadaki `Beliebte Suchen in Wien` bölümü query parametreleri yerine bu kalıcı URL'lere doğrudan internal link verir.
- Doğrulama: `npx tsc --noEmit` ve `npm run build` başarılı; 5 URL SSG olarak oluşturuldu.

## 39) Session Delta (2026-09-01) - SEO Ratgeber İçerikleri
- Tıbbi teşhis/tedavi iddiası içermeyen, randevu süreci ve yerel arama niyetine odaklı üç özgün Almanca rehber eklendi:
   - `/ratgeber/arzttermin-wien`
   - `/ratgeber/arzttermin-kurzfristig`
   - `/ratgeber/facharzttermin-wien`
- Her rehberin kendine özgü title/description/canonical/OpenGraph metadata'sı, dört uygulama adımı, FAQ bölümü + FAQPage JSON-LD ve breadcrumb JSON-LD'si bulunur.
- Rehberler gerçek doktor listesi, boş-slot alanı ve ilgili branş landing sayfalarına internal link verir.
- Ana sayfaya `Ratgeber: Arzttermine in Wien` bölümü eklendi ve üç rehbere crawl edilebilir normal link verildi.
- Sitemap kapsamına eklendiler; Next build'te üçü SSG olarak üretildi.
- Doğrulama: `npx tsc --noEmit` ve `npm run build` başarılı.

## 40) Session Delta (2026-09-01) - Production ve Mola Durumu
- Son production deploy: `https://terminboerse-bf4lyw1k7-ilhanyalcin3307s-projects.vercel.app`
   - Alias: `https://www.terminboerse.at`
   - Bu deploy, üç SEO Ratgeber sayfasını, sitemap güncellemesini ve ana sayfadaki rehber linklerini içerir.
- `Meistgesuchte Ärzte` ranking production'da ayrıca düzeltildi ve deploy edildi:
   - Son ranking deploy: `https://terminboerse-7mhvrcjz3-ilhanyalcin3307s-projects.vercel.app`
   - Root cause: yalnız son 24 saatte güncellenen sayaçlar filtrelendiği için ranking boş dönüyordu.
   - Çözüm: toplam gerçek profil görüntülemeleri sıralanır; endpoint sonucu Vercel CDN'de 24 saat cache'lenir.
   - Canlı kontrol: `/api/doctors/top-viewed` 5 doktor döndürdü.
- Doktor `Konto & Sicherheit` özellikleri de production'a alındı:
   - Şifre/e-posta değişimi ve doktor/admin tetiklemeli reset e-postası mevcut.
   - Açık konfigürasyon: kullanıcı Supabase'e henüz giriş yapamadığı için Supabase Authentication Redirect URLs içine `https://www.terminboerse.at/login?recovery=doctor` henüz eklenemedi.
   - Bu ayar eklenene kadar reset e-postası akışı hedef sayfaya dönmeyebilir; diğer şifre/e-posta değişimi çalışır.
- Mola anındaki sonraki olası odaklar:
   1. Doktor paneli: `Neue Patienten willkommen` üç durumlu veri + `/arzt` filtresi/kart rozeti.
   2. Doktor profilindeki `Leistungen` alanlarını `/api/doctors` aramasına dahil etme.
   3. Yeni branş rehberleri: Hautarzttermin, Frauenarzttermin, Zahnarzttermin Wien.
   4. Doktor detail sayfalarında gerçek veriye dayalı `Physician`/`MedicalClinic` schema.
   5. Google Places API konusu şimdilik ertelendi. Olası güvenli model: yalnız yönetilen doktorlarla, admin onaylı manuel eşleştirme pilotu; Google puanı, yorum sayısı ve çalışma saatleri için `place_id` saklanır. Tüm OGD listesini otomatik eşleştirme veya Google yorum metinlerini kopyalama yapılmayacak.

## 41) Session Delta (2026-09-02) - Slug Redirect Fix + Profil Sayfası Benzersizleştirme
- Kritik bug bulundu ve düzeltildi: doktor profili düzenlenince (isim/branş/bezirk değişince) SEO slug'ı değişiyor, eski indekslenmiş URL kalıcı olarak 404 veriyordu.
  - `lib/doctors.ts` içindeki `findDoctorBySeoSlug` artık tam eşleşme bulamazsa kalıcı doktor ID'sinden (slug sonundaki `arztogd-XXXX`/`custom-XXXX`) fallback araması yapıyor.
  - `app/arzt/[id]/page.tsx` artık eski slug ile gelen istekleri güncel kanonik URL'e `permanentRedirect` (308) ile yönlendiriyor.
  - Canlıda doğrulandı: `dr-oliver-schneeberger-...-09-bezirk-...` artık 404 değil, 308 ile doğru URL'e yönleniyor.
- Doktor profil sayfalarındaki birebir tekrar eden şablon metinleri azaltıldı (Google'ın "gecrawlt, indekslenmedi" kararına dogrudan bagli bir sorun):
  - Yeni yardımcı: `lib/nearbyPlaces.ts` → `getNearestPharmacies(lat, lng, limit)`. Mevcut `data/APOTHEKEOGD.json` + doktorun koordinatlarıyla haversine mesafe hesaplayıp en yakın 3 eczaneyi (isim, adres, mesafe) listeliyor. Doktor girdisi gerektirmiyor.
  - "Apotheken in der Nähe" bölümü canlıda doğrulandı (Dr. Daniel Dugandzic profilinde 3 eczane, 190m/410m/420m).
  - Boş profil alanları (`Über mich`, `Leistungen`, `Versicherung`, `Neue Patienten`) artık sabit "Noch keine Angaben vorhanden" yerine branş+bezirk enjekte edilmiş cümle gösteriyor.
  - "Anreise & Parken" giriş metnine adres/bezirk eklendi.
  - Booking-durum metinleri (`getBookingStatusLabel`) artık doktor adını içeren iki farklı varyanta (`short`/`detailed`) ayrıldı; aynı sayfada aynı cümle iki kez birebir tekrar etmiyor.
- Doğrulama: `npx tsc --noEmit`, `npm run build` başarılı; production'da Dr. Daniel Dugandzic profili üzerinden eczane mesafesi, branş/bezirk enjekte edilmiş boş alan metinleri ve kişiselleştirilmiş booking metni canlıda doğrulandı.
- Deploy: `terminboerse-93q5cwwhp-ilhanyalcin3307s-projects.vercel.app` (alias: www.terminboerse.at)
- Kalan iş: `getDoctorWorkingHours` içindeki varsayılan (doktor saatleri girilmemişse) Sprechzeiten metni hâlâ sabit; sıradaki küçük iyileştirme adayı.

## 42) Session Delta (2026-09-02) - Gerçek Toplu Taşıma + Otopark Verisi
- Wien'in resmi açık veri WFS servisinden (data.wien.gv.at) iki yeni veri seti indirilip repoya eklendi:
  - `data/HALTESTELLENOGD.json` (`ogdwien:OEFFHALTESTOGD`, 10.404 durak, isim + hat numaraları)
  - `data/GARAGENOGD.json` (`ogdwien:GARAGENOGD`, 373 otopark, isim/adres/işletmeci/Park&Ride)
- `lib/nearbyPlaces.ts` genişletildi:
  - `getNearestTransitStops(lat, lng, limit)`: en yakın duraklar, aynı durağın farklı yön kayıtları isim bazlı birleştirilip hatlar tekilleştiriliyor.
  - `getNearestParkingGarages(lat, lng, limit)`: en yakın otoparklar.
- `app/arzt/[id]/page.tsx`:
  - "Öffentliche Verkehrsmittel" kartına en yakın 3 durak + hat numaraları eklendi.
  - "Mit dem Auto" kartına en yakın otoparkın kısa özeti eklendi.
  - "Parken" kartına en yakın 3 otoparkın tam listesi (isim, adres, işletmeci, mesafe) eklendi.
- Bilinçli olarak eklenmedi: "Gürtel yakınında" gibi cadde/yol adı yakınlığı iddiaları. Güvenilir açık veri kaynağı bulunamadı, uydurma bilgi verilmedi.
- Doğrulama: `npx tsc --noEmit`, `npm run build` başarılı; production'da Dr. Daniel Dugandzic profilinde gerçek durak/hat (`Linien 49, N49` vb.) ve otopark (`Karree Breitensee`, ~300m) canlı doğrulandı.
- Deploy: `terminboerse-52bl1z86s-ilhanyalcin3307s-projects.vercel.app` (alias: www.terminboerse.at)

## 43) Session Delta (2026-09-02) - Boş Alan Toparlama + Physician Schema
- Doktor profilinde 4 ayrı "Noch keine Angaben vorhanden" kutusu tek bir özet kutusuna birleştirildi:
  - Doldurulmuş alanlar (`Über mich`, `Leistungen`, `Versicherung`, `Neue Patienten`) normal kartlarında görünmeye devam ediyor.
  - Boş olanlar tek kartta toplanıyor: `Noch nicht angegeben` başlığı + eksik alan isimleri + branş/bezirk enjekte edilmiş tek cümle.
  - Kullanılmayan `EmptyProfileValue` bileşeni kaldırıldı.
- Doktor sayfasına gerçek veriye dayalı `Physician` JSON-LD şeması eklendi (isim, uzmanlık, adres, koordinat, telefon, website).
- Doğrulama: `npx tsc --noEmit`, `npm run build` başarılı; production'da Dr. Daniel Dugandzic profilinde tek özet kutusu ve `Physician` şeması canlı doğrulandı.
- Deploy: `terminboerse-1eagvq4bv-ilhanyalcin3307s-projects.vercel.app` (alias: www.terminboerse.at)

## 45) Session Delta (2026-09-02) - Aynı Adresteki Çift Doktor Kayıtlarını Otomatik Birleştirme
- `lib/doctors.ts` içindeki `normalizeDoctorsData` fonksiyonu güncellendi.
- İsim ve adres bazında tam eşleşen doktor kayıtları tek bir profil altında otomatik olarak birleştiriliyor.
- Farklı uzmanlık alanları birleştirilerek tek profilde (ör. `Innere Medizin & Hausarzt / Allgemeinmedizin`) gösteriliyor.
- Telefon, e-posta, web sitesi ve randevu linki gibi eksik alanlar diğer kayıttan tamamlanıyor.
- Doğrulama: `npx tsc --noEmit` ve `npm run build` başarılı.

## 44) Session Delta (2026-09-02) - Harici Direkt Online-Termin Linki (meineakte.at, Doctena, Latido)
- Doktor profil veri modeline opsiyonel `bookingUrl` (harici online randevu linki) eklendi (`lib/doctors.ts`, `lib/arztbereichAdminStore.ts`).
- Arztbereich profil editörüne `Direkter Online-Termin Link (z. B. meineakte.at, Doctena, Latido)` alanı eklendi (`components/arztbereich/ArztDashboardLite.tsx`, `app/api/arztbereich/profile/update/route.ts`). Profil seçildiğinde local storage/kayıtlı `bookingUrl` verisinin form alanına yüklenmesi düzeltildi.
- Doktor detay sayfasında (`app/arzt/[id]/page.tsx`):
  - Harici link tanımlıysa yeşil `Direkte Online-Terminbuchung möglich` bilgi kutusu ve `Jetzt Online-Termin buchen` butonu gösteriliyor.
  - `DoctorProfileActions` aksiyon çubuğunda yeşil `Online-Termin buchen` butonu görüntüleniyor (`components/arzt/DoctorProfileActions.tsx`).
  - `Physician` schema'sı içine `sameAs` array ile ekleniyor.
- Arama/dizin kartlarında (`components/arzt/ArztDirectory.tsx`):
  - Harici randevu linki olan doktorlarda `🟢 Online-Termin möglich` rozeti render ediliyor.
  - Kart alt aksiyon butonlarına yeşil `Online-Termin` butonu eklendi.
- Supabase SQL migration eklendi: `supabase/migrations/20260902_doctor_profile_booking_url.sql`.
- Doğrulama: `npx tsc --noEmit` ve `npm run build` başarılı.
