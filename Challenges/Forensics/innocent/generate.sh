#!/bin/sh
set -e

mkdir -p build
cd build

# Innocent files
echo "Vacation photos from 2023" > photos.txt
echo "Nothing suspicious here" > notes.txt

# Create ZIP
zip innocent.zip photos.txt notes.txt

# Add ZIP comment (XOR key) — MUST terminate with '.'
printf "XORKEY=dead\n.\n" | zip -z innocent.zip

# Fake appended decoy
echo "-----BEGIN ARCHIVE-----" >> innocent.zip
echo "VGhpcyBpcyBhIGRlY295Lg==" >> innocent.zip
echo "-----END ARCHIVE-----" >> innocent.zip

# XOR-encode the real flag and append as binary
python3 - <<EOF >> innocent.zip
flag = open("../flag.txt","rb").read()
key = b"dead"
out = bytes([flag[i] ^ key[i % len(key)] for i in range(len(flag))])
import sys
sys.stdout.buffer.write(out)
EOF

mv innocent.zip /work/innocent.zip
