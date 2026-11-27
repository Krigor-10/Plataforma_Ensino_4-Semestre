-- CodeRyse - Acompanhado nao usa publicacao (27/11/2026)
-- Curso Acompanhado com marca de "publicado/retirado da venda" (sobra de quando
-- era Gratuito/Pago) fica travado para o professor e aparece "A venda".
-- Este UPDATE tira a marca. O curso continua no catalogo (Acompanhado aparece
-- enquanto nao for encerrado). Pode rodar de novo sem efeito.
-- Em producao em 27/11: Python (id 5) e Desenvolvimento Web (id 1).

-- 1) Conferir antes (deve listar os cursos afetados):
SELECT Id, Titulo, ModeloCurso, PublicadoParaVendaEm, RetiradoDaVendaEm
FROM Cursos
WHERE ModeloCurso = 3
  AND (PublicadoParaVendaEm IS NOT NULL OR RetiradoDaVendaEm IS NOT NULL);

-- 2) Corrigir:
UPDATE Cursos
SET PublicadoParaVendaEm = NULL,
    RetiradoDaVendaEm = NULL
WHERE ModeloCurso = 3
  AND (PublicadoParaVendaEm IS NOT NULL OR RetiradoDaVendaEm IS NOT NULL);
