# Pacote dos 3 cursos de teste

Conteúdo pronto para o script de carga (`tools/carga-cursos-teste/`) criar os cursos pela API. **Não edite à mão**: se precisar mudar algo, ajuste `_gerador/pacote.py` e gere de novo.

## Os 3 cursos

| Chave | Curso | Modelo | Preço | Fonte |
|---|---|---|---|---|
| `gratis-ia` | Introdução à Inteligência Artificial | Gratuito | R$ 0,00 | Apostila de IA (Esesp) |
| `pago-eng-software` | Engenharia de Software | PagoPacote | R$ 29,90 | Banco 3 (Tomo 14) + Banco 1 Q7 |
| `acompanhado-redes` | Redes e Infraestrutura | Acompanhado | R$ 59,90 | Banco 1 (Tomo 18) + Banco 2 (Tomo 17) |

Cada curso tem:
- **2 módulos × 2 aulas em PDF.** Texto e figuras vêm dos PDFs originais de `docs/QuestoesCodeRyse`. Nenhuma imagem foi criada.
- **1 quiz por módulo.** São 3 perguntas curtas com 4 alternativas cada, valem 1 ponto cada e não geram nota.
- **1 avaliação final (Prova).** Fica solta no curso, sem módulo. Tem 5 questões no modelo ENADE, de 2 pontos cada, e 2 delas têm figura (anexo). A nota máxima é 10, e o certificado exige 7.

Avaliações finais:
- **Engenharia de Software:** questões 1, 2, 5 e 8 do Banco 3 e questão 7 do Banco 1. Enunciado e análise estão como no PDF.
- **Redes:** questões 1 e 2 do Banco 1 e questões 2, 4 e 7 do Banco 2. Enunciado e análise estão como no PDF.
- **IA:** 5 questões novas no modelo ENADE, escritas a partir da apostila.

Mapeamento da análise da UNIP para os campos da API:
- **Contexto:** texto-base com a citação da fonte.
- **Enunciado:** o comando da questão.
- **`justificativa`:** a análise de cada alternativa ou afirmativa.
- **`explicacaoPosResposta`:** a introdução teórica.
- **`referenciasBibliograficas`:** a questão de origem no ENADE mais as indicações bibliográficas.

## Estrutura

```
cursos.json      # os 3 cursos (campos com os nomes dos DTOs da API, em camelCase)
aulas/*.pdf      # 12 aulas (ia-*, es-*, rd-*)
figuras/*.png    # 6 figuras usadas como anexo de questão
capas/*.jpg      # capas dos cursos (imagemCapa), copiadas de frontend/src/assets
_gerador/        # scripts Python que geraram o pacote (PyMuPDF + reportlab)
```

## Enums no `cursos.json`

O JSON usa o **nome** do enum. A API recebe o **número**, então o script converte:

| Campo | Valores usados |
|---|---|
| `modeloCurso` | `Gratuito`=1, `PagoPacote`=2, `Acompanhado`=3 |
| `tipoConteudo` | `Pdf`=2 · anexos de questão: `Imagem`=5 |
| `tipoQuestao` | `MultiplaEscolha`=1, `AfirmativasCombinadas`=4 |
| `tipoAvaliacao` | `Quiz`=1, `Prova`=2 |
| status de publicação | `Rascunho`=1, `Publicado`=2 |

`arquivo` (aulas e anexos) e `imagemCapa` são caminhos relativos a esta pasta. O script faz o upload e usa a URL devolvida (a capa vai por `POST /Cursos/{id}/imagem`, só Admin).
## Gerar de novo

```bash
cd docs/teste-usabilidade/cursos/_gerador
python aulas.py out
python pacote.py ..
```

Requisitos: `pymupdf`, `reportlab` e as fontes Arial do Windows. Os scripts leem os PDFs de `docs/QuestoesCodeRyse` (caminho absoluto em `extrair.py`, variável `SRC`).
