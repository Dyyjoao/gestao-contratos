import { $, permite } from "./core.js";

const OPERACIONAIS_LEGADOS=["prestadores","almoxarifado","cotacoes"];
function css(){
  if(!document.querySelector('link[href^="modules.css"]')){const l=document.createElement("link");l.rel="stylesheet";l.href="modules.css?v=20";document.head.appendChild(l)}
  if(!document.querySelector('link[href^="sidebar-layout.css"]')){const l=document.createElement("link");l.rel="stylesheet";l.href="sidebar-layout.css?v=1";document.head.appendChild(l)}
}
function removerOperacaoLegada(){
  ["menuPrestadores","menuAlmoxarifado","menuCotacoes"].forEach(id=>$(id)?.remove());
  ["pagina-prestadores","pagina-almoxarifado","pagina-cotacoes"].forEach(id=>$(id)?.remove());
  const frotaLegada=$("pagina-frota");
  if(frotaLegada&&!frotaLegada.classList.contains("fleet-page"))frotaLegada.remove();
  document.querySelectorAll(".permissao-modulo").forEach(box=>{const cb=box.querySelector(".checkbox-permissao[data-modulo]");if(cb&&OPERACIONAIS_LEGADOS.includes(cb.dataset.modulo))box.remove()})
}
function garantirControladoria(){const sep=document.querySelector(".sidebar-menu .menu-separador");if(!$("menuControladoria")&&sep){const b=document.createElement("button");b.id="menuControladoria";b.className="menu-item hidden";b.type="button";b.textContent="Controladoria & FP&A";sep.before(b)}if(!$("pagina-controladoria")){const main=document.querySelector("main.conteudo");if(main){const s=document.createElement("section");s.id="pagina-controladoria";s.className="pagina hidden";s.innerHTML='<div class="painel-vazio"><h3>Controladoria & FP&A</h3><p>Escolha uma rotina no submenu lateral.</p></div>';main.appendChild(s)}}}
function montarDashboardBase(){const p=$("pagina-dashboard");if(!p||p.dataset.gerencial==="1")return;p.dataset.gerencial="1";p.innerHTML=`<div class="welcome modulo-hero"><div><span class="eyebrow">VISÃO EXECUTIVA</span><h2>SIG Gerencial</h2><p>O cockpit gerencial será carregado conforme seu perfil e suas preferências.</p></div><span class="hero-meta">Base gerencial</span></div><div class="dashboard-grid"></div>`}
function acesso(){const m=$("menuControladoria");if(m)m.classList.toggle("hidden",!permite("controladoria"))}
function aplicar(){removerOperacaoLegada();garantirControladoria();montarDashboardBase();acesso()}
css();aplicar();const obs=new MutationObserver(()=>removerOperacaoLegada());obs.observe(document.body,{childList:true,subtree:true});window.addEventListener("sig:ready",aplicar);
