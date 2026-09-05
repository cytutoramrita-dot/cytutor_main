# Challenge Templates

This directory contains Dockerfile templates for different challenge types.

## Building Challenge Images

### Web Challenge Example
```bash
cd web-challenge
docker build -t cytutor/web-01 .
```

### Creating New Challenges

1. Copy a template directory
2. Modify the challenge content
3. Build with appropriate tag matching challenge-registry.json
4. Push to registry or keep locally for development

## Challenge Types

- **web-challenge** - Node.js web server challenges
- **crypto-challenge** - Python-based cryptography challenges
- **network-challenge** - Network analysis challenges
- **reverse-challenge** - Binary reverse engineering challenges

## Security Notes

- All containers run with limited memory (256MB)
- CPU limited to 0.5 cores
- No host filesystem access
- Containers auto-cleanup after timeout
- User runs as non-root inside container
