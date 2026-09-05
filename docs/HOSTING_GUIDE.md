# CyTutor Hosting Guide — College VM + Cloudflare + is-a.dev

## Overview

| Part | Service | Cost |
|---|---|---|
| Server (VPS) | College-provided Ubuntu VM | Free |
| Domain | is-a.dev subdomain | Free forever |
| DNS + CDN + SSL | Cloudflare Free | Free forever |
| Database | PostgreSQL (on VM) | Free |
| Docker (CTF challenges) | Docker (on VM) | Free |

---

## Before You Start — Ask Your College IT

Get answers to these before proceeding:

- [ ] What is the VM's IP address?
- [ ] Do we have sudo/root access?
- [ ] Can Docker be installed?
- [ ] How do we SSH in? (username + IP + password or SSH key)
- [ ] Is the VM publicly accessible from the internet, or only on college network?
- [ ] VM specs: RAM, CPU, storage (minimum needed: 2GB RAM, 20GB disk)

---

## Phase 1 — SSH Into the VM

Open **PowerShell** on your Windows PC:

**If using password:**
```powershell
ssh your-username@VM-IP-ADDRESS
```

**If using SSH key:**
```powershell
# Set correct permissions on the key first
icacls "path\to\key.pem" /inheritance:r /grant:r "$($env:USERNAME):(R)"

# Connect
ssh -i "path\to\key.pem" your-username@VM-IP-ADDRESS
```

You should see a terminal prompt like `username@hostname:~$` — you are now inside the VM.

---

## Phase 2 — Install Required Software

Run these commands inside the VM:

### Step 2.1 — Update system
```bash
sudo apt update && sudo apt upgrade -y
```

### Step 2.2 — Install Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version    # should show v20.x.x
npm --version
```

### Step 2.3 — Install PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Step 2.4 — Install Docker
```bash
curl -fsSL https://get.docker.com | sudo bash
sudo usermod -aG docker $USER
newgrp docker
docker --version    # should show Docker version
```

### Step 2.5 — Install Nginx and PM2
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo npm install -g pm2
```

---

## Phase 3 — Set Up PostgreSQL Database

```bash
sudo -u postgres psql
```

Inside psql, run:
```sql
CREATE DATABASE cytutor;
CREATE USER cytutor_user WITH PASSWORD 'choose-a-strong-password';
GRANT ALL PRIVILEGES ON DATABASE cytutor TO cytutor_user;
\q
```

---

## Phase 4 — Deploy CyTutor Code

### Step 4.1 — Clone the repository
```bash
cd /var/www
sudo mkdir cytutor
sudo chown $USER:$USER cytutor
git clone https://github.com/REPO-OWNER/cytutor-repo-name.git cytutor
cd cytutor/cytutor-1-main
```

> Replace `REPO-OWNER/cytutor-repo-name` with the actual GitHub repo path.
> Make sure the repo is public OR ask your senior to add you as a collaborator.

### Step 4.2 — Generate a JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output — you'll use it as `JWT_SECRET` below.

### Step 4.3 — Create backend environment file
```bash
cd server

cat > .env << 'EOF'
DATABASE_URL=postgresql://cytutor_user:choose-a-strong-password@localhost:5432/cytutor
JWT_SECRET=PASTE-THE-OUTPUT-FROM-STEP-4.2-HERE
PORT=3001
NODE_ENV=production
CHALLENGE_PORT_MIN=10000
CHALLENGE_PORT_MAX=20000
CHALLENGE_TIMEOUT_MINUTES=45
FRONTEND_URL=https://cytutor.is-a.dev
CORS_ORIGINS=https://cytutor.is-a.dev
EOF
```

### Step 4.4 — Create frontend environment file
```bash
# Go back to project root (cytutor-1-main/)
cd ..

cat > .env << 'EOF'
VITE_API_URL=https://cytutor.is-a.dev/api
EOF
```

> Replace `cytutor.is-a.dev` with your actual subdomain once registered in Phase 6.

### Step 4.5 — Install and build frontend
```bash
# In cytutor-1-main/
npm install
npm run build
# This creates a dist/ folder
```

### Step 4.6 — Install and build backend
```bash
cd server
npm install
npm run build
```

### Step 4.7 — Initialize database
```bash
# Still in server/
npx tsx create_db.ts
npm run migrate
npm run load-challenges
npm run load-tutorials
npm run load-courses
```

### Step 4.8 — Build Docker challenge images
```bash
cd /var/www/cytutor/cytutor-1-main

# See all challenges that have a Dockerfile
find Challenges -name Dockerfile

# Build each one (example):
docker build -t cytutor/power-cookie "./Challenges/Web Exploitation/power-cookie/"
# Repeat for every challenge with a Dockerfile
```

### Step 4.9 — Start backend with PM2
```bash
cd /var/www/cytutor/cytutor-1-main/server

pm2 start dist/index.js --name cytutor-backend
pm2 save
pm2 startup
# Copy and run the command that pm2 startup prints
```

Verify it's running:
```bash
pm2 status
curl http://localhost:3001/
```

---

## Phase 5 — Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/cytutor
```

Paste this (replace `cytutor.is-a.dev` with your subdomain):

```nginx
server {
    listen 80;
    server_name cytutor.is-a.dev;

    # Serve React frontend
    root /var/www/cytutor/cytutor-1-main/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy /api/ calls to Node.js backend
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and test:
```bash
sudo ln -s /etc/nginx/sites-available/cytutor /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default    # remove default page
sudo nginx -t                                   # should say "syntax is ok"
sudo systemctl reload nginx
```

---

## Phase 6 — Get Free Domain (is-a.dev)

### Step 6.1 — Fork the repository
1. Go to **github.com/is-a-dev/register**
2. Click **Fork** → fork to your GitHub account

### Step 6.2 — Create your domain file
In your forked repo → open the `domains/` folder → **Add file → Create new file**

- **File name**: `cytutor.json` (this gives you `cytutor.is-a.dev`)

Paste this content:
```json
{
  "owner": {
    "username": "your-github-username",
    "email": "your-email@gmail.com"
  },
  "record": {
    "A": ["YOUR-VM-IP-ADDRESS"]
  }
}
```

> Replace `YOUR-VM-IP-ADDRESS` with the college VM's public IP.

### Step 6.3 — Submit a Pull Request
1. Commit the file in your fork
2. Click **Contribute → Open Pull Request**
3. Title: `Add cytutor.is-a.dev`
4. Wait for approval — usually 1–3 days
5. Once merged, `cytutor.is-a.dev` points to your VM within minutes

> **Note:** is-a.dev already runs through Cloudflare — so HTTPS/SSL is automatically provided for your `*.is-a.dev` subdomain. No extra Cloudflare setup needed for this domain.

---

## Phase 7 — Open VM Firewall Ports

If the college VM has a firewall (UFW), open the required ports:

```bash
sudo ufw allow 22/tcp       # SSH (keep this open!)
sudo ufw allow 80/tcp       # HTTP
sudo ufw allow 443/tcp      # HTTPS
sudo ufw allow 10000:20000/tcp   # Docker challenge ports
sudo ufw enable
sudo ufw status
```

Also ask college IT to open these ports at the **network/router level** if the VM is behind a college firewall.

---

## Phase 8 — Verify Everything Works

```bash
# Backend running?
pm2 status

# Backend responding?
curl http://localhost:3001/

# Nginx serving frontend?
curl http://YOUR-VM-IP/

# After domain is active:
curl https://cytutor.is-a.dev/
curl https://cytutor.is-a.dev/api/
```

Visit `https://cytutor.is-a.dev` in your browser — you should see the CyTutor landing page.

---

## Redeployment (after code changes)

```bash
cd /var/www/cytutor/cytutor-1-main
git pull

# Rebuild frontend
npm run build

# Rebuild and restart backend
cd server
npm run build
pm2 restart cytutor-backend
```

---

## Quick Reference

```bash
pm2 status                        # Check if backend is running
pm2 logs cytutor-backend          # View backend logs
pm2 restart cytutor-backend       # Restart backend
sudo systemctl reload nginx       # Reload nginx after config changes
sudo tail -f /var/log/nginx/error.log   # Nginx error logs
docker ps                         # List running challenge containers
```

---

## Checklist Before Going Live

- [ ] SSH access confirmed to the college VM
- [ ] sudo/root access confirmed
- [ ] Node.js 20, PostgreSQL, Docker, Nginx, PM2 installed
- [ ] Database `cytutor` created and migrations run
- [ ] All challenge Docker images built
- [ ] Frontend `dist/` folder exists
- [ ] Backend running via PM2 (`pm2 status` → online)
- [ ] Nginx configured and reloaded
- [ ] Firewall ports 80, 443, 10000-20000 open
- [ ] is-a.dev PR submitted (waiting for approval)
- [ ] Site loads at `http://YOUR-VM-IP` before domain is active

---

## Troubleshooting

| Problem | Fix |
|---|---|
| SSH: Permission denied | Check username; ensure SSH key permissions are set correctly |
| 502 Bad Gateway | Backend not running — `pm2 restart cytutor-backend` |
| 404 Not Found | Check Nginx `root` path points to the correct `dist/` folder |
| CORS errors in browser | Check `CORS_ORIGINS` in `server/.env` matches your exact domain |
| Docker challenges fail | Check `docker ps`; ensure ports 10000-20000 are open |
| is-a.dev PR rejected | Ensure GitHub account is not brand new; check JSON is valid |
| Site only works on college WiFi | Ask IT to give the VM a public IP or set up port forwarding |
