import { $, permite } from "./core.js";

function css(){
  if(document.querySelector('link[href^="modules.css"]'))return;
  const l=document.createElement("link");l.rel="stylesheet";l.href="modules.css?v=20";document.head.appendChild(l);
}
function removerOperacao(){
  ["menuContratos","menuPrestadores","menuFrota","menuAlmoxarifado","menuCotacoes"].forEach(id=>$(id)?.remove());
  ["pagina-contratos","pagina-prestadores","pagina-frota","pagina-almoxarifado","pagina-cotacoes"].forEach(id=>$(id)?.remove());
}
function garantirControladoria(){
  const sep=document.querySelector(".sidebar-menu .menu-separador");
  if(!$("menuControladoria")&&sep){const b=document.createElement("button");b.id="menuControladoria";b.className="menu-item hidden";b.type="button";b.textContent="Controladoria & FP&A";sep.before(b)}
  if(!$("pagina-controladoria")){const main=document.querySelector("main.conteudo");if(main){const s=document.createElement("section");s.id="pagina-controladoria";s.className="pagina hidden";s.innerHTML='<div class="painel-vazio"><h3>Controladoria & FP&A</h3><p>Escolha uma rotina no submenu lateral.</p></div>';main.appendChild(s)}}
}
function montarDashboardBase(){
  const p=$("pagina-dashboard");if(!p||p.dataset.gerencial==="1")return;p.dataset.gerencial="1";
  p.innerHTML=`<div class="welcome modulo-hero"><div><span class="eyebrow">VISÃO EXECUTIVA</span><h2>SIG Gerencial</h2><p>Controladoria, FP&A, fechamento, governança e compliance em uma visão integrada.</p></div><span class="hero-meta">Base gerencial</span></div>
  <section class="lista-card"><div class="lista-cabecalho"><div><h3>Atalhos de gestão</h3><p>As rotinas pesadas são carregadas somente quando abertas.</p></div></div><div class="quick-grid">
    <button id="dashAbrirDre" class="quick-card" type="button"><span>DRE Gerencial</span><small>Realizado, Budget e Forecast</small></button>
    <button id="dashAbrirBudget" class="quick-card" type="button"><span>Budget</span><small>Planejamento e premissas</small></button>
    <button id="dashAbrirFechamento" class="quick-card" type="button"><span>Fechamento</span><small>Cockpit mensal e anual</small></button>
    <button id="dashAbrirGovernanca" class="quick-card" type="button"><span>Governança & Compliance</span><small>Obrigações, riscos e auditorias</small></button>
  </div></section><div class="dashboard-grid"></div>`;
  $("dashAbrirDre")?.addEventListener("click",()=>window.SIG_ABRIR_CTRL?.("dre"));
  $("dashAbrirBudget")?.addEventListener("click",()=>window.SIG_ABRIR_CTRL?.("budget"));
  $("dashAbrirFechamento")?.addEventListener("click",()=>window.SIG_ABRIR_CTRL?.("fechamento"));
  $("dashAbrirGovernanca")?.addEventListener("click",()=>$("menuGovernanca")?.click());
}
function acesso(){const m=$("menuControladoria");if(m)m.classList.toggle("hidden",!permite("controladoria"))}

css();removerOperacao();garantirControladoria();montarDashboardBase();
window.addEventListener("sig:ready",()=>{removerOperacao();garantirControladoria();montarDashboardBase();acesso()});
