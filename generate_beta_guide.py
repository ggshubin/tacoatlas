#!/usr/bin/env python3
"""
TacoAtlas Beta Tester Guide — PDF Generator
Uses ReportLab for precise layout control.
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable,
    Table, TableStyle, KeepTogether
)
from reportlab.platypus.flowables import Flowable
import os

OUTPUT_PATH = "/Users/shubin/Library/CloudStorage/Dropbox/Claude/tacooatlas/TacoAtlas-Beta-Tester-Guide.pdf"

# ─── Color Palette ─────────────────────────────────────────────────────────
DARK_BROWN      = colors.HexColor("#2C1A0E")
MED_BROWN       = colors.HexColor("#4A2E1A")
AMBER           = colors.HexColor("#D97706")
AMBER_LIGHT     = colors.HexColor("#FEF3C7")
AMBER_BORDER    = colors.HexColor("#F59E0B")
CREAM           = colors.HexColor("#FDFAF6")
BODY_TEXT       = colors.HexColor("#1C1917")
MUTED           = colors.HexColor("#78716C")
WHITE           = colors.white
RULE_COLOR      = colors.HexColor("#E7E0D8")
STEP_BG         = colors.HexColor("#F5EFE8")

# ─── Custom Flowables ──────────────────────────────────────────────────────

class HeaderBanner(Flowable):
    """Full-width dark brown header with app title."""

    def __init__(self, width, height=1.4 * inch):
        super().__init__()
        self.width = width
        self.height = height

    def wrap(self, available_width, available_height):
        return self.width, self.height

    def draw(self):
        c = self.canv
        w, h = self.width, self.height

        # Background
        c.setFillColor(DARK_BROWN)
        c.rect(0, 0, w, h, fill=1, stroke=0)

        # Subtle bottom accent stripe
        c.setFillColor(AMBER)
        c.rect(0, 0, w, 4, fill=1, stroke=0)

        # App name
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 28)
        c.drawString(0.45 * inch, h - 0.62 * inch, "\U0001f32e TacoAtlas Beta")

        # Subtitle
        c.setFillColor(AMBER)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(0.45 * inch, h - 0.95 * inch, "Beta Tester Guide")

        # Version tag — right-aligned
        c.setFillColor(colors.HexColor("#A8917A"))
        c.setFont("Helvetica", 9)
        tag = "March 2026  |  Internal Beta"
        c.drawRightString(w - 0.45 * inch, 0.22 * inch, tag)


class ScenarioHeader(Flowable):
    """Colored scenario header with large number badge and title."""

    def __init__(self, number, title, width, important=False):
        super().__init__()
        self.number = number
        self.title = title
        self.width = width
        self.important = important
        self.height = 0.52 * inch

    def wrap(self, available_width, available_height):
        return self.width, self.height

    def draw(self):
        c = self.canv
        w, h = self.width, self.height

        bg = MED_BROWN if not self.important else colors.HexColor("#7C3209")
        c.setFillColor(bg)
        c.roundRect(0, 0, w, h, 6, fill=1, stroke=0)

        # Number badge
        badge_r = 0.18 * inch
        badge_x = 0.38 * inch
        badge_y = h / 2
        c.setFillColor(AMBER)
        c.circle(badge_x, badge_y, badge_r, fill=1, stroke=0)
        c.setFillColor(DARK_BROWN)
        c.setFont("Helvetica-Bold", 13)
        c.drawCentredString(badge_x, badge_y - 0.05 * inch, str(self.number))

        # Title text
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(0.7 * inch, h / 2 - 0.07 * inch, self.title)

        if self.important:
            c.setFillColor(AMBER)
            c.setFont("Helvetica-BoldOblique", 8)
            c.drawRightString(w - 0.25 * inch, h / 2 - 0.05 * inch, "\u2605  THE BIG ONE")


class CalloutBox(Flowable):
    """Amber callout box for important notes."""

    def __init__(self, text, width):
        super().__init__()
        self.text = text
        self.width = width
        self._content_height = None

    def wrap(self, available_width, available_height):
        self.width = available_width
        chars_per_line = int(self.width / 6.2) - 4
        import math
        lines = math.ceil(len(self.text) / max(chars_per_line, 1))
        self._content_height = max(lines, 2) * 14 + 28
        return self.width, self._content_height

    def draw(self):
        c = self.canv
        w = self.width
        h = self._content_height or 60

        # Background
        c.setFillColor(AMBER_LIGHT)
        c.roundRect(0, 0, w, h, 6, fill=1, stroke=0)

        # Left accent bar
        c.setFillColor(AMBER)
        c.roundRect(0, 0, 5, h, 3, fill=1, stroke=0)

        # Border
        c.setStrokeColor(AMBER_BORDER)
        c.setLineWidth(1)
        c.roundRect(0, 0, w, h, 6, fill=0, stroke=1)

        # Icon + label
        c.setFillColor(colors.HexColor("#92400E"))
        c.setFont("Helvetica-Bold", 9)
        c.drawString(16, h - 16, "\u26a0  TEXT ME IF THIS BREAKS")

        # Body text — manual word wrap
        c.setFont("Helvetica", 9.5)
        c.setFillColor(colors.HexColor("#451A03"))
        self._draw_wrapped(c, self.text, 16, h - 30, w - 32, 13)

    def _draw_wrapped(self, c, text, x, y, max_width, line_height):
        words = text.split()
        line = ""
        for word in words:
            test = (line + " " + word).strip()
            if c.stringWidth(test, "Helvetica", 9.5) <= max_width:
                line = test
            else:
                c.drawString(x, y, line)
                y -= line_height
                line = word
        if line:
            c.drawString(x, y, line)


class FooterRule(Flowable):
    """Footer separator + attribution text."""

    def __init__(self, width):
        super().__init__()
        self.width = width
        self.height = 0.4 * inch

    def wrap(self, available_width, available_height):
        return self.width, self.height

    def draw(self):
        c = self.canv
        w = self.width

        c.setStrokeColor(AMBER)
        c.setLineWidth(1.5)
        c.line(0, self.height - 4, w, self.height - 4)

        c.setFillColor(MUTED)
        c.setFont("Helvetica-Oblique", 8.5)
        msg = "Seriously, thank you. This is huge help.   \U0001f32e  TacoAtlas Beta"
        c.drawCentredString(w / 2, 6, msg)


# ─── Style Definitions ─────────────────────────────────────────────────────

def build_styles():
    base = getSampleStyleSheet()

    styles = {}

    styles["body"] = ParagraphStyle(
        "body",
        fontName="Helvetica",
        fontSize=10.5,
        leading=16,
        textColor=BODY_TEXT,
        spaceAfter=4,
    )

    styles["intro"] = ParagraphStyle(
        "intro",
        parent=styles["body"],
        fontSize=11,
        leading=17,
        textColor=colors.HexColor("#292524"),
        spaceAfter=10,
        leftIndent=0,
    )

    styles["section_heading"] = ParagraphStyle(
        "section_heading",
        fontName="Helvetica-Bold",
        fontSize=12,
        textColor=DARK_BROWN,
        spaceBefore=10,
        spaceAfter=4,
    )

    styles["bullet"] = ParagraphStyle(
        "bullet",
        parent=styles["body"],
        leftIndent=18,
        bulletIndent=6,
        spaceAfter=3,
    )

    styles["step"] = ParagraphStyle(
        "step",
        parent=styles["body"],
        leftIndent=28,
        spaceAfter=4,
    )

    styles["step_num"] = ParagraphStyle(
        "step_num",
        parent=styles["body"],
        fontName="Helvetica-Bold",
        textColor=AMBER,
        leftIndent=0,
        spaceAfter=2,
    )

    styles["callout_note"] = ParagraphStyle(
        "callout_note",
        fontName="Helvetica-Oblique",
        fontSize=10,
        textColor=MUTED,
        spaceAfter=6,
    )

    return styles


# ─── Build Story ───────────────────────────────────────────────────────────

def build_story(styles, page_width, page_height, margins):
    content_width = page_width - margins[0] - margins[2]
    story = []

    # ── Header banner ──────────────────────────────────────────────────────
    story.append(HeaderBanner(content_width))
    story.append(Spacer(1, 0.22 * inch))

    # ── Intro ──────────────────────────────────────────────────────────────
    story.append(Paragraph(
        "Hey! Thanks for helping test TacoAtlas before it goes live. You don't need to do "
        "anything crazy — just use it like you normally would, but keep an eye on a few specific "
        "things for me. Here's what to focus on.",
        styles["intro"]
    ))

    story.append(HRFlowable(width="100%", thickness=1, color=RULE_COLOR, spaceAfter=10))

    # ── Get Set Up ────────────────────────────────────────────────────────
    story.append(Paragraph("First, get set up", styles["section_heading"]))

    before_items = [
        "Download from the Play Store beta link I sent you",
        "Create an account with your real email — you'll get a confirmation link",
        "If you can, grab a friend to also sign up so you can test the friends stuff together",
    ]
    for item in before_items:
        story.append(Paragraph(f"<bullet>\u2022</bullet> {item}", styles["bullet"]))

    story.append(Spacer(1, 0.18 * inch))

    # ── Helper to render numbered steps ───────────────────────────────────
    def add_steps(steps):
        for i, step in enumerate(steps, 1):
            row = Table(
                [[
                    Paragraph(f"<b>{i}</b>", ParagraphStyle(
                        "sn", fontName="Helvetica-Bold", fontSize=10,
                        textColor=WHITE, alignment=TA_CENTER
                    )),
                    Paragraph(step, styles["body"]),
                ]],
                colWidths=[0.26 * inch, content_width - 0.26 * inch - 0.08 * inch],
            )
            row.setStyle(TableStyle([
                ("BACKGROUND",    (0, 0), (0, 0), AMBER),
                ("BACKGROUND",    (1, 0), (1, 0), STEP_BG),
                ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING",    (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING",   (0, 0), (0, 0), 4),
                ("LEFTPADDING",   (1, 0), (1, 0), 8),
                ("RIGHTPADDING",  (1, 0), (1, 0), 8),
                ("ROUNDEDCORNERS", [4]),
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [None]),
            ]))
            story.append(row)
            story.append(Spacer(1, 4))

    # ── Thing 1 ────────────────────────────────────────────────────────────
    story.append(KeepTogether([
        ScenarioHeader(1, "Drop a spot", content_width),
        Spacer(1, 8),
    ]))
    story.append(Paragraph(
        "Drop a pin somewhere you know — a taco spot, a restaurant, wherever.",
        styles["callout_note"]
    ))
    add_steps([
        "Tap the + button and drop a pin on any location you recognize",
        "Save it — does your pin show up on the map right away?",
        "Tap the pin, then open the detail screen — does it load correctly?",
    ])

    story.append(Spacer(1, 0.16 * inch))

    # ── Thing 2 ────────────────────────────────────────────────────────────
    story.append(KeepTogether([
        ScenarioHeader(2, "Leave a review", content_width),
        Spacer(1, 8),
    ]))
    story.append(Paragraph(
        "Open one of your spots and go through the whole review flow.",
        styles["callout_note"]
    ))
    add_steps([
        "Open a spot and tap Add Review",
        "Go through the whole thing — taco entries, salsa, notes, stars",
        "Submit it — does it save and show up on the spot page?",
        "If you have more than one review, try collapsing and expanding them",
    ])

    story.append(Spacer(1, 0.16 * inch))

    # ── Thing 3 (highlighted — the big one) ───────────────────────────────
    story.append(KeepTogether([
        ScenarioHeader(3, "Uninstall and restore", content_width, important=True),
        Spacer(1, 8),
    ]))

    story.append(Paragraph(
        "This is the main thing I need you to test. Don't skip this one.",
        styles["callout_note"]
    ))

    add_steps([
        "Make sure you have at least one spot saved",
        "Uninstall the app completely",
        "Reinstall and sign back in with the same account",
        "You should see a \"Welcome back\" popup asking if you want to restore your spots",
        "Tap Restore — your spots should come back",
    ])

    story.append(Spacer(1, 6))
    story.append(CalloutBox(
        "If that popup doesn't show up, or your spots don't come back, text me right away. "
        "That's the thing I most need to know about.",
        content_width
    ))

    story.append(Spacer(1, 0.16 * inch))

    # ── Thing 4 ────────────────────────────────────────────────────────────
    story.append(KeepTogether([
        ScenarioHeader(4, "Find a friend", content_width),
        Spacer(1, 8),
    ]))

    story.append(Paragraph(
        "You'll need another tester for this one.",
        styles["callout_note"]
    ))

    add_steps([
        "Go to the Mi Gente tab and follow someone else who's testing",
        "Once they add a spot, it should show up on your map as a colored pin (not a taco — those are just yours)",
        "Check that their spots also show up in the Mi Gente feed",
    ])

    story.append(Spacer(1, 0.16 * inch))

    # ── While you're at it ─────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=1, color=RULE_COLOR, spaceAfter=8))
    story.append(Paragraph("While you're at it", styles["section_heading"]))
    story.append(Paragraph(
        "A few extra things to poke at if you feel like it:",
        styles["body"]
    ))

    extras = [
        "Edit a review after you've saved it — does it update correctly?",
        "Sign out and back in — do your spots still show?",
        "Add a pin with no review — does it still show in your list?",
    ]
    for item in extras:
        story.append(Paragraph(f"<bullet>\u2022</bullet> {item}", styles["bullet"]))

    story.append(Spacer(1, 0.2 * inch))

    # ── If something breaks ────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=1, color=RULE_COLOR, spaceAfter=8))
    story.append(Paragraph("If something breaks", styles["section_heading"]))
    story.append(Paragraph(
        "Just text me what you were doing and what happened. A screenshot helps. Don't worry about "
        "writing it up formally — a voice memo works too. The more specific the better though:",
        styles["body"]
    ))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "<i>\"it crashed when I tapped Restore\"</i> is way more useful than <i>\"it crashed.\"</i>",
        styles["body"]
    ))

    story.append(Spacer(1, 0.25 * inch))

    # ── Footer ─────────────────────────────────────────────────────────────
    story.append(FooterRule(content_width))

    return story


# ─── Page Template with page numbers ──────────────────────────────────────

def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 8)
    page_num = canvas.getPageNumber()
    canvas.drawRightString(
        doc.pagesize[0] - doc.rightMargin,
        doc.bottomMargin - 18,
        f"Page {page_num}"
    )
    canvas.restoreState()


# ─── Main ──────────────────────────────────────────────────────────────────

def main():
    margins = (0.65 * inch, 0.65 * inch, 0.65 * inch, 0.65 * inch)  # L, T, R, B

    doc = SimpleDocTemplate(
        OUTPUT_PATH,
        pagesize=letter,
        leftMargin=margins[0],
        topMargin=margins[1],
        rightMargin=margins[2],
        bottomMargin=margins[3],
        title="TacoAtlas Beta Tester Guide",
        author="TacoAtlas",
        subject="Internal Beta Testing Guide",
    )

    styles = build_styles()
    story = build_story(styles, letter[0], letter[1], margins)

    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(f"PDF saved to: {OUTPUT_PATH}")
    print(f"File size: {os.path.getsize(OUTPUT_PATH):,} bytes")


if __name__ == "__main__":
    main()
