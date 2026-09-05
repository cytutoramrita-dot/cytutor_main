# Bookmarklet — Web Challenge  
**Category:** Web Exploitation  
**Difficulty:** Easy  

This challenge provides a simple Flask web application where the user interacts with a **bookmarklet** to request files from the server.  
The backend attempts to restrict file access using a custom `safe_join()` function — but due to flawed path validation, the challenge is vulnerable to **directory traversal**.
