import { criarMatrizPlanejamentoV3 } from "./ctrl-planning-matrix-v3.js";

const mod=criarMatrizPlanejamentoV3({
  cenario:"forecast",
  paginaId:"pagina-ctrl-forecast-v6",
  titulo:"Forecast",
  versaoPadrao:()=>`F${String(new Date().getMonth()+1).padStart(2,"0")}`
});

export const abrir=mod.abrir;
export const carregar=mod.carregar;
