





# SSTI Vulnerability Testing Guide

This guide helps you quickly determine whether a web application is vulnerable to **Server-Side Template Injection (SSTI)** and how to leverage exposed objects for exploitation.

---

##  1. Test if the template engine evaluates expressions

In any input field (search bar, textbox, comment box, etc.), enter:

{{ 5 + 5 }}


## Expected Output (if SSTI exists):


If you see the result evaluated instead of being treated as plain text, the application is vulnerable to SSTI.

---

##  2. Check for exposed Python objects

Next, try inspecting available objects:

{{ h }}

###  Expected Output Example:

<main.Helper object at 0x...>


This confirms that a Python object named **h** is accessible inside the template environment.

---

##  3. Attempt to use exposed methods

If the object has useful functions, try calling them:

{{ h.read_flag() }}


###  If vulnerable, this will directly output the flag or sensitive data.



## 🛠️ Author  
Security testing helper guide for identifying SSTI vulnerabilities.



