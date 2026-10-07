# Math Up

Workspace untuk guru matematika: dashboard, jadwal mengajar, To-Do, kalender akademik, Drive materi, dan kolaborasi guru.

## Arsitektur

Math Up sekarang diarahkan ke **Google Sheets + Google Apps Script**, tanpa Google Cloud sebagai backend.

- React/Vite: antarmuka Math Up.
- Google Apps Script: backend dan autentikasi akun Google.
- Google Sheets: database utama.
- GitHub: source code.

Folder `apps-script/` berisi backend yang membuat/mengelola:
- Users
- Teachers
- Schedule
- Todo
- Events
- AcademicCalendar

Google Apps Script menyediakan identitas pengguna melalui `Session.getActiveUser()` pada konfigurasi web app yang sesuai. citeturn0search0turn0search2

## Konfigurasi Apps Script

1. Buat satu Google Spreadsheet untuk database Math Up.
2. Buka **Extensions → Apps Script**.
3. Salin `apps-script/Code.gs` dan `apps-script/appsscript.json` ke project tersebut.
4. Jalankan `setSpreadsheetId("ID_SHEET")` satu kali.
5. Jalankan `setupSheets()` satu kali.
6. Deploy sebagai **Web app** dengan konfigurasi akses yang sesuai akun/domain sekolah.

Backend tidak mempercayai email yang dikirim sendiri oleh browser; identitas diambil dari sesi Google pada Apps Script.

## Catatan autentikasi

Versi GitHub Pages murni tidak boleh menganggap endpoint Apps Script sebagai API publik yang menerima email dari browser. Karena itu tahap berikutnya adalah menghubungkan shell React dengan host Apps Script atau mekanisme autentikasi yang sesuai dengan host tersebut.

Dengan arsitektur ini kita tidak perlu membuat Google Cloud project sebagai backend.

## Keamanan

Jangan commit password, token, service-account JSON, atau credential rahasia ke repository publik.

Google Apps Script meminta otorisasi saat script pertama kali menggunakan layanan yang memerlukan izin. citeturn0search0turn0search3
