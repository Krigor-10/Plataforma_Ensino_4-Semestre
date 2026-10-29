"""Gera os PDFs das aulas a partir de trechos dos PDFs originais (texto + figuras originais)."""
import io, os, re, sys
import pymupdf
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, KeepTogether
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from xml.sax.saxutils import escape

sys.path.insert(0, os.path.dirname(__file__))
from extrair import SRC, ARQ, limpar

OUT = sys.argv[1] if len(sys.argv) > 1 else "out"
FONTES = "C:/Windows/Fonts/"
pdfmetrics.registerFont(TTFont("Arial", FONTES + "arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", FONTES + "arialbd.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Italic", FONTES + "ariali.ttf"))
from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily("Arial", normal="Arial", bold="Arial-Bold", italic="Arial-Italic", boldItalic="Arial-Bold")

ROXO = HexColor("#5b21b6")
EST = {
    "topo": ParagraphStyle("topo", fontName="Arial", fontSize=8.5, textColor=HexColor("#6b7280")),
    "titulo": ParagraphStyle("titulo", fontName="Arial-Bold", fontSize=19, leading=23, textColor=ROXO, spaceAfter=4),
    "sub": ParagraphStyle("sub", fontName="Arial", fontSize=10, textColor=HexColor("#4b5563"), spaceAfter=10),
    "h": ParagraphStyle("h", fontName="Arial-Bold", fontSize=12.5, leading=16, textColor=ROXO, spaceBefore=10, spaceAfter=4),
    "p": ParagraphStyle("p", fontName="Arial", fontSize=10.5, leading=15, alignment=TA_JUSTIFY, spaceAfter=6),
    "li": ParagraphStyle("li", fontName="Arial", fontSize=10.5, leading=15, leftIndent=14, bulletIndent=4, spaceAfter=3),
    "leg": ParagraphStyle("leg", fontName="Arial-Italic", fontSize=8.5, leading=11, alignment=TA_CENTER, textColor=HexColor("#4b5563"), spaceAfter=8),
    "fonte": ParagraphStyle("fonte", fontName="Arial", fontSize=8, leading=10, textColor=HexColor("#6b7280"), spaceBefore=14),
}


def linhas(chave, p_ini, p_fim):
    """Linhas/figuras em ordem de leitura: ('l', texto, x0, x1, negrito, pagina) ou ('img', bytes, w, h, pagina)."""
    d = pymupdf.open(SRC + ARQ[chave])
    out = []
    for pno in range(p_ini - 1, p_fim):
        for b in d[pno].get_text("dict", sort=True)["blocks"]:
            if b["type"] == 1:
                w, h = b["bbox"][2] - b["bbox"][0], b["bbox"][3] - b["bbox"][1]
                if w > 120 and h > 40:
                    out.append(("img", b["image"], w, h, pno + 1))
                continue
            for l in b["lines"]:
                spans = [s for s in l["spans"] if s["text"].replace(chr(0), "").strip()]
                if not spans:
                    continue
                txt = limpar(" ".join(s["text"] for s in spans))
                if not txt or ruido(txt, spans):
                    continue
                neg = all("Bold" in s["font"] for s in spans)
                out.append(("l", txt, l["bbox"][0], l["bbox"][2], neg, pno + 1))
    return out


def ruido(txt, spans):
    if txt.startswith("Material Específico") or "GOVERNO DO ESTADO" in txt or txt.startswith("Escola de Serviço Público"):
        return True
    if re.fullmatch(r"\d{1,2}", txt):
        return True
    if re.match(r"^\d+\s*Questão \d+ – Enade", txt):   # nota de rodape
        return True
    return False


def recortar(chave, p_ini, p_fim, ini_re, fim_re):
    itens = linhas(chave, p_ini, p_fim)
    i0 = next(i for i, x in enumerate(itens) if x[0] == "l" and re.search(ini_re, x[1]))
    i1 = next((i for i, x in enumerate(itens) if i > i0 and x[0] == "l" and re.search(fim_re, x[1])), len(itens))
    return itens[i0:i1]


def paragrafos(itens):
    """Junta linhas quebradas em paragrafos. Retorna ('h'|'p'|'li'|'leg'|'img', conteudo)."""
    out, buf, tipo = [], [], "p"
    margem_dir = max((x[3] for x in itens if x[0] == "l"), default=500)
    # "1." sozinho numa linha + texto na linha seguinte -> uma linha so; tira rotulos de secao
    juntos = []
    for x in itens:
        if x[0] == "l" and re.fullmatch(r"\d\. (Introdução teórica|Análise da questão)", x[1]):
            continue
        if juntos and juntos[-1][0] == "l" and re.fullmatch(r"\d+\.", juntos[-1][1]) and x[0] == "l":
            ant = juntos.pop()
            x = ("l", ant[1] + " " + x[1], ant[2], x[3], x[4], x[5])
        juntos.append(x)
    itens = juntos

    def flush():
        nonlocal buf, tipo
        if buf:
            out.append((tipo, " ".join(buf)))
        buf, tipo = [], "p"

    for x in itens:
        if x[0] == "img":
            flush(); out.append(("img", x)); continue
        _, txt, x0, x1, neg, _pg = x
        if tipo == "leg" and buf and buf[0].startswith("Fonte") and (" " not in txt or "http" in txt):
            buf[-1] = buf[-1] + txt if buf[-1].endswith(("-", "/", "%", "=")) or " " not in buf[-1] else buf[-1] + " " + txt
            continue
        if tipo == "leg" and buf and buf[0].startswith("Fonte"):
            flush()
        novo_item = re.match(r"^(•|\d+[.)] |[a-z]\) )", txt)
        legenda = re.match(r"^(Figura|Quadro|Fonte:|Disponível em|Adaptado de)", txt)
        titulo = neg and len(txt) < 95 and not novo_item
        if titulo or re.match(r"^\d\.\d\.? +[A-ZÁÉÍÓÚ]", txt) and len(txt) < 80:
            flush(); out.append(("h", re.sub(r"^\d\.(\d\.?)? +", "", txt).strip())); continue
        if legenda:
            flush(); tipo = "leg"
        elif novo_item:
            flush(); tipo = "li"
        buf.append(txt)
        termina = txt.endswith((".", ":", "?", "!")) and x1 < margem_dir - 40
        if tipo == "leg" and buf[0].startswith("Fonte"):
            continue
        if termina or tipo == "leg" and txt.endswith("."):
            flush()
    flush()
    # descarta o proprio rotulo "Introducao teorica"/"Analise da questao"
    return [p for p in out if not (p[0] == "h" and re.match(r"^(Introdução teórica|Análise da questão)$", p[1]))]


def imagem(x, larg_max=15.5 * cm, alt_max=10 * cm):
    _, dados, w, h, _ = x
    esc = min(larg_max / w, alt_max / h, 1.6)
    return Image(io.BytesIO(dados), width=w * esc, height=h * esc)


def gerar(arquivo, curso, modulo, titulo, resumo, trechos, fonte_txt):
    doc = SimpleDocTemplate(os.path.join(OUT, arquivo), pagesize=A4, leftMargin=2.2 * cm, rightMargin=2.2 * cm,
                            topMargin=1.8 * cm, bottomMargin=1.8 * cm, title=titulo, author="CodeRyse")
    hist = [Paragraph(escape(f"CodeRyse · {curso} · {modulo}"), EST["topo"]), Spacer(1, 6),
            Paragraph(escape(titulo), EST["titulo"]), Paragraph(escape(resumo), EST["sub"])]
    for t in trechos:
        for tipo, c in paragrafos(recortar(*t)):
            if tipo == "img":
                hist.append(KeepTogether([Spacer(1, 4), imagem(c), Spacer(1, 4)]))
            elif tipo == "li":
                hist.append(Paragraph(escape(re.sub(r"^•\s*", "", c)), EST["li"], bulletText="•" if c.startswith("•") else None))
            else:
                hist.append(Paragraph(escape(c), EST[tipo]))
    hist.append(Paragraph(escape(fonte_txt), EST["fonte"]))
    doc.build(hist)


APOSTILA = "Fonte: Apostila “Inteligência Artificial” – Escola de Serviço Público do Espírito Santo (Esesp), 2025. Texto e figuras reproduzidos do material original."
def UNIP(tomos): return f"Fonte: Material Instrucional Específico – Análise e Desenvolvimento de Sistemas – {tomos} – CQA/UNIP (introduções teóricas). Texto e figuras reproduzidos do material original."

AULAS = [
    # ---------------- Gratis: Introducao a IA ----------------
    ("ia-m1-a1.pdf", "Introdução à Inteligência Artificial", "Módulo 1 · Fundamentos",
     "O que é IA e conceitos fundamentais", "Algoritmos, machine learning, redes neurais, transformers, LLMs e IA generativa.",
     [("ia", 3, 6, r"^Introdução$", r"^História, origens")], APOSTILA),
    ("ia-m1-a2.pdf", "Introdução à Inteligência Artificial", "Módulo 1 · Fundamentos",
     "História, empresas e produtos de IA", "Marcos da IA, empresas e produtos, aplicações na administração pública e benefícios.",
     [("ia", 6, 9, r"^História, origens", r"^Desafios de Ética")], APOSTILA),
    ("ia-m2-a1.pdf", "Introdução à Inteligência Artificial", "Módulo 2 · Uso responsável",
     "Ética, regulamentação e mau uso", "Alucinações, deepfakes, código de ética, regulamentação no Brasil e o que evitar ao usar IA.",
     [("ia", 9, 15, r"^Desafios de Ética", r"^I\.A\. no Governo do Estado"),
      ("ia", 33, 34, r"^Mau uso da Inteligência", r"^Exercícios de Fixação")], APOSTILA),
    ("ia-m2-a2.pdf", "Introdução à Inteligência Artificial", "Módulo 2 · Uso responsável",
     "IAs atuais e criação de bons prompts", "Para que servem as IAs atuais e os quatro pilares de um bom prompt.",
     [("ia", 29, 33, r"^As I\.A\..s atuais", r"^Mau uso da Inteligência")], APOSTILA),
    # ---------------- Pago: Engenharia de Software ----------------
    ("es-m1-a1.pdf", "Engenharia de Software", "Módulo 1 · Requisitos",
     "Requisitos de software", "Requisitos funcionais e não funcionais, com exemplos e critérios objetivos.",
     [("b3", 3, 5, r"Introdução teórica", r"^2\. Análise")], UNIP("Tomo 14")),
    ("es-m1-a2.pdf", "Engenharia de Software", "Módulo 1 · Requisitos",
     "Engenharia de requisitos", "Elicitação, especificação e validação de requisitos.",
     [("b3", 6, 10, r"Introdução teórica", r"^2\. Análise")], UNIP("Tomo 14")),
    ("es-m2-a1.pdf", "Engenharia de Software", "Módulo 2 · Projeto e processo",
     "Arquitetura e gestão de mudanças", "Estilos arquiteturais, MVC, gestão de configuração e tipos de manutenção.",
     [("b3", 12, 16, r"Introdução teórica", r"^2\. Análise"),
      ("b3", 18, 21, r"Introdução teórica", r"^2\. Análise"),
      ("b1", 38, 39, r"Introdução teórica", r"^2\. Análise")], UNIP("Tomos 14 e 18")),
    ("es-m2-a2.pdf", "Engenharia de Software", "Módulo 2 · Projeto e processo",
     "Métodos ágeis e gestão de projetos", "Scrum, XP, Kanban, modelos de processo e áreas de conhecimento do PMBOK.",
     [("b3", 27, 32, r"Introdução teórica", r"^2\. Análise"),
      ("b3", 35, 39, r"Introdução teórica", r"^2\. Análise"),
      ("b3", 41, 42, r"Introdução teórica", r"^2\. Resolução")], UNIP("Tomo 14")),
    # ---------------- Acompanhado: Redes e Infraestrutura ----------------
    ("rd-m1-a1.pdf", "Redes e Infraestrutura", "Módulo 1 · Protocolos e serviços",
     "TCP/IP, camada de transporte e IPv6", "Portas, sockets, multiplexação, TCP x UDP e o protocolo IPv6.",
     [("b1", 4, 5, r"Análise da questão", r"^2\. Análise"),
      ("b1", 7, 8, r"Análise da questão", r"^2\. Análise")], UNIP("Tomo 18")),
    ("rd-m1-a2.pdf", "Redes e Infraestrutura", "Módulo 1 · Protocolos e serviços",
     "FTP e servidor web", "Protocolo FTP, handshake triplo, virtual hosting e DNS.",
     [("b2", 3, 8, r"Introdução teórica", r"^(2\. Análise|3\. Indicações)"),
      ("b2", 17, 20, r"Introdução teórica", r"^(2\. Análise|3\. Indicações)")], UNIP("Tomo 17")),
    ("rd-m2-a1.pdf", "Redes e Infraestrutura", "Módulo 2 · Gestão e infraestrutura",
     "Gerência de redes (SNMP)", "Protocolo SNMP, comandos PING e TRACERT e o modelo OSI.",
     [("b2", 11, 14, r"Introdução teórica", r"^2\. Análise")], UNIP("Tomo 17")),
    ("rd-m2-a2.pdf", "Redes e Infraestrutura", "Módulo 2 · Gestão e infraestrutura",
     "Virtualização, TI verde e Marco Civil", "Virtualização de servidores, sustentabilidade em TI e o Marco Civil da Internet.",
     [("b2", 26, 29, r"Introdução teórica", r"^2\. Análise"),
      ("b2", 31, 33, r"Introdução teórica", r"^2\. Análise"),
      ("b2", 21, 23, r"Introdução teórica", r"^(2\. Análise|3\. Indicações)")], UNIP("Tomo 17")),
]

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    so = set(sys.argv[2:])
    for a in AULAS:
        if so and a[0] not in so:
            continue
        gerar(*a)
        print("ok", a[0])
