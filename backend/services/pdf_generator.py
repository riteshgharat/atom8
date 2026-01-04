import io
from datetime import datetime
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import re


# Emoji to text replacements for PDF compatibility
EMOJI_REPLACEMENTS = {
    '📊': '[CHART]',
    '💊': '[HEALTH]',
    '🎯': '[TARGET]',
    '🧬': '[DNA]',
    '💡': '[INSIGHT]',
    '🚀': '[ROCKET]',
    '📈': '[GRAPH]',
    '🔍': '[SEARCH]',
    '✅': '[OK]',
    '⚠️': '[WARN]',
    '❌': '[X]',
    '🔬': '[LAB]',
    '📋': '[LIST]',
    '📅': '[DATE]',
    '🎨': '[ART]',
    '📄': '[DOC]',
    '🔧': '[TOOL]',
    '⚡': '[BOLT]',
    '🏆': '[TROPHY]',
    '💾': '[SAVE]',
    '📁': '[FOLDER]',
    '🔒': '[LOCK]',
    '🔓': '[UNLOCK]',
    '✨': '*',
    '⭐': '*',
    '🌟': '*',
    '💪': '[STRONG]',
    '👍': '[GOOD]',
    '👎': '[BAD]',
    '📝': '[NOTE]',
    '🎉': '[PARTY]',
    '🔥': '[FIRE]',
    '💥': '[BOOM]',
    '⚙️': '[GEAR]',
    '🛠️': '[TOOLS]',
    '📦': '[BOX]',
    '🗂️': '[FILES]',
    '📂': '[OPEN]',
    '🔗': '[LINK]',
    '🏷️': '[TAG]',
    '📌': '[PIN]',
    '🔎': '[ZOOM]',
}


def remove_emojis(text: str) -> str:
    """Remove or replace emojis with text equivalents."""
    # Replace known emojis
    for emoji, replacement in EMOJI_REPLACEMENTS.items():
        text = text.replace(emoji, replacement)
    
    # Remove any remaining emojis (unicode ranges for emojis)
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map symbols
        "\U0001F1E0-\U0001F1FF"  # flags
        "\U00002702-\U000027B0"  # dingbats
        "\U000024C2-\U0001F251"  # misc
        "\U0001F900-\U0001F9FF"  # supplemental symbols
        "\U0001FA00-\U0001FA6F"  # chess symbols
        "\U0001FA70-\U0001FAFF"  # symbols extended
        "\U00002600-\U000026FF"  # misc symbols
        "]+", 
        flags=re.UNICODE
    )
    return emoji_pattern.sub('', text)


def parse_markdown_table(lines: List[str], start_idx: int) -> tuple:
    """
    Parse a markdown table starting at start_idx.
    Returns (table_data, end_idx) where table_data is a list of rows.
    """
    table_rows = []
    idx = start_idx
    
    while idx < len(lines):
        line = lines[idx].strip()
        
        # Check if this is a table row (contains | characters)
        if '|' in line:
            # Skip separator rows (contain only |, -, :, and spaces)
            if re.match(r'^[\|\-\:\s]+$', line):
                idx += 1
                continue
            
            # Parse cells
            cells = [cell.strip() for cell in line.split('|')]
            # Remove empty first/last cells from leading/trailing |
            cells = [c for c in cells if c]
            
            if cells:
                table_rows.append(cells)
            idx += 1
        else:
            # End of table
            break
    
    return table_rows, idx


def create_pdf_table(table_data: List[List[str]], body_style) -> Table:
    """Create a styled PDF table from parsed markdown table data."""
    if not table_data:
        return None
    
    # Clean cell contents
    cleaned_data = []
    for row in table_data:
        cleaned_row = []
        for cell in row:
            cell_text = remove_emojis(cell)
            cell_text = re.sub(r'\*\*(.*?)\*\*', r'\1', cell_text)  # Remove bold markers
            cell_text = re.sub(r'\*(.*?)\*', r'\1', cell_text)  # Remove italic markers
            cleaned_row.append(cell_text)
        cleaned_data.append(cleaned_row)
    
    # Normalize row lengths
    max_cols = max(len(row) for row in cleaned_data)
    for row in cleaned_data:
        while len(row) < max_cols:
            row.append('')
    
    # Calculate column widths
    available_width = 6.5 * inch
    col_width = available_width / max_cols
    
    # Create table
    table = Table(cleaned_data, colWidths=[col_width] * max_cols)
    
    # Style the table
    style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2563eb')),  # Header background
        ('TEXTCOLOR', (0, 0), (-1, 0), white),  # Header text color
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#e5e7eb')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#f9fafb')]),
    ])
    table.setStyle(style)
    
    return table


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
        topMargin=0.75*inch,
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
        fontSize=20,
        textColor=HexColor('#1e40af'),
        spaceAfter=20,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    header_style = ParagraphStyle(
        'CustomHeader',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=HexColor('#2563eb'),
        spaceAfter=10,
        spaceBefore=14,
        fontName='Helvetica-Bold'
    )
    
    subheader_style = ParagraphStyle(
        'CustomSubHeader',
        parent=styles['Heading3'],
        fontSize=11,
        textColor=HexColor('#3b82f6'),
        spaceAfter=6,
        spaceBefore=10,
        fontName='Helvetica-Bold'
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=9,
        textColor=black,
        spaceAfter=6,
        leading=12,
        fontName='Helvetica'
    )
    
    bullet_style = ParagraphStyle(
        'CustomBullet',
        parent=styles['BodyText'],
        fontSize=9,
        textColor=black,
        leftIndent=15,
        spaceAfter=4,
        leading=12,
        fontName='Helvetica'
    )
    
    code_style = ParagraphStyle(
        'CustomCode',
        parent=styles['Code'],
        fontSize=8,
        textColor=HexColor('#1f2937'),
        backColor=HexColor('#f3f4f6'),
        leftIndent=15,
        spaceAfter=6,
        fontName='Courier'
    )
    
    # Add header with branding (no emoji)
    header_table = Table([
        ['ATOM8 DATA AUTOPSY REPORT'],
        ['Advanced AI-Powered Data Analysis']
    ], colWidths=[6.5*inch])
    
    header_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (0, 0), 16),
        ('FONTNAME', (0, 1), (0, 1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (0, 1), 10),
        ('TEXTCOLOR', (0, 0), (0, 0), HexColor('#1e40af')),
        ('TEXTCOLOR', (0, 1), (0, 1), HexColor('#6b7280')),
        ('BACKGROUND', (0, 0), (-1, -1), HexColor('#eff6ff')),
        ('BOX', (0, 0), (-1, -1), 2, HexColor('#2563eb')),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    
    elements.append(header_table)
    elements.append(Spacer(1, 0.2*inch))
    
    # Add generation timestamp
    timestamp_para = Paragraph(
        f"<b>Generated:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        body_style
    )
    elements.append(timestamp_para)
    elements.append(Spacer(1, 0.15*inch))
    
    # Add horizontal line
    line_table = Table([['']], colWidths=[6.5*inch])
    line_table.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, 0), 1, HexColor('#e5e7eb')),
    ]))
    elements.append(line_table)
    elements.append(Spacer(1, 0.1*inch))
    
    # Parse and convert markdown to PDF elements
    lines = markdown_content.split('\n')
    in_code_block = False
    code_lines = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Handle code blocks
        if line.strip().startswith('```'):
            if in_code_block:
                # End code block
                if code_lines:
                    code_text = '\n'.join(code_lines)
                    code_text = remove_emojis(code_text)
                    code_para = Paragraph(
                        f"<font face='Courier' size='7'>{escape_html(code_text)}</font>",
                        code_style
                    )
                    elements.append(code_para)
                    code_lines = []
                in_code_block = False
            else:
                in_code_block = True
            i += 1
            continue
        
        if in_code_block:
            code_lines.append(line)
            i += 1
            continue
        
        # Check for markdown table
        if '|' in line and not line.strip().startswith('#'):
            table_data, end_idx = parse_markdown_table(lines, i)
            if table_data:
                pdf_table = create_pdf_table(table_data, body_style)
                if pdf_table:
                    elements.append(Spacer(1, 0.1*inch))
                    elements.append(pdf_table)
                    elements.append(Spacer(1, 0.1*inch))
                i = end_idx
                continue
        
        # Clean the line
        clean_line = remove_emojis(line)
        
        # Handle headers
        if clean_line.startswith('# '):
            text = clean_line[2:].strip()
            elements.append(Paragraph(escape_html(text), title_style))
        elif clean_line.startswith('## '):
            text = clean_line[3:].strip()
            elements.append(Paragraph(escape_html(text), header_style))
        elif clean_line.startswith('### '):
            text = clean_line[4:].strip()
            elements.append(Paragraph(escape_html(text), subheader_style))
        
        # Handle bullets
        elif clean_line.strip().startswith('• ') or clean_line.strip().startswith('- '):
            bullet_text = clean_line.strip()[2:]
            bullet_text = format_text(bullet_text)
            elements.append(Paragraph('- ' + bullet_text, bullet_style))
        
        # Handle numbered lists
        elif re.match(r'^\d+\.\s', clean_line.strip()):
            text = format_text(clean_line.strip())
            elements.append(Paragraph(text, bullet_style))
        
        # Handle regular text
        elif clean_line.strip():
            text = format_text(clean_line.strip())
            elements.append(Paragraph(text, body_style))
        else:
            # Empty line - add small space
            elements.append(Spacer(1, 0.05*inch))
        
        i += 1
    
    # Add footer
    elements.append(Spacer(1, 0.2*inch))
    footer_line = Table([['']], colWidths=[6.5*inch])
    footer_line.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, 0), 1, HexColor('#e5e7eb')),
    ]))
    elements.append(footer_line)
    elements.append(Spacer(1, 0.1*inch))
    
    footer_para = Paragraph(
        "<i>Report generated by ATOM8 - AI-Powered Data Intelligence Platform</i>",
        ParagraphStyle(
            'Footer',
            parent=body_style,
            alignment=TA_CENTER,
            fontSize=8,
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


def format_text(text: str) -> str:
    """Format text with bold/italic and escape HTML."""
    # Convert markdown bold to reportlab bold
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
    # Convert markdown italic to reportlab italic
    text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', text)
    return escape_html_preserve_tags(text)


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
