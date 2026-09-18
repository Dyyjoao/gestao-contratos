import { $, admin, abrirPagina } from "./core.js";
import { empresaUnicaSelecionadaId, emitirAlteracao } from "./shared.js";
import { carregarConfiguracaoModulo, salvarConfiguracaoModulo } from "./module-settings.js";

let desbloqueado=false;
let carregando=false;

function montar(){
  const grid=document.querySelector("#pagina-administracao .admin-grid");
  const main=document.querySelector("main.conteudo");
  if(!grid||!main)return;

  let card=$("cardConfigBomba");
  if(!card){
    card=document.createElement("button");
    card.id="cardConfigBomba";
    card.className="admin-card admin-card-button hidden";
    card.type="button";
    card.innerHTML='<span class="admin-card-tag">CONFIGURAÇÃO</span><h3>Bomba de combustível</h3><p>Proteja estoque inicial, capacidade e parâmetros-base da auditoria do tanque.</p><span class="admin-card-link">Configurar bomba →</span>';
    grid.appendChild(card);
    card.addEventListener("click",async()=>{
      if(!admin())return;
      abrirPagina("configuracao-bomba");
      desbloqueado=false;
      await carregar();
    });
  }

  if(!$("pagina-configuracao-bomba")){
    const s=document.createElement("section");
    s.id="pagina-configuracao-bomba";
    s.className="pagina hidden";
    s.innerHTML=`
      <div class="pagina-cabecalho">
        <div>
          <button id="btnVoltarConfigBomba" class="btn-voltar" type="button">← Administração</button>
          <h2>Configuração da bomba de combustível</h2>
          <p>Parâmetros estruturais da auditoria de tanque. Alteração exclusiva do Administrador.</p>
        </div>
      </div>

      <section class="form-card">
        <div class="form-card-titulo">
          <div>
            <h3>Parâmetros protegidos</h3>
            <p id="configBombaStatus">Configuração bloqueada para edição.</p>
          </div>
          <div class="acoes-cabecalho">
            <button id="btnDesbloquearConfigBomba" class="btn-secundario" type="button">Desbloquear edição</button>
          </div>
        </div>

        <div class="form-grid form-grid-3">
          <div class="campo">
            <label for="adminFuelEstoqueData">Data do estoque inicial</label>
            <input id="adminFuelEstoqueData" type="date" disabled>
          </div>
          <div class="campo">
            <label for="adminFuelEstoqueLitros">Estoque inicial (litros)</label>
            <input id="adminFuelEstoqueLitros" type="number" min="0" step="0.01" disabled>
          </div>
          <div class="campo">
            <label for="adminFuelCapacidade">Capacidade do tanque (litros)</label>
            <input id="adminFuelCapacidade" type="number" min="0" step="0.01" disabled>
          </div>
        </div>

        <div class="form-acoes">
          <button id="btnCancelarConfigBomba" class="btn-secundario hidden" type="button">Bloquear sem salvar</button>
          <button id="btnSalvarConfigBomba" class="btn-primario hidden" type="button">Salvar e bloquear</button>
        </div>
        <p id="configBombaMensagem" class="mensagem-form"></p>
      </section>

      <section class="lista-card">
        <div class="lista-cabecalho">
          <div>
            <h3>Proteção da configuração</h3>
            <p>Alterar estoque inicial ou capacidade muda os cálculos posteriores da auditoria. Por isso a edição exige desbloqueio explícito e confirmação.</p>
          </div>
        </div>
      </section>
    `;
    main.appendChild(s);

    $("btnVoltarConfigBomba").onclick=()=>abrirPagina("administracao");
    $("btnDesbloquearConfigBomba").onclick=desbloquear;
    $("btnCancelarConfigBomba").onclick=async()=>{
      desbloqueado=false;
      aplicarBloqueio();
      await carregar();
    };
    $("btnSalvarConfigBomba").onclick=salvar;
  }

  atualizarVisibilidade();
}

function atualizarVisibilidade(){
  $("cardConfigBomba")?.classList.toggle("hidden",!admin());
  if(!admin()&&!$("pagina-configuracao-bomba")?.classList.contains("hidden"))abrirPagina("administracao");
}

function aplicarBloqueio(){
  ["adminFuelEstoqueData","adminFuelEstoqueLitros","adminFuelCapacidade"].forEach(id=>{
    if($(id))$(id).disabled=!desbloqueado;
  });
  $("btnDesbloquearConfigBomba")?.classList.toggle("hidden",desbloqueado);
  $("btnCancelarConfigBomba")?.classList.toggle("hidden",!desbloqueado);
  $("btnSalvarConfigBomba")?.classList.toggle("hidden",!desbloqueado);
  if($("configBombaStatus")){
    $("configBombaStatus").textContent=desbloqueado
      ?"Edição desbloqueada temporariamente. Salve ou bloqueie novamente."
      :"Configuração bloqueada para edição.";
  }
}

async function carregar(){
  if(!admin()||carregando)return;
  const empresaId=empresaUnicaSelecionadaId();
  if(!empresaId){
    if($("configBombaMensagem"))$("configBombaMensagem").textContent="Selecione apenas uma empresa no cabeçalho.";
    return;
  }

  carregando=true;
  try{
    const cfg=await carregarConfiguracaoModulo("combustivel",empresaId).catch(()=>({}));
    $("adminFuelEstoqueData").value=cfg.estoqueInicialData||"";
    $("adminFuelEstoqueLitros").value=cfg.estoqueInicialLitros??"";
    $("adminFuelCapacidade").value=cfg.capacidadeTanqueLitros??"";
    if($("configBombaMensagem")){
      $("configBombaMensagem").textContent="";
      $("configBombaMensagem").classList.remove("sucesso");
    }
    aplicarBloqueio();
  }finally{
    carregando=false;
  }
}

function desbloquear(){
  if(!admin())return;
  if(!confirm("Desbloquear os parâmetros da bomba para edição? Alterações nesses valores recalculam o estoque teórico da auditoria."))return;
  desbloqueado=true;
  aplicarBloqueio();
  $("adminFuelEstoqueData")?.focus();
}

async function salvar(){
  if(!admin()||!desbloqueado)return;
  const empresaId=empresaUnicaSelecionadaId();
  if(!empresaId)return alert("Selecione apenas uma empresa.");

  const data=$("adminFuelEstoqueData").value;
  const estoque=Number($("adminFuelEstoqueLitros").value);
  const capacidade=Number($("adminFuelCapacidade").value||0);

  if(!/^\d{4}-\d{2}-\d{2}$/.test(data)||!Number.isFinite(estoque)||estoque<0||!Number.isFinite(capacidade)||capacidade<0){
    return alert("Revise a data, o estoque inicial e a capacidade.");
  }
  if(!confirm("Confirmar alteração dos parâmetros da bomba? Isso muda o cálculo histórico do estoque teórico."))return;

  try{
    if($("configBombaMensagem"))$("configBombaMensagem").textContent="Salvando...";
    await salvarConfiguracaoModulo("combustivel",{
      estoqueInicialData:data,
      estoqueInicialLitros:estoque,
      capacidadeTanqueLitros:capacidade
    },empresaId);
    desbloqueado=false;
    aplicarBloqueio();
    if($("configBombaMensagem")){
      $("configBombaMensagem").textContent="Configuração salva e bloqueada.";
      $("configBombaMensagem").classList.add("sucesso");
    }
    emitirAlteracao("combustivel");
  }catch(e){
    console.error(e);
    if($("configBombaMensagem"))$("configBombaMensagem").textContent="Não foi possível salvar a configuração.";
  }
}

function instalar(){
  montar();
  atualizarVisibilidade();
}

instalar();
window.addEventListener("sig:ready",instalar);
window.addEventListener("sig:empresa-contexto",()=>{
  if(!$("pagina-configuracao-bomba")?.classList.contains("hidden"))carregar();
});
window.addEventListener("sig:page",e=>{
  if(e.detail?.pagina==="administracao")atualizarVisibilidade();
  if(e.detail?.pagina==="configuracao-bomba")carregar();
});
