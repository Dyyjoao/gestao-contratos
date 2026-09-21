import { $, esc, permite, admin, moeda, listarDocumentos, criarDocumento, atualizarDocumento, empresaUnicaSelecionadaId, nomeEmpresa, emitirAlteracao, state } from "./shared.js";
import { colaboradoresPorFuncao } from "./hr-role-registry.js?v=6";
import { normalizarChave, chaveImportacao, arredondarCentavos, executarEmLotes } from "./import-center.js";

const XLSX_CDN="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
const CAMPOS={
  clienteCodigo:"CDCLIENTE",
  clienteNome:"NOMEPESSOA",
  clienteCidade:"CIDADEPESSOA",
  clienteUf:"UFPESSOA",
  vendaCodigo:"CDVENDA",
  lojaCodigo:"CDLOJA",
  vendedorCodigo:"CDFUNCIONARIOVENDA",
  vendedorNome:"NOMEFUNCIONARIO",
  dataVenda:"DATAVENDA",
  valorVenda:"VALORVENDA"
};
const OBRIGATORIOS=["CDCLIENTE","NOMEPESSOA","CDVENDA","CDFUNCIONARIOVENDA","NOMEFUNCIONARIO","DATAVENDA","VALORVENDA"];

let arquivoAtual="",analise=null,vendedoresRh=[],configs=[],vendas=[],clientes=[],importacoes=[],busy=false;
const pagina=()=>$("pagina-vendas");
const podeImportar=()=>admin()||permite("vendas","lancar");
const podeVendedores=()=>admin()||permite("vendas","vendedores");
const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};
const codigo=v=>String(v??"").trim().toUpperCase();
const chaveCodigo=v=>normalizarChave(codigo(v));
const loteId=()=>{const d=new Date(),p=v=>String(v).padStart(2,"0"),s=Math.random().toString(36).slice(2,6).toUpperCase();return `IMP-VND-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${s}`};
const statusImportacao=s=>({processando:"Processando",concluida:"Concluída",parcial:"Parcial",estornada:"Estornada",erro:"Erro"})[s]||s||"—";

const dataIso=v=>{
  if(v instanceof Date&&!Number.isNaN(v.getTime()))return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,"0")}-${String(v.getDate()).padStart(2,"0")}`;
  const s=String(v??"").trim();
  if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);
  let m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2}|\d{4})$/);
  if(m){let a=Number(m[3]);if(m[3].length===2)a+=a>=70?1900:2000;const d=Number(m[1]),mes=Number(m[2]);if(mes>=1&&mes<=12&&d>=1&&d<=31)return `${String(a).padStart(4,"0")}-${String(mes).padStart(2,"0")}-${String(d).padStart(2,"0")}`}
  return""
};
const numero=v=>{
  if(typeof v==="number")return Number.isFinite(v)?v:0;
  let s=String(v??"").trim().replace(/R\$/gi,"").replace(/\s/g,"");
  if(!s)return 0;
  if(s.includes(",")&&s.includes("."))s=s.replace(/\./g,"").replace(",",".");
  else if(s.includes(","))s=s.replace(",",".");
  s=s.replace(/[^0-9.-]/g,"");
  const x=Number(s);return Number.isFinite(x)?x:0
};
function css(){if($("sales-import-css"))return;const l=document.createElement("link");l.id="sales-import-css";l.rel="stylesheet";l.href="sales-import.css?v=2";document.head.appendChild(l)}
async function carregarXlsx(){
  if(globalThis.XLSX)return globalThis.XLSX;
  await new Promise((resolve,reject)=>{
    const existente=document.querySelector('script[data-sig-xlsx]');
    if(existente){existente.addEventListener("load",resolve,{once:true});existente.addEventListener("error",reject,{once:true});return}
    const s=document.createElement("script");s.dataset.sigXlsx="1";s.src=XLSX_CDN;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error("biblioteca-xls-indisponivel"));document.head.appendChild(s)
  });
  if(!globalThis.XLSX)throw new Error("biblioteca-xls-indisponivel");
  return globalThis.XLSX
}
function acharCabecalho(matriz){
  for(let i=0;i<Math.min(40,matriz.length);i++){
    const norm=(matriz[i]||[]).map(normalizarChave);
    const presentes=new Set(norm);
    if(OBRIGATORIOS.every(x=>presentes.has(x))){
      const indices={};Object.entries(CAMPOS).forEach(([k,h])=>indices[k]=norm.indexOf(h));
      return{linha:i,indices}
    }
  }
  return null
}
export function parseMatrizRelatorioVendas(matriz){
  const cab=acharCabecalho(matriz);if(!cab)throw new Error("cabecalho-nao-reconhecido");
  const linhas=[],erros=[];
  for(let i=cab.linha+1;i<matriz.length;i++){
    const r=matriz[i]||[],get=k=>cab.indices[k]>=0?r[cab.indices[k]]:"";
    const row={
      linha:i+1,
      clienteCodigo:codigo(get("clienteCodigo")),
      clienteNome:String(get("clienteNome")??"").trim(),
      clienteCidade:String(get("clienteCidade")??"").trim(),
      clienteUf:codigo(get("clienteUf")),
      vendaCodigo:codigo(get("vendaCodigo")),
      lojaCodigo:codigo(get("lojaCodigo")),
      vendedorCodigo:codigo(get("vendedorCodigo")),
      vendedorNome:String(get("vendedorNome")??"").trim(),
      data:dataIso(get("dataVenda")),
      valor:arredondarCentavos(numero(get("valorVenda")))
    };
    if(!Object.values(row).some(Boolean))continue;
    const faltas=[];
    if(!row.clienteCodigo)faltas.push("código do cliente");
    if(!row.clienteNome)faltas.push("nome do cliente");
    if(!row.vendaCodigo)faltas.push("código da venda");
    if(!row.vendedorCodigo)faltas.push("código do vendedor");
    if(!row.vendedorNome)faltas.push("nome do vendedor");
    if(!row.data)faltas.push("data da venda");
    if(!(row.valor>0))faltas.push("valor da venda");
    row.erro=faltas.length?`Linha ${row.linha}: ${faltas.join(", ")} inválido(s).`:"";
    if(row.erro)erros.push(row.erro);else linhas.push(row)
  }
  return{linhas,erros,total:linhas.reduce((s,x)=>s+x.valor,0)}
}
async function lerPlanilha(file){
  const XLSX=await carregarXlsx(),buf=await file.arrayBuffer(),wb=XLSX.read(buf,{type:"array",cellDates:true});
  let ultimoErro=null;
  for(const nome of wb.SheetNames){
    const matriz=XLSX.utils.sheet_to_json(wb.Sheets[nome],{header:1,defval:"",raw:false});
    try{return{...parseMatrizRelatorioVendas(matriz),aba:nome}}catch(e){ultimoErro=e}
  }
  throw ultimoErro||new Error("cabecalho-nao-reconhecido")
}
function cfgPorRh(id){return configs.find(x=>x.rhColaboradorId===id&&x.tipoComissao!=="supervisor"&&x.status!=="inativo")}
function rhPorCodigo(cod){
  const key=chaveCodigo(cod),achados=vendedoresRh.filter(x=>chaveCodigo(x.codigoVendedor)===key);
  return achados.length===1?achados[0]:null
}
function clientePorCodigo(cod,emp){
  const key=chaveCodigo(cod);return clientes.find(x=>x.empresaId===emp&&chaveCodigo(x.codigo)===key)||null
}
function chaveVenda(r,emp){return chaveImportacao("RELATORIO_VENDAS",emp,r.lojaCodigo||"SEMLOJA",r.vendaCodigo)}
function duplicada(r,emp){const k=chaveVenda(r,emp);return vendas.some(v=>v.empresaId===emp&&(v.importacaoChave===k||(String(v.documento||"").trim()===r.vendaCodigo&&String(v.lojaOrigem||"")===String(r.lojaCodigo||""))))}
function montar(){
  const p=pagina();if(!p||$("salesReportImportBox"))return false;css();
  const acoes=p.querySelector(".pagina-cabecalho .acoes-cabecalho"),btn=document.createElement("button");btn.id="btnSalesReportImport";btn.className="btn-secundario";btn.type="button";btn.textContent="Importar vendas";acoes?.insertBefore(btn,$("btnSalesVenda")||null);
  const box=document.createElement("section");box.id="salesReportImportBox";box.className="form-card hidden sales-import-box";box.innerHTML=`
    <div class="form-card-titulo"><div><h3>Importar relatório de vendas</h3><p>Compatível com o relatório Excel contendo CD_CLIENTE, CD_VENDA, CD_FUNCIONARIOVENDA, DATA_VENDA e VALOR_VENDA. Clientes são localizados pelo código e vendedores pelo código vinculado no RH.</p></div><button id="btnSalesReportImportFechar" class="btn-secundario" type="button">Fechar</button></div>
    <div class="sales-import-grid"><div class="campo"><label for="salesReportArquivo">Arquivo Excel</label><input id="salesReportArquivo" type="file" accept=".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"><small>O arquivo é lido no navegador; o XLS bruto não é gravado no Firebase.</small></div><div class="campo campo-span-2"><label>Estrutura reconhecida</label><div class="sales-import-schema"><strong>Venda:</strong> DATA_VENDA · CD_VENDA · VALOR_VENDA<br><strong>Cliente:</strong> CD_CLIENTE · NOME_PESSOA · CIDADE_PESSOA · UF_PESSOA<br><strong>Vendedor:</strong> CD_FUNCIONARIOVENDA · NOME_FUNCIONARIO</div></div></div>
    <div class="form-acoes"><button id="btnSalesReportImportLimpar" class="btn-secundario" type="button">Limpar</button><button id="btnSalesReportImportAnalisar" class="btn-primario" type="button">Analisar arquivo</button></div>
    <p id="salesReportImportMsg" class="mensagem-form"></p>
    <div id="salesReportImportResultado" class="hidden">
      <div id="salesReportImportResumo" class="sales-import-resumo"></div>
      <section class="lista-card sales-import-sub"><div class="lista-cabecalho"><div><h3>Vendedores do relatório</h3><p>O vínculo é automático pelo código comercial salvo no cadastro do colaborador no RH.</p></div></div><div class="tabela-container"><table class="tabela"><thead><tr><th>Código</th><th>Nome no relatório</th><th>Colaborador RH</th><th>Configuração comercial</th><th>Linhas</th></tr></thead><tbody id="salesReportVendedores"></tbody></table></div></section>
      <section class="lista-card sales-import-sub"><div class="lista-cabecalho"><div><h3>Prévia</h3><p id="salesReportPreviewInfo">—</p></div></div><div class="tabela-container"><table class="tabela"><thead><tr><th>Data</th><th>Venda</th><th>Cliente</th><th>Vendedor</th><th>Valor</th><th>Situação</th></tr></thead><tbody id="salesReportPreview"></tbody></table></div></section>
      <div class="sales-import-footer"><div><strong>Importação por código</strong><small>Cada importação recebe um ID rastreável. Cliente existente usa a base do SIG; cliente novo é criado automaticamente. Venda duplicada é ignorada.</small></div><button id="btnSalesReportImportConfirmar" class="btn-primario" type="button">Importar vendas válidas</button></div>
    </div>
    <section class="lista-card sales-import-history">
      <div class="lista-cabecalho"><div><h3>Histórico de importações</h3><p>Controle por lote. O estorno em lote remove as vendas dos indicadores e preserva toda a trilha de auditoria.</p></div><button id="btnSalesReportHistoricoAtualizar" class="btn-secundario" type="button">Atualizar histórico</button></div>
      <div class="tabela-container"><table class="tabela"><thead><tr><th>ID da importação</th><th>Data / arquivo</th><th>Vendas</th><th>Clientes novos</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead><tbody id="salesReportHistorico"></tbody></table></div>
    </section>`;
  $("salesAviso")?.insertAdjacentElement("afterend",box);
  btn.onclick=abrir;$("btnSalesReportImportFechar").onclick=fechar;$("btnSalesReportImportLimpar").onclick=limpar;$("btnSalesReportImportAnalisar").onclick=analisar;$("btnSalesReportImportConfirmar").onclick=confirmar;$("btnSalesReportHistoricoAtualizar").onclick=async()=>{await carregarBases();renderHistorico()};$("salesReportArquivo").addEventListener("change",()=>analisar());
  atualizarPermissao();return true
}
function atualizarPermissao(){const b=$("btnSalesReportImport");if(b)b.classList.toggle("hidden",!podeImportar())}
function abrir(){if(!podeImportar())return alert("Seu perfil não pode importar vendas.");if(!empresaUnicaSelecionadaId())return alert("Selecione uma única empresa no cabeçalho.");$("salesReportImportBox")?.classList.remove("hidden");$("salesReportImportBox")?.scrollIntoView({behavior:"smooth",block:"start"})}
function fechar(){$("salesReportImportBox")?.classList.add("hidden")}
function limpar(){analise=null;arquivoAtual="";const f=$("salesReportArquivo");if(f)f.value="";$("salesReportImportResultado")?.classList.add("hidden");msg($("salesReportImportMsg"),"")}
async function carregarBases(){
  const [rh,cfg,vs,cl,imps]=await Promise.all([colaboradoresPorFuncao("VENDEDOR"),listarDocumentos("vendedores"),listarDocumentos("vendas"),listarDocumentos("clientesComerciais"),listarDocumentos("importacoesVendas")]);
  vendedoresRh=rh;configs=cfg;vendas=vs;clientes=cl;importacoes=imps
}
function renderHistorico(){
  const tb=$("salesReportHistorico");if(!tb)return;const emp=empresaUnicaSelecionadaId();
  const arr=importacoes.filter(x=>x.empresaId===emp).sort((a,b)=>String(b.iniciadoEm||b.criadoEm||"").localeCompare(String(a.iniciadoEm||a.criadoEm||"")));
  tb.innerHTML=arr.length?arr.map(x=>`<tr class="${x.status==="estornada"?"sales-import-dup":""}"><td><strong>${esc(x.loteId||x.id)}</strong><small>${esc(x.origem||"relatorio_vendas")}</small></td><td>${x.iniciadoEm?new Date(x.iniciadoEm).toLocaleString("pt-BR"):"—"}<small>${esc(x.arquivo||"—")}</small></td><td>${n(x.quantidadeVendas||x.quantidadePrevista)}</td><td>${n(x.quantidadeClientesNovos)}</td><td>${moeda(n(x.valorTotal||x.valorPrevisto))}</td><td><span class="${x.status==="concluida"?"status-ativo":"status-inativo"}">${esc(statusImportacao(x.status))}</span>${x.estornadoEm?`<small>${new Date(x.estornadoEm).toLocaleString("pt-BR")}</small>`:""}</td><td>${admin()&&["concluida","parcial"].includes(x.status)?`<button type="button" class="btn-acao perigo" data-sales-import-estorno="${esc(x.id)}">Estornar lote</button>`:"—"}</td></tr>`).join(""):'<tr><td colspan="7">Nenhuma importação registrada para a empresa selecionada.</td></tr>';
  document.querySelectorAll("[data-sales-import-estorno]").forEach(b=>b.onclick=()=>estornarLote(b.dataset.salesImportEstorno))
}
async function estornarLote(id){
  if(!admin())return alert("O estorno em lote é restrito ao Administrador.");
  const imp=importacoes.find(x=>x.id===id);if(!imp||!["concluida","parcial"].includes(imp.status))return;
  const lote=imp.loteId||imp.id,linhas=vendas.filter(v=>v.empresaId===imp.empresaId&&v.importacaoLoteId===lote&&v.status!=="cancelada");
  const motivo=prompt(`Estornar a importação ${lote}?\n\n${linhas.length} venda(s) serão retiradas dos indicadores. Informe o motivo do estorno:`);
  if(motivo===null)return;if(!motivo.trim())return alert("Informe o motivo do estorno.");
  if(!confirm(`Confirmar estorno em lote de ${linhas.length} venda(s)?\n\nO histórico será preservado e poderá ser auditado pelo ID ${lote}.`))return;
  busy=true;try{
    const agora=new Date().toISOString(),uid=state.usuario?.id||"";
    msg($("salesReportImportMsg"),`Estornando lote ${lote}...`);
    await executarEmLotes(linhas,v=>atualizarDocumento("vendas",v.id,{status:"cancelada",importacaoEstornada:true,importacaoEstornadaEm:agora,importacaoEstornadaPor:uid,importacaoEstornoMotivo:motivo.trim()}),{tamanho:8});
    const vendasDepois=await listarDocumentos("vendas"),clientesLote=clientes.filter(x=>x.empresaId===imp.empresaId&&x.importacaoLoteId===lote&&x.status!=="inativo");let inativados=0;
    for(const cliente of clientesLote){
      const usado=vendasDepois.some(v=>v.clienteId===cliente.id&&v.importacaoLoteId!==lote&&v.status!=="cancelada");
      if(!usado){await atualizarDocumento("clientesComerciais",cliente.id,{status:"inativo",importacaoEstornada:true,importacaoEstornadaEm:agora,importacaoEstornadaPor:uid,importacaoEstornoMotivo:motivo.trim()});inativados++}
    }
    await atualizarDocumento("importacoesVendas",id,{status:"estornada",estornadoEm:agora,estornadoPor:uid,estornoMotivo:motivo.trim(),quantidadeVendasEstornadas:linhas.length,quantidadeClientesInativados:inativados});
    await carregarBases();renderHistorico();if(analise)render();emitirAlteracao("vendas");msg($("salesReportImportMsg"),`Lote ${lote} estornado: ${linhas.length} venda(s) retiradas dos indicadores.`,true)
  }catch(e){console.error("Estorno de importação:",e);msg($("salesReportImportMsg"),e?.message||"Não foi possível estornar o lote. Confira as Rules publicadas.")}
  finally{busy=false}
}

function consolidarVendedores(){
  const mapa=new Map();
  analise.linhas.forEach(r=>{const k=chaveCodigo(r.vendedorCodigo),z=mapa.get(k)||{codigo:r.vendedorCodigo,nome:r.vendedorNome,qtd:0,rh:null,cfg:null};z.qtd++;mapa.set(k,z)});
  const arr=[...mapa.values()];arr.forEach(x=>{x.rh=rhPorCodigo(x.codigo);x.cfg=x.rh?cfgPorRh(x.rh.id):null});return arr
}
function render(){
  if(!analise)return;const emp=empresaUnicaSelecionadaId(),vend=consolidarVendedores(),novosClientes=new Set(analise.linhas.filter(r=>!clientePorCodigo(r.clienteCodigo,emp)).map(r=>chaveCodigo(r.clienteCodigo))),dups=analise.linhas.filter(r=>duplicada(r,emp)).length,semRh=vend.filter(x=>!x.rh).length,semCfg=vend.filter(x=>x.rh&&!x.cfg).length;
  $("salesReportImportResumo").innerHTML=`<div><span>Linhas válidas</span><strong>${analise.linhas.length}</strong><small>${analise.erros.length} aviso(s) ignorado(s)</small></div><div><span>Valor das vendas</span><strong>${moeda(analise.total)}</strong><small>Aba: ${esc(analise.aba||"—")}</small></div><div><span>Clientes novos</span><strong>${novosClientes.size}</strong><small>Cadastro automático por CD_CLIENTE</small></div><div><span>Vendedores</span><strong>${vend.length}</strong><small>${semRh} sem vínculo RH · ${semCfg} sem configuração</small></div><div><span>Duplicadas</span><strong>${dups}</strong><small>Serão ignoradas</small></div>`;
  $("salesReportVendedores").innerHTML=vend.map(x=>`<tr><td><strong>${esc(x.codigo)}</strong></td><td>${esc(x.nome||"—")}</td><td>${x.rh?`<strong>${esc(x.rh.nome)}</strong><small>${esc(x.rh.cargoNome||"")}</small>`:'<span class="status-inativo">Código não vinculado no RH</span>'}</td><td>${x.cfg?`<span class="status-ativo">${n(x.cfg.comissaoPct).toLocaleString("pt-BR",{maximumFractionDigits:3})}% · recebido</span>`:x.rh&&podeVendedores()?'<span class="status-inativo">Será criada em 0% · revisar depois</span>':'<span class="status-inativo">Configuração de comissão pendente</span>'}</td><td>${x.qtd}</td></tr>`).join("");
  const preview=analise.linhas.slice(0,120);$("salesReportPreviewInfo").textContent=`${analise.linhas.length} venda(s) válida(s) · exibindo ${preview.length}. ${analise.erros.length?analise.erros.length+" linha(s) inválida(s) foram ignoradas.":""}`;
  $("salesReportPreview").innerHTML=preview.map(r=>{const rh=rhPorCodigo(r.vendedorCodigo),cl=clientePorCodigo(r.clienteCodigo,emp),dup=duplicada(r,emp),ok=rh&&(cfgPorRh(rh.id)||podeVendedores());return`<tr class="${dup?"sales-import-dup":""}"><td>${esc(r.data.split("-").reverse().join("/"))}</td><td><strong>${esc(r.vendaCodigo)}</strong><small>${r.lojaCodigo?"Loja "+esc(r.lojaCodigo):""}</small></td><td><strong>${esc(cl?.nome||r.clienteNome)}</strong><small>Cód. ${esc(r.clienteCodigo)}${cl?" · cadastrado":" · será cadastrado"}</small></td><td><strong>${esc(rh?.nome||r.vendedorNome)}</strong><small>Cód. ${esc(r.vendedorCodigo)}</small></td><td>${moeda(r.valor)}</td><td>${dup?'<span class="status-inativo">Duplicada</span>':ok?'<span class="status-ativo">Pronta</span>':'<span class="status-inativo">Pendente de vínculo/configuração</span>'}</td></tr>`}).join("");
  $("salesReportImportResultado")?.classList.remove("hidden");renderHistorico()
}
async function analisar(){
  if(busy)return;const emp=empresaUnicaSelecionadaId(),file=$("salesReportArquivo")?.files?.[0];if(!emp)return msg($("salesReportImportMsg"),"Selecione uma única empresa.");if(!file)return msg($("salesReportImportMsg"),"Selecione o relatório Excel.");
  busy=true;try{msg($("salesReportImportMsg"),"Lendo relatório...");arquivoAtual=file.name;analise=await lerPlanilha(file);if(!analise.linhas.length)throw new Error("sem-vendas-validas");await carregarBases();render();msg($("salesReportImportMsg"),`Relatório reconhecido: ${analise.linhas.length} venda(s) válida(s).`,true)}
  catch(e){console.error("Importação de vendas:",e);analise=null;$("salesReportImportResultado")?.classList.add("hidden");msg($("salesReportImportMsg"),e?.message==="biblioteca-xls-indisponivel"?"Não foi possível carregar o leitor de Excel. Verifique a conexão e tente novamente.":"Não reconheci a estrutura deste arquivo. Confira se ele contém CD_CLIENTE, CD_VENDA, CD_FUNCIONARIOVENDA, DATA_VENDA e VALOR_VENDA.")}
  finally{busy=false}
}
async function garantirClientes(emp,linhas,lote){
  const mapa=new Map(clientes.filter(x=>x.empresaId===emp).map(x=>[chaveCodigo(x.codigo),x]));
  const unicos=new Map();linhas.forEach(r=>{const k=chaveCodigo(r.clienteCodigo);if(k&&!mapa.has(k)&&!unicos.has(k))unicos.set(k,r)});
  for(const r of unicos.values()){
    const id=await criarDocumento("clientesComerciais",{empresaId:emp,codigo:r.clienteCodigo,nome:r.clienteNome,cidade:r.clienteCidade||"",uf:r.clienteUf||"",status:"ativo",origem:"importacao_relatorio_vendas",importacaoLoteId:lote});
    const x={id,empresaId:emp,codigo:r.clienteCodigo,nome:r.clienteNome,cidade:r.clienteCidade||"",uf:r.clienteUf||"",status:"ativo",importacaoLoteId:lote};clientes.push(x);mapa.set(chaveCodigo(r.clienteCodigo),x)
  }
  return mapa
}
async function garantirConfigs(emp,linhas){
  const mapa=new Map();
  const codigos=[...new Set(linhas.map(r=>chaveCodigo(r.vendedorCodigo)))];
  for(const k of codigos){
    const rh=vendedoresRh.find(x=>chaveCodigo(x.codigoVendedor)===k);if(!rh)throw new Error(`Código de vendedor ${linhas.find(r=>chaveCodigo(r.vendedorCodigo)===k)?.vendedorCodigo||k} não está vinculado a um colaborador vendedor no RH.`);
    let cfg=cfgPorRh(rh.id);
    if(!cfg){
      if(!podeVendedores())throw new Error(`${rh.nome} está no RH, mas ainda não possui configuração comercial de comissão.`);
      const id=await criarDocumento("vendedores",{empresaId:emp,rhColaboradorId:rh.id,nome:rh.nome||"",email:rh.email||"",cargoNome:rh.cargoNome||"",codigoVendedor:rh.codigoVendedor||"",tipoComissao:"vendedor",metaMensal:0,comissaoPct:0,baseComissao:"recebido",status:"ativo",configuracaoPendente:true});
      cfg={id,empresaId:emp,rhColaboradorId:rh.id,nome:rh.nome||"",codigoVendedor:rh.codigoVendedor||"",tipoComissao:"vendedor",metaMensal:0,comissaoPct:0,baseComissao:"recebido",status:"ativo",configuracaoPendente:true};configs.push(cfg)
    }
    mapa.set(k,{rh,cfg})
  }
  return mapa
}
async function confirmar(){
  if(busy||!analise||!podeImportar())return;const emp=empresaUnicaSelecionadaId();if(!emp)return alert("Selecione uma única empresa.");
  const novas=analise.linhas.filter(r=>!duplicada(r,emp));if(!novas.length)return alert("Todas as vendas deste relatório já foram importadas.");
  if(!confirm(`Importar ${novas.length} venda(s) para ${nomeEmpresa(emp)}?\n\nClientes inexistentes serão cadastrados automaticamente pelo código. Duplicidades serão ignoradas. A operação receberá um ID de lote rastreável.`))return;
  busy=true;let logId="",lote="",clientesAntes=0;
  try{
    lote=loteId();clientesAntes=clientes.filter(x=>x.empresaId===emp).length;
    logId=await criarDocumento("importacoesVendas",{empresaId:emp,loteId:lote,origem:"relatorio_vendas",arquivo:arquivoAtual||"arquivo_excel",aba:analise.aba||"",status:"processando",quantidadePrevista:novas.length,valorPrevisto:novas.reduce((s,x)=>s+n(x.valor),0),iniciadoEm:new Date().toISOString(),importadoPor:state.usuario?.id||""});
    msg($("salesReportImportMsg"),`Lote ${lote} · validando clientes e vendedores...`);
    const clienteMap=await garantirClientes(emp,novas,lote),vendMap=await garantirConfigs(emp,novas),docs=[];
    for(const r of novas){
      const cl=clienteMap.get(chaveCodigo(r.clienteCodigo)),v=vendMap.get(chaveCodigo(r.vendedorCodigo));if(!cl||!v)throw new Error("vinculo-incompleto");
      const pct=n(v.cfg.comissaoPct);
      docs.push({empresaId:emp,data:r.data,dataRecebimento:null,valorRecebido:0,vendedorId:v.cfg.id,vendedorRhId:v.rh.id,vendedorNome:v.rh.nome||r.vendedorNome,vendedorCodigo:r.vendedorCodigo,vendedorNomeOrigem:r.vendedorNome,clienteId:cl.id,clienteCodigo:cl.codigo,cliente:cl.nome||r.clienteNome,clienteNomeOrigem:r.clienteNome,documento:r.vendaCodigo,lojaOrigem:r.lojaCodigo||"",descricao:"Venda importada de relatório · sem detalhamento de itens",itens:[],valor:r.valor,baseComissao:"recebido",comissaoPct:pct,comissaoBaseValor:0,comissaoValor:0,comissaoStatus:"aguardando_recebimento",status:"confirmada",observacao:"",origemImportacao:"relatorio_vendas",arquivoImportacao:arquivoAtual,importacaoLoteId:lote,importacaoChave:chaveVenda(r,emp)})
    }
    msg($("salesReportImportMsg"),`Lote ${lote} · importando 0 de ${docs.length}...`);
    await executarEmLotes(docs,d=>criarDocumento("vendas",d),{tamanho:8,onProgress:(feito,total)=>msg($("salesReportImportMsg"),`Lote ${lote} · importando ${feito} de ${total}...`)});
    await carregarBases();const qtdVendas=vendas.filter(v=>v.empresaId===emp&&v.importacaoLoteId===lote).length,qtdClientes=Math.max(0,clientes.filter(x=>x.empresaId===emp&&x.importacaoLoteId===lote).length);
    await atualizarDocumento("importacoesVendas",logId,{status:"concluida",quantidadeVendas:qtdVendas,quantidadeClientesNovos:qtdClientes,valorTotal:docs.reduce((s,x)=>s+n(x.valor),0),concluidoEm:new Date().toISOString()});
    await carregarBases();renderHistorico();if(analise)render();emitirAlteracao("vendas");msg($("salesReportImportMsg"),`${docs.length} venda(s) importada(s) com sucesso. ID do lote: ${lote}`,true)
  }catch(e){
    console.error(e);
    if(logId){try{await carregarBases();const qv=vendas.filter(v=>v.empresaId===emp&&v.importacaoLoteId===lote).length,qc=clientes.filter(x=>x.empresaId===emp&&x.importacaoLoteId===lote).length;await atualizarDocumento("importacoesVendas",logId,{status:qv||qc?"parcial":"erro",quantidadeVendas:qv,quantidadeClientesNovos:qc,erro:String(e?.message||e).slice(0,500),finalizadoEm:new Date().toISOString()});await carregarBases();renderHistorico()}catch(logErr){console.error("Falha ao registrar log da importação",logErr)}}
    msg($("salesReportImportMsg"),(e?.message||"A importação não pôde ser concluída.")+(lote?` · Lote: ${lote}`:""))
  }finally{busy=false}
}
function tentar(){if(montar())setTimeout(async()=>{atualizarPermissao();try{if(empresaUnicaSelecionadaId()){await carregarBases();renderHistorico()}}catch{}},20);else atualizarPermissao()}
const obs=new MutationObserver(tentar);obs.observe(document.body,{childList:true,subtree:true});
window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="vendas")setTimeout(async()=>{montar();atualizarPermissao();try{await carregarBases();renderHistorico()}catch{}},120)});
window.addEventListener("sig:ready",tentar);
window.addEventListener("sig:data-changed",e=>{if(["vendas","rh"].includes(e.detail?.modulo)&&analise)setTimeout(async()=>{try{await carregarBases();render()}catch{}},120)});
tentar();
