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

# 4. Buat Sertifikat SSL untuk Cloudflare Full mode
echo "🔒 Membuat sertifikat SSL untuk port 443..."
mkdir -p /etc/ssl/certs /etc/ssl/private
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout /etc/ssl/private/$DOMAIN.key \
  -out /etc/ssl/certs/$DOMAIN.crt \
  -subj "/CN=$DOMAIN" >/dev/null 2>&1

# 5. Buat konfigurasi Nginx (Port 80 & Port 443)
echo "🌐 Mengonfigurasi Nginx reverse proxy (Port 80 & 443)..."
NGINX_TEMPLATE='server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN_NAME;

    client_max_body_size 10M;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml font/woff2;

    location / {
        proxy_pass http://127.0.0.1:PORT_NUM;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name DOMAIN_NAME;

    ssl_certificate /etc/ssl/certs/DOMAIN_NAME.crt;
    ssl_certificate_key /etc/ssl/private/DOMAIN_NAME.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 10M;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml font/woff2;

    location / {
        proxy_pass http://127.0.0.1:PORT_NUM;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}'

CONFIG_CONTENT=$(echo "$NGINX_TEMPLATE" | sed "s/DOMAIN_NAME/$DOMAIN/g" | sed "s/PORT_NUM/$PORT/g")

if [ -d "/etc/nginx/sites-available" ]; then
  CONF_PATH="/etc/nginx/sites-available/$DOMAIN"
  echo "$CONFIG_CONTENT" > "$CONF_PATH"
  ln -sf "$CONF_PATH" "/etc/nginx/sites-enabled/$DOMAIN"
elif [ -d "/etc/nginx/conf.d" ]; then
  CONF_PATH="/etc/nginx/conf.d/$DOMAIN.conf"
  echo "$CONFIG_CONTENT" > "$CONF_PATH"
fi

# 6. Verifikasi dan reload Nginx
echo "🔄 Memeriksa dan memuat ulang Nginx..."
nginx -t
systemctl reload nginx

echo ""
echo "================================================="
echo "🎉 DEPLOY SUKSES!"
echo "🌐 Website: https://$DOMAIN"
echo "🔐 Panel Admin: https://$DOMAIN/kamu"
echo "📊 Cek log/status PM2: pm2 status $DOMAIN"
echo "================================================="
