import { criarMatrizPlanejamentoV3 } from "./ctrl-planning-matrix-v3.js";

const mod=criarMatrizPlanejamentoV3({
  cenario:"budget",
  paginaId:"pagina-ctrl-budget-v8",
  titulo:"Budget",
  versaoPadrao:ano=>`Budget ${ano} - V1`
});

export const abrir=mod.abrir;
export const carregar=mod.carregar;
