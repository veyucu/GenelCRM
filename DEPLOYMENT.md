# GenelCRM - Windows Sunucu Kurulum Kılavuzu

## Gereksinimler
- Node.js 18+ 
- Git
- SQL Server erişimi

---

## 1. Projeyi Sunucuya Kopyalama

```powershell
cd C:\
git clone https://github.com/veyucu/GenelCRM.git
cd GenelCRM
```

---

## 2. Bağımlılıkları Yükleme

```powershell
# Backend
cd C:\GenelCRM\backend
npm install

# Frontend
cd C:\GenelCRM\frontend
npm install
```

---

## 3. Backend .env Dosyasını Yapılandırma

`C:\GenelCRM\backend\.env` dosyası oluşturun:

```env
PORT=5000
DB_SERVER=sunucu_adresi
DB_DATABASE=veritabani_adi
DB_USER=kullanici
DB_PASSWORD=sifre
JWT_SECRET=guclu_bir_secret_key
```

---

## 4. Frontend Production Build

```powershell
cd C:\GenelCRM\frontend
npm run build
```

Bu komut `dist/` klasörü oluşturur.

---

## 5. PM2 Kurulumu ve Yapılandırma

### PM2 ve Windows Service Kurulumu

```powershell
# PM2 global kurulum
npm install -g pm2

# Windows service modülü
npm install -g pm2-windows-startup
```

### ecosystem.config.js Oluşturma

`C:\GenelCRM\ecosystem.config.js` dosyası oluşturun:

```javascript
module.exports = {
  apps: [
    {
      name: 'genel-crm-backend',
      cwd: 'C:/GenelCRM/backend',
      script: 'server.js',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'genel-crm-frontend',
      cwd: 'C:/GenelCRM/frontend',
      script: 'node_modules/serve/build/main.js',
      args: 'dist -s -l 5173',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false
    }
  ]
};
```

### Frontend için Serve Kurulumu

```powershell
cd C:\GenelCRM\frontend
npm install serve
```

---

## 6. Uygulamaları Başlatma

```powershell
cd C:\GenelCRM
pm2 start ecosystem.config.js
pm2 save
```

---

## 7. Windows Servisi Olarak Kaydetme

```powershell
# Yönetici olarak PowerShell açın
pm2-startup install

# Servisleri kaydet
pm2 save
```

---

## 8. Kullanışlı PM2 Komutları

| Komut | Açıklama |
|-------|----------|
| `pm2 list` | Çalışan servisler |
| `pm2 logs` | Tüm loglar |
| `pm2 logs genel-crm-backend` | Backend logları |
| `pm2 restart all` | Tümünü yeniden başlat |
| `pm2 stop all` | Tümünü durdur |
| `pm2 delete all` | Tümünü sil |
| `pm2 monit` | Canlı izleme |

---

## 9. Erişim Adresleri

- **Frontend:** http://sunucu-ip:5173
- **Backend API:** http://sunucu-ip:5000/api

---

## Sorun Giderme

### Logları Kontrol Et
```powershell
pm2 logs --lines 100
```

### Servisi Yeniden Başlat
```powershell
pm2 restart genel-crm-backend
pm2 restart genel-crm-frontend
```

### PM2 Durumunu Kontrol Et
```powershell
pm2 status
```
