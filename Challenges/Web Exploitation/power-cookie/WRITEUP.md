# Power Cookie Challenge — Technical Analysis

## Summary
The application demonstrates a fundamental security flaw: authorization is based entirely on a client-controlled cookie. The server assigns a cookie `isAdmin=0` and later checks this value to determine whether to display privileged content.

Because the cookie originates from and is modifiable by the client, privilege escalation is trivial.

## Application Behavior
Index page<br>
<img width="746" height="352" alt="image" src="https://github.com/user-attachments/assets/1edf6342-6a98-4656-94b9-c9a8e493b650" />

1. `index.php` sets a cookie if one does not already exist:
   ```php
   if (!isset($_COOKIE['isAdmin'])) {
       setcookie("isAdmin", "0", time() + 3600, "/");
   }
   ```
* Cookie is neither signed nor validated.

* No integrity or authenticity protection.

2. `check.php` performs authorization using:
```
$isAdmin = intval($_COOKIE['isAdmin']);<br>
if ($isAdmin === 1) { /* show admin content */ }<br>
```
* Direct reliance on untrusted client input.

* No server-side session or role verification.

### Exploitation
<img width="654" height="309" alt="image" src="https://github.com/user-attachments/assets/041d17e1-23dc-4098-871c-7dd5565166fe" />

<img width="1105" height="464" alt="image" src="https://github.com/user-attachments/assets/ed46c611-bfc2-4816-888d-c53f38bd486c" />

Modify the isAdmin cookie in the browser or via a crafted HTTP request:
<img width="1097" height="625" alt="image" src="https://github.com/user-attachments/assets/973b5795-c700-4899-b13c-1c806a0f0b24" />

Reloading the page results in the application treating the client as an administrator.
<img width="559" height="288" alt="image" src="https://github.com/user-attachments/assets/474e0e70-2661-4d06-84fd-54278989cb0d" />


### Root Cause
The system conflates authentication/authorization state with client-controlled cookie values. Cookies are not inherently secure and can be manipulated freely by the user.

### Conclusion
The challenge clearly illustrates why client-side data cannot be trusted for security decisions. All authorization logic must be enforced server-side with authenticated, integrity-protected state.
