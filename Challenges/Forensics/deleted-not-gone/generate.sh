#!/bin/sh

set -e

IMG=disk.img
MNT=/mnt/forensic

# Create empty disk image
dd if=/dev/zero of=$IMG bs=1M count=50

# Create filesystem
mkfs.ext4 $IMG

# Mount image
mkdir -p $MNT
mount -o loop $IMG $MNT

# Create and write sensitive file
echo "CTF{deleted_is_not_gone}" > $MNT/secret.txt

# Sync to disk
sync

# Delete the file
rm $MNT/secret.txt

# Create noise
echo "Nothing to see here" > $MNT/readme.txt

sync

# Unmount
umount $MNT
