import { criarMatrizPlanejamentoV2 } from "./ctrl-planning-matrix-v2.js";

const mod=criarMatrizPlanejamentoV2({
  cenario:"forecast",
  paginaId:"pagina-ctrl-forecast-v5",
  titulo:"Forecast",
  versaoPadrao:()=>`F${String(new Date().getMonth()+1).padStart(2,"0")}`
});

export const abrir=mod.abrir;
export const carregar=mod.carregar;
