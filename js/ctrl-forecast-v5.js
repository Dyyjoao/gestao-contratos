import { abrirPagina, $ } from "./core.js";
import { criarMatrizPlanejamentoV2 } from "./ctrl-planning-matrix-v2.js";

const PAGINA="ctrl-forecast-v5";
const mod=criarMatrizPlanejamentoV2({
  cenario:"forecast",
  paginaId:`pagina-${PAGINA}`,
  titulo:"Forecast",
  versaoPadrao:()=>`F${String(new Date().getMonth()+1).padStart(2,"0")}`
});

export function abrir(){
  mod.carregar(true);
  abrirPagina(PAGINA);
  const t=$("tituloPagina");
  if(t)t.textContent="Forecast";
}

export const carregar=mod.carregar;
