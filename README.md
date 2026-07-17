# KakiDaki Backend 🏔️

KakiDaki adalah platform persiapan dan pelacakan pendakian gunung yang ditenagai oleh AI. Backend ini dibangun menggunakan **NestJS**, **Prisma ORM**, dan **PostgreSQL**, serta terintegrasi dengan berbagai layanan eksternal seperti Google Fit, Gemini AI, dan Midtrans.

## 🌟 Fitur Utama
- **AI Readiness Assessment**: Menganalisis kondisi fisik, histori medis, dan data gunung menggunakan Gemini AI untuk memberikan skor kesiapan dan keputusan (GO / CAUTION / NO-GO).
- **AI Training Plan**: Menghasilkan target porsi latihan fisik secara otomatis yang disesuaikan dengan BMI pengguna dan kesulitan elevasi gunung.
- **Google Fit Auto-Tracking**: Melacak progress porsi latihan pengguna dengan menarik data asli langsung dari Google Fit (via OAuth 2.0).
- **Weather Forecast**: Mendapatkan data prakiraan cuaca 7 hari secara akurat langsung dari Open-Meteo di lokasi (latitude/longitude) gunung tujuan.
- **Pro Credits / Payment**: Sistem pembelian kredit analisis persiapan mendaki menggunakan payment gateway Midtrans.

## 🛠️ Prasyarat (Prerequisites)
Sebelum menjalankan proyek ini, pastikan sistem kamu sudah terinstall:
- **Node.js** (v18 atau lebih baru)
- **PostgreSQL** (Berjalan di port 5432)
- Git

---

## 🚀 Cara Menjalankan Project (Setup Guide)

### 1. Clone Repository
Buka terminal dan clone repository ini ke komputer lokal kamu:
```bash
git clone <URL_REPO_KAMU> kaki-daki-backend
cd kaki-daki-backend
```

### 2. Install Dependencies
Install semua library dan package yang dibutuhkan:
```bash
npm install
```

### 3. Setup Environment Variables
Buat sebuah file baru bernama `.env` di root folder proyek (sejajar dengan file `package.json`). Copy paste konfigurasi di bawah ini ke dalam file `.env` tersebut dan sesuaikan dengan datamu:

```env
# ===== App =====
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# ===== Database (PostgreSQL) =====
# Ganti nama_user, password, dan nama_db sesuai dengan setting Postgres lokalmu
DATABASE_URL="postgresql://username_kamu:password_kamu@localhost:5432/kakidaki?schema=public"

# ===== JWT =====
JWT_SECRET=rahasia_jwt_super_aman_untuk_kakidaki_123
JWT_EXPIRES_IN=7d

# ===== Gemini AI =====
GEMINI_API_KEY=masukkan_api_key_gemini_mu_di_sini
GEMINI_MODEL=gemini-1.5-flash

# ===== Google Fit OAuth =====
GOOGLE_FIT_CLIENT_ID=masukkan_client_id_google_cloud_mu
GOOGLE_FIT_CLIENT_SECRET=masukkan_client_secret_google_cloud_mu
# PENTING: Jika run di lokal, pastikan redirect uri ini terdaftar di Google Cloud Console
GOOGLE_FIT_REDIRECT_URI=http://localhost:3000/api/v1/google-fit/callback

# ===== OpenRouter (Opsional - Vision AI) =====
OPENROUTER_API_KEY=
OPENROUTER_MODEL=google/gemini-2.5-flash

# ===== Open-Meteo (Cuaca - Tidak butuh key) =====
OPENMETEO_BASE_URL=https://api.open-meteo.com/v1/forecast

# ===== Midtrans (Payment Gateway Sandbox) =====
MIDTRANS_SERVER_KEY=masukkan_server_key_sandbox_midtrans
MIDTRANS_CLIENT_KEY=masukkan_client_key_sandbox_midtrans
MIDTRANS_IS_PRODUCTION=false

# ===== Pro Pricing =====
PRO_PRICE_PER_CREDIT=25000
```

### 4. Setup Database (Prisma)
Pastikan server PostgreSQL kamu sudah menyala dan database `kakidaki` sudah terbuat. Jalankan perintah ini untuk melakukan sinkronisasi skema database dan membuat Prisma Client:
```bash
npx prisma db push
npx prisma generate
```

### 5. Jalankan Server
Setelah database berhasil disinkronisasi, kamu bisa menjalankan server dalam mode development:
```bash
npm run start:dev
```
Aplikasi sekarang berjalan di `http://localhost:3000/api/v1`.

---

## 📖 Dokumentasi API (Swagger)
Backend KakiDaki telah dilengkapi dengan dokumentasi interaktif Swagger API. 
Saat server sedang berjalan, kamu bisa mengaksesnya dengan membuka browser dan pergi ke:
👉 **`http://localhost:3000/api/docs`**

Di sana kamu bisa langsung mengetes semua endpoint beserta panduan format request/response-nya.

## ⚠️ Troubleshooting (Catatan Penting)
- **Error Google Fit `redirect_uri_mismatch` atau `invalid_request`**: Pastikan nilai `GOOGLE_FIT_REDIRECT_URI` di file `.env` kamu **sama persis** dengan yang kamu daftarkan di menu *Authorized redirect URIs* di akun Google Cloud Console. Jika kamu baru mengubah file `.env`, **wajib restart server backend** (`Ctrl+C` lalu jalankan lagi `npm run start:dev`).
- **Error Prisma connection**: Pastikan format username dan password di `DATABASE_URL` sudah benar dan service PostgreSQL sedang running.
