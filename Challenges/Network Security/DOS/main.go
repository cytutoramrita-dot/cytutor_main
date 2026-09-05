package main

import (
	"crypto/rand"
	"encoding/hex"
	"io"
	"log"
	"net/http"
	"os"
	"sync"
	"sync/atomic"
	"time"
)

var (
	THRESHOLD    int64         = 50
	MIN_DURATION time.Duration = 20 * time.Second
	FLAG_PATH                  = "/flag.txt"
)

var (
	activeConnections int64
	conditionStart    atomic.Value // time.Time
	conditionOn       atomic.Bool

	tokenMutex sync.Mutex
	activeToken string
	tokenExpiry time.Time
)

func main() {
	http.HandleFunc("/", rootHandler)
	http.HandleFunc("/admin", adminHandler)

	log.Println("[+] Server running on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func rootHandler(w http.ResponseWriter, r *http.Request) {
	atomic.AddInt64(&activeConnections, 1)
	defer atomic.AddInt64(&activeConnections, -1)

	updateCondition()

	// hold connection
	time.Sleep(25 * time.Second)

	if conditionOn.Load() {
		start := conditionStart.Load().(time.Time)
		if time.Since(start) >= MIN_DURATION {
			token := generateToken()
			w.Header().Set("X-Access-Token", token)
			io.WriteString(w, "High load detected. Token issued.\n")
			return
		}
	}

	io.WriteString(w, "Service OK\n")
}

func adminHandler(w http.ResponseWriter, r *http.Request) {
	token := r.Header.Get("X-Access-Token")

	tokenMutex.Lock()
	defer tokenMutex.Unlock()

	if token == "" || token != activeToken {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	if time.Now().After(tokenExpiry) {
		http.Error(w, "Token expired", http.StatusForbidden)
		return
	}

	flag, err := os.ReadFile(FLAG_PATH)
	if err != nil {
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	io.WriteString(w, string(flag))
}

func updateCondition() {
	cur := atomic.LoadInt64(&activeConnections)

	if cur >= THRESHOLD {
		if !conditionOn.Load() {
			conditionOn.Store(true)
			conditionStart.Store(time.Now())
		}
	} else {
		conditionOn.Store(false)
		conditionStart.Store(time.Time{})
	}
}

func generateToken() string {
	tokenMutex.Lock()
	defer tokenMutex.Unlock()

	// reuse valid token
	if time.Now().Before(tokenExpiry) {
		return activeToken
	}

	b := make([]byte, 16)
	rand.Read(b)

	activeToken = hex.EncodeToString(b)
	tokenExpiry = time.Now().Add(5 * time.Minute)

	log.Println("[+] Token generated:", activeToken)
	return activeToken
}
