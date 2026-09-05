FROM ubuntu:22.04

RUN apt update && apt install -y \
    e2fsprogs \
    mount \
    util-linux \
    coreutils \
    dos2unix

WORKDIR /work

COPY generate.sh .
COPY flag.txt .

# Fix Windows line endings
RUN dos2unix generate.sh && chmod +x generate.sh

CMD ["./generate.sh"]
