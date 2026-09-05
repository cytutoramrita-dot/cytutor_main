# Hidden
**Category:** Web Exploitation  
**Difficulty:** Medium  

## Overview
Hidden is a simple web challenge that focuses on **information disclosure** and **web reconnaissance**.  
The website contains multiple unlinked pages that can be found by inspecting developer comments and common indexing files such as `robots.txt` and `sitemap.xml`.

The goal is to identify these hidden files and access the final page that contains the flag.

### Steps for execution

`docker build -t hidden .`<br>
`docker run -p 8080:80 hidden`

Open the Challenge in Your Browser
http://localhost:8080
