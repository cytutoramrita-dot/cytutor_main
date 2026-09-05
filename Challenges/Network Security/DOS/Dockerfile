# Stage 1: build static Go binary
FROM golang:1.21-alpine AS builder
WORKDIR /src
RUN apk add --no-cache git
COPY MAIN.GO /src/
ENV CGO_ENABLED=0
RUN go build -ldflags="-s -w" -o /server /src/MAIN.GO

# copy flag into builder and set strict permissions here
COPY Flag.txt /Flag.txt
RUN chmod 400 /Flag.txt

# Stage 2: final minimal image
FROM scratch
COPY --from=builder /server /server
COPY --from=builder /Flag.txt /Flag.txt
EXPOSE 8080
ENTRYPOINT ["/server"]
