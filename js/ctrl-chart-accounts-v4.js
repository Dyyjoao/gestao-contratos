import { abrirPagina, admin } from "./core.js";
import { $, esc, msg, permite, listarDocumentos, criarDocumento, atualizarDocumento, empresaUnicaSelecionadaId, nomeEmpresa } from "./shared.js";
import { contaSintetica, contaAnalitica, temFilhos } from "./account-tree.js";
import { RAIZES_CONTABEIS, raizConta, definicaoRaiz, codigoSinteticoValido, codigoAnaliticoValido, proximoCodigoSintetico, proximoCodigoAnalitico, grupoDreCompatibilidade, naturezaCompatibilidade, centroTecnicoDaConta } from "./account-mask.js";

const UNIDADES={numero:"Número",un:"Unidades",m2:"m²",m3:"m³",t:"Toneladas",kg:"kg",h:"Horas",pct:"%",rs_un:"R$/un",rs_m2:"R$/m²",rs_m3:"R$/m³",outra:"Outra"};
const CONSOLIDACOES={soma:"Somar",media:"Média",ultimo:"Último valor",recalcular:"Recalcular fórmula"};
let contas=[],editId=null,novoCtx=null,busy=false;
const pagina=()=>$("pagina-ctrl-plano-v4");
const podeEditar=()=>admin()||permite("controladoria","editar")||permite("controladoria","planoContas");
const contaAtual=()=>contas.find(c=>c.id===editId);
const defAtual=()=>definicaoRaiz(novoCtx?.raiz||contaAtual());

function criarPagina(){
  if(pagina())return;const main=document.querySelector("main.conteudo");if(!main)return;
  const s=document.createElement("section");s.id="pagina-ctrl-plano-v4";s.className="pagina hidden";s.innerHTML=`
  <div class="pagina-cabecalho"><div><span class="eyebrow">CONTROLADORIA & FP&A</span><h2>Plano de Contas Gerencial</h2><p>Máscara fixa <strong>#.##.####</strong> com código gerado automaticamente pela conta mãe.</p></div></div>
  <div class="modulo-aviso"><strong>Estrutura:</strong> 1 Ativo · 2 Passivo · 3 Receita · 4 Despesa · 9 Estatística. A raiz e a conta <code>#.##</code> são Sintéticas; somente <code>#.##.####</code> é Analítica. Analítica nunca recebe filhos.</div>
  <section id="formContaV4Box" class="form-card hidden"><div class="form-card-titulo"><div><h3 id="contaV4Titulo">Conta</h3><p id="contaV4Subtitulo">—</p></div></div><form id="formContaV4"><div class="form-grid form-grid-3">
    <div class="campo"><label for="contaV4Codigo">Código</label><input id="contaV4Codigo" readonly></div>
    <div class="campo"><label for="contaV4Raiz">Raiz</label><input id="contaV4Raiz" readonly></div>
    <div class="campo"><label for="contaV4Estrutura">Classificação</label><input id="contaV4Estrutura" readonly></div>
    <div class="campo campo-span-2"><label for="contaV4Nome">Conta gerencial</label><input id="contaV4Nome" required placeholder="Ex.: Receita de vendas"></div>
    <div class="campo"><label for="contaV4Status">Status</label><select id="contaV4Status"><option value="ativo">Ativa</option><option value="inativo">Inativa</option></select></div>
    <div id="contaV4EstatTipoCampo" class="campo hidden"><label for="contaV4EstatTipo">Tipo estatístico</label><select id="contaV4EstatTipo"><option value="driver">Driver operacional</option><option value="calculada">Indicador calculado</option></select></div>
    <div id="contaV4ModoCampo" class="campo hidden"><label for="contaV4Modo">Modo de preenchimento</label><select id="contaV4Modo"><option value="manual">Manual</option><option value="automatico">Automático</option></select></div>
    <div id="contaV4UnidadeCampo" class="campo hidden"><label for="contaV4Unidade">Unidade</label><select id="contaV4Unidade">${Object.entries(UNIDADES).map(([v,n])=>`<option value="${v}">${n}</option>`).join("")}</select></div>
    <div id="contaV4ConsolidacaoCampo" class="campo hidden"><label for="contaV4Consolidacao">Consolidação</label><select id="contaV4Consolidacao">${Object.entries(CONSOLIDACOES).map(([v,n])=>`<option value="${v}">${n}</option>`).join("")}</select></div>
    <div id="contaV4FormulaCampo" class="campo campo-span-3 hidden"><label for="contaV4Formula">Regra / fórmula automática</label><input id="contaV4Formula" placeholder="Será substituído pelo construtor visual de fórmulas"></div>
  </div><div class="form-acoes"><button id="btnCancelarContaV4" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Salvar conta</button></div><p id="mensagemContaV4" class="mensagem-form"></p></form></section>
  <section class="lista-card"><div class="lista-cabecalho"><div><h3>Árvore contábil e gerencial</h3><p id="contaV4Contexto">—</p></div></div><div class="tabela-container"><table class="tabela plano-v4-table"><thead><tr><th>Código / Conta</th><th>Tipo</th><th>Uso</th><th>Status</th><th>Ações</th></tr></thead><tbody id="listaContasV4"></tbody></table></div></section>`;
  main.appendChild(s);garantirCss();$("btnCancelarContaV4")?.addEventListener("click",fecharForm);$("formContaV4")?.addEventListener("submit",salvar);$("contaV4Modo")?.addEventListener("change",sincronizarEstatistica);$("contaV4EstatTipo")?.addEventListener("change",sincronizarEstatistica);
}
function garantirCss(){if($("plano-v4-css"))return;const s=document.createElement("style");s.id="plano-v4-css";s.textContent=`
.plano-v4-table td:first-child{min-width:330px}.plano-v4-raiz td{background:#e7eef2;font-weight:900}.plano-v4-sint td{background:#f7f9fb}.plano-v4-estat td{background:#eefaf8}.plano-v4-balanco td{background:#f5f3ff}.plano-v4-tree{display:flex;align-items:center;gap:7px}.plano-v4-tree.n1{padding-left:20px}.plano-v4-tree.n2{padding-left:48px}.plano-v4-pill{display:inline-block;border-radius:999px;padding:2px 7px;font-size:8px;background:#eef2f5;color:#52606d}.plano-v4-pill.sint{background:#eaf5f3;color:#087a6f}.plano-v4-pill.legado{background:#fff3e8;color:#9a4e00}.plano-v4-actions{display:flex;gap:6px;flex-wrap:wrap}.plano-v4-raiz .btn-acao{background:#fff}.plano-v4-code{font-variant-numeric:tabular-nums}`;document.head.appendChild(s)}
function classeRaiz(r){return r==="9"?"plano-v4-estat":(r==="1"||r==="2")?"plano-v4-balanco":""}
function usoRaiz(r){return r==="9"?"Indicadores · CC técnico invisível":(r==="1"||r==="2")?"Balanço · saldo mensal · CC técnico invisível":"DRE · depende de Centro de Custo"}
function masked(c){return codigoSinteticoValido(c?.codigo)||codigoAnaliticoValido(c?.codigo)}
function sinteticasRaiz(r){return contas.filter(c=>raizConta(c)===r&&contaSintetica(c)&&codigoSinteticoValido(c.codigo)).sort((a,b)=>String(a.codigo).localeCompare(String(b.codigo),"pt-BR"))}
function analiticasPai(p){return contas.filter(c=>contaAnalitica(c)&&c.contaPaiId===p.id&&codigoAnaliticoValido(c.codigo)).sort((a,b)=>String(a.codigo).localeCompare(String(b.codigo),"pt-BR"))}
function legadoRaiz(r){return contas.filter(c=>raizConta(c)===r&&!masked(c)).sort((a,b)=>String(a.codigo||"").localeCompare(String(b.codigo||""),"pt-BR"))}
function render(){
  const tb=$("listaContasV4");if(!tb)return;const emp=empresaUnicaSelecionadaId();$("contaV4Contexto").textContent=emp?`${nomeEmpresa(emp)} · máscara #.##.#### · ${contas.length} conta(s) cadastrada(s)`:"Selecione apenas uma empresa no cabeçalho.";
  const linhas=[];for(const [r,d] of Object.entries(RAIZES_CONTABEIS)){
    linhas.push(`<tr class="plano-v4-raiz ${classeRaiz(r)}"><td><div class="plano-v4-tree"><span>▾</span><span class="plano-v4-code">${r}</span><span>${esc(d.nome)}</span></div></td><td><span class="plano-v4-pill sint">Sintética raiz</span></td><td>${esc(usoRaiz(r))}</td><td>Fixa</td><td><div class="plano-v4-actions">${podeEditar()?`<button class="btn-acao destaque" data-v4-add-sint="${r}" type="button">+ Sintética</button>`:"—"}</div></td></tr>`);
    for(const s of sinteticasRaiz(r)){
      linhas.push(`<tr class="plano-v4-sint ${classeRaiz(r)}"><td><div class="plano-v4-tree n1"><span>▾</span><strong class="plano-v4-code">${esc(s.codigo)}</strong><span>${esc(s.nome)}</span></div></td><td><span class="plano-v4-pill sint">Sintética</span></td><td>${esc(usoRaiz(r))}</td><td>${s.status==="inativo"?"Inativa":"Ativa"}</td><td><div class="plano-v4-actions">${podeEditar()?`<button class="btn-acao" data-v4-add-ana="${s.id}" type="button">+ Analítica</button><button class="btn-acao destaque" data-v4-edit="${s.id}" type="button">Editar</button>`:"—"}</div></td></tr>`);
      for(const a of analiticasPai(s)){
        const modo=r==="9"?(a.modoPreenchimento||"manual")==="automatico"?"Automático":"Manual":"";
        linhas.push(`<tr class="${classeRaiz(r)}"><td><div class="plano-v4-tree n2"><span>•</span><strong class="plano-v4-code">${esc(a.codigo)}</strong><span>${esc(a.nome)}</span></div></td><td><span class="plano-v4-pill">Analítica</span></td><td>${r==="9"?`${esc(UNIDADES[a.unidadeEstatistica]||"Número")} · ${modo}`:esc(usoRaiz(r))}</td><td>${a.status==="inativo"?"Inativa":"Ativa"}</td><td>${podeEditar()?`<button class="btn-acao destaque" data-v4-edit="${a.id}" type="button">Editar</button>`:"—"}</td></tr>`);
      }
    }
    for(const l of legadoRaiz(r))linhas.push(`<tr><td><div class="plano-v4-tree n1"><span>!</span><strong>${esc(l.codigo||"-")}</strong><span>${esc(l.nome||"")}</span></div></td><td><span class="plano-v4-pill legado">Legado</span></td><td>Preservada até migração para a nova máscara</td><td>${l.status==="inativo"?"Inativa":"Ativa"}</td><td>${podeEditar()?`<button class="btn-acao destaque" data-v4-edit="${l.id}" type="button">Editar</button>`:"—"}</td></tr>`);
  }
  tb.innerHTML=linhas.join("");tb.querySelectorAll("[data-v4-add-sint]").forEach(b=>b.addEventListener("click",()=>novaSintetica(b.dataset.v4AddSint)));tb.querySelectorAll("[data-v4-add-ana]").forEach(b=>b.addEventListener("click",()=>novaAnalitica(contas.find(c=>c.id===b.dataset.v4AddAna))));tb.querySelectorAll("[data-v4-edit]").forEach(b=>b.addEventListener("click",()=>editar(contas.find(c=>c.id===b.dataset.v4Edit))));
}
function preencherForm({codigo,raiz,estrutura,nome="",status="ativo",conta=null}){
  const d=RAIZES_CONTABEIS[raiz];$("contaV4Codigo").value=codigo||"";$("contaV4Raiz").value=`${raiz} · ${d?.nome||""}`;$("contaV4Estrutura").value=estrutura==="sintetica"?"Sintética":"Analítica";$("contaV4Nome").value=nome||"";$("contaV4Status").value=status||"ativo";$("contaV4Titulo").textContent=editId?"Editar conta":estrutura==="sintetica"?"Nova conta Sintética":"Nova conta Analítica";$("contaV4Subtitulo").textContent=estrutura==="sintetica"?`Filha da raiz ${raiz}. O código foi reservado automaticamente.`:`Filha de ${novoCtx?.pai?.codigo||conta?.codigoPaiMascara||"conta sintética"}. O código foi reservado automaticamente.`;
  const estat=raiz==="9"&&estrutura==="analitica";["contaV4EstatTipoCampo","contaV4ModoCampo","contaV4UnidadeCampo","contaV4ConsolidacaoCampo"].forEach(id=>$(id)?.classList.toggle("hidden",!estat));$("contaV4EstatTipo").value=conta?.tipoEstatistica||"driver";$("contaV4Modo").value=conta?.modoPreenchimento||"manual";$("contaV4Unidade").value=conta?.unidadeEstatistica||"numero";$("contaV4Consolidacao").value=conta?.consolidacaoEstatistica||"soma";$("contaV4Formula").value=conta?.formulaEstatistica||"";sincronizarEstatistica();$("formContaV4Box")?.classList.remove("hidden");setTimeout(()=>$("contaV4Nome")?.focus(),20);
}
function novaSintetica(raiz){editId=null;try{const codigo=proximoCodigoSintetico(contas,raiz);novoCtx={raiz,tipo:"sintetica",pai:null,codigo};preencherForm({codigo,raiz,estrutura:"sintetica"})}catch(e){alert(e.message==="limite-sinteticas"?"Esta raiz já atingiu 99 contas Sintéticas.":"Não foi possível gerar o próximo código.")}}
function novaAnalitica(pai){if(!pai||!contaSintetica(pai)||!codigoSinteticoValido(pai.codigo))return alert("A conta mãe precisa ser uma Sintética válida no formato #.##.");editId=null;try{const raiz=raizConta(pai),codigo=proximoCodigoAnalitico(contas,pai.codigo);novoCtx={raiz,tipo:"analitica",pai,codigo};preencherForm({codigo,raiz,estrutura:"analitica"})}catch(e){alert(e.message==="limite-analiticas"?"Esta conta Sintética já atingiu 9.999 Analíticas.":"Não foi possível gerar o próximo código.")}}
function editar(c){if(!c)return;editId=c.id;const raiz=raizConta(c),estrutura=contaSintetica(c)?"sintetica":"analitica";novoCtx=null;preencherForm({codigo:c.codigo,raiz,estrutura,nome:c.nome,status:c.status,conta:c});if(!masked(c))$("contaV4Subtitulo").textContent="Conta legada preservada. Nome/status podem ser alterados; a migração de código será feita em rotina própria."}
function fecharForm(){editId=null;novoCtx=null;$("formContaV4Box")?.classList.add("hidden");msg($("mensagemContaV4"),"")}
function sincronizarEstatistica(){const raiz=novoCtx?.raiz||raizConta(contaAtual()),estrutura=novoCtx?.tipo||(contaSintetica(contaAtual())?"sintetica":"analitica"),estat=raiz==="9"&&estrutura==="analitica",auto=estat&&$("contaV4Modo")?.value==="automatico";$("contaV4FormulaCampo")?.classList.toggle("hidden",!auto);if(auto&&$("contaV4EstatTipo")?.value==="driver")$("contaV4EstatTipo").value="calculada"}
async function carregar(){criarPagina();const emp=empresaUnicaSelecionadaId();if(busy)return;if(!emp){contas=[];render();return}busy=true;try{contas=await listarDocumentos("planoContasGerencial");render()}catch(e){console.error(e);msg($("mensagemContaV4"),"Não foi possível carregar o Plano de Contas.")}finally{busy=false}}
async function salvar(e){
  e.preventDefault();if(!podeEditar())return;const atual=contaAtual(),nome=$("contaV4Nome").value.trim(),status=$("contaV4Status").value;if(!nome)return msg($("mensagemContaV4"),"Informe o nome da conta.");
  if(editId){if(atual&&contaSintetica(atual)&&status==="inativo"&&contas.some(c=>c.contaPaiId===atual.id&&c.status!=="inativo"))return msg($("mensagemContaV4"),"Inative primeiro as contas Analíticas filhas.");const d={nome,status};if(raizConta(atual)==="9"&&contaAnalitica(atual)){d.tipoEstatistica=$("contaV4EstatTipo").value;d.modoPreenchimento=$("contaV4Modo").value;d.unidadeEstatistica=$("contaV4Unidade").value;d.consolidacaoEstatistica=$("contaV4Consolidacao").value;d.formulaEstatistica=d.modoPreenchimento==="automatico"?$("contaV4Formula").value.trim():""}try{await atualizarDocumento("planoContasGerencial",editId,d);fecharForm();await carregar()}catch(err){console.error(err);msg($("mensagemContaV4"),"Não foi possível salvar a conta.")}return}
  const {raiz,tipo,pai,codigo}=novoCtx||{};const def=RAIZES_CONTABEIS[raiz];if(!def)return msg($("mensagemContaV4"),"Raiz contábil inválida.");if(tipo==="analitica"&&(!pai||!codigoSinteticoValido(pai.codigo)))return msg($("mensagemContaV4"),"Conta Analítica precisa nascer de uma Sintética #.##.");
  const d={codigo,nome,status,grupoRaiz:raiz,demonstracao:def.tipo,natureza:naturezaCompatibilidade(raiz),grupoDre:grupoDreCompatibilidade(raiz),tipoEstrutura:tipo,contaPaiId:tipo==="analitica"?pai.id:"",tipoConta:def.tipo==="estatistica"?"estatistica":def.tipo==="balanco"?"balanco":"financeira",centroTecnicoId:def.ccTecnicoId||"",mascaraPlano:"#.##.####",versaoMascara:"v4"};
  if(def.tipo==="balanco"){d.modoPreenchimento="manual";d.consolidacaoSaldo="ultimo";d.naturezaSaldo=raiz==="1"?"devedor":"credor"}
  if(def.tipo==="estatistica"&&tipo==="analitica"){d.tipoEstatistica=$("contaV4EstatTipo").value;d.modoPreenchimento=$("contaV4Modo").value;d.unidadeEstatistica=$("contaV4Unidade").value;d.consolidacaoEstatistica=$("contaV4Consolidacao").value;d.formulaEstatistica=d.modoPreenchimento==="automatico"?$("contaV4Formula").value.trim():""}
  try{await criarDocumento("planoContasGerencial",d);fecharForm();await carregar()}catch(err){console.error(err);msg($("mensagemContaV4"),"Não foi possível criar a conta.")}
}
export function abrir(){criarPagina();abrirPagina("ctrl-plano-v4");const t=$("tituloPagina");if(t)t.textContent="Plano de Contas";carregar()}
export{carregar};
criarPagina();window.addEventListener("sig:empresa-changed",()=>{if(pagina()&&!pagina().classList.contains("hidden"))carregar()});
