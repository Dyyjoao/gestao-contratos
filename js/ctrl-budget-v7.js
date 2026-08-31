import { criarMatrizPlanejamentoV2 } from "./ctrl-planning-matrix-v2.js";
const mod=criarMatrizPlanejamentoV2({cenario:"budget",paginaId:"pagina-ctrl-budget-v7",titulo:"Budget",versaoPadrao:ano=>`Budget ${ano} - V1`});
export const abrir=mod.abrir;
export const carregar=mod.carregar;
