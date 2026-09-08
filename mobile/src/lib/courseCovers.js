import courseArchitectureCover from "../../assets/courses/course-arquitetura-soft.jpg";
import courseAutomationTestingCover from "../../assets/courses/course-automacao-teste.jpg";
import courseDataScienceCover from "../../assets/courses/course-ciencia-dados.jpg";
import courseCyberSecurityCover from "../../assets/courses/course-cyber-sec.jpg";
import courseDevopsCloudCover from "../../assets/courses/course-devops-cloud.jpg";
import courseMobileReactCover from "../../assets/courses/course-mobile-react.jpg";
import coursePromptEngineeringCover from "../../assets/courses/course-eng-ia.jpg";
import coursePythonCover from "../../assets/courses/course-python.jpg";
import courseUxDigitalCover from "../../assets/courses/course-ux-digitais.jpg";
import courseWebFullstackCover from "../../assets/courses/course-web-fullstack.jpg";

const COURSE_COVERS_BY_TITLE = {
  "arquitetura de software moderna": courseArchitectureCover,
  "ciencia de dados aplicada": courseDataScienceCover,
  "cyberseguranca para aplicacoes web": courseCyberSecurityCover,
  "desenvolvimento web full stack": courseWebFullstackCover,
  "devops e cloud foundations": courseDevopsCloudCover,
  "engenharia de prompt e ia generativa": coursePromptEngineeringCover,
  "mobile com react native": courseMobileReactCover,
  "python para automacao e dados": coursePythonCover,
  "qa e automacao de testes": courseAutomationTestingCover,
  "ux para produtos digitais": courseUxDigitalCover
};

/* Mesmo mapeamento por titulo usado no web (frontend/src/data/courseCovers.js,
   fonte de verdade visual), so que com copias das imagens redimensionadas
   pra 200x200 JPEG (~10KB cada, os originais chegavam a 7MB) - nao faz
   sentido embarcar imagem em resolucao de banner no bundle do app so pra
   exibir numa miniatura de ~60px. Cursos sem titulo mapeado (dados de teste)
   nao mostram miniatura - ver ausencia de retorno em CoverMiniatura. */
export function getCourseCover(curso) {
  const titulo = String(curso?.titulo || "").trim().toLowerCase();
  return COURSE_COVERS_BY_TITLE[titulo] || null;
}
