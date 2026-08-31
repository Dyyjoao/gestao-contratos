import { abrirPagina, admin } from "./core.js";
import { $, esc, msg, permite, listarDocumentos, criarDocumento, atualizarDocumento, empresaUnicaSelecionadaId, nomeEmpresa } from "./shared.js";

let atual=null,carregando=false;
const pagina=()=>$("pagina-ctrl-config");
const podeEditar=()=>admin()||permite("controladoria","editar");

function criarPagina(){
  if(pagina())return;
  const main=document.querySelector("main.conteudo");if(!main)return;
  const s=document.createElement("section");s.id="pagina-ctrl-config";s.className="pagina hidden";s.innerHTML=`
    <div class="pagina-cabecalho"><div><span class="eyebrow">ADMINISTRAÇÃO DA CONTROLADORIA</span><h2>Configurações</h2><p>Parâmetros gerenciais da empresa selecionada. Dados cadastrais continuam no cadastro da empresa; regras de gestão ficam aqui.</p></div></div>
    <div id="ctrlConfigAviso" class="modulo-aviso hidden"></div>
    <section class="form-card"><div class="form-card-titulo"><div><h3>Parâmetros gerenciais</h3><p id="ctrlConfigEmpresa">Selecione uma empresa no cabeçalho.</p></div></div>
      <form id="formCtrlConfig"><div class="form-grid form-grid-3">
        <div class="campo"><label for="cfgMaterialidade">Variação material (%)</label><input id="cfgMaterialidade" type="number" min="0" step="0.1" value="5"><small>Usada em prestação de contas e alertas de desvios.</small></div>
        <div class="campo"><label for="cfgPermutaDias">Permuta sem movimento (dias)</label><input id="cfgPermutaDias" type="number" min="1" step="1" value="60"><small>Prazo para sinalizar saldos parados.</small></div>
        <div class="campo"><label for="cfgMoeda">Moeda gerencial</label><select id="cfgMoeda"><option value="BRL">BRL · Real</option></select></div>
        <div class="campo campo-toggle"><label class="toggle-linha"><input id="cfgExigirCentroConta" type="checkbox" checked><span><strong>Exigir matriz Centro × Conta</strong><small>Bloqueia lançamentos em combinações não autorizadas.</small></span></label></div>
        <div class="campo campo-toggle"><label class="toggle-linha"><input id="cfgPermitirSemCentro" type="checkbox"><span><strong>Permitir lançamento sem centro</strong><small>Recomendado manter desativado na operação.</small></span></label></div>
        <div class="campo campo-toggle"><label class="toggle-linha"><input id="cfgDreContasZero" type="checkbox"><span><strong>Mostrar contas zeradas na DRE</strong><small>Desativado deixa a leitura mais limpa.</small></span></label></div>
      </div><div class="form-acoes"><button id="btnSalvarCtrlConfig" class="btn-primario" type="submit">Salvar configurações</button></div><p id="mensagemCtrlConfig" class="mensagem-form"></p></form>
    </section>
    <section class="lista-card"><div class="lista-cabecalho"><div><h3>Estrutura da Controladoria</h3><p>Cadastros que parametrizam Budget, Forecast, DRE e Input Mensal.</p></div></div><div class="quick-grid">
      <button id="cfgAbrirPlano" type="button" class="quick-card"><span>Plano de Contas</span><small>Estrutura gerencial da DRE</small></button>
      <button id="cfgAbrirCentros" type="button" class="quick-card"><span>Centros de Custo</span><small>Responsáveis e contas permitidas</small></button>
      <button id="cfgAbrirPremissas" type="button" class="quick-card"><span>Premissas</span><small>Drivers do planejamento</small></button>
    </div></section>`;
  main.appendChild(s);
  $("formCtrlConfig")?.addEventListener("submit",salvar);
  [["cfgAbrirPlano","plano"],["cfgAbrirCentros","centros"],["cfgAbrirPremissas","premissas"]].forEach(([id,chave])=>$(id)?.addEventListener("click",()=>window.SIG_ABRIR_CTRL?.(chave)));
}

function aplicar(d={}){
  $("cfgMaterialidade").value=Number(d.materialidadePct??5);$("cfgPermutaDias").value=Number(d.permutaSemMovimentoDias??60);$("cfgMoeda").value=d.moeda||"BRL";
  $("cfgExigirCentroConta").checked=d.exigirCentroConta!==false;$("cfgPermitirSemCentro").checked=d.permitirLancamentoSemCentro===true;$("cfgDreContasZero").checked=d.dreMostrarContasZeradas===true;
}

async function carregar(){
  criarPagina();if(carregando)return;const emp=empresaUnicaSelecionadaId(),av=$("ctrlConfigAviso");
  if(!emp){atual=null;aplicar({});if(av){av.classList.remove("hidden");av.textContent="Configurações exigem uma única empresa selecionada no cabeçalho."}if($("ctrlConfigEmpresa"))$("ctrlConfigEmpresa").textContent="Selecione uma empresa.";$("btnSalvarCtrlConfig").disabled=true;return}
  carregando=true;try{const arr=await listarDocumentos("configuracoesControladoria");atual=arr.find(x=>x.empresaId===emp)||null;aplicar(atual||{});if(av)av.classList.add("hidden");if($("ctrlConfigEmpresa"))$("ctrlConfigEmpresa").textContent=`Empresa: ${nomeEmpresa(emp)}`;$("btnSalvarCtrlConfig").disabled=!podeEditar()}catch(e){console.error(e);if(av){av.classList.remove("hidden");av.textContent="As regras do Firebase para Configurações da Controladoria ainda precisam ser publicadas."}}finally{carregando=false}
}

async function salvar(e){
  e.preventDefault();if(!podeEditar())return msg($("mensagemCtrlConfig"),"Somente administrador ou perfil com edição da Controladoria pode alterar estes parâmetros.");const emp=empresaUnicaSelecionadaId();if(!emp)return msg($("mensagemCtrlConfig"),"Selecione uma única empresa.");
  const d={materialidadePct:Number($("cfgMaterialidade").value||5),permutaSemMovimentoDias:Number($("cfgPermutaDias").value||60),moeda:$("cfgMoeda").value,exigirCentroConta:$("cfgExigirCentroConta").checked,permitirLancamentoSemCentro:$("cfgPermitirSemCentro").checked,dreMostrarContasZeradas:$("cfgDreContasZero").checked};
  try{msg($("mensagemCtrlConfig"),"Salvando...");if(atual)await atualizarDocumento("configuracoesControladoria",atual.id,d);else await criarDocumento("configuracoesControladoria",d);msg($("mensagemCtrlConfig"),"Configurações salvas.",true);await carregar()}catch(err){console.error(err);msg($("mensagemCtrlConfig"),"Não foi possível salvar as configurações.")}
}

export function abrir(){criarPagina();abrirPagina("ctrl-config");const t=$("tituloPagina");if(t)t.textContent="Configurações da Controladoria";carregar()}

criarPagina();window.addEventListener("sig:empresa-changed",()=>{if(pagina()&&!pagina().classList.contains("hidden"))carregar()});
