# Challenge Files Directory

This directory stores downloadable files for challenges.

## Structure

```
public/challenge-files/
├── down/
│   └── mystery.jpg  (Place your image file here)
├── other-challenge/
│   └── files...
```

## Adding Files

1. Create a folder for your challenge (e.g., `down/`)
2. Place your downloadable files in that folder
3. Reference them in `challenges.json` as `/challenge-files/challenge-name/filename.ext`

## For "Down" Challenge

Place your image file at:
```
public/challenge-files/down/mystery.jpg
```

The file will be accessible at:
```
http://localhost:3000/challenge-files/down/mystery.jpg
```

## File Types Supported

- Images: .jpg, .png, .gif
- Archives: .zip, .tar.gz, .7z
- Documents: .pdf, .txt
- Binary files: .bin, .exe, .elf
- Network captures: .pcap, .pcapng
- Memory dumps: .raw, .dump

## Security Note

Files in this directory are publicly accessible. Don't store sensitive information.
