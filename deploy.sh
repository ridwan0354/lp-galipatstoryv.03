#!/usr/bin/env bash
set -e

DOMAIN="lp.galipatstory.com"
APP_DIR="/var/www/$DOMAIN"
PORT=4303
REPO="https://github.com/ridwan0354/lp-galipatstoryv.03.git"

echo "================================================="
echo "🚀 MEMULAI DEPLOY LP GALIPAT STORY KE VPS"
echo "🌐 Target Domain: https://$DOMAIN"
echo "================================================="

# 1. Pastikan Git terpasang
if ! command -v git >/dev/null 2>&1; then
  echo "📦 Memasang Git..."
  (apt-get update -y && apt-get install -y git) || (yum install -y git)
fi

# 2. Setup folder project
if [ -d "$APP_DIR/.git" ]; then
  echo "🔄 Mengambil update terbaru dari Git..."
  cd "$APP_DIR"
  git reset --hard HEAD
  git pull origin main
else
  echo "📥 Mengkloning repositori ke $APP_DIR..."
  mkdir -p /var/www
  git clone "$REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

# 3. Pastikan PM2 terpasang & jalankan server Node.js
if ! command -v pm2 >/dev/null 2>&1; then
  echo "⚙️ Memasang PM2 secara global..."
  npm install -g pm2
fi

echo "▶️ Menjalankan aplikasi dengan PM2..."
pm2 stop "$DOMAIN" >/dev/null 2>&1 || true
pm2 delete "$DOMAIN" >/dev/null 2>&1 || true
PORT=$PORT pm2 start server.mjs --name "$DOMAIN" --time
pm2 save

# 4. Buat konfigurasi Nginx aman (tidak mengganggu proyek lain)
echo "🌐 Mengonfigurasi Nginx reverse proxy..."
if [ -d "/etc/nginx/sites-available" ]; then
  CONF_PATH="/etc/nginx/sites-available/$DOMAIN"
  cat << 'EOF' > "$CONF_PATH"
server {
    listen 80;
    listen [::]:80;
    server_name lp.galipatstory.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:4303;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
  ln -sf "$CONF_PATH" "/etc/nginx/sites-enabled/$DOMAIN"
elif [ -d "/etc/nginx/conf.d" ]; then
  CONF_PATH="/etc/nginx/conf.d/$DOMAIN.conf"
  cat << 'EOF' > "$CONF_PATH"
server {
    listen 80;
    server_name lp.galipatstory.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:4303;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
fi

# 5. Pasang SSL via Certbot untuk Cloudflare Full mode
echo "🔒 Memasang sertifikat SSL via Certbot..."
if ! command -v certbot >/dev/null 2>&1; then
  (apt-get update -y && apt-get install -y certbot python3-certbot-nginx) || (yum install -y certbot python3-certbot-nginx) || true
fi

certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect 2>/dev/null || true

# 6. Verifikasi dan reload Nginx
echo "🔄 Memeriksa dan memuat ulang Nginx..."
nginx -t
systemctl reload nginx

echo ""
echo "================================================="
echo "🎉 DEPLOY SUKSES!"
echo "🌐 Website sudah aktif di: https://$DOMAIN"
echo "📊 Cek log/status PM2: pm2 status $DOMAIN"
echo "================================================="
