import courseArchitectureCover from "../assets/course-arquitetura-soft.jpg";
import courseAutomationTestingCover from "../assets/course-automacao-teste.jpg";
import courseDataScienceCover from "../assets/course-ciencia-dados.jpg";
import courseCyberSecurityCover from "../assets/course-cyber-sec.png";
import courseDevopsCloudCover from "../assets/course-devops-cloud.jpg";
import courseMobileReactCover from "../assets/course-mobile-react.jpg";
import coursePromptEngineeringCover from "../assets/course-eng-ia.png";
import coursePythonCover from "../assets/couse-python.jpg";
import courseTestCover from "../assets/course-test-cover.svg";
import courseUxDigitalCover from "../assets/course-ux-digitais.jpg";
import courseWebFullstackCover from "../assets/course-web-fullstack.png";

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

/* Mesma logica usada pela Home Publica (unica fonte de verdade pra
   imagem de curso): mapeia pelo titulo, com fallback pro SVG generico
   quando o titulo nao bate com nenhum curso conhecido. */
export function getCourseCover(course) {
  const title = String(course?.titulo || "").trim().toLowerCase();
  return COURSE_COVERS_BY_TITLE[title] || courseTestCover;
}
