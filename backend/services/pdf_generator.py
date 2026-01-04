import io
from datetime import datetime
from typing import Dict, Any
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
import re


def create_pdf_report(markdown_content: str, processing_data: Dict[str, Any] = None) -> bytes:
    """
    Create a professional PDF report from markdown content.
    
    Args:
        markdown_content: The markdown content for the report
        processing_data: Optional processing data for additional context
    
    Returns:
        bytes: PDF file content
    """
    buffer = io.BytesIO()
    
    # Create PDF document
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.75*inch,
        leftMargin=0.75*inch,
        topMargin=1*inch,
        bottomMargin=0.75*inch
    )
    
    # Container for 'Flowable' objects
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    
    # Custom styles for the report
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=HexColor('#1e40af'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    header_style = ParagraphStyle(
        'CustomHeader',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=HexColor('#2563eb'),
        spaceAfter=12,
        spaceBefore=16,
        fontName='Helvetica-Bold'
    )
    
    subheader_style = ParagraphStyle(
        'CustomSubHeader',
        parent=styles['Heading3'],
        fontSize=13,
        textColor=HexColor('#3b82f6'),
        spaceAfter=8,
        spaceBefore=12,
        fontName='Helvetica-Bold'
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=10,
        textColor=black,
        spaceAfter=8,
        leading=14,
        fontName='Helvetica'
    )
    
    bullet_style = ParagraphStyle(
        'CustomBullet',
        parent=styles['BodyText'],
        fontSize=10,
        textColor=black,
        leftIndent=20,
        spaceAfter=6,
        leading=14,
        fontName='Helvetica'
    )
    
    code_style = ParagraphStyle(
        'CustomCode',
        parent=styles['Code'],
        fontSize=9,
        textColor=HexColor('#1f2937'),
        leftIndent=20,
        spaceAfter=8,
        fontName='Courier'
    )
    
    # Add header with branding
    header_table = Table([
        ['🔬 ATOM8 DATA AUTOPSY REPORT'],
        ['Advanced AI-Powered Data Analysis']
    ], colWidths=[6.5*inch])
    
    header_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (0, 0), 18),
        ('FONTNAME', (0, 1), (0, 1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (0, 1), 12),
        ('TEXTCOLOR', (0, 0), (0, 0), HexColor('#1e40af')),
        ('TEXTCOLOR', (0, 1), (0, 1), HexColor('#6b7280')),
        ('BACKGROUND', (0, 0), (-1, -1), HexColor('#eff6ff')),
        ('BOX', (0, 0), (-1, -1), 2, HexColor('#2563eb')),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
    ]))
    
    elements.append(header_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Add generation timestamp
    timestamp_para = Paragraph(
        f"<b>Generated:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        body_style
    )
    elements.append(timestamp_para)
    elements.append(Spacer(1, 0.2*inch))
    
    # Add horizontal line
    line_table = Table([['']], colWidths=[6.5*inch])
    line_table.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, 0), 2, HexColor('#e5e7eb')),
    ]))
    elements.append(line_table)
    elements.append(Spacer(1, 0.2*inch))
    
    # Parse and convert markdown to PDF elements
    lines = markdown_content.split('\n')
    in_code_block = False
    code_lines = []
    
    for line in lines:
        # Handle code blocks
        if line.strip().startswith('```'):
            if in_code_block:
                # End code block
                if code_lines:
                    code_text = '\n'.join(code_lines)
                    code_para = Paragraph(
                        f"<font face='Courier' size='8'>{escape_html(code_text)}</font>",
                        code_style
                    )
                    elements.append(code_para)
                    code_lines = []
                in_code_block = False
            else:
                in_code_block = True
            continue
        
        if in_code_block:
            code_lines.append(line)
            continue
        
        # Handle headers
        if line.startswith('# '):
            elements.append(Paragraph(escape_html(line[2:]), title_style))
        elif line.startswith('## '):
            elements.append(Paragraph(escape_html(line[3:]), header_style))
        elif line.startswith('### '):
            elements.append(Paragraph(escape_html(line[4:]), subheader_style))
        
        # Handle bullets
        elif line.strip().startswith('• ') or line.strip().startswith('- '):
            bullet_text = line.strip()[2:]
            # Convert markdown bold to reportlab bold
            bullet_text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', bullet_text)
            elements.append(Paragraph('• ' + escape_html_preserve_tags(bullet_text), bullet_style))
        
        # Handle numbered lists
        elif re.match(r'^\d+\.\s', line.strip()):
            elements.append(Paragraph(escape_html(line.strip()), bullet_style))
        
        # Handle regular text
        elif line.strip():
            # Convert emoji and markdown formatting
            text = line.strip()
            # Convert markdown bold to reportlab bold
            text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
            # Convert markdown italic to reportlab italic
            text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', text)
            elements.append(Paragraph(escape_html_preserve_tags(text), body_style))
        else:
            # Empty line - add small space
            elements.append(Spacer(1, 0.1*inch))
    
    # Add footer
    elements.append(Spacer(1, 0.3*inch))
    footer_line = Table([['']], colWidths=[6.5*inch])
    footer_line.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, 0), 2, HexColor('#e5e7eb')),
    ]))
    elements.append(footer_line)
    elements.append(Spacer(1, 0.15*inch))
    
    footer_para = Paragraph(
        "<i>Report generated by ATOM8 - AI-Powered Data Intelligence Platform</i>",
        ParagraphStyle(
            'Footer',
            parent=body_style,
            alignment=TA_CENTER,
            fontSize=9,
            textColor=HexColor('#6b7280')
        )
    )
    elements.append(footer_para)
    
    # Build PDF
    doc.build(elements)
    
    # Get PDF bytes
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return pdf_bytes


def escape_html(text: str) -> str:
    """Escape HTML special characters."""
    return (text
            .replace('&', '&amp;')
            .replace('<', '&lt;')
            .replace('>', '&gt;')
            .replace('"', '&quot;')
            .replace("'", '&#039;'))


def escape_html_preserve_tags(text: str) -> str:
    """Escape HTML but preserve <b> and <i> tags."""
    # First escape all
    text = escape_html(text)
    # Then unescape allowed tags
    text = text.replace('&lt;b&gt;', '<b>').replace('&lt;/b&gt;', '</b>')
    text = text.replace('&lt;i&gt;', '<i>').replace('&lt;/i&gt;', '</i>')
    return text
