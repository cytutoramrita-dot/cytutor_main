"""
Build CyTutor_Review1.pptx using the 20CYS495 college template.
3 slides: Slide 1 = Project Intro, Slide 2 = Platform Features, Slide 3 = Mentored Classrooms
"""

import copy
from lxml import etree
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.oxml.ns import qn

TEMPLATE = r"C:\Users\Kavya\My Drive\Kavya Google Drive\14 Engineering\402 Cytutor\Cytutor\Cytutor_260414\cytutor-1-main\20CYS495Project Phase I.pptx"
OUT      = r"C:\Users\Kavya\My Drive\Kavya Google Drive\14 Engineering\402 Cytutor\CyTutor_Review1_v3.pptx"

# ── Palette (matches academic feel; accent is maroon/navy common in college templates)
MAROON  = RGBColor(0x7B, 0x00, 0x00)
NAVY    = RGBColor(0x1A, 0x35, 0x6E)
TEAL    = RGBColor(0x00, 0x77, 0x7A)
ORANGE  = RGBColor(0xD4, 0x6A, 0x00)
DARK    = RGBColor(0x1A, 0x1A, 0x2E)
WHITE   = RGBColor(0xFF, 0xFF, 0xFF)
LGRAY   = RGBColor(0xF4, 0xF6, 0xF8)
DGRAY   = RGBColor(0x44, 0x44, 0x55)
BLACK   = RGBColor(0x11, 0x11, 0x11)
ACCENT  = MAROON

prs = Presentation(TEMPLATE)

# ── Keep exactly 4 slides; drop extras ───────────────────────────────────────
sldIdLst = prs.slides._sldIdLst
while len(prs.slides) > 4:
    last_sldId = sldIdLst[-1]
    rId = last_sldId.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
    sldIdLst.remove(last_sldId)
    prs.part.drop_rel(rId)

# ── Helpers ───────────────────────────────────────────────────────────────────
CHROME = {"Picture 1", "Straight Connector 3", "Straight Connector 6",
          "TextBox 7", "Date Placeholder 9", "Slide Number Placeholder 10",
          "Footer Placeholder 11", "TextBox 2"}

def clear_content(slide):
    """Remove all non-chrome shapes from a slide."""
    sp_tree = slide.shapes._spTree
    to_remove = []
    for el in sp_tree:
        # shape name is in nvSpPr/cNvPr[@name] or nvPicPr/cNvPr[@name] etc.
        name_el = el.find(".//" + qn("p:cNvPr"))
        if name_el is None:
            name_el = el.find(".//" + qn("p:cNvGrpSpPr"))
        name = name_el.get("name", "") if name_el is not None else ""
        if name not in CHROME:
            to_remove.append(el)
    for el in to_remove:
        try:
            sp_tree.remove(el)
        except Exception:
            pass

def add_rect(slide, left, top, width, height, fill=None, line_color=None, line_width_pt=0):
    from pptx.util import Inches, Pt
    from pptx.oxml import parse_xml
    from pptx.oxml.ns import nsmap
    l = int(Inches(left)); t = int(Inches(top))
    w = int(Inches(width)); h = int(Inches(height))
    lw = int(Pt(line_width_pt)) if line_width_pt else 0

    if fill:
        fill_val = fill.replace("#", "")
        fill_xml = f'<a:solidFill><a:srgbClr val="{fill_val}"/></a:solidFill>'
    else:
        fill_xml = '<a:noFill/>'

    line_xml = ""
    if line_color and line_width_pt:
        lc_val = line_color.replace("#", "")
        line_xml = f'<a:ln w="{lw}"><a:solidFill><a:srgbClr val="{lc_val}"/></a:solidFill></a:ln>'
    else:
        line_xml = '<a:ln><a:noFill/></a:ln>'

    xml = f'''<p:sp xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
               xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
               xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:nvSpPr>
    <p:cNvPr id="999" name="rect"/>
    <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
    <p:nvPr/>
  </p:nvSpPr>
  <p:spPr>
    <a:xfrm><a:off x="{l}" y="{t}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm>
    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
    {fill_xml}
    {line_xml}
  </p:spPr>
  <p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>
</p:sp>'''
    el = parse_xml(xml)
    slide.shapes._spTree.append(el)

def txb(slide, text, left, top, width, height,
        size=16, bold=False, color=BLACK, align=PP_ALIGN.LEFT,
        italic=False, wrap=True):
    from pptx.util import Inches, Pt
    shape = slide.shapes.add_textbox(
        Inches(left), Inches(top), Inches(width), Inches(height))
    tf = shape.text_frame
    tf.word_wrap = wrap
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color
    return shape

def add_para(tf, text, size=13, color=DGRAY, bold=False, align=PP_ALIGN.LEFT):
    p = tf.add_paragraph()
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color

# Content area bounds (between the two connector lines)
# Top line at T=0.65", bottom line at T=7.07"
# Use T=0.75 to T=6.95 for content (with margin from lines)
CT  = 0.75   # content top
CB  = 6.95   # content bottom
CL  = 0.35   # content left
CR  = 13.0   # content right
CW  = CR - CL  # ~12.65

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 1 — Project Introduction
# ══════════════════════════════════════════════════════════════════════════════
s1 = prs.slides[0]
clear_content(s1)

# Slide heading bar
add_rect(s1, CL, CT, CW, 0.55, fill="7B0000")
txb(s1, "CyTutor – Cybersecurity Learning Platform",
    CL+0.15, CT+0.08, CW-0.3, 0.42,
    size=22, bold=True, color=WHITE)

# Subtitle row
txb(s1, "20CYS495 Project Phase I  |  Final Year Project  |  2023-2027 Batch",
    CL, CT+0.62, CW, 0.32, size=11, color=DGRAY, italic=True)

# Divider
add_rect(s1, CL, CT+0.98, CW, 0.025, fill="7B0000")

# ── Left block: About ─────────────────────────────────────────────────────────
add_rect(s1, CL, CT+1.1, 7.7, 0.34, fill="F0F0F5")
txb(s1, "About the Project", CL+0.1, CT+1.12, 7.5, 0.3,
    size=13, bold=True, color=MAROON)

desc = (
    "CyTutor is a full-stack cybersecurity education platform that bridges the gap between "
    "passive classroom learning and real-world practice. Students work through structured "
    "tutorials and course paths, then apply skills on live Docker-based CTF challenges — "
    "all within one unified, gamified environment."
)
dtxb = txb(s1, "", CL, CT+1.5, 7.7, 1.2, size=13, color=BLACK)
dtxb.text_frame.word_wrap = True
dtxb.text_frame.paragraphs[0].runs  # prime
r = dtxb.text_frame.paragraphs[0].add_run()
r.text = desc
r.font.size = Pt(13)
r.font.color.rgb = BLACK

# Problem statement box
add_rect(s1, CL, CT+2.78, 7.7, 0.34, fill="F0F0F5")
txb(s1, "Problem Statement", CL+0.1, CT+2.80, 7.5, 0.3,
    size=13, bold=True, color=MAROON)

prob = (
    "Cybersecurity education lacks an integrated platform where students can learn "
    "concepts, practise on real challenges, and receive structured guidance from mentors "
    "— all in one place, with measurable progress."
)
ptxb = txb(s1, "", CL, CT+3.18, 7.7, 0.95, size=13, color=BLACK)
ptxb.text_frame.word_wrap = True
r2 = ptxb.text_frame.paragraphs[0].add_run()
r2.text = prob
r2.font.size = Pt(13)
r2.font.color.rgb = BLACK

# ── Right block: Tech Stack + Stats ───────────────────────────────────────────
add_rect(s1, 8.25, CT+1.1, 4.4, 0.34, fill="F0F0F5")
txb(s1, "Tech Stack", 8.35, CT+1.12, 4.2, 0.3,
    size=13, bold=True, color=MAROON)

stack_items = [
    ("Frontend", "React 19 + TypeScript + Vite"),
    ("Backend",  "Express.js + TypeScript"),
    ("Database", "PostgreSQL"),
    ("Infra",    "Docker (challenge containers)"),
    ("Auth",     "JWT + OTP email verification"),
]
sy = CT + 1.52
for label, val in stack_items:
    txb(s1, label + ":", 8.35, sy, 1.4, 0.28, size=12, bold=True, color=NAVY)
    txb(s1, val,         9.75, sy, 2.85, 0.28, size=12, color=BLACK)
    sy += 0.34

# Stat boxes
add_rect(s1, 8.25, CT+3.38, 4.4, 0.34, fill="F0F0F5")
txb(s1, "Platform at a Glance", 8.35, CT+3.40, 4.2, 0.3,
    size=13, bold=True, color=MAROON)

stats = [("26+", "CTF Challenges"), ("5", "Categories"), ("3", "User Roles")]
bx = 8.25
for val, lbl in stats:
    add_rect(s1, bx, CT+3.82, 1.38, 0.9, fill="1A356E", line_color="1A356E", line_width_pt=1)
    txb(s1, val, bx, CT+3.85, 1.38, 0.45, size=22, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    txb(s1, lbl, bx, CT+4.3,  1.38, 0.38, size=10, color=LGRAY, align=PP_ALIGN.CENTER)
    bx += 1.52

# Solution line
add_rect(s1, CL, CT+4.82, CW, 0.025, fill="CCCCCC")
txb(s1, "Solution: A single integrated platform for learning, practising, and being guided — with real Docker containers as the challenge environment.",
    CL+0.1, CT+4.9, CW-0.2, 0.55, size=12, color=DGRAY, italic=True)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 2 — Platform Features
# ══════════════════════════════════════════════════════════════════════════════
s2 = prs.slides[1]
clear_content(s2)

add_rect(s2, CL, CT, CW, 0.55, fill="7B0000")
txb(s2, "Platform Features", CL+0.15, CT+0.08, CW-0.3, 0.42,
    size=22, bold=True, color=WHITE)

add_rect(s2, CL, CT+0.62, CW, 0.025, fill="CCCCCC")

features = [
    ("CTF Challenges", MAROON,
     "26+ real CTF challenges across Web Exploitation, Cryptography, "
     "Forensics, OSINT and Network Security. Each \"web\" or \"terminal\" "
     "challenge spins up a live Docker container for the student — they "
     "hack a real target, not a simulation. Flags are stored in the DB; "
     "never exposed to the client."),
    ("Learning Materials", NAVY,
     "Structured tutorials with JSONB-rich sectioned content and ordered "
     "course paths. Students build foundational knowledge before attempting "
     "challenges. Per-tutorial progress, completion status, and 1-5 star "
     "ratings with feedback are tracked per user."),
    ("Gamification", TEAL,
     "Points, XP, levels, a daily streak system with streak-freeze mechanics, "
     "and a global leaderboard. Every solved challenge and completed tutorial "
     "feeds into a persistent user profile, keeping students motivated to "
     "return daily."),
    ("Secure Auth & User Roles", ORANGE,
     "OTP-verified email sign-up (account created only after code is confirmed), "
     "JWT sessions (7-day expiry), bcrypt-hashed passwords, and rate limiting "
     "on all auth routes. Three roles — Student, Mentor, Admin — each with "
     "strictly scoped access enforced at the middleware layer."),
]

# 2x2 card layout
positions = [(CL, CT+0.72), (CL+6.35, CT+0.72),
             (CL, CT+3.7),  (CL+6.35, CT+3.7)]

for (title, accent, body), (fx, fy) in zip(features, positions):
    col_hex = f"{accent[0]:02X}{accent[1]:02X}{accent[2]:02X}"
    add_rect(s2, fx, fy, 6.1, 2.85, fill="F8F9FA", line_color=col_hex, line_width_pt=1.5)
    add_rect(s2, fx, fy, 0.12, 2.85, fill=col_hex)
    txb(s2, title, fx+0.22, fy+0.12, 5.7, 0.35, size=14, bold=True, color=accent)
    bd = txb(s2, "", fx+0.22, fy+0.52, 5.7, 2.2, size=12, color=BLACK)
    bd.text_frame.word_wrap = True
    r = bd.text_frame.paragraphs[0].add_run()
    r.text = body
    r.font.size = Pt(12)
    r.font.color.rgb = DGRAY


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 3 — Mentored Classrooms
# ══════════════════════════════════════════════════════════════════════════════
s3 = prs.slides[2]
clear_content(s3)

add_rect(s3, CL, CT, CW, 0.55, fill="7B0000")
txb(s3, "Mentored Classrooms  —  My Contribution",
    CL+0.15, CT+0.08, 9.5, 0.42, size=22, bold=True, color=WHITE)
add_rect(s3, 10.1, CT+0.07, 2.55, 0.42, fill="D4F4DD")
txb(s3, "Built by Kavya", 10.12, CT+0.10, 2.5, 0.36,
    size=11, bold=True, color=TEAL, align=PP_ALIGN.CENTER)

txb(s3, "A role-based, mentor-guided layer added on top of the existing CyTutor platform",
    CL, CT+0.62, CW, 0.3, size=12, color=DGRAY, italic=True)
add_rect(s3, CL, CT+0.96, CW, 0.025, fill="CCCCCC")

# ── Left: How it works ─────────────────────────────────────────────────────
add_rect(s3, CL, CT+1.08, 0.12, 5.62, fill="7B0000")
txb(s3, "How It Works", CL+0.22, CT+1.08, 5.8, 0.34,
    size=14, bold=True, color=MAROON)

steps = [
    ("1", "Mentor creates a classroom",
     "Auto-generates a unique invite code (CYT-XXXXXX) on creation."),
    ("2", "Students join via invite code",
     "Instant enrolment; mentor can view members and remove if needed."),
    ("3", "Mentor creates assignments",
     "Links a global platform challenge or a classroom-private challenge with a due date."),
    ("4", "Students submit flags",
     "Flag verified server-side; points awarded to global profile on first correct solve."),
    ("5", "Mentor tracks progress",
     "Per-student status: Completed / Attempted / Overdue / Pending."),
    ("6", "Classroom leaderboard",
     "Students ranked by points from that classroom's assignments only."),
]

sy3 = CT + 1.5
for num, heading, detail in steps:
    add_rect(s3, CL+0.22, sy3+0.02, 0.3, 0.3, fill="7B0000")
    txb(s3, num, CL+0.22, sy3+0.01, 0.3, 0.32,
        size=11, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    txb(s3, heading, CL+0.6, sy3, 5.2, 0.26, size=12, bold=True, color=NAVY)
    txb(s3, detail,  CL+0.6, sy3+0.26, 5.5, 0.28, size=11, color=DGRAY)
    sy3 += 0.68

# ── Right: Design decisions ──────────────────────────────────────────────────
add_rect(s3, 6.7, CT+0.96, 0.025, 5.75, fill="CCCCCC")  # vertical rule

add_rect(s3, 6.85, CT+1.08, 0.12, 5.62, fill="1A356E")
txb(s3, "Design Decisions", 7.05, CT+1.08, 5.75, 0.34,
    size=14, bold=True, color=NAVY)

decisions = [
    ("Role-based access control",
     "Every API route checks whether the caller is mentor-of-that-classroom or "
     "a member. Cross-classroom access is blocked even for other mentors."),
    ("Dual challenge sources",
     "Assignments reference either a global challenge or a classroom-private one. "
     "The submission route handles both paths transparently."),
    ("Classroom-private challenges",
     "Mentors author description/downloadable challenges scoped only to their "
     "classroom — no Docker needed, flag stored in DB."),
    ("Soft deletes",
     "Classrooms and assignments are deactivated (is_active=FALSE), not dropped "
     "— submission history is preserved for review."),
    ("Points feed global profile",
     "Correct assignment submissions award XP and points to user_stats, so "
     "classroom work contributes to the platform-wide leaderboard."),
]

dy = CT + 1.5
for title_d, body_d in decisions:
    add_rect(s3, 7.05, dy+0.05, 0.22, 0.22, fill="1A356E")
    txb(s3, title_d, 7.35, dy, 5.55, 0.27, size=12, bold=True, color=NAVY)
    txb(s3, body_d,  7.35, dy+0.28, 5.55, 0.36, size=11, color=DGRAY)
    dy += 0.75

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 4 — Proposed: Dynamic Flag Generation
# ══════════════════════════════════════════════════════════════════════════════
s4 = prs.slides[3]
clear_content(s4)

add_rect(s4, CL, CT, CW, 0.55, fill="7B0000")
txb(s4, "Proposed Enhancement: Dynamic Flag Generation",
    CL+0.15, CT+0.08, 9.5, 0.42, size=20, bold=True, color=WHITE)
add_rect(s4, 10.1, CT+0.07, 2.55, 0.42, fill="FFF3CD")
txb(s4, "Future Scope", 10.12, CT+0.10, 2.5, 0.36,
    size=11, bold=True, color=ORANGE, align=PP_ALIGN.CENTER)

txb(s4, "Each student gets a unique flag — making flag-sharing between students completely useless",
    CL, CT+0.62, CW, 0.3, size=12, color=DGRAY, italic=True)
add_rect(s4, CL, CT+0.96, CW, 0.025, fill="CCCCCC")

# ── Problem statement box ──────────────────────────────────────────────────
add_rect(s4, CL, CT+1.08, CW, 0.34, fill="FFF0F0")
txb(s4, "Problem with Static Flags", CL+0.1, CT+1.10, CW-0.2, 0.3,
    size=13, bold=True, color=MAROON)
txb(s4,
    "Currently all users submit the same flag string. One student can solve a challenge and "
    "share the flag with others — they get full points without any effort.",
    CL+0.1, CT+1.50, CW-0.2, 0.38, size=12, color=BLACK)

# ── Divider ────────────────────────────────────────────────────────────────
add_rect(s4, CL, CT+1.96, CW, 0.025, fill="CCCCCC")

# ── Left: How it works ─────────────────────────────────────────────────────
add_rect(s4, CL, CT+2.08, 0.12, 4.55, fill="7B0000")
txb(s4, "How Dynamic Flagging Works", CL+0.22, CT+2.08, 6.0, 0.34,
    size=14, bold=True, color=MAROON)

steps4 = [
    ("1", "Extract name salt",
     "Take first 2 + last 2 letters of the student's name.\n"
     "e.g.  Kavya Koduru Karu  ->  'Ka' + 'ru'  =  'Karu'"),
    ("2", "Generate user flag (server-side)",
     "HMAC-SHA256(key = JWT_SECRET,  data = base_flag + user_id)\n"
     "Prefix with name salt:  Cytutor{Ka_ru_<hash[:12]>}"),
    ("3", "Inject into Docker container",
     "Pass the computed flag as an env variable on docker run.\n"
     "Container writes it to /flag.txt at startup."),
    ("4", "Student finds and submits their flag",
     "Each student's flag is unique to them — sharing it\n"
     "with another student does nothing."),
    ("5", "Server verifies without storing",
     "On submission, server recomputes HMAC with the same\n"
     "inputs and compares. No per-user flag stored in DB."),
]

sy4 = CT + 2.5
for num, heading, detail in steps4:
    add_rect(s4, CL+0.22, sy4+0.04, 0.28, 0.28, fill="7B0000")
    txb(s4, num, CL+0.22, sy4+0.03, 0.28, 0.30,
        size=10, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    txb(s4, heading, CL+0.6, sy4, 5.4, 0.26, size=12, bold=True, color=NAVY)
    txb(s4, detail,  CL+0.6, sy4+0.26, 5.6, 0.44, size=10, color=DGRAY)
    sy4 += 0.82

# ── Right: Advantages + Implementation ────────────────────────────────────
add_rect(s4, 6.7, CT+1.96, 0.025, 4.68, fill="CCCCCC")
add_rect(s4, 6.85, CT+2.08, 0.12, 2.1, fill="007777")

txb(s4, "Advantages", 7.05, CT+2.08, 5.9, 0.34,
    size=14, bold=True, color=TEAL)

advantages = [
    ("No flag sharing",      "Each flag is mathematically tied to that student's identity."),
    ("No extra DB storage",  "Server recomputes the flag on verification — nothing extra stored."),
    ("Collision-resistant",  "UUID as salt guarantees uniqueness even for students with similar names."),
    ("Transparent to student", "Student experience is identical — they find and submit a flag as usual."),
]
ay = CT + 2.5
for title_a, body_a in advantages:
    add_rect(s4, 7.05, ay+0.06, 0.18, 0.18, fill="007777")
    txb(s4, title_a, 7.32, ay, 5.55, 0.26, size=12, bold=True, color=TEAL)
    txb(s4, body_a,  7.32, ay+0.26, 5.55, 0.3, size=11, color=DGRAY)
    ay += 0.6

# Implementation note
add_rect(s4, 6.85, CT+4.28, 0.12, 2.35, fill="1A356E")
txb(s4, "Implementation Note", 7.05, CT+4.28, 5.9, 0.34,
    size=14, bold=True, color=NAVY)

impl_lines = [
    ("Scope", "Web and terminal challenge types only (Docker-based)."),
    ("Change in backend", "challengeManager.ts: compute flag before docker run, pass as --env FLAG=<value>."),
    ("Change in verification", "challenges.ts submit route: recompute HMAC instead of DB lookup."),
    ("No frontend change", "Student-facing UI stays exactly the same."),
]
iy = CT + 4.65
for lbl, val in impl_lines:
    txb(s4, lbl + ":", 7.05, iy, 1.55, 0.26, size=11, bold=True, color=NAVY)
    txb(s4, val,       8.62, iy, 4.2, 0.26, size=11, color=DGRAY)
    iy += 0.38

# ── Save ──────────────────────────────────────────────────────────────────────
prs.save(OUT)
print(f"Saved: {OUT}")
