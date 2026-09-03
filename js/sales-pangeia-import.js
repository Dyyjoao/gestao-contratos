import { $, esc, permite, admin, moeda, listarDocumentos, criarDocumento, empresaUnicaSelecionadaId, nomeEmpresa, emitirAlteracao } from "./shared.js";
import { lerArquivoTexto, normalizarTextoImportacao, numeroBr, dataBrParaIso, normalizarChave, chaveImportacao, arredondarCentavos, executarEmLotes } from "./import-center.js";

let textoAtual="",arquivoAtual="",analise=null,vendedores=[],vendas=[],busy=false;
const pagina=()=>$("pagina-vendas");
const podeImportar=()=>admin()||permite("vendas","lancar");
const podeVendedores=()=>admin()||permite("vendas","vendedores");
const podeComissoes=()=>admin()||permite("vendas","comissoes");
const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};
const pct=v=>`${n(v).toLocaleString("pt-BR",{maximumFractionDigits:4})}%`;
const baseNome=b=>b==="faturamento"?"Faturamento":"Venda";

function vendedorMeta(origem,pctValor){
  const bruto=String(origem||"").trim(),partes=bruto.split("-"),codigo=partes.length>1?partes.shift().trim():"",nomeOrigem=partes.join("-").trim()||bruto;
  return{chave:normalizarChave(bruto),codigo,nomeOrigem,rotulo:bruto,pct:n(pctValor),linhas:[],section:[]};
}
function dinheiroTokens(v){return [...String(v||"").matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/g)]}
function finalizarLinha(pendente,vendedor,saida,erros){
  if(!pendente)return null;
  const bloco=pendente.partes.join(" ").replace(/\s+/g," ").trim(),dm=bloco.match(/\d{2}\/\d{2}\/\d{2}/),tokens=dinheiroTokens(bloco);
  if(!dm||tokens.length<2){erros.push(`Venda ${pendente.numero}: não foi possível identificar data/valores.`);return null}
  const dataPos=dm.index||0,dataFim=dataPos+dm[0].length,ult=tokens[tokens.length-1],pen=tokens[tokens.length-2],cliente=bloco.slice(0,dataPos).trim(),ci=bloco.slice(dataFim,pen.index).trim(),data=dataBrParaIso(dm[0]);
  if(!cliente||!data){erros.push(`Venda ${pendente.numero}: cliente ou data inválidos.`);return null}
  const row={venda:String(pendente.numero),cliente,data,dataBr:dm[0],ci,liquido:numeroBr(pen[1]),comissaoRelatorio:numeroBr(ult[1]),vendedorChave:vendedor.chave,vendedorOrigem:vendedor.rotulo,percentualRelatorio:vendedor.pct};
  if(row.liquido<=0){erros.push(`Venda ${pendente.numero}: líquido inválido.`);return null}
  vendedor.linhas.push(row);saida.push(row);return null;
}
function fecharVendedor(v){
  if(!v)return;
  const texto=v.section.join(" ").replace(/\s+/g," ");
  const total=texto.match(/Total\s*do\s*Vendedor:\s*([\d.]+,\d{2})\s+([\d.]+,\d{2})/i);
  const liquida=texto.match(/Comiss[^:]*L[^:]*:\s*([\d.]+,\d{2})/i);
  v.totalLiquidoRelatorio=total?numeroBr(total[1]):null;
  v.totalComissaoRelatorio=total?numeroBr(total[2]):(liquida?numeroBr(liquida[1]):null);
  v.comissaoLiquidaRelatorio=liquida?numeroBr(liquida[1]):v.totalComissaoRelatorio;
  v.totalLiquidoLinhas=v.linhas.reduce((s,x)=>s+n(x.liquido),0);
  v.totalComissaoLinhas=v.linhas.reduce((s,x)=>s+n(x.comissaoRelatorio),0);
  v.diferencaLiquido=v.totalLiquidoRelatorio==null?null:arredondarCentavos(v.totalLiquidoLinhas-v.totalLiquidoRelatorio);
  v.diferencaComissao=v.totalComissaoRelatorio==null?null:arredondarCentavos(v.totalComissaoLinhas-v.totalComissaoRelatorio);
}

export function parseRelatorioPangeia(texto){
  const bruto=normalizarTextoImportacao(texto),linhas=bruto.split("\n"),saida=[],erros=[],map=new Map();let atual=null,pendente=null,empresaOrigem="";
  const header=/^\s*Vendedor:\s*(.*?)\s+Comiss[^:]*:\s*([\d.,]+)%/i,novo=/^\s*(\d{5,10})\s+(.*)$/;
  for(const linha0 of linhas){
    const linha=String(linha0||"");
    if(!empresaOrigem&&linha.trim()&&!/COMISS/i.test(linha)&&!/Venda\s+Cliente/i.test(linha)&&!/^-+$/.test(linha.trim())&&!/Vendedor:/i.test(linha)&&!/Pang/i.test(linha))empresaOrigem=linha.trim();
    const h=linha.match(header);
    if(h){pendente=finalizarLinha(pendente,atual,saida,erros);fecharVendedor(atual);atual=vendedorMeta(h[1],numeroBr(h[2]));map.set(atual.chave,atual);atual.section.push(linha);continue}
    if(!atual)continue;atual.section.push(linha);
    const t=linha.trim();
    if(!t||/^-+$/.test(t)||/Total\s*do\s*dia/i.test(t)||/Total\s*do\s*Vendedor/i.test(t)||/Comiss[^:]*L/i.test(t)||/COMISS[^:]*POR\s+VENDEDOR/i.test(t)||/Venda\s+Cliente/i.test(t)||/SALVADOR/i.test(t)||/Pang/i.test(t)){if(/Total\s*do\s*dia/i.test(t)||/Total\s*do\s*Vendedor/i.test(t))pendente=finalizarLinha(pendente,atual,saida,erros);continue}
    const m=linha.match(novo);
    if(m){pendente=finalizarLinha(pendente,atual,saida,erros);pendente={numero:m[1],partes:[m[2]]}}
    else if(pendente)pendente.partes.push(t);
  }
  pendente=finalizarLinha(pendente,atual,saida,erros);fecharVendedor(atual);
  const vendedores=[...map.values()];
  return{empresaOrigem,vendedores,linhas:saida,erros,totalLiquido:saida.reduce((s,x)=>s+n(x.liquido),0),totalComissao:saida.reduce((s,x)=>s+n(x.comissaoRelatorio),0)};
}

function css(){if($("sales-import-css"))return;const l=document.createElement("link");l.id="sales-import-css";l.rel="stylesheet";l.href="sales-import.css?v=1";document.head.appendChild(l)}
function montar(){
  const p=pagina();if(!p||$("salesImportBox"))return false;css();
  const acoes=p.querySelector(".pagina-cabecalho .acoes-cabecalho"),btn=document.createElement("button");btn.id="btnSalesImportar";btn.className="btn-secundario";btn.type="button";btn.textContent="Importar Pangéia";acoes?.insertBefore(btn,$("btnSalesVendedor")||null);
  const box=document.createElement("section");box.id="salesImportBox";box.className="form-card hidden sales-import-box";box.innerHTML=`
    <div class="form-card-titulo"><div><h3>Importar relatório de Comissão por Vendedor</h3><p>Leia TXT do Pangéia, confira vendedores, duplicidades e totais antes de gravar. O arquivo bruto não é enviado ao Firebase.</p></div><button id="btnSalesImportFechar" class="btn-secundario" type="button">Fechar</button></div>
    <div class="sales-import-grid"><div class="campo"><label for="salesImportArquivo">Arquivo TXT</label><input id="salesImportArquivo" type="file" accept=".txt,text/plain"><small>Compatível com TXT ANSI/Windows-1252 e UTF-8.</small></div><div class="campo campo-span-2"><label for="salesImportTexto">Ou cole o relatório</label><textarea id="salesImportTexto" rows="6" placeholder="Cole aqui o conteúdo do relatório Comissão por Vendedor..."></textarea></div></div>
    <div class="form-acoes"><button id="btnSalesImportLimpar" class="btn-secundario" type="button">Limpar</button><button id="btnSalesImportAnalisar" class="btn-primario" type="button">Analisar relatório</button></div>
    <p id="salesImportMsg" class="mensagem-form"></p>
    <div id="salesImportResultado" class="hidden">
      <div id="salesImportResumo" class="sales-import-resumo"></div>
      <section class="lista-card sales-import-sub"><div class="lista-cabecalho"><div><h3>Vinculação de vendedores</h3><p>O SIG tenta reconhecer automaticamente. Na primeira importação você pode vincular ou cadastrar.</p></div></div><div class="tabela-container"><table class="tabela"><thead><tr><th>Relatório</th><th>%</th><th>Registros</th><th>Conferência</th><th>Vincular a</th><th>Base se novo</th></tr></thead><tbody id="salesImportVendedores"></tbody></table></div></section>
      <section class="lista-card sales-import-sub"><div class="lista-cabecalho"><div><h3>Prévia dos lançamentos</h3><p id="salesImportPreviewInfo">—</p></div></div><div class="tabela-container"><table class="tabela"><thead><tr><th>Venda</th><th>Data</th><th>Vendedor</th><th>Cliente / C.I.</th><th>Líquido</th><th>Comissão relatório</th><th>Situação</th></tr></thead><tbody id="salesImportPreview"></tbody></table></div></section>
      <div class="sales-import-footer"><div><strong>Importação auditável</strong><small>Os registros recebem origem, arquivo, nº da venda, C.I. e comissão informada pelo relatório.</small></div><button id="btnSalesImportConfirmar" class="btn-primario" type="button">Importar registros válidos</button></div>
    </div>`;
  $("salesAviso")?.insertAdjacentElement("afterend",box);
  btn.addEventListener("click",abrirImportacao);$("btnSalesImportFechar")?.addEventListener("click",fecharImportacao);$("btnSalesImportLimpar")?.addEventListener("click",limparImportacao);$("btnSalesImportAnalisar")?.addEventListener("click",analisarTexto);$("btnSalesImportConfirmar")?.addEventListener("click",confirmarImportacao);$("salesImportArquivo")?.addEventListener("change",arquivoSelecionado);$("salesImportVendedores")?.addEventListener("change",eventoMapaVendedor);$("salesImportVendedores")?.addEventListener("input",eventoMapaVendedor);
  atualizarPermissao();return true;
}
function atualizarPermissao(){const b=$("btnSalesImportar");if(b)b.classList.toggle("hidden",!podeImportar())}
function abrirImportacao(){if(!podeImportar())return alert("Seu perfil não pode registrar/importar vendas.");if(!empresaUnicaSelecionadaId())return alert("Para importar, selecione uma única empresa no cabeçalho.");$("salesImportBox")?.classList.remove("hidden");$("salesImportBox")?.scrollIntoView({behavior:"smooth",block:"start"})}
function fecharImportacao(){$("salesImportBox")?.classList.add("hidden")}
function limparImportacao(){textoAtual="";arquivoAtual="";analise=null;const f=$("salesImportArquivo"),t=$("salesImportTexto");if(f)f.value="";if(t)t.value="";$("salesImportResultado")?.classList.add("hidden");msg($("salesImportMsg"),"")}
async function arquivoSelecionado(e){const f=e.target.files?.[0];if(!f)return;try{msg($("salesImportMsg"),"Lendo arquivo...");textoAtual=await lerArquivoTexto(f);arquivoAtual=f.name;$("salesImportTexto").value=textoAtual;await analisarTexto()}catch(err){console.error(err);msg($("salesImportMsg"),"Não foi possível ler o arquivo.")}}
function chaveVendedor(v){return normalizarChave(v?.codigoExternoPangeia||v?.codigoPangeia||v?.nomeOrigemPangeia||v?.nome||"")}
function aliasesOrigem(s){return new Set([normalizarChave(s.rotulo),normalizarChave(s.nomeOrigem),normalizarChave(s.codigo)].filter(Boolean))}
function sugerirVendedor(s){const aliases=aliasesOrigem(s);return vendedores.find(v=>{const a=new Set([chaveVendedor(v),normalizarChave(v.nome),normalizarChave(v.codigoExternoPangeia),normalizarChave(v.nomeOrigemPangeia)].filter(Boolean));return [...aliases].some(x=>a.has(x))})||null}
function duplicada(row,empresaId){const key=chaveImportacao("PANGEIA",empresaId,row.venda);return vendas.some(v=>v.empresaId===empresaId&&(v.importacaoChave===key||String(v.documento||"").trim()===row.venda))}
function vendedorPorId(id){return vendedores.find(v=>v.id===id)}
function renderResumo(){
  const emp=empresaUnicaSelecionadaId(),novas=analise.linhas.filter(x=>!duplicada(x,emp)),dups=analise.linhas.length-novas.length,div=$("salesImportResumo");if(!div)return;
  div.innerHTML=`<div><span>Empresa no relatório</span><strong>${esc(analise.empresaOrigem||"Não identificada")}</strong><small>Destino: ${esc(nomeEmpresa(emp))}</small></div><div><span>Vendedores</span><strong>${analise.vendedores.length}</strong><small>${analise.erros.length?analise.erros.length+" aviso(s) de leitura":"Leitura sem erros estruturais"}</small></div><div><span>Vendas identificadas</span><strong>${analise.linhas.length}</strong><small>${novas.length} nova(s) · ${dups} duplicada(s)</small></div><div><span>Líquido</span><strong>${moeda(analise.totalLiquido)}</strong><small>Soma das linhas lidas</small></div><div><span>Comissão no relatório</span><strong>${moeda(analise.totalComissao)}</strong><small>Valor informado, preservado para conferência</small></div>`;
}
function renderVendedores(){
  const tb=$("salesImportVendedores");if(!tb)return;const opts=vendedores.slice().sort((a,b)=>String(a.nome||"").localeCompare(String(b.nome||""),"pt-BR"));
  tb.innerHTML=analise.vendedores.map(s=>{const sug=sugerirVendedor(s);if(!s.mapVendedorId&&sug)s.mapVendedorId=sug.id;if(!s.novoNome)s.novoNome=s.nomeOrigem;if(!s.novaBase)s.novaBase="venda";const dif=s.diferencaComissao,conf=dif==null?"Sem total de conferência":Math.abs(dif)<=0.10?`OK · diferença ${moeda(dif)}`:`Atenção · diferença ${moeda(dif)}`;return`<tr data-seller="${s.chave}"><td><strong>${esc(s.rotulo)}</strong><small>${esc(s.codigo?`Código ${s.codigo}`:"Sem código externo")}</small>${(!s.mapVendedorId||s.mapVendedorId==="__novo__")?`<input data-new-name="${s.chave}" value="${esc(s.novoNome)}" placeholder="Nome no SIG">`:""}</td><td>${pct(s.pct)}</td><td>${s.linhas.length}</td><td><strong>${moeda(s.totalLiquidoLinhas)}</strong><small>${esc(conf)}</small></td><td><select data-map-vendedor="${s.chave}"><option value="">Selecione...</option>${opts.map(v=>`<option value="${v.id}" ${v.id===s.mapVendedorId?"selected":""}>${esc(v.nome)} · ${pct(v.comissaoPct)} · ${baseNome(v.baseComissao)}</option>`).join("")}${podeVendedores()?`<option value="__novo__" ${s.mapVendedorId==="__novo__"?"selected":""}>+ Cadastrar novo</option>`:""}</select></td><td>${s.mapVendedorId==="__novo__"?`<select data-new-base="${s.chave}"><option value="venda" ${s.novaBase!=="faturamento"?"selected":""}>Venda</option><option value="faturamento" ${s.novaBase==="faturamento"?"selected":""}>Faturamento</option></select>`:"—"}</td></tr>`}).join("");
}
function renderPreview(){
  const emp=empresaUnicaSelecionadaId(),linhas=analise.linhas,tb=$("salesImportPreview"),dups=linhas.filter(x=>duplicada(x,emp)).length;setText("salesImportPreviewInfo",`${linhas.length} linha(s) reconhecida(s) · ${dups} já existente(s). Mostrando até 100.`);if(!tb)return;
  tb.innerHTML=linhas.slice(0,100).map(r=>{const d=duplicada(r,emp);return`<tr class="${d?"sales-import-dup":""}"><td><strong>${esc(r.venda)}</strong></td><td>${esc(r.dataBr)}</td><td>${esc(r.vendedorOrigem)}<small>${pct(r.percentualRelatorio)}</small></td><td><strong>${esc(r.cliente)}</strong><small>${r.ci?`C.I. ${esc(r.ci)}`:""}</small></td><td>${moeda(r.liquido)}</td><td>${moeda(r.comissaoRelatorio)}</td><td>${d?'<span class="status-inativo">Duplicada · será ignorada</span>':'<span class="status-ativo">Pronta para importar</span>'}</td></tr>`}).join("")+(linhas.length>100?`<tr><td colspan="7">+ ${linhas.length-100} registro(s) na importação.</td></tr>`:"");
}
function eventoMapaVendedor(e){const chave=e.target?.dataset?.mapVendedor||e.target?.dataset?.newBase||e.target?.dataset?.newName;if(!chave||!analise)return;const s=analise.vendedores.find(x=>x.chave===chave);if(!s)return;if(e.target.dataset.mapVendedor){s.mapVendedorId=e.target.value;if(s.mapVendedorId!=="__novo__")s.novaBase="venda";renderVendedores()}else if(e.target.dataset.newBase)s.novaBase=e.target.value;else if(e.target.dataset.newName)s.novoNome=e.target.value}
async function analisarTexto(){
  if(busy)return;const emp=empresaUnicaSelecionadaId();if(!emp)return msg($("salesImportMsg"),"Selecione uma única empresa no cabeçalho.");const txt=$("salesImportTexto")?.value||textoAtual;if(!txt.trim())return msg($("salesImportMsg"),"Selecione um TXT ou cole o relatório.");busy=true;try{msg($("salesImportMsg"),"Analisando relatório...");analise=parseRelatorioPangeia(txt);if(!analise.linhas.length)throw new Error("nenhuma-linha-reconhecida");[vendedores,vendas]=await Promise.all([listarDocumentos("vendedores"),listarDocumentos("vendas")]);renderResumo();renderVendedores();renderPreview();$("salesImportResultado")?.classList.remove("hidden");msg($("salesImportMsg"),`Leitura concluída: ${analise.linhas.length} venda(s) reconhecida(s).`,true)}catch(err){console.error(err);analise=null;$("salesImportResultado")?.classList.add("hidden");msg($("salesImportMsg"),"Não reconheci este relatório. Use o TXT do relatório Comissão por Vendedor do Pangéia.")}finally{busy=false}}
async function garantirVendedores(){
  const mapa=new Map();for(const s of analise.vendedores){let id=s.mapVendedorId,v=vendedorPorId(id);if(id==="__novo__"){if(!podeVendedores())throw new Error(`Sem permissão para cadastrar ${s.rotulo}`);const nome=String(s.novoNome||s.nomeOrigem||s.rotulo).trim();if(!nome)throw new Error(`Informe o nome do vendedor ${s.rotulo}`);id=await criarDocumento("vendedores",{nome,email:"",metaMensal:0,comissaoPct:s.pct,baseComissao:s.novaBase==="faturamento"?"faturamento":"venda",status:"ativo",codigoExternoPangeia:s.codigo||"",nomeOrigemPangeia:s.rotulo});v={id,nome,comissaoPct:s.pct,baseComissao:s.novaBase==="faturamento"?"faturamento":"venda",status:"ativo",codigoExternoPangeia:s.codigo||"",nomeOrigemPangeia:s.rotulo};vendedores.push(v);s.mapVendedorId=id}else if(!v)throw new Error(`Vincule o vendedor ${s.rotulo}.`);mapa.set(s.chave,v)}return mapa;
}
async function confirmarImportacao(){
  if(busy||!analise||!podeImportar())return;const emp=empresaUnicaSelecionadaId();if(!emp)return alert("Selecione uma única empresa.");const novas=analise.linhas.filter(r=>!duplicada(r,emp));if(!novas.length)return alert("Todas as vendas deste relatório já estão no SIG.");if(!confirm(`Importar ${novas.length} venda(s) para ${nomeEmpresa(emp)}?\n\nDuplicidades serão ignoradas e o histórico do relatório será preservado.`))return;
  busy=true;try{msg($("salesImportMsg"),"Validando vendedores...");const mapa=await garantirVendedores();const itens=[];
    for(const r of novas){const vend=mapa.get(r.vendedorChave);if(!vend)throw new Error(`Vendedor não vinculado: ${r.vendedorOrigem}`);const taxaRel=n(r.percentualRelatorio),taxaCad=n(vend.comissaoPct),taxa=podeComissoes()?taxaRel:taxaCad;if(!podeComissoes()&&Math.abs(taxaRel-taxaCad)>0.0001)throw new Error(`A comissão de ${vend.nome} no relatório (${pct(taxaRel)}) difere do cadastro (${pct(taxaCad)}). Ajuste o cadastro ou use um perfil com permissão de comissões.`);const base=vend.baseComissao==="faturamento"?"faturamento":"venda",valor=n(r.liquido),valorFat=base==="faturamento"?valor:0,baseValor=base==="faturamento"?valorFat:valor,calc=baseValor*taxa/100;itens.push({data:r.data,dataFaturamento:base==="faturamento"?r.data:null,vendedorId:vend.id,vendedorNome:vend.nome,cliente:r.cliente,documento:r.venda,descricao:"Importado do relatório Comissão por Vendedor · Pangéia",valor,valorFaturado:valorFat,baseComissao:base,comissaoPct:taxa,comissaoBaseValor:baseValor,comissaoValor:calc,comissaoStatus:"provisionada",status:"confirmada",observacao:r.ci?`C.I. ${r.ci}`:"",ci:r.ci||"",origemImportacao:"pangeia_comissao",arquivoImportacao:arquivoAtual||"texto_colado",importacaoChave:chaveImportacao("PANGEIA",emp,r.venda),vendedorOrigem:r.vendedorOrigem,percentualRelatorio:taxaRel,comissaoRelatorio:r.comissaoRelatorio,comissaoDiferenca:arredondarCentavos(calc-r.comissaoRelatorio),empresaId:emp})}
    msg($("salesImportMsg"),`Importando 0 de ${itens.length}...`);await executarEmLotes(itens,d=>criarDocumento("vendas",d),{tamanho:8,onProgress:(feito,total)=>msg($("salesImportMsg"),`Importando ${feito} de ${total}...`)});emitirAlteracao("vendas");msg($("salesImportMsg"),`${itens.length} venda(s) importada(s) com sucesso.`,true);[vendedores,vendas]=await Promise.all([listarDocumentos("vendedores"),listarDocumentos("vendas")]);renderResumo();renderVendedores();renderPreview();
  }catch(err){console.error(err);msg($("salesImportMsg"),err?.message||"A importação não pôde ser concluída. Os registros já gravados serão reconhecidos como duplicados na próxima tentativa.")}finally{busy=false}}
function setText(id,v){if($(id))$(id).textContent=v}
function tentar(){if(montar())setTimeout(atualizarPermissao,20);else atualizarPermissao()}
const obs=new MutationObserver(tentar);obs.observe(document.body,{childList:true,subtree:true});
window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="vendas")setTimeout(()=>{montar();atualizarPermissao()},100)});
window.addEventListener("sig:ready",tentar);window.addEventListener("sig:data-changed",e=>{if(e.detail?.modulo==="vendas"&&analise)setTimeout(analisarTexto,100)});tentar();
