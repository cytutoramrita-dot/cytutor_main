# Hidden — Writeup  
**Category:** Web Exploitation  
**Difficulty:** Medium  

---

## Step 1 — Explore the Homepage  
Open the challenge in a browser:<br>
<img width="1706" height="729" alt="image" src="https://github.com/user-attachments/assets/54445ad2-f527-47ae-81e2-5c0d739871a0" />

View the page source (Ctrl + U).  
A developer comment reveals two unlinked pages:
<img width="888" height="294" alt="image" src="https://github.com/user-attachments/assets/642410d6-a602-497e-bce6-cf5825dabbff" />


This is the first indication that the site contains hidden content.

---

## Step 2 — Check robots.txt  
<img width="437" height="213" alt="image" src="https://github.com/user-attachments/assets/a95ce2ac-7ad5-4336-ad3c-07f0b2529888" />

robots.txt disallows search engine from indexing two hidden pages:


There is also a commented line:


This suggests another hidden file exists.

---

## Step 3 — Check sitemap.xml  
<img width="990" height="456" alt="image" src="https://github.com/user-attachments/assets/5320d12b-df95-4010-908f-8efc09d66b0b" />

The sitemap lists:
/hidden/page1.html
/hidden/page2.html

But the final file (`ultimate_secret.html`) is intentionally missing.  
This confirms that the real flag page is not indexed.

---

## Step 4 — Inspect the Hidden Pages  
<img width="1257" height="400" alt="image" src="https://github.com/user-attachments/assets/4cd572cd-b07a-4a5a-a75b-74a79d1474b2" />
A simple decoy page.

Then visit:

<img width="1420" height="239" alt="image" src="https://github.com/user-attachments/assets/2363b178-94f5-4cb2-b07d-d6610552a51e" />
<img width="615" height="319" alt="image" src="https://github.com/user-attachments/assets/d75a4517-c49d-4fcd-a78a-cd793f7cd58e" />
<br>
This page contains a Base64 string in a comment:

dWx0aW1hdGVfc2VjcmV0


Decode it using any Base64 decoder:<br>
<img width="1573" height="673" alt="image" src="https://github.com/user-attachments/assets/6eabc5ea-da05-4fd8-b40c-687fb17a9bee" />
<br>

Result:
ultimate_secret


This reveals the filename of the final hidden page.

---

## Step 5 — Access the Final Page  
<img width="1751" height="432" alt="image" src="https://github.com/user-attachments/assets/0d6a2148-6e2d-4f6f-b29c-496ce3975ede" />

This page contains the flag:
CTF{find_hidden_pages_and_read_the_source}


---

## Summary  
The challenge demonstrates how sensitive information can be leaked through:

- HTML comments  
- robots.txt  
- sitemap.xml  
- Poorly removed test files  

The solution requires basic **web reconnaissance**, **source code inspection**, and **Base64 decoding**.

This aligns with common web security issues where developers unintentionally expose internal paths or staging files.

