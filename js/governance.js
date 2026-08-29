import { $, on, permite, abrirPagina } from "./core.js";

function montarMenu(){
  if($("menuGovernanca"))return;
  const separador=document.querySelector(".sidebar-menu .menu-separador");
  if(!separador)return;
  const b=document.createElement("button");
  b.id="menuGovernanca";
  b.className="menu-item hidden";
  b.dataset.pagina="governanca";
  b.type="button";
  b.textContent="Governança & Compliance";
  separador.before(b);
  on(b,"click",()=>{
    if(!permite("governanca"))return;
    abrirPagina("governanca");
    if($("tituloPagina"))$("tituloPagina").textContent="Governança & Compliance";
  });
}

function montarPagina(){
  if($("pagina-governanca"))return;
  const conteudo=document.querySelector("main.conteudo");
  if(!conteudo)return;
  const s=document.createElement("section");
  s.id="pagina-governanca";
  s.className="pagina hidden";
  s.innerHTML=`
    <div class="pagina-cabecalho">
      <div>
        <span class="eyebrow">GOVERNANÇA</span>
        <h2>Governança & Compliance</h2>
        <p>Auditorias internas, conformidade, indicadores, evidências e planos de ação.</p>
      </div>
    </div>
    <div class="modulo-aviso"><strong>Módulo reservado para a próxima etapa.</strong> A estrutura foi incluída agora para que Governança nasça integrada aos demais módulos, sem criar um sistema paralelo.</div>
    <div class="kpi-grid kpi-grid-4">
      <div class="kpi-card"><span>Índice geral de conformidade</span><strong>—</strong><small>será calculado pelas auditorias</small></div>
      <div class="kpi-card"><span>Auditorias em aberto</span><strong>—</strong><small>por área e ciclo</small></div>
      <div class="kpi-card"><span>Não conformidades</span><strong>—</strong><small>com criticidade e reincidência</small></div>
      <div class="kpi-card"><span>Planos de ação vencidos</span><strong>—</strong><small>responsáveis e prazos</small></div>
    </div>
    <section class="lista-card">
      <div class="lista-cabecalho"><div><h3>Programas de auditoria</h3><p>Modelo previsto para checklists, notas, evidências, indicadores e planos de ação.</p></div></div>
      <div class="quick-grid governanca-grid">
        <button type="button" class="quick-card" disabled><span>Manutenção & Frota</span><small>preventiva, corretiva, documentação, segurança e disponibilidade</small></button>
        <button type="button" class="quick-card" disabled><span>Controladoria & Financeiro</span><small>fechamento, caixa, contratos, reconciliações, budget e controles</small></button>
        <button type="button" class="quick-card" disabled><span>RH & Pessoas</span><small>documentação, treinamentos, jornada, indicadores e conformidade</small></button>
        <button type="button" class="quick-card" disabled><span>Almoxarifado & Compras</span><small>estoque, ferramentas, solicitações, cotações e rastreabilidade</small></button>
        <button type="button" class="quick-card" disabled><span>Contratos & Fornecedores</span><small>vigência, SLA, reajustes, documentação e homologação</small></button>
        <button type="button" class="quick-card" disabled><span>Qualidade & Processos</span><small>procedimentos, evidências, aderência, riscos e melhoria contínua</small></button>
      </div>
    </section>`;
  conteudo.appendChild(s);
}

function atualizarAcesso(){
  const b=$("menuGovernanca");
  if(b)b.classList.toggle("hidden",!permite("governanca"));
}

montarMenu();
montarPagina();
window.addEventListener("sig:ready",atualizarAcesso);
window.addEventListener("sig:page",e=>{
  if(e.detail?.pagina==="governanca"&&$("tituloPagina"))$("tituloPagina").textContent="Governança & Compliance";
});
