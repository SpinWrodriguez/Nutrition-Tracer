# FatSecret Proxy — How It Works & How We Built It

## Why do we need a proxy?

FatSecret is the food database that powers nutrition search in the app. The problem is:

- FatSecret only allows requests from **whitelisted IP addresses** (max 15 IPs)
- Your app runs in users' browsers, which have random IPs — impossible to whitelist
- Browsers also can't call FatSecret's login endpoint directly (CORS blocked)

So we need a **middleman server** with a fixed IP address:

```
Your App (GitHub Pages, HTTPS)
        ↓
  Proxy Server (Oracle VM — fixed IP, whitelisted in FatSecret)
        ↓
    FatSecret API
```

---

## What the proxy does

The proxy is a small Node.js server (`server/fatsecret-proxy.js`) that:
1. Receives food search requests from your app
2. Logs into FatSecret using your API credentials (stored only on the server)
3. Forwards the search to FatSecret and returns results
4. Exposes two endpoints:
   - `GET /api/fatsecret/search?q=salmon` — search for foods
   - `GET /api/fatsecret/food?id=2057` — get full nutrition detail for a food

---

## Infrastructure overview

| Component | What it is | Purpose |
|-----------|-----------|---------|
| **Oracle Cloud VM** | A free cloud computer running 24/7 in Melbourne | Hosts the proxy server |
| **Node.js + PM2** | JavaScript runtime + process manager | Runs the proxy, auto-restarts on reboot |
| **nginx** | Web server | Handles HTTPS (port 443), forwards to Node.js (port 3000) |
| **Let's Encrypt (certbot)** | Free SSL certificate | Makes HTTPS trusted (the padlock) — required because the app is on HTTPS |
| **DuckDNS** | Free domain name service | Gives the VM a readable address instead of a raw IP |

---

## Step-by-step: what we did

### 1. Created the Oracle Cloud VM
- Signed up for Oracle Cloud Always Free (free forever)
- Created an Ubuntu 20.04 VM in Melbourne (`ap-melbourne-1`)
- Assigned a **public static IP**: `169.224.231.149`
- Opened ports in Oracle's firewall (Security List — Destination Port, Source = All):
  - Port 22 — SSH (to connect to the VM)
  - Port 80 — HTTP (needed for SSL certificate verification)
  - Port 443 — HTTPS (the app calls this)
  - Port 3000 — Node.js (internal, also opened as backup)

### 2. Set up the domain name
- Created a free subdomain at [duckdns.org](https://duckdns.org): `nutrition-proxy.duckdns.org`
- Pointed it to the VM's IP `169.224.231.149`
- This lets the app call `https://nutrition-proxy.duckdns.org` instead of a raw IP

### 3. Connected to the VM
- Used OCI Cloud Shell (browser terminal at cloud.oracle.com — no software needed)
- Generated an SSH key pair in Cloud Shell
- SSH'd in: `ssh ubuntu@169.224.231.149`

### 4. Installed Node.js on the VM
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 5. Cloned the app repo onto the VM
```bash
git clone https://github.com/spinwrodriguez/Nutrition-Tracer.git
cd Nutrition-Tracer
npm install
```

### 6. Created the credentials file on the VM
```bash
cat > .env << 'EOF'
FATSECRET_CLIENT_ID=6a80b94a249942a58c77846aee22c542
FATSECRET_CLIENT_SECRET=45bbad83bb924f2081c26902f71eeec3
FATSECRET_REGION=AU
FATSECRET_LANGUAGE=en
PORT=3000
EOF
```
The credentials only live on the server — never committed to GitHub, never in the browser.

### 7. Started the proxy with PM2
```bash
npm install -g pm2
pm2 start server/fatsecret-proxy.js --name fatsecret-proxy
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
pm2 save
```
PM2 keeps the server running 24/7 and restarts it automatically if the VM reboots.

### 8. Got a free HTTPS certificate
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo certbot certonly --standalone -d nutrition-proxy.duckdns.org
```
Certificate expires **2026-09-21** — must be renewed before then (see Maintenance below).

### 9. Configured nginx for HTTPS
```bash
sudo tee /etc/nginx/sites-available/fatsecret > /dev/null << 'EOF'
server {
    listen 443 ssl;
    server_name nutrition-proxy.duckdns.org;
    ssl_certificate /etc/letsencrypt/live/nutrition-proxy.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nutrition-proxy.duckdns.org/privkey.pem;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}
server {
    listen 80;
    server_name nutrition-proxy.duckdns.org;
    return 301 https://$host$request_uri;
}
EOF
sudo ln -s /etc/nginx/sites-available/fatsecret /etc/nginx/sites-enabled/
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo nginx -t && sudo systemctl restart nginx
```

### 10. Whitelisted the IP in FatSecret
Added `169.224.231.149` at:
**platform.fatsecret.com → Account → API Keys → IP Restrictions**

### 11. Connected the app to the proxy
`.env.local` (local dev):
```
VITE_FATSECRET_PROXY_URL=https://nutrition-proxy.duckdns.org
```
GitHub Secret (production): `VITE_FATSECRET_PROXY_URL` = `https://nutrition-proxy.duckdns.org`

---

## Maintenance

### SSH into the VM (from OCI Cloud Shell at cloud.oracle.com)
```bash
ssh ubuntu@169.224.231.149
```

### Update the proxy after code changes
```bash
cd ~/Nutrition-Tracer && git pull && pm2 restart fatsecret-proxy
```

### Renew SSL certificate (before 2026-09-21)
```bash
sudo systemctl stop nginx
sudo certbot renew
sudo systemctl start nginx
```

### Check proxy is running
```bash
pm2 status
pm2 logs fatsecret-proxy
```

### Test the proxy
```
https://nutrition-proxy.duckdns.org/api/health
https://nutrition-proxy.duckdns.org/api/fatsecret/search?q=salmon
```
