/* Quadrado com o numero do modulo, baseado no padrao ja usado na trilha do
   Professor/Aluno (SecaoConteudosProfessor.jsx/SecoesAluno.jsx,
   .conteudos-modulo__numero) - extraido pra componente unico (rodada 2 da
   tela do Coordenador, item 7) e reaproveitado tambem em
   PainelCursoCoordenador, PainelModulosDesempenho e SecaoModulos, que antes
   tinham cada um seu proprio icone generico + rotulo "Modulo NN" em texto
   visivel. O numero ("01") + o texto "Modulo" (visualmente-oculto, so pro
   leitor de tela) formam juntos o nome acessivel do cabecalho. */
export default function NumeroModulo({ indice }) {
  return (
    <span className="conteudos-modulo__icone conteudos-modulo__numero">
      <span className="visualmente-oculto">Módulo</span> <span>{String(indice + 1).padStart(2, "0")}</span>
    </span>
  );
}
