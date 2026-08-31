import { $, esc, msg, permite, state, abrirPagina, db } from "./core.js";
import {
  listarDocumentos, empresaUnicaSelecionadaId, empresasSelecionadasIds,
  grupoAtualId, periodoAtual, periodoAno, nomeEmpresa
} from "./shared.js";
import {
  writeBatch, doc, collection, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const MESES=[
  ["jan","Jan"],["fev","Fev"],["mar","Mar"],["abr","Abr"],["mai","Mai"],["jun","Jun"],
  ["jul","Jul"],["ago","Ago"],["set","Set"],["out","Out"],["nov","Nov"],["dez","Dez"]
];
const GRUPOS={receita:"Receita Operacional",deducoes:"Deduções da Receita",custos:"Custos",despesas:"Despesas Operacionais",financeiro:"Resultado Financeiro",impostos:"Impostos",outros:"Outros"};
let plano=[],centros=[],realizados=[],carregando=false;

function podeVer(){return permite("controladoria","visualizar")||podeEditar()}
function podeEditar(){return permite("controladoria","editar")||permite("controladoria","realizado")||permite("controladoria","importar")}
function pagina(){return $("pagina-input-mensal")}
function visivel(){return pagina()&&!pagina().classList.contains("hidden")}
function n(v){const x=Number(v||0);return Number.isFinite(x)?x:0}
function moeda(v){return n(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
function vazioMeses(){return Object.fromEntries(MESES.map(([m])=>[m,0]))}
function competenciaMensal(){const p=periodoAtual();if(!/^m\d{2}$/.test(p.chave))return null;const idx=Number(p.chave.slice(1))-1;return idx>=0&&idx<12?{...p,indice:idx,mes:MESES[idx][0],nome:MESES[idx][1]}:null}
function docRealizado(contaId,centroId,ano){return realizados.find(x=>x.contaId===contaId&&x.centroCustoId===centroId&&Number(x.exercicio)===Number(ano))}

function garantirCss(){
  if($("input-mensal-css"))return;
  const s=document.createElement("style");s.id="input-mensal-css";s.textContent=`
    .input-mensal-hero{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.input-mensal-contexto{font-size:11px;color:#667085;text-align:right}
    .input-toolbar{display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin:14px 0}.input-toolbar .campo{min-width:240px}.input-toolbar select{min-width:240px}
    .input-status{padding:11px 13px;border:1px solid #d7e1e6;border-radius:10px;background:#f8fafb;color:#475467;font-size:11px;margin:10px 0}.input-status.alerta{border-color:#f3c98b;background:#fff8ed;color:#8a4b08}.input-status.ok{border-color:#b7e6dc;background:#effbf8;color:#087a6f}
    .input-grid-wrap{overflow:auto}.input-grid{width:100%;border-collapse:collapse;font-size:11px}.input-grid th,.input-grid td{padding:9px;border-bottom:1px solid #eaecf0;text-align:left}.input-grid th{color:#667085;background:#f8fafc;position:sticky;top:0;z-index:1}.input-grid .numero{text-align:right}.input-grid input{width:130px;height:34px;border:1px solid #d0d5dd;border-radius:7px;padding:0 8px;text-align:right}.input-grid input:focus{outline:2px solid rgba(12,148,136,.14);border-color:#0c9488}.input-conta strong{display:block;color:#1d2939}.input-conta small{color:#667085}
    .input-vazio{padding:26px;text-align:center;color:#667085}.input-acoes{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.input-resumo{margin-left:auto;font-size:11px;color:#667085}
    @media(max-width:760px){.input-mensal-hero{display:block}.input-mensal-contexto{text-align:left;margin-top:8px}.input-toolbar .campo,.input-toolbar select{width:100%;min-width:0}.input-grid input{width:110px}}
  `;document.head.appendChild(s);
}

function criarPagina(){
  if(pagina())return;
  const main=document.querySelector("main.conteudo");if(!main)return;
  const p=document.createElement("section");p.id="pagina-input-mensal";p.className="pagina hidden";p.innerHTML=`
    <div class="pagina-cabecalho input-mensal-hero"><div><span class="eyebrow">CONTROLADORIA</span><h2>Input Mensal</h2><p>Lançamento do realizado com validação por centro de custo e conta gerencial.</p></div><div id="inputMensalContexto" class="input-mensal-contexto"></div></div>
    <div id="inputMensalAviso" class="input-status">Selecione uma empresa, uma competência mensal e um centro de custo.</div>
    <div class="input-toolbar">
      <div class="campo"><label for="inputCentroCusto">Centro de custo</label><select id="inputCentroCusto"><option value="">Carregando...</option></select></div>
      <button id="btnRecarregarInput" class="btn-secundario" type="button">Recarregar</button>
      <button id="btnSalvarInput" class="btn-primario" type="button">Salvar competência</button>
      <button id="btnConfigurarContasCentro" class="btn-secundario" type="button">Configurar contas do centro</button>
      <span id="mensagemInputMensal" class="mensagem-form"></span>
    </div>
    <section class="lista-card"><div class="lista-cabecalho"><div><h3 id="inputMensalTitulo">Realizado mensal</h3><p id="inputMensalSubtitulo">Somente contas autorizadas para o centro selecionado aparecem para lançamento.</p></div><div id="inputMensalResumo" class="input-resumo"></div></div><div class="input-grid-wrap"><table id="tabelaInputMensal" class="input-grid"><tbody><tr><td class="input-vazio">Carregando...</td></tr></tbody></table></div></section>`;
  main.appendChild(p);
  $("inputCentroCusto")?.addEventListener("change",render);
  $("btnRecarregarInput")?.addEventListener("click",()=>carregar({preservarCentro:true}));
  $("btnSalvarInput")?.addEventListener("click",salvar);
  $("btnConfigurarContasCentro")?.addEventListener("click",irConfigurarCentro);
}

function criarMenu(){
  let b=$("menuInputMensal");
  if(!b){const base=$("menuControladoria");if(!base)return; b=document.createElement("button");b.id="menuInputMensal";b.className="menu-item hidden";b.type="button";b.textContent="Input Mensal";base.insertAdjacentElement("afterend",b);b.addEventListener("click",()=>{if(!podeVer())return;abrirPagina("input-mensal");const t=$("tituloPagina");if(t)t.textContent="Input Mensal";carregar({preservarCentro:true})})}
  b.classList.toggle("hidden",!podeVer());
}

function separarDaControladoria(){
  document.querySelector('[data-fpa-tab="realizado"]')?.remove();
  document.querySelector('[data-fpa-view="realizado"]')?.remove();
}

function contextoValido(){
  const emp=empresaUnicaSelecionadaId(),comp=competenciaMensal();
  if(empresasSelecionadasIds().length!==1)return{ok:false,texto:"Para lançar o realizado, selecione apenas uma empresa no cabeçalho."};
  if(!emp)return{ok:false,texto:"Selecione uma empresa no cabeçalho."};
  if(!comp)return{ok:false,texto:"O Input Mensal exige uma competência mensal. No cabeçalho, escolha Jan, Fev, Mar... em vez de T1/T2/T3/T4 ou Total."};
  return{ok:true,emp,comp};
}

function atualizarContexto(){
  const c=contextoValido(),el=$("inputMensalContexto");
  if(el)el.textContent=c.ok?`${nomeEmpresa(c.emp)} · ${c.comp.nome}/${periodoAno()}`:`Exercício ${periodoAno()}`;
  const av=$("inputMensalAviso");if(av){av.className=`input-status ${c.ok?"ok":"alerta"}`;av.textContent=c.ok?`Competência de lançamento: ${c.comp.nome}/${periodoAno()}. O centro de custo define quais contas podem receber valores.`:c.texto}
  return c;
}

async function carregar({preservarCentro=false}={}){
  if(carregando)return;criarPagina();const c=atualizarContexto();
  const sel=$("inputCentroCusto"),atual=preservarCentro?sel?.value:"";
  if(!c.ok){plano=[];centros=[];realizados=[];if(sel)sel.innerHTML='<option value="">Indisponível</option>';render();return}
  carregando=true;const btn=$("btnRecarregarInput");if(btn)btn.disabled=true;msg($("mensagemInputMensal"),"Carregando base do realizado...");
  try{
    [centros,plano,realizados]=await Promise.all([listarDocumentos("centrosCusto"),listarDocumentos("planoContasGerencial"),listarDocumentos("realizadoMensal")]);
    centros=centros.filter(x=>x.status!=="inativo").sort((a,b)=>String(a.codigo||"").localeCompare(String(b.codigo||""),"pt-BR"));
    plano=plano.filter(x=>x.status!=="inativo").sort((a,b)=>n(a.ordem)-n(b.ordem)||String(a.codigo||"").localeCompare(String(b.codigo||""),"pt-BR"));
    if(sel){sel.innerHTML='<option value="">Selecione o centro...</option>'+centros.map(x=>`<option value="${esc(x.id)}">${esc(x.codigo||"")} · ${esc(x.nome||"")}</option>`).join("");if(atual&&centros.some(x=>x.id===atual))sel.value=atual}
    msg($("mensagemInputMensal"),"");render();
  }catch(e){console.error("Erro ao carregar Input Mensal",e);msg($("mensagemInputMensal"),"Não foi possível carregar o Input Mensal.");}
  finally{carregando=false;if(btn)btn.disabled=false}
}

function render(){
  const t=$("tabelaInputMensal");if(!t)return;const c=atualizarContexto(),centroId=$("inputCentroCusto")?.value||"";
  const btnSalvar=$("btnSalvarInput");if(btnSalvar)btnSalvar.disabled=!podeEditar()||!c.ok||!centroId;
  if(!c.ok){t.innerHTML=`<tbody><tr><td class="input-vazio">${esc(c.texto)}</td></tr></tbody>`;return}
  if(!centroId){t.innerHTML='<tbody><tr><td class="input-vazio">Selecione um centro de custo para começar.</td></tr></tbody>';if($("inputMensalResumo"))$("inputMensalResumo").textContent="";return}
  const centro=centros.find(x=>x.id===centroId),permitidas=new Set(Array.isArray(centro?.contasPermitidas)?centro.contasPermitidas:[]),contas=plano.filter(x=>permitidas.has(x.id));
  if($("inputMensalTitulo"))$("inputMensalTitulo").textContent=`${centro?.codigo||""} · ${centro?.nome||"Centro de custo"}`;
  if($("inputMensalResumo"))$("inputMensalResumo").textContent=`${contas.length} conta(s) autorizada(s)`;
  if(!contas.length){t.innerHTML='<tbody><tr><td class="input-vazio">Este centro ainda não possui contas permitidas. Clique em “Configurar contas do centro”.</td></tr></tbody>';return}
  const ano=periodoAno(),mes=c.comp.mes;
  t.innerHTML=`<thead><tr><th>Código / conta</th><th>Grupo</th><th>Natureza</th><th class="numero">${c.comp.nome}/${ano}</th></tr></thead><tbody>${contas.map(conta=>{const r=docRealizado(conta.id,centroId,ano),v=n(r?.valores?.[mes]);return`<tr><td class="input-conta"><strong>${esc(conta.codigo||"")}</strong><small>${esc(conta.nome||"")}</small></td><td>${esc(GRUPOS[conta.grupoDre]||conta.grupoDre||"-")}</td><td>${conta.natureza==="receita"?"Receita":"Despesa / custo"}</td><td class="numero"><input data-input-conta="${esc(conta.id)}" data-original="${v}" type="number" step="0.01" value="${v}" aria-label="Valor ${esc(conta.nome||conta.codigo||"")}"></td></tr>`}).join("")}</tbody>`;
}

async function salvar(){
  if(!podeEditar())return msg($("mensagemInputMensal"),"Seu perfil não permite lançar o realizado.");
  const c=contextoValido(),empresaId=empresaUnicaSelecionadaId(),centroId=$("inputCentroCusto")?.value||"";if(!c.ok)return msg($("mensagemInputMensal"),c.texto);if(!centroId)return msg($("mensagemInputMensal"),"Selecione o centro de custo.");
  const centro=centros.find(x=>x.id===centroId),permitidas=new Set(Array.isArray(centro?.contasPermitidas)?centro.contasPermitidas:[]),inputs=[...document.querySelectorAll("#tabelaInputMensal [data-input-conta]")].filter(i=>permitidas.has(i.dataset.inputConta));
  const alterados=inputs.map(i=>({input:i,contaId:i.dataset.inputConta,valor:n(i.value),original:n(i.dataset.original)})).filter(x=>x.valor!==x.original);
  if(!alterados.length)return msg($("mensagemInputMensal"),"Nenhuma alteração para salvar.",true);
  const btn=$("btnSalvarInput");if(btn){btn.disabled=true;btn.textContent="Salvando..."}msg($("mensagemInputMensal"),`Salvando ${alterados.length} alteração(ões)...`);
  try{
    const ano=periodoAno(),mes=c.comp.mes,grupoId=grupoAtualId();
    for(let ini=0;ini<alterados.length;ini+=400){
      const bloco=alterados.slice(ini,ini+400),batch=writeBatch(db);
      for(const x of bloco){
        const exist=docRealizado(x.contaId,centroId,ano);
        if(exist){batch.update(doc(db,"realizadoMensal",exist.id),{[`valores.${mes}`]:x.valor,atualizadoEm:serverTimestamp()})}
        else{const ref=doc(collection(db,"realizadoMensal"));batch.set(ref,{grupoId,empresaId,contaId:x.contaId,centroCustoId:centroId,exercicio:ano,valores:{...vazioMeses(),[mes]:x.valor},criadoPor:state.usuario.id,criadoEm:serverTimestamp(),atualizadoEm:serverTimestamp()})}
      }
      await batch.commit();await new Promise(resolve=>requestAnimationFrame(resolve));
    }
    realizados=await listarDocumentos("realizadoMensal");render();msg($("mensagemInputMensal"),`Competência salva: ${c.comp.nome}/${ano}.`,true);window.dispatchEvent(new CustomEvent("sig:data-changed",{detail:{modulo:"realizadoMensal"}}));
  }catch(e){console.error("Erro ao salvar Input Mensal",e);msg($("mensagemInputMensal"),"Não foi possível salvar a competência. Nenhuma outra tela será recarregada automaticamente.")}
  finally{if(btn){btn.disabled=false;btn.textContent="Salvar competência"}}
}

function irConfigurarCentro(){
  if(!empresaUnicaSelecionadaId())return msg($("mensagemInputMensal"),"Selecione apenas uma empresa para configurar o centro.");
  abrirPagina("controladoria");const t=$("tituloPagina");if(t)t.textContent="Controladoria & Planejamento";setTimeout(()=>{document.querySelector('[data-fpa-tab="centros"]')?.click();const centroId=$("inputCentroCusto")?.value;if(centroId)setTimeout(()=>document.querySelector(`[data-contas-centro="${CSS.escape(centroId)}"]`)?.click(),120)},80);
}

function inicializar(){garantirCss();criarPagina();criarMenu();separarDaControladoria()}
inicializar();
window.addEventListener("sig:ready",()=>{criarMenu();separarDaControladoria()});
window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="controladoria")separarDaControladoria();if(e.detail?.pagina==="input-mensal"&&podeVer())carregar({preservarCentro:true})});
window.addEventListener("sig:empresa-changed",()=>{plano=[];centros=[];realizados=[];if(visivel())carregar()});
window.addEventListener("sig:periodo-changed",()=>{realizados=[];if(visivel())carregar({preservarCentro:true})});
