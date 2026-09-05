# CTF Challenge — Exploiting Exposed `.git` Directory

## Overview
This challenge revolves around a common misconfiguration in web applications: an exposed `.git` directory. When a developer accidentally deploys their Git repository along with the application, sensitive information—such as previous versions of files, deleted files, or even credentials—can often be recovered.

Your objective in this challenge is to extract the complete Git repository from the target server, navigate through its commit history, and recover a file that no longer exists in the current version of the application.

---

## Learning Objectives
- Understand the risks of exposing version control metadata publicly.
- Learn techniques to download and restore a Git repository from a web server.
- Practice navigating Git history to recover deleted or modified files.
- Strengthen forensic and source-analysis skills.

---

## Challenge Description

The target web application has its `.git` directory openly accessible:

