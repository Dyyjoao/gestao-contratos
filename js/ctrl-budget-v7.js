import { abrirPagina, $ } from "./core.js";
import { criarMatrizPlanejamentoV2 } from "./ctrl-planning-matrix-v2.js";

const PAGINA="ctrl-budget-v7";
const mod=criarMatrizPlanejamentoV2({
  cenario:"budget",
  paginaId:`pagina-${PAGINA}`,
  titulo:"Budget",
  versaoPadrao:ano=>`Budget ${ano} - V1`
});

export function abrir(){
  mod.carregar(true);
  abrirPagina(PAGINA);
  const t=$("tituloPagina");
  if(t)t.textContent="Budget";
}

export const carregar=mod.carregar;
