import { criarMatrizPlanejamentoV4 } from "./ctrl-planning-matrix-v4.js";

const mod=criarMatrizPlanejamentoV4({
  cenario:"forecast",
  paginaId:"pagina-ctrl-forecast-v6",
  titulo:"Forecast",
  versaoPadrao:()=>`F${String(new Date().getMonth()+1).padStart(2,"0")}`
});

export const abrir=mod.abrir;
export const carregar=mod.carregar;
