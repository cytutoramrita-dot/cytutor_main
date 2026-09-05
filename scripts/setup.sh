#!/bin/bash

# CyTutor Bare Minimum Setup
set -e

USER=$(whoami)
[ "$EUID" -eq 0 ] && { echo "Don't run as root"; exit 1; }

# Install dependencies
sudo apt update -qq
sudo apt install -y nodejs npm postgresql postgresql-contrib docker.io git curl exiftool >/dev/null 2>&1

# Setup Docker
sudo usermod -aG docker $USER
sudo systemctl enable --now docker >/dev/null 2>&1

# Setup PostgreSQL
sudo systemctl enable --now postgresql >/dev/null 2>&1
sudo -u postgres createuser --superuser $USER 2>/dev/null || true
sudo -u postgres psql -c "ALTER USER $USER PASSWORD '$USER';" 2>/dev/null
PG_HBA=$(sudo find /etc -name "pg_hba.conf" 2>/dev/null | head -1)
[ -n "$PG_HBA" ] && sudo sed -i 's/peer\|ident/md5/g' "$PG_HBA" && sudo systemctl restart postgresql

# Install project dependencies
npm install >/dev/null 2>&1
cd server && npm install >/dev/null 2>&1 && cd ..

# Create environment
NETWORK_IP=$(hostname -I | awk '{print $1}')
cat > server/.env << EOF
DATABASE_URL=postgresql://$USER:$USER@localhost:5432/cytutor
JWT_SECRET=$(openssl rand -hex 32)
PORT=3001
NODE_ENV=development
HOST_IP=${NETWORK_IP:-localhost}
CHALLENGE_PORT_MIN=10000
CHALLENGE_PORT_MAX=20000
CHALLENGE_TIMEOUT_MINUTES=45
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
EOF

# Setup database
cd server
npx tsx create_db.ts >/dev/null 2>&1
npm run migrate >/dev/null 2>&1
npm run load-challenges >/dev/null 2>&1
npm run load-tutorials >/dev/null 2>&1

# Initialize ports table
psql -U $USER -d cytutor -c "
INSERT INTO ports (port, is_allocated) 
SELECT generate_series(10000, 20000), false 
ON CONFLICT (port) DO NOTHING;
" >/dev/null 2>&1

cd ..

# Build Docker images
make build >/dev/null 2>&1 || true

echo "Setup complete! Start with: cd server && npm run dev & sleep 3 && cd .. && npm run dev"