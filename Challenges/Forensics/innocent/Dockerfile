FROM alpine:3.19

RUN apk add --no-cache zip python3 dos2unix

WORKDIR /work

COPY generate.sh .
COPY flag.txt .

RUN dos2unix generate.sh && chmod +x generate.sh

CMD ["sh", "./generate.sh"]
