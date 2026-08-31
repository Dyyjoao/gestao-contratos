import { criarMatrizPlanejamento } from "./ctrl-planning-matrix-v1.js";

const mod=criarMatrizPlanejamento({
  cenario:"budget",
  paginaId:"pagina-ctrl-budget-v6",
  titulo:"Budget",
  versaoPadrao:ano=>`Budget ${ano} - V1`
});

export const abrir=mod.abrir;
export const carregar=mod.carregar;
