"""Le blocos (paragrafos/figuras) dos PDFs em ordem de leitura, sem cabecalho/rodape."""
import re, sys, pymupdf

SRC = "E:/Projetos/Projetos/Projetos/Edtech/ConsoleApp3/docs/QuestoesCodeRyse/"
ARQ = {"ia": "Apostila - Inteligência Artificial.pdf", "b1": "QuestoesBanco1.pdf",
       "b2": "QuestoesBanco2.pdf", "b3": "QuestoesBanco3.pdf"}
BULLETS = "\uf0b7\uf0a7\uf0d8\uf076\u25aa\u25cf"


def limpar(t):
    t = t.replace(chr(0), "").replace("\u00ad", "")
    for b in BULLETS:
        t = t.replace(b, "•")
    t = re.sub(r"(\w)- (\w)", r"\1-\2", t)          # "chama- se"
    t = re.sub(r"(\w) -(\w)", r"\1-\2", t)          # "chama -se"
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r" ([,.;:)])", r"\1", t)
    return t.strip()


def ruido(txt):
    return (txt.startswith("Material Específico") or "GOVERNO DO ESTADO" in txt
            or txt.startswith("Escola de Serviço Público") or re.fullmatch(r"\d{1,2}", txt) is not None
            or re.match(r"^\d+Questão \d+ – Enade", txt) is not None)


def blocos(chave, p_ini, p_fim):
    """Paginas 1-based inclusivas. Retorna ('t', texto, tam, negrito) ou ('img', bloco, w, h, pagina)."""
    d = pymupdf.open(SRC + ARQ[chave])
    out = []
    for pno in range(p_ini - 1, p_fim):
        pg = d[pno]
        for b in pg.get_text("dict", sort=True)["blocks"]:
            if b["type"] == 1:
                w, h = b["bbox"][2] - b["bbox"][0], b["bbox"][3] - b["bbox"][1]
                if w > 120 and h > 40:
                    out.append(("img", b, w, h, pno + 1))
                continue
            spans = [s for l in b["lines"] for s in l["spans"] if s["text"].strip()]
            if not spans:
                continue
            linhas = [" ".join(s["text"] for s in l["spans"]).strip() for l in b["lines"]]
            txt = limpar(" ".join(x for x in linhas if x))
            if not txt or ruido(txt):
                continue
            tam = max(s["size"] for s in spans)
            neg = all("Bold" in s["font"] for s in spans)
            out.append(("t", txt, tam, neg))
    return d, out


if __name__ == "__main__":
    ch, a, b = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
    _, bl = blocos(ch, a, b)
    for x in bl:
        if x[0] == "img":
            print(f"[IMG p{x[4]} {int(x[2])}x{int(x[3])}]")
        else:
            print(("## " if x[3] and len(x[1]) < 90 else "") + x[1])
