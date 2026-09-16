from pathlib import Path
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf"

GUIDES = [
    {
        "filename": "guia-la-telarana-de-carlota.pdf",
        "title": "La telaraña de Carlota",
        "author": "E. B. White",
        "color": "#E95845",
        "dark": "#8C3028",
        "questions": [
            "¿Qué personaje te dio más curiosidad y por qué?",
            "Busca una palabra nueva. ¿Qué crees que significa por las pistas de la lectura?",
            "Cuenta a alguien en casa una parte importante sin revelar el final.",
        ],
        "activity": "Dibuja una red de ideas: en el centro escribe un personaje y alrededor anota tres cualidades que descubriste.",
    },
    {
        "filename": "guia-el-coleccionista-de-palabras.pdf",
        "title": "El coleccionista de palabras",
        "author": "Peter H. Reynolds",
        "color": "#E1AA28",
        "dark": "#8C6614",
        "questions": [
            "¿Qué palabra te gustaría guardar hoy?",
            "¿Cómo cambia una oración cuando eliges una palabra más precisa?",
            "Comparte una palabra nueva en casa y úsala en una oración propia.",
        ],
        "activity": "Crea tu frasco de palabras: escribe cinco palabras interesantes y dibuja una pista para recordar cada una.",
    },
    {
        "filename": "guia-la-ultima-parada-de-la-calle-market.pdf",
        "title": "La última parada de la calle Market",
        "author": "Matt de la Peña",
        "color": "#2B68BB",
        "dark": "#17447D",
        "questions": [
            "¿Qué detalle del camino te ayuda a imaginar el lugar?",
            "¿Qué aprende un personaje al observar a otras personas?",
            "Platica en casa sobre un momento en que algo sencillo te hizo sentir agradecimiento.",
        ],
        "activity": "Haz un mapa de un recorrido conocido. Agrega tres lugares, un sonido y una persona que podrías encontrar.",
    },
]


def wrap(text, font_name, font_size, width):
    words = text.split()
    lines, line = [], ""
    for word in words:
        proposal = f"{line} {word}".strip()
        if stringWidth(proposal, font_name, font_size) <= width:
            line = proposal
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def draw_wrapped(pdf, text, x, y, width, font_name="Helvetica", font_size=11, leading=16, color=HexColor("#33445F")):
    pdf.setFont(font_name, font_size)
    pdf.setFillColor(color)
    for line in wrap(text, font_name, font_size, width):
        pdf.drawString(x, y, line)
        y -= leading
    return y


def build_guide(guide):
    output_path = OUTPUT / guide["filename"]
    pdf = canvas.Canvas(str(output_path), pagesize=letter)
    pdf.setTitle(f"Guía de lectura: {guide['title']}")
    pdf.setAuthor("Bearings AI - Escuela Gaspar Castaño de Sosa")
    width, height = letter
    accent = HexColor(guide["color"])
    dark = HexColor(guide["dark"])

    pdf.setFillColor(HexColor("#FFFDF7"))
    pdf.rect(0, 0, width, height, stroke=0, fill=1)
    pdf.setFillColor(accent)
    pdf.rect(0, height - 146, width, 146, stroke=0, fill=1)
    pdf.setFillColor(dark)
    pdf.circle(width - 56, height - 30, 78, stroke=0, fill=1)
    pdf.setFillColor(HexColor("#FFD453"))
    pdf.circle(width - 50, height - 23, 44, stroke=0, fill=1)

    pdf.setFillColor(white)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(45, height - 40, "BEARINGS AI - RINCÓN DE LECTURA")
    pdf.setFont("Helvetica-Bold", 27)
    pdf.drawString(45, height - 76, guide["title"])
    pdf.setFont("Helvetica", 12)
    pdf.drawString(45, height - 98, guide["author"])
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(45, height - 123, "Guía de acompañamiento - Tercer grado")

    card_y = height - 180
    pdf.setFillColor(white)
    pdf.roundRect(40, card_y - 80, width - 80, 76, 14, stroke=0, fill=1)
    pdf.setStrokeColor(HexColor("#DDE6F0"))
    pdf.roundRect(40, card_y - 80, width - 80, 76, 14, stroke=1, fill=0)
    pdf.setFillColor(HexColor("#60708A"))
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(60, card_y - 25, "PARA ANTES DE LEER")
    prompt = "Mira la portada y el título. ¿Qué imaginas que puede ocurrir? Escribe o dibuja una predicción."
    draw_wrapped(pdf, prompt, 60, card_y - 45, width - 120, font_size=11)

    y = card_y - 125
    pdf.setFillColor(dark)
    pdf.setFont("Helvetica-Bold", 17)
    pdf.drawString(45, y, "Durante y después de leer")
    y -= 31
    for index, question in enumerate(guide["questions"], start=1):
        pdf.setFillColor(accent)
        pdf.circle(56, y + 3, 12, stroke=0, fill=1)
        pdf.setFillColor(white)
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawCentredString(56, y, str(index))
        y = draw_wrapped(pdf, question, 78, y, width - 128, font_name="Helvetica-Bold", font_size=11, leading=16)
        y -= 13

    activity_top = y - 4
    pdf.setFillColor(HexColor("#FFF0BB"))
    pdf.roundRect(40, activity_top - 100, width - 80, 94, 14, stroke=0, fill=1)
    pdf.setFillColor(HexColor("#8A6516"))
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(60, activity_top - 28, "UNA ACTIVIDAD PARA COMPARTIR")
    draw_wrapped(pdf, guide["activity"], 60, activity_top - 50, width - 120, font_size=11, leading=16, color=HexColor("#5E532D"))

    pdf.setStrokeColor(HexColor("#C9D5E4"))
    pdf.line(45, 66, width - 45, 66)
    pdf.setFillColor(HexColor("#6D7D94"))
    pdf.setFont("Helvetica", 8.5)
    pdf.drawString(45, 48, "Material de acompañamiento para el aula. No incluye ni reemplaza el texto completo del libro.")
    pdf.drawRightString(width - 45, 48, "Escuela Gaspar Castaño de Sosa")
    pdf.save()


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for reading_guide in GUIDES:
        build_guide(reading_guide)
