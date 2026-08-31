import { criarMatrizPlanejamentoV4 } from "./ctrl-planning-matrix-v4.js";

const mod=criarMatrizPlanejamentoV4({
  cenario:"budget",
  paginaId:"pagina-ctrl-budget-v8",
  titulo:"Budget",
  versaoPadrao:ano=>`Budget ${ano} - V1`
});

export const abrir=mod.abrir;
export const carregar=mod.carregar;
