"""Builds the DonoRex 5-minute hackathon deck, mirroring the BenMed template."""

from pptx import Presentation
from pptx.util import Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.dml import MSO_LINE
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION, XL_LABEL_POSITION
import os

# ---------------------------------------------------------------- design tokens
PT = 12700  # EMU per point

ORANGE = RGBColor(0xFF, 0x6B, 0x00)
NAVY = RGBColor(0x0B, 0x19, 0x2C)
INK = RGBColor(0x23, 0x23, 0x25)
GRAY_BG = RGBColor(0xDF, 0xE2, 0xE4)
PANEL_BG = RGBColor(0xF5, 0xF6, 0xF5)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
RULE = RGBColor(0xC9, 0xCD, 0xD1)
MUTED = RGBColor(0x64, 0x74, 0x8B)
ARC = RGBColor(0xE2, 0xE5, 0xE8)

TITLE_FONT = "Aptos Display"
BODY_FONT = "Aptos"

W, H = 960, 540  # points

ROOT = r"C:\Users\latoriaa\projects\HackMIT_Dropbox"
SHOTS = os.path.join(ROOT, "presentation", "screenshots")
CLIPART = os.path.join(ROOT, "presentation", "clipart")
LOGO = os.path.join(ROOT, "apps", "web", "public", "donorex-logo.png")

prs = Presentation()
prs.slide_width = Emu(W * PT)
prs.slide_height = Emu(H * PT)
BLANK = prs.slide_layouts[6]


# ---------------------------------------------------------------- helpers
def add_slide(bg=WHITE):
    s = prs.slides.add_slide(BLANK)
    bgshape = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Emu(0), Emu(0), Emu(W * PT), Emu(H * PT))
    bgshape.fill.solid()
    bgshape.fill.fore_color.rgb = bg
    bgshape.line.fill.background()
    bgshape.shadow.inherit = False
    return s


def textbox(slide, x, y, w, h, text, size, font=BODY_FONT, color=INK,
            bold=False, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, spacing=1.0):
    tb = slide.shapes.add_textbox(Emu(x * PT), Emu(y * PT), Emu(w * PT), Emu(h * PT))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    for i, line in enumerate(text.split("\n")):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = spacing
        r = p.add_run()
        r.text = line
        r.font.size = Pt(size)
        r.font.name = font
        r.font.bold = bold
        r.font.color.rgb = color
    return tb


def bullets(slide, x, y, w, h, items, size=24, color=INK, spacing=1.35, space_after=10):
    """Bulleted list (plain text bullets — avoids OOXML that breaks some PowerPoint builds)."""
    tb = slide.shapes.add_textbox(Emu(x * PT), Emu(y * PT), Emu(w * PT), Emu(h * PT))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.line_spacing = spacing
        p.space_after = Pt(space_after)
        r = p.add_run()
        r.text = "\u2022  " + item
        r.font.size = Pt(size)
        r.font.name = BODY_FONT
        r.font.color.rgb = color
    return tb


def accent_bar(slide, x=40, y=52, w=60, h=7, color=ORANGE):
    b = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Emu(x * PT), Emu(y * PT), Emu(w * PT), Emu(h * PT))
    b.fill.solid()
    b.fill.fore_color.rgb = color
    b.line.fill.background()
    b.shadow.inherit = False
    return b


def hrule(slide, x, y, w, color=RULE):
    ln = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Emu(x * PT), Emu(y * PT), Emu(w * PT), Emu(1 * PT))
    ln.fill.solid()
    ln.fill.fore_color.rgb = color
    ln.line.fill.background()
    ln.shadow.inherit = False
    return ln


def swoosh(slide):
    """The template's curved left panel: a large white circle whose right edge arcs
    from x=350 at the slide edges out to x=420 at mid-height."""
    oval = slide.shapes.add_shape(
        MSO_SHAPE.OVAL, Emu(int(-692 * PT)), Emu(int(-286 * PT)),
        Emu(int(1112 * PT)), Emu(int(1112 * PT)))
    oval.fill.solid()
    oval.fill.fore_color.rgb = WHITE
    oval.line.color.rgb = ARC
    oval.line.width = Pt(1)
    oval.shadow.inherit = False
    return oval


def left_title(slide, title):
    """Swoosh-slide title block: accent bar top-left, title low-left, rule beneath."""
    accent_bar(slide)
    textbox(slide, 46, 300, 300, 60, title, 48, font=TITLE_FONT, color=INK)
    hrule(slide, 40, 385, 340)


def picture(slide, path, x, y, w, h, crop_top=0.0, crop_bottom=0.0,
            crop_left=0.0, crop_right=0.0):
    pic = slide.shapes.add_picture(path, Emu(int(x * PT)), Emu(int(y * PT)),
                                   Emu(int(w * PT)), Emu(int(h * PT)))
    pic.crop_top = crop_top
    pic.crop_bottom = crop_bottom
    pic.crop_left = crop_left
    pic.crop_right = crop_right
    return pic


def frame(slide, x, y, w, h, color=RULE):
    f = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Emu(int(x * PT)), Emu(int(y * PT)),
                               Emu(int(w * PT)), Emu(int(h * PT)))
    f.fill.background()
    f.line.color.rgb = color
    f.line.width = Pt(0.75)
    f.shadow.inherit = False
    return f


def logo(slide, x, y, w):
    h = w * 314 / 987
    slide.shapes.add_picture(LOGO, Emu(int(x * PT)), Emu(int(y * PT)), Emu(int(w * PT)), Emu(int(h * PT)))


def notes(slide, text):
    slide.notes_slide.notes_text_frame.text = text.strip()


def stat_tile(slide, x, y, w, h, number, caption):
    tile = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Emu(int(x * PT)), Emu(int(y * PT)),
                                  Emu(int(w * PT)), Emu(int(h * PT)))
    tile.fill.solid()
    tile.fill.fore_color.rgb = WHITE
    tile.line.color.rgb = RULE
    tile.line.width = Pt(1)
    tile.shadow.inherit = False
    tile.adjustments[0] = 0.08
    textbox(slide, x + 12, y + 18, w - 24, 44, number, 36, font=TITLE_FONT, color=ORANGE,
            align=PP_ALIGN.CENTER)
    textbox(slide, x + 12, y + 68, w - 24, 36, caption, 14, color=NAVY, align=PP_ALIGN.CENTER, spacing=1.2)


def clipart(slide, name, cx, top, size):
    path = os.path.join(CLIPART, name + ".png")
    slide.shapes.add_picture(path, Emu(int((cx - size / 2) * PT)), Emu(int(top * PT)),
                             Emu(int(size * PT)), Emu(int(size * PT)))


def pipeline_step(slide, cx, icon_y, name, title, body, icon_size=52):
    clipart(slide, name, cx, icon_y, icon_size)
    textbox(slide, cx - 72, icon_y + icon_size + 6, 144, 22, title, 11.5, color=ORANGE,
            bold=True, align=PP_ALIGN.CENTER)
    node_label(slide, cx, icon_y + icon_size + 26, 138, body, size=9)


def arrow(slide, x1, x2, y, color=ORANGE):
    """Thin horizontal connector with a head, as in the reference architecture diagram."""
    shaft = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Emu(int(x1 * PT)), Emu(int((y - 0.75) * PT)),
                                   Emu(int((x2 - x1 - 6) * PT)), Emu(int(1.5 * PT)))
    shaft.fill.solid()
    shaft.fill.fore_color.rgb = color
    shaft.line.fill.background()
    shaft.shadow.inherit = False
    head = slide.shapes.add_shape(MSO_SHAPE.ISOSCELES_TRIANGLE, Emu(int((x2 - 7) * PT)),
                                  Emu(int((y - 4) * PT)), Emu(int(8 * PT)), Emu(int(8 * PT)))
    head.rotation = 90
    head.fill.solid()
    head.fill.fore_color.rgb = color
    head.line.fill.background()
    head.shadow.inherit = False


def group_box(slide, x, y, w, h, label, color=ORANGE):
    """Dashed grouping frame with a small caption above it."""
    box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Emu(int(x * PT)), Emu(int(y * PT)),
                                 Emu(int(w * PT)), Emu(int(h * PT)))
    box.fill.background()
    box.line.color.rgb = color
    box.line.width = Pt(1)
    box.line.dash_style = MSO_LINE.DASH
    box.shadow.inherit = False
    box.adjustments[0] = 0.06
    textbox(slide, x + 8, y - 15, w - 16, 14, label, 10.5, color=color, bold=True)
    return box


def node_label(slide, cx, top, w, lines, size=9.5):
    textbox(slide, cx - w / 2, top, w, 40, lines, size, color=NAVY,
            align=PP_ALIGN.CENTER, spacing=1.15)


def style_chart(chart, cat_size=12, val_size=12, title=None):
    chart.font.size = Pt(cat_size)
    chart.font.name = BODY_FONT
    chart.font.color.rgb = INK
    if title:
        chart.has_title = True
        chart.chart_title.text_frame.text = title
        r = chart.chart_title.text_frame.paragraphs[0].runs[0]
        r.font.size = Pt(val_size)
        r.font.name = BODY_FONT
        r.font.bold = False
        r.font.color.rgb = INK
    else:
        chart.has_title = False


# ================================================================ SLIDE 1 — Title
s = add_slide(GRAY_BG)
logo(s, (W - 430) / 2, 130, 430)
textbox(s, 60, 310, W - 120, 60, "Automated Donation Recommendations", 40,
        font=TITLE_FONT, color=INK, align=PP_ALIGN.CENTER)
textbox(s, 60, 382, W - 120, 30, "Ava Latoria  \u00b7  [teammate names]", 22,
        color=INK, align=PP_ALIGN.CENTER)
textbox(s, 60, 416, W - 120, 24, "HackMIT  \u00b7  GiveCampus Challenge", 16,
        color=MUTED, align=PP_ALIGN.CENTER)
notes(s, """
[0:00-0:20 \u2014 20 sec]

"Hi, we're DonoRex.

Every university has a small advancement team and a very large alumni database.
DonoRex tells that team exactly who to contact this week, what to say, and why \u2014
and then books it into their real calendar.

Let me show you the problem first."

DELIVERY: Don't read the tagline. Say the team names, then move. This slide is 20 seconds.
""")

# ================================================================ SLIDE 2 — Problem
s = add_slide(GRAY_BG)
accent_bar(s, x=64, y=42, w=60, h=7)
textbox(s, 64, 58, 400, 52, "Problem", 44, font=TITLE_FONT, color=INK)
textbox(s, 64, 118, 820, 28, "GiveCampus University \u2014 real constituent data", 16, color=MUTED)

stat_tile(s, 64, 158, 260, 118, "20,000", "constituents in the database")
stat_tile(s, 350, 158, 260, 118, "1,002", "LYBUNT \u2014 gave last year, not this year")
stat_tile(s, 636, 158, 260, 118, "149", "personal touches in a 40-hour week")

textbox(s, 64, 300, 832, 72,
        "Every CRM can export the list.\nAdvancement teams still have to choose who gets one of those 149 slots \u2014 "
        "and whether each touch is stewardship or an ask.",
        20, color=INK, spacing=1.25)
textbox(s, 64, 400, 832, 48, "Which 149?", 40, font=TITLE_FONT, color=ORANGE, align=PP_ALIGN.CENTER)
logo(s, 770, 468, 155)
notes(s, """
[0:20-0:55 \u2014 35 sec]

"This is the real GiveCampus dataset: 20,000 constituents, and 1,002 who gave last
year but not this year \u2014 lapsing right now.

A fundraiser has a 40-hour week. That's about 149 meaningful personal touches.
Zero point seven percent of the database.

So the job isn't reporting. The job is choosing \u2014 which 149, and what to do with each.

Today that choice is made by gut feel and whoever the fundraiser remembers."

DELIVERY: Land "Which 149?" on the big orange line.
""")

# ================================================================ SLIDE 3 — Introducing
s = add_slide(WHITE)
accent_bar(s, x=64, y=42)
textbox(s, 64, 58, 520, 52, "Introducing DonoRex", 44, font=TITLE_FONT, color=INK)
textbox(s, 64, 118, 380, 56, "Automated Donation Recommendations", 22, color=NAVY, spacing=1.2)
bullets(s, 64, 188, 360, 220, [
    "Time-budgeted weekly action queue",
    "Evidence on every recommendation",
    "Outlook scheduling + approval-gated Autopilot",
], size=18, spacing=1.25, space_after=12)
picture(s, os.path.join(SHOTS, "08-overview.png"), 440, 88, 480, 400,
        crop_left=0.05, crop_right=0.05, crop_bottom=0.08)
frame(s, 440, 88, 480, 400)
logo(s, 64, 448, 200)
notes(s, """
[0:55-1:15 \u2014 20 sec]

"DonoRex answers that question.

It turns a giant alumni database into a weekly plan: who to contact, what action to
take, how many minutes it costs, and why \u2014 then optionally books it into Outlook and
drafts the outreach for human approval."

Keep this slide short; the next one is the hero demo frame.
""")

# ================================================================ SLIDE 4 — Weekly plan
s = add_slide(GRAY_BG)
textbox(s, 64, 34, 700, 52, "Weekly plan", 44, font=TITLE_FONT, color=INK)
bullets(s, 64, 100, 300, 360, [
    "Pick objective + hour budget",
    "Build my week \u2192 ranked queue",
    "Channel, minutes, evidence on every card",
    "Export CSV or schedule around Outlook",
], size=17, spacing=1.3, space_after=14)
picture(s, os.path.join(SHOTS, "04-weekly-queue-scrolled.png"), 372, 88, 548, 442,
        crop_top=0.20, crop_bottom=0.04, crop_left=0.10, crop_right=0.10)
frame(s, 372, 88, 548, 442)
notes(s, """
[1:15-1:50 \u2014 35 sec]

"This is the hero flow.

Pick a fundraising objective \u2014 protect renewals, maximize near-term dollars, reactivate
lapsed donors. Set the hours you actually have \u2014 twenty or forty. Hit Build my week.

You get a ranked queue: channel, minutes, evidence, suggested message. Export CSV or
connect Outlook to place tasks around your real calendar.

If the live demo is up, do this on screen instead of the slide."

DELIVERY: Point at objective, hours, and the first queue card.
""")

# ================================================================ SLIDE 5 — Pipeline (product architecture)
s = add_slide(WHITE)
accent_bar(s, x=46, y=42, w=60, h=7)
textbox(s, 46, 58, 720, 48, "How it connects", 40, font=TITLE_FONT, color=INK)
textbox(s, 46, 108, 868, 22,
        "Deterministic engine end-to-end \u2014 no LLM choosing who gets asked for money",
        14, color=MUTED)

ICON_Y = 168
CENTERS = [98, 254, 410, 566, 722, 878]
steps = [
    ("ingest", "Data ingestion", "15 CSVs\n20k profiles\npaid gifts only"),
    ("classify", "Classification", "LYBUNT \u00b7 loyal\nlapsed \u00b7 DNC flags"),
    ("prioritize", "Priority engine", "6 scores\n18k actions\nhour-budget knapsack"),
    ("weekly", "Weekly plan", "ranked queue\nevidence cards\nstaff export"),
    ("schedule", "Scheduling", "Outlook busy/\nfree slots\n9\u20135 placement"),
    ("mcp", "M365 MCP layer", "7 validated\nGraph tools\ncalendar + mail"),
]
for cx, (clip, title, body) in zip(CENTERS, steps):
    pipeline_step(s, cx, ICON_Y, clip, title, body)

for a, b in zip(CENTERS, CENTERS[1:]):
    arrow(s, a + 30, b - 30, ICON_Y + 26)

# Human approval gate branches from the MCP node (last step before anything sends).
APPROVAL_Y = 372
v_top, v_bot = ICON_Y + 88, APPROVAL_Y - 4
v_shaft = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Emu(int((878 - 0.75) * PT)), Emu(int(v_top * PT)),
                             Emu(int(1.5 * PT)), Emu(int((v_bot - v_top) * PT)))
v_shaft.fill.solid()
v_shaft.fill.fore_color.rgb = ORANGE
v_shaft.line.fill.background()
v_shaft.shadow.inherit = False
v_head = s.shapes.add_shape(MSO_SHAPE.ISOSCELES_TRIANGLE, Emu(int((878 - 4) * PT)),
                            Emu(int((v_bot - 2) * PT)), Emu(int(8 * PT)), Emu(int(8 * PT)))
v_head.rotation = 180
v_head.fill.solid()
v_head.fill.fore_color.rgb = ORANGE
v_head.line.fill.background()
v_head.shadow.inherit = False
pipeline_step(s, 878, APPROVAL_Y, "approval", "Human approval",
              "approve / reject\naudit log\nno auto-send", icon_size=42)

logo(s, 46, 468, 150)
notes(s, """
[1:50-2:40 \u2014 50 sec]

"Here's how the pieces connect \u2014 product architecture, not a stack diagram.

Ingestion pulls GiveCampus CSVs into constituent profiles. Classification applies
donor labels \u2014 LYBUNT, loyal, lapsed \u2014 and contact rules.

The priority engine scores every legal action and packs the best ones into your hour
budget. That becomes the weekly plan you just saw.

Scheduling reads Outlook free/busy and places tasks in open slots.

The M365 MCP layer is a narrow tool registry \u2014 seven validated Graph operations for
calendar and mail, nothing arbitrary. Autopilot calls those tools to draft outreach.

Then a human approves before anything sends. The gate is policy, not just UI."

DELIVERY: Trace left to right, then drop down to approval on the last node.
""")

# ================================================================ SLIDE 6 — Explainability
s = add_slide(GRAY_BG)
textbox(s, 64, 34, 780, 52, "Every recommendation shows its work", 40, font=TITLE_FONT, color=INK)
picture(s, os.path.join(SHOTS, "04-weekly-queue-scrolled.png"), 70, 104, 820, 421,
        crop_top=0.25, crop_bottom=0.06, crop_left=0.08, crop_right=0.08)
frame(s, 70, 104, 820, 421)
notes(s, """
[2:45-3:45 \u2014 60 sec]

"A fundraiser will not act on a black box. So every card explains itself.

Each one gives you the rank, the channel, how many minutes it costs, and a
'Why now?' \u2014 here, lapsed donor, reactivation timing. Then the raw evidence:
repeat donor, loyal, SYBUNT, last gift $100 in 2021. Those are the facts the score
was built from, not a rationalization after the fact.

Open the person and you also get why NOT \u2014 why we're not asking them to upgrade, and
what evidence we're missing to be more confident.

And those buttons at the bottom matter: if the fundraiser says 'wrong action,'
that person drops in the next rebuild. The human stays in charge of the queue.

Honest note: the anonymous-gift amounts are redacted on purpose, and the feedback is
session-local right now \u2014 it's not a trained model yet."

DELIVERY: Read one real card out loud, name and all. Specificity sells this slide.
""")

# ================================================================ SLIDE 7 — Autopilot
s = add_slide(GRAY_BG)
textbox(s, 64, 34, 820, 52, "Autopilot drafts it. A human sends it.", 40,
        font=TITLE_FONT, color=INK)
picture(s, os.path.join(SHOTS, "10-autopilot.png"), 60, 112, 840, 241,
        crop_top=0.585, crop_bottom=0.015, crop_left=0.065, crop_right=0.065)
frame(s, 60, 112, 840, 241)
bullets(s, 64, 382, 850, 130, [
    "Drafts are grounded in that donor\u2019s real giving history \u2014 nothing invented",
    "Sends and calendar invites are approval-gated in policy, not just in the UI",
    "Delegated scopes only  \u00b7  AES-256-GCM token cache  \u00b7  full audit log",
], size=16, spacing=1.2, space_after=8)
notes(s, """
[3:40-4:30 \u2014 50 sec]

"Ranking the work is only half of it. The other half is doing it.

This is Autopilot. When the queue says 'thank Claire Foster,' DonoRex writes the
draft \u2014 grounded in her actual giving history, not invented \u2014 and pushes it into
Microsoft Graph as a real Outlook draft.

Then it stops. Every send and every calendar invitation lands in this approval
inbox, and a human clicks Approve or Reject. That gate is in the policy layer, not
just the UI \u2014 mail.send and calendar.send_invitation are both marked
requires-approval in code, and anything unrecognised defaults to requiring approval.

Everything that happens gets audit-logged: drafted, approved, rejected, executed.

And the permissions are delegated to the signed-in user only \u2014 we never asked for
tenant-wide mailbox access. The token cache is AES-256-GCM encrypted on disk."

DELIVERY: The punchline is "it stops." Fundraising automation that sends on its own
is a liability; the approval gate is the feature, not a limitation.
""")

# ================================================================ SLIDE 8 — Weaknesses
s = add_slide(GRAY_BG)
textbox(s, 78, 62, 700, 52, "Weaknesses", 44, font=TITLE_FONT, color=INK)
bullets(s, 78, 152, 820, 300, [
    "Greedy optimizer \u2014 near-optimal, not provably optimal",
    "Opportunity dollars are planning estimates, not causal lift",
    "Segments match intent templates, not a language model",
    "Feedback is browser-local \u2014 no trained model yet",
    "Recurring Autopilot tasks need \u201cRun now\u201d \u2014 no scheduler",
], size=26, spacing=1.2, space_after=14)
logo(s, 770, 472, 155)
notes(s, """
[4:25-4:50 \u2014 25 sec]

"What we'd fix.

The optimizer is greedy, not integer programming \u2014 near-optimal, and fast enough to
rerun live, but not provably optimal.

The dollar figures are planning estimates from past giving. We are careful not to
call them predicted revenue, because there's no experiment in this dataset that
would let us claim causal lift.

Segments are template matching, not an LLM. Feedback is browser-local. And recurring
automations need a manual Run now \u2014 there's no background scheduler yet."

DELIVERY: Say these confidently and quickly. Judges trust teams that name their own
limits before being asked. Do not apologize.
""")

# ================================================================ SLIDE 9 — Thank you
s = add_slide(WHITE)
panel = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Emu(0), Emu(0), Emu(int(600 * PT)), Emu(H * PT))
panel.fill.solid()
panel.fill.fore_color.rgb = PANEL_BG
panel.line.fill.background()
panel.shadow.inherit = False
logo(s, 110, 215, 380)
accent_bar(s, x=690, y=68, w=60, h=7)
textbox(s, 690, 96, 240, 46, "Thank you", 32, font=TITLE_FONT, color=INK)
bullets(s, 690, 190, 250, 260, [
    "GiveCampus",
    "HackMIT organizers",
    "Our mentors",
    "Rex, our very good dinosaur",
], size=20, spacing=1.3, space_after=8)
textbox(s, 690, 452, 250, 40, "donorex \u2014 questions?", 15, color=MUTED)
notes(s, """
[4:50-5:00 \u2014 10 sec]

"Thanks to GiveCampus for the dataset and the challenge, to the HackMIT organizers,
and to our mentors.

DonoRex: it tells a fundraising team who to call on Tuesday, and why. Happy to take
questions."

BACKUP SLIDES TO HAVE READY (append after this one, do not present):
  \u2022 Strategy simulator \u2014 the same hours run under 7 different strategies
  \u2022 Communities & connectors \u2014 who can introduce you to whom
  \u2022 Autopilot approval inbox \u2014 the human-in-the-loop send gate
  \u2022 Privacy \u2014 anonymous gift redaction, delegated-only Graph scopes,
    AES-256-GCM encrypted token cache

LIKELY QUESTIONS:
  Q: How do you know the recommendations are good?
  A: We can't measure causal lift without an experiment \u2014 no A/B data in the set. What
     we can show is that the ranking is fully auditable: every score decomposes into
     named evidence on the card.

  Q: Why not use an LLM to pick?
  A: Fundraisers need a reason they can repeat to a boss. The ranking is deterministic
     and explainable; the LLM-shaped work is drafting the message, and even that is
     gated on human approval.

  Q: What's the Microsoft integration actually doing?
  A: Delegated permissions for the signed-in user only. It reads free/busy to schedule,
     writes drafts, and never sends mail or invitations without an explicit approval
     click. Tokens are AES-256-GCM encrypted on disk and every action is audit-logged.
""")

out = os.path.join(ROOT, "presentation", "DonoRex-HackMIT-5min.pptx")
out_root = os.path.join(ROOT, "DonoRex-HackMIT-5min.pptx")
prs.save(out)
print("saved", out)

import shutil

try:
    shutil.copy2(out, out_root)
    print("copied", out_root)
except PermissionError:
    print("SKIPPED root copy \u2014 close", os.path.basename(out_root), "in PowerPoint and rerun")
