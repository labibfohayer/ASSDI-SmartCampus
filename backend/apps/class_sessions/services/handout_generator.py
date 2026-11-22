import os
from pathlib import Path
from django.conf import settings
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors


def generate_handout_pdf(subject_name, topic_title, teacher_name, key_takeaways, hadith_or_ethics, output_filename):
    """
    Generates a production-ready, beautifully formatted As-Sunnah lecture sheet PDF.
    """
    media_dir = Path(settings.MEDIA_ROOT) / "session_materials"
    media_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = media_dir / output_filename

    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    primary_color = colors.HexColor("#0B2A21")
    secondary_color = colors.HexColor("#10B981")
    dark_neutral = colors.HexColor("#1F2937")
    light_bg = colors.HexColor("#F9FAFB")
    accent_bg = colors.HexColor("#ECFDF5")

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=18,
        textColor=primary_color,
        alignment=1, # Center
    )

    sub_title_style = ParagraphStyle(
        "DocSubTitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#4B5563"),
        alignment=1,
    )

    h1_style = ParagraphStyle(
        "Heading1_Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=primary_color,
        spaceBefore=10,
        spaceAfter=4,
    )

    body_style = ParagraphStyle(
        "Body_Custom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13.5,
        textColor=dark_neutral,
    )

    bullet_style = ParagraphStyle(
        "Bullet_Custom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=dark_neutral,
        leftIndent=14,
        firstLineIndent=-10,
    )

    quote_style = ParagraphStyle(
        "Quote_Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#065F46"),
    )

    elements = []

    # 1. Header with branding
    elements.append(Paragraph("AS-SUNNAH SKILL DEVELOPMENT INSTITUTE (ASSDI)", title_style))
    elements.append(Paragraph("A Flagship Project of As-Sunnah Foundation • Dhaka, Bangladesh", sub_title_style))
    elements.append(Paragraph("Course: Small Business Management Course (SBMC) • NSDA Registered", sub_title_style))
    elements.append(Spacer(1, 8))
    elements.append(HRFlowable(width="100%", thickness=2, color=secondary_color, spaceBefore=2, spaceAfter=8))

    # 2. Metadata Box (Subject, Topic, Faculty)
    meta_data = [
        [
            Paragraph(f"<b>Subject:</b> {subject_name}", body_style),
            Paragraph(f"<b>Faculty / Instructor:</b> {teacher_name or 'ASSDI Faculty'}", body_style),
        ],
        [
            Paragraph(f"<b>Topic Title:</b> {topic_title}", body_style),
            Paragraph(f"<b>Classification:</b> Core Curriculum Lecture Sheet", body_style),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[270, 250])
    meta_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), accent_bg),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#A7F3D0")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D1FAE5")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    elements.append(meta_table)
    elements.append(Spacer(1, 10))

    # 3. Learning Objectives & Core Concepts
    elements.append(Paragraph("1. LEARNING OBJECTIVES & OVERVIEW", h1_style))
    elements.append(
        Paragraph(
            f"This handout covers the core technical and practical foundations of <b>{topic_title}</b>. "
            f"Students are expected to master both the conceptual framework and execute real-world enterprise drills.",
            body_style,
        )
    )
    elements.append(Spacer(1, 6))

    # 4. Key Takeaways & Practical Drills
    elements.append(Paragraph("2. KEY TAKEAWAYS & OPERATIONAL GUIDELINES", h1_style))
    if key_takeaways:
        points = [p.strip() for p in key_takeaways.split("\n") if p.strip()]
        for pt in points:
            elements.append(Paragraph(f"• {pt}", bullet_style))
    else:
        elements.append(Paragraph("• Master standard professional workflows and industry-standard best practices.", bullet_style))
        elements.append(Paragraph("• Ensure continuous data reconciliation and quality control checks.", bullet_style))
        elements.append(Paragraph("• Comply with enterprise standards for accuracy, security and transparency.", bullet_style))

    elements.append(Spacer(1, 10))

    # 5. Hadith / Fiqh / Ethical Guidelines Callout
    elements.append(Paragraph("3. ETHICAL & ISLAMIC COMMERCIAL FRAMEWORK", h1_style))
    ethics_text = hadith_or_ethics or (
        "The Messenger of Allah (ﷺ) said: 'The truthful and trustworthy merchant is associated with the prophets, "
        "the upright, and the martyrs.' (Jami` at-Tirmidhi 1209). In all commercial and digital dealings, "
        "transparency (Sidq), honesty (Amanah), and avoidance of deception (Ghashsh) are strictly mandatory."
    )
    quote_data = [[Paragraph(f"<b>Ethical Reminder:</b> {ethics_text}", quote_style)]]
    quote_table = Table(quote_data, colWidths=[520])
    quote_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F0FDF4")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#34D399")),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    elements.append(quote_table)
    elements.append(Spacer(1, 10))

    # 6. Practical Action Items / Self-Study Assignment
    elements.append(Paragraph("4. PRACTICAL EXERCISES & HOMEWORK", h1_style))
    elements.append(
        Paragraph("1. Complete the assigned worksheet on this topic and submit it before the next review session.", bullet_style)
    )
    elements.append(
        Paragraph("2. Prepare a 3-minute oral presentation or spreadsheet model based on today's case study.", bullet_style)
    )
    elements.append(
        Paragraph("3. If any doubts remain, submit a Help Request via the ASSDI student portal within 24 hours.", bullet_style)
    )
    elements.append(Spacer(1, 14))

    # 7. Verification Footer
    elements.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor("#D1D5DB"), spaceBefore=4, spaceAfter=6))
    footer_text = Paragraph(
        "<font size='7' color='#6B7280'>Document Reference: ASSDI-LEC-"
        f"{subject_name[:4].upper()}-2026 • Verified by Academic Committee • As-Sunnah Skill Development Institute, Satarkul, Badda, Dhaka.</font>",
        ParagraphStyle("Footer", parent=styles["Normal"], alignment=1),
    )
    elements.append(footer_text)

    doc.build(elements)
    file_size = os.path.getsize(pdf_path)
    return str(pdf_path), file_size
