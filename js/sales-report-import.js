import { $, esc, permite, admin, moeda, listarDocumentos, criarDocumento, atualizarDocumento, excluirDocumento, empresaUnicaSelecionadaId, nomeEmpresa, emitirAlteracao, state } from "./shared.js";
import { colaboradoresPorFuncao } from "./hr-role-registry.js?v=6";
import { normalizarChave, chaveImportacao, arredondarCentavos, executarEmLotes } from "./import-center.js";

const XLSX_CDNS=["./vendor/xlsx.full.min.js?v=1","https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js","https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js","https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js"];
const CAMPOS={
  clienteCodigo:["CDCLIENTE"],
  clienteNome:["NOMEPESSOA"],
  clienteCidade:["CIDADEPESSOA"],
  clienteUf:["UFPESSOA"],
  vendaCodigo:["CDVENDA"],
  lojaCodigo:["CDLOJA"],
  vendedorCodigo:["CDFUNCIONARIOVENDA"],
  vendedorNome:["NOMEFUNCIONARIO"],
  dataVenda:["DATAVENDA"],
  valorVenda:["VALORRECEITA","VALORVENDA"],
  vencimento:["VENCIMENTORECEITA"]
};
const OBRIGATORIOS=["clienteCodigo","clienteNome","vendaCodigo","vendedorCodigo","vendedorNome","dataVenda","valorVenda","vencimento"];

let arquivoAtual="",analise=null,vendedoresRh=[],configs=[],vendas=[],clientes=[],importacoes=[],snapshots=[],busy=false;
const pagina=()=>$("pagina-vendas");
const podeImportar=()=>admin()||permite("vendas","lancar");
const podeVendedores=()=>admin()||permite("vendas","vendedores");
const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};
const codigo=v=>String(v??"").trim().toUpperCase();
const chaveCodigo=v=>normalizarChave(codigo(v));
const loteId=()=>{const d=new Date(),p=v=>String(v).padStart(2,"0"),s=Math.random().toString(36).slice(2,6).toUpperCase();return `IMP-VND-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${s}`};
const statusImportacao=s=>({processando:"Processando",excluindo:"Excluindo...",concluida:"Concluída",parcial:"Parcial",erro:"Erro",exclusao_parcial:"Exclusão parcial",excluida:"Excluída"})[s]||s||"—";

const dataIso=v=>{
  const iso=(a,m,d)=>`${String(a).padStart(4,"0")}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  if(v instanceof Date&&!Number.isNaN(v.getTime()))return iso(v.getFullYear(),v.getMonth()+1,v.getDate());
  if(typeof v==="number"&&Number.isFinite(v)&&v>20000&&v<100000){
    const dt=new Date(Date.UTC(1899,11,30)+Math.floor(v)*86400000);
    return iso(dt.getUTCFullYear(),dt.getUTCMonth()+1,dt.getUTCDate())
  }
  const s=String(v??"").trim();
  if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);
  if(/^\d{4,5}(?:[.,]\d+)?$/.test(s)){
    const serial=Number(s.replace(",","."));
    if(Number.isFinite(serial)&&serial>20000&&serial<100000){
      const dt=new Date(Date.UTC(1899,11,30)+Math.floor(serial)*86400000);
      return iso(dt.getUTCFullYear(),dt.getUTCMonth()+1,dt.getUTCDate())
    }
  }
  const m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2}|\d{4})(?:\s+.*)?$/);
  if(m){let a=Number(m[3]);if(m[3].length===2)a+=a>=70?1900:2000;const d=Number(m[1]),mes=Number(m[2]);if(mes>=1&&mes<=12&&d>=1&&d<=31)return iso(a,mes,d)}
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
function msg(el,texto,sucesso=false){
  if(!el)return;
  el.textContent=String(texto??"");
  el.classList.toggle("sucesso",!!sucesso&&!!texto);
}
function css(){if($("sales-import-css"))return;const l=document.createElement("link");l.id="sales-import-css";l.rel="stylesheet";l.href="sales-import.css?v=4";document.head.appendChild(l)}
async function carregarXlsx(){
  if(globalThis.XLSX)return globalThis.XLSX;
  const antigo=document.querySelector('script[data-sig-xlsx]');
  if(antigo)antigo.remove();
  let ultimoErro=null;
  for(const src of XLSX_CDNS){
    try{
      await new Promise((resolve,reject)=>{
        const s=document.createElement("script");s.dataset.sigXlsx="1";s.dataset.estado="carregando";s.src=src;s.async=true;
        const timer=setTimeout(()=>{s.dataset.estado="erro";s.remove();reject(new Error("timeout-leitor-excel"))},12000);
        s.onload=()=>{clearTimeout(timer);s.dataset.estado="ok";resolve()};
        s.onerror=()=>{clearTimeout(timer);s.dataset.estado="erro";s.remove();reject(new Error("falha-cdn-leitor-excel"))};
        document.head.appendChild(s)
      });
      if(globalThis.XLSX)return globalThis.XLSX
    }catch(e){ultimoErro=e}
  }
  throw ultimoErro||new Error("biblioteca-xls-indisponivel")
}
function acharCabecalho(matriz){
  for(let i=0;i<Math.min(40,matriz.length);i++){
    const norm=(matriz[i]||[]).map(normalizarChave),indices={};
    Object.entries(CAMPOS).forEach(([k,aliases])=>{
      indices[k]=-1;
      for(const alias of aliases){const pos=norm.indexOf(alias);if(pos>=0){indices[k]=pos;break}}
    });
    if(OBRIGATORIOS.every(k=>indices[k]>=0))return{linha:i,indices}
  }
  return null
}
function consolidarPedidosRelatorio(linhas,erros){
  const mapa=new Map(),invalidos=new Set();
  linhas.forEach(r=>{
    const chave=`${codigo(r.lojaCodigo)||"SEMLOJA"}|${codigo(r.vendaCodigo)}`,z=mapa.get(chave);
    if(!z){
      mapa.set(chave,{...r,parcelas:[{linha:r.linha,vencimento:r.vencimento,valor:r.valor}]});return
    }
    const divergente=z.clienteCodigo!==r.clienteCodigo||z.vendedorCodigo!==r.vendedorCodigo||z.data!==r.data||z.lojaCodigo!==r.lojaCodigo;
    if(divergente){
      invalidos.add(chave);
      erros.push(`Pedido ${r.vendaCodigo}: cliente, vendedor, loja ou data divergente entre as parcelas.`);
      return
    }
    z.parcelas.push({linha:r.linha,vencimento:r.vencimento,valor:r.valor})
  });
  const pedidos=[];
  mapa.forEach((z,chave)=>{
    if(invalidos.has(chave))return;
    z.parcelas.sort((a,b)=>String(a.vencimento).localeCompare(String(b.vencimento))||a.linha-b.linha);
    z.parcelas=z.parcelas.map((p,i)=>({id:`P${String(i+1).padStart(3,"0")}`,ordem:i+1,vencimento:p.vencimento,valor:arredondarCentavos(p.valor)}));
    z.valor=arredondarCentavos(z.parcelas.reduce((s,p)=>s+p.valor,0));
    z.quantidadeParcelas=z.parcelas.length;
    delete z.vencimento;
    pedidos.push(z)
  });
  pedidos.sort((a,b)=>String(a.data).localeCompare(String(b.data))||String(a.vendaCodigo).localeCompare(String(b.vendaCodigo)));
  return pedidos
}
export function parseMatrizRelatorioVendas(matriz){
  const cab=acharCabecalho(matriz);if(!cab)throw new Error("cabecalho-nao-reconhecido");
  const linhasBrutas=[],erros=[];
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
      vencimento:dataIso(get("vencimento")),
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
    if(!row.vencimento)faltas.push("vencimento da parcela");
    if(!(row.valor>0))faltas.push("valor da parcela");
    row.erro=faltas.length?`Linha ${row.linha}: ${faltas.join(", ")} inválido(s).`:"";
    if(row.erro)erros.push(row.erro);else linhasBrutas.push(row)
  }
  const linhas=consolidarPedidosRelatorio(linhasBrutas,erros);
  return{linhas,erros,total:arredondarCentavos(linhas.reduce((s,x)=>s+x.valor,0)),quantidadeParcelas:linhas.reduce((s,x)=>s+x.parcelas.length,0)}
}
function parseTextoDelimitado(texto,separador="|"){
  const matriz=[];let linha=[],celula="",aspas=false;
  const fecharLinha=()=>{linha.push(celula);celula="";if(linha.some(v=>String(v??"").trim()!==""))matriz.push(linha);linha=[]};
  for(let i=0;i<texto.length;i++){
    const ch=texto[i];
    if(aspas){
      if(ch==='"'&&texto[i+1]==='"'){celula+='"';i++;continue}
      if(ch==='"'){aspas=false;continue}
      celula+=ch;continue
    }
    if(ch==='"'){aspas=true;continue}
    if(ch===separador){linha.push(celula);celula="";continue}
    if(ch==="\n"){fecharLinha();continue}
    if(ch==="\r"){if(texto[i+1]!=="\n")fecharLinha();continue}
    celula+=ch
  }
  if(celula!==""||linha.length)fecharLinha();
  if(matriz[0]?.length)matriz[0][0]=String(matriz[0][0]).replace(/^\uFEFF/,"");
  return matriz
}
async function lerCsvPipe(file){
  const buf=await file.arrayBuffer();let texto="";
  try{texto=new TextDecoder("utf-8",{fatal:true}).decode(buf)}catch{texto=new TextDecoder("windows-1252").decode(buf)}
  texto=texto.replace(/^\uFEFF/,"");
  if(!texto.includes("|"))throw new Error("csv-separador-invalido");
  const matriz=parseTextoDelimitado(texto,"|");
  return{...parseMatrizRelatorioVendas(matriz),aba:"CSV |"}
}
async function lerPlanilha(file){
  const nomeArquivo=String(file?.name||"").toLowerCase(),tipoArquivo=String(file?.type||"").toLowerCase();
  if(nomeArquivo.endsWith(".csv")||tipoArquivo.includes("csv")||tipoArquivo.startsWith("text/"))return lerCsvPipe(file);
  const XLSX=await carregarXlsx(),buf=await file.arrayBuffer(),wb=XLSX.read(buf,{type:"array",cellDates:true});
  let ultimoErro=null;
  for(const nome of wb.SheetNames){
    const matriz=XLSX.utils.sheet_to_json(wb.Sheets[nome],{header:1,defval:"",raw:true});
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
function vendaPorPedido(r,emp){
  const pedido=codigo(r.vendaCodigo),loja=codigo(r.lojaCodigo),candidatas=vendas.filter(v=>v.empresaId===emp&&codigo(v.documento)===pedido);
  if(!candidatas.length)return null;
  if(loja){const porLoja=candidatas.find(v=>codigo(v.lojaOrigem)===loja);if(porLoja)return porLoja}
  if(candidatas.length===1)return candidatas[0];
  return{__ambigua:true,candidatas}
}
function vendaImportada(v){return !!v&&(v.origemImportacao==="relatorio_vendas"||String(v.importacaoLoteId||"").startsWith("IMP-VND-"))}
function parcelasAntigas(v){
  if(Array.isArray(v?.parcelas)&&v.parcelas.length)return v.parcelas.map((p,i)=>({
    id:p.id||`P${String(i+1).padStart(3,"0")}`,ordem:n(p.ordem)||i+1,vencimento:String(p.vencimento||""),valor:arredondarCentavos(n(p.valor)),
    valorRecebido:arredondarCentavos(n(p.valorRecebido)),dataUltimoRecebimento:p.dataUltimoRecebimento||null
  }));
  return[]
}
function estruturaParcelasMudou(r,v){
  const antigas=parcelasAntigas(v);
  if(!antigas.length)return true;
  if(antigas.length!==r.parcelas.length)return true;
  return r.parcelas.some((p,i)=>{
    const a=antigas[i];
    return !a||a.id!==p.id||a.vencimento!==p.vencimento||Math.abs(n(a.valor)-n(p.valor))>0.009
  })
}
function conflitoFinanceiroParcelas(r,v){
  const antigas=parcelasAntigas(v);
  if(!antigas.length)return n(v?.valorRecebido)>n(r.valor)+0.009;
  const novas=new Map(r.parcelas.map(p=>[p.id,p]));
  return antigas.some(a=>{
    if(n(a.valorRecebido)<=0)return false;
    const nova=novas.get(a.id);
    return !nova||n(a.valorRecebido)>n(nova.valor)+0.009
  })
}
function linhaMudou(r,v,rh,cfg,cl){
  if(!v)return true;
  return String(v.data||"")!==r.data||
    Math.abs(n(v.valor)-n(r.valor))>0.009||
    estruturaParcelasMudou(r,v)||
    chaveCodigo(v.vendedorCodigo||"")!==chaveCodigo(r.vendedorCodigo)||
    String(v.vendedorRhId||"")!==String(rh?.id||"")||
    chaveCodigo(v.clienteCodigo||"")!==chaveCodigo(r.clienteCodigo)||
    String(v.clienteId||"")!==String(cl?.id||"")||
    codigo(v.lojaOrigem||"")!==codigo(r.lojaCodigo||"")||
    String(v.vendedorId||"")!==String(cfg?.id||"")
}
function classificarLinha(r,emp){
  const existente=vendaPorPedido(r,emp),rh=rhPorCodigo(r.vendedorCodigo),cfg=rh?cfgPorRh(rh.id):null,cl=clientePorCodigo(r.clienteCodigo,emp);
  if(!existente)return{tipo:"nova",existente,rh,cfg,cl};
  if(existente.__ambigua)return{tipo:"conflito",motivo:"Pedido encontrado mais de uma vez na base; revise a origem antes de importar",existente:null,rh,cfg,cl};
  if(!vendaImportada(existente))return{tipo:"conflito",motivo:"Pedido já existe fora do importador",existente,rh,cfg,cl};
  if(conflitoFinanceiroParcelas(r,existente))return{tipo:"conflito",motivo:"Nova estrutura de parcelas conflita com recebimentos já baixados",existente,rh,cfg,cl};
  return{tipo:linhaMudou(r,existente,rh,cfg,cl)?"atualizar":"igual",existente,rh,cfg,cl}
}
function montar(){
  const p=pagina();if(!p||$("salesReportImportBox"))return false;css();
  const acoes=p.querySelector(".pagina-cabecalho .acoes-cabecalho"),btn=document.createElement("button");btn.id="btnSalesReportImport";btn.className="btn-secundario";btn.type="button";btn.textContent="Importar vendas";acoes?.insertBefore(btn,$("btnSalesVenda")||null);
  const box=document.createElement("section");box.id="salesReportImportBox";box.className="form-card hidden sales-import-box";box.innerHTML=`
    <div class="form-card-titulo"><div><h3>Importar relatório de vendas</h3><p>Compatível com Excel (.xls/.xlsx) e CSV separado por |. Cada linha representa uma parcela do pedido, com VALOR_RECEITA e VENCIMENTO_RECEITA. O SIG consolida as parcelas em uma única venda e preserva os vencimentos para a Inadimplência.</p></div><button id="btnSalesReportImportFechar" class="btn-secundario" type="button">Fechar</button></div>
    <div class="sales-import-grid"><div class="campo"><label for="salesReportArquivo">Arquivo Excel</label><input id="salesReportArquivo" type="file" accept=".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"><small>O arquivo é lido no navegador; CSV separado por | é processado diretamente e o arquivo bruto não é gravado no Firebase.</small></div><div class="campo campo-span-2"><label>Estrutura reconhecida</label><div class="sales-import-schema"><strong>Venda:</strong> DATA_VENDA · CD_VENDA · VALOR_RECEITA · VENCIMENTO_RECEITA<br><strong>Cliente:</strong> CD_CLIENTE · NOME_PESSOA · CIDADE_PESSOA · UF_PESSOA<br><strong>Vendedor:</strong> CD_FUNCIONARIOVENDA · NOME_FUNCIONARIO</div></div></div>
    <div class="form-acoes"><button id="btnSalesReportImportLimpar" class="btn-secundario" type="button">Limpar</button><button id="btnSalesReportImportAnalisar" class="btn-primario" type="button">Analisar arquivo</button></div>
    <p id="salesReportImportMsg" class="mensagem-form"></p>
    <div id="salesReportImportResultado" class="hidden">
      <div id="salesReportImportResumo" class="sales-import-resumo"></div>
      <section class="lista-card sales-import-sub"><div class="lista-cabecalho"><div><h3>Vendedores do relatório</h3><p>O vínculo é automático pelo código comercial salvo no cadastro do colaborador no RH.</p></div></div><div class="tabela-container"><table class="tabela"><thead><tr><th>Código</th><th>Nome no relatório</th><th>Colaborador RH</th><th>Vínculo de vendedor</th><th>Linhas</th></tr></thead><tbody id="salesReportVendedores"></tbody></table></div></section>
      <section class="lista-card sales-import-sub"><div class="lista-cabecalho"><div><h3>Prévia</h3><p id="salesReportPreviewInfo">—</p></div></div><div class="tabela-container"><table class="tabela"><thead><tr><th>Data</th><th>Venda</th><th>Cliente</th><th>Vendedor</th><th>Parcelas</th><th>Valor total</th><th>Situação</th></tr></thead><tbody id="salesReportPreview"></tbody></table></div></section>
      <div class="sales-import-footer"><div><strong>Importação por código</strong><small>Cada importação recebe um ID rastreável. Cliente existente usa a base do SIG; cliente novo é criado automaticamente. Pedido já existente é atualizado quando houver alteração de dados ou da estrutura de parcelas.</small></div><button id="btnSalesReportImportConfirmar" class="btn-primario" type="button">Importar vendas válidas</button></div>
    </div>
    <section class="lista-card sales-import-history">
      <div class="lista-cabecalho"><div><h3>Histórico de importações</h3><p>Controle por lote. A exclusão em lote remove fisicamente os registros importados incorretamente e mantém somente o log mínimo da operação.</p></div><button id="btnSalesReportHistoricoAtualizar" class="btn-secundario" type="button">Atualizar histórico</button></div>
      <div class="tabela-container sales-import-history-scroll"><table class="tabela"><thead><tr><th>ID da importação</th><th>Data / arquivo</th><th>Vendas</th><th>Clientes novos</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead><tbody id="salesReportHistorico"></tbody></table></div>
    </section>`;
  $("salesAviso")?.insertAdjacentElement("afterend",box);
  btn.onclick=abrir;$("btnSalesReportImportFechar").onclick=fechar;$("btnSalesReportImportLimpar").onclick=limpar;$("btnSalesReportImportAnalisar").onclick=analisar;$("btnSalesReportImportConfirmar").onclick=confirmar;$("btnSalesReportHistoricoAtualizar").onclick=async()=>{await carregarBases();renderHistorico()};$("salesReportArquivo").addEventListener("change",e=>{const file=e.target.files?.[0];analise=null;$("salesReportImportResultado")?.classList.add("hidden");msg($("salesReportImportMsg"),file?`Arquivo selecionado: ${file.name}. Clique em Analisar arquivo.`:"")});
  atualizarPermissao();return true
}
function atualizarPermissao(){const b=$("btnSalesReportImport");if(b)b.classList.toggle("hidden",!podeImportar())}
function abrir(){if(!podeImportar())return alert("Seu perfil não pode importar vendas.");if(!empresaUnicaSelecionadaId())return alert("Selecione uma única empresa no cabeçalho.");$("salesReportImportBox")?.classList.remove("hidden");$("salesReportImportBox")?.scrollIntoView({behavior:"smooth",block:"start"})}
function fechar(){$("salesReportImportBox")?.classList.add("hidden")}
function limpar(){analise=null;arquivoAtual="";const f=$("salesReportArquivo");if(f)f.value="";$("salesReportImportResultado")?.classList.add("hidden");msg($("salesReportImportMsg"),"")}
async function carregarBases(){
  const [rh,cfg,vs,cl,imps,snaps]=await Promise.all([colaboradoresPorFuncao("VENDEDOR"),listarDocumentos("vendedores"),listarDocumentos("vendas"),listarDocumentos("clientesComerciais"),listarDocumentos("importacoesVendas"),listarDocumentos("importacoesVendasAlteracoes")]);
  vendedoresRh=rh;configs=cfg;vendas=vs;clientes=cl;importacoes=imps;snapshots=snaps
}
function renderHistorico(){
  const tb=$("salesReportHistorico");if(!tb)return;const emp=empresaUnicaSelecionadaId();
  const arr=importacoes.filter(x=>x.empresaId===emp).sort((a,b)=>String(b.iniciadoEm||b.criadoEm||"").localeCompare(String(a.iniciadoEm||a.criadoEm||"")));
  tb.innerHTML=arr.length?arr.map(x=>{
    const feitos=n(x.quantidadeVendasNovas)+n(x.quantidadeVendasAtualizadas),prev=n(x.quantidadePrevista),podeFinalizar=x.status==="parcial"&&prev>0&&feitos>=prev;
    const acao=podeImportar()&&["processando","excluindo","concluida","parcial","exclusao_parcial"].includes(x.status)
      ?`<div class="acoes-tabela">${podeFinalizar?`<button type="button" class="btn-acao" data-sales-import-finalizar="${esc(x.id)}">Finalizar lote</button>`:""}<button type="button" class="btn-acao perigo" data-sales-import-excluir="${esc(x.id)}">${["processando","excluindo"].includes(x.status)?"Cancelar / reverter":"Excluir lote"}</button></div>`
      :"—";
    return `<tr class="${x.status==="excluida"?"sales-import-dup":""}"><td><strong>${esc(x.loteId||x.id)}</strong><small>${esc(x.origem||"relatorio_vendas")}</small></td><td>${x.iniciadoEm?new Date(x.iniciadoEm).toLocaleString("pt-BR"):"—"}<small>${esc(x.arquivo||"—")}${Array.isArray(x.lojasOrigem)&&x.lojasOrigem.length?` · Loja(s) ${esc(x.lojasOrigem.join(", "))}`:""}</small></td><td>${n(x.quantidadeVendas||x.quantidadePrevista)}<small>${n(x.quantidadeVendasNovas)} nova(s) · ${n(x.quantidadeVendasAtualizadas)} atualizada(s)</small></td><td>${n(x.quantidadeClientesNovos)}</td><td>${moeda(n(x.valorTotal||x.valorPrevisto))}</td><td><span class="${x.status==="concluida"?"status-ativo":"status-inativo"}">${esc(statusImportacao(x.status))}</span>${x.erro?`<small title="${esc(x.erro)}">Erro: ${esc(String(x.erro).slice(0,90))}</small>`:""}${x.excluidoEm?`<small>${new Date(x.excluidoEm).toLocaleString("pt-BR")}</small>`:""}</td><td>${acao}</td></tr>`
  }).join(""):'<tr><td colspan="7">Nenhuma importação registrada para a empresa selecionada.</td></tr>';
  document.querySelectorAll("[data-sales-import-excluir]").forEach(b=>b.onclick=()=>excluirLote(b.dataset.salesImportExcluir));
  document.querySelectorAll("[data-sales-import-finalizar]").forEach(b=>b.onclick=()=>finalizarLoteParcial(b.dataset.salesImportFinalizar))
}
async function finalizarLoteParcial(id){
  if(!podeImportar())return;
  const imp=importacoes.find(x=>x.id===id);if(!imp||imp.status!=="parcial")return;
  const feitos=n(imp.quantidadeVendasNovas)+n(imp.quantidadeVendasAtualizadas),prev=n(imp.quantidadePrevista);
  if(!prev||feitos<prev)return alert("Este lote ainda não processou todas as vendas previstas e não pode ser finalizado.");
  if(!confirm(`Finalizar o lote ${imp.loteId||imp.id} como concluído?\n\n${feitos} de ${prev} venda(s) previstas já foram processadas.`))return;
  try{
    await atualizarDocumento("importacoesVendas",id,{status:"concluida",quantidadeVendas:feitos,valorTotal:n(imp.valorPrevisto),concluidoEm:new Date().toISOString(),erro:""});
    imp.status="concluida";imp.quantidadeVendas=feitos;imp.valorTotal=n(imp.valorPrevisto);imp.erro="";renderHistorico();
    msg($("salesReportImportMsg"),`Lote ${imp.loteId||imp.id} reconciliado e finalizado.`,true)
  }catch(e){console.error(e);alert("Não foi possível finalizar o lote. Confira as Firestore Rules publicadas.")}
}
async function excluirLote(id){
  if(!podeImportar())return alert("Seu perfil não possui permissão para cancelar ou reverter importações de vendas.");
  const imp=importacoes.find(x=>x.id===id);if(!imp||!["processando","excluindo","concluida","parcial","exclusao_parcial"].includes(imp.status))return;
  const lote=imp.loteId||imp.id,novas=vendas.filter(v=>v.empresaId===imp.empresaId&&v.importacaoLoteId===lote),snaps=snapshots.filter(s=>s.empresaId===imp.empresaId&&s.loteId===lote);
  const novasComBaixa=novas.filter(v=>n(v.valorRecebido)>0||(Array.isArray(v.recebimentoChaves)&&v.recebimentoChaves.length));
  const atualizadasComBaixa=snaps.filter(s=>{const atual=vendas.find(v=>v.id===s.vendaId),antes=n(s.antes?.valorRecebido);return atual&&n(atual.valorRecebido)>antes+0.009});
  if(novasComBaixa.length||atualizadasComBaixa.length)return alert(`Este lote não pode ser excluído porque ${novasComBaixa.length+atualizadasComBaixa.length} pedido(s) já possuem recebimentos posteriores vinculados às parcelas.`);
  const motivo=prompt(`${["processando","excluindo"].includes(imp.status)?"Cancelar/reverter":"Excluir fisicamente"} a importação ${lote}?\n\n${novas.length} venda(s) criada(s) serão apagadas e ${snaps.length} venda(s) atualizada(s) serão restauradas ao estado anterior. Informe o motivo:`);
  if(motivo===null)return;if(!motivo.trim())return alert("Informe o motivo da exclusão.");
  if(!confirm(`ATENÇÃO: confirmar reversão do lote ${lote}?\n\nNovos registros serão apagados. Pedidos que já existiam antes do lote serão restaurados. O log mínimo do lote será preservado para rastreabilidade.`))return;
  busy=true;let vendasExcluidas=0,vendasRestauradas=0,clientesExcluidos=0,configsExcluidas=0,snapshotsExcluidos=0;
  try{
    const agora=new Date().toISOString(),uid=state.usuario?.id||"";
    await atualizarDocumento("importacoesVendas",id,{status:"excluindo"});imp.status="excluindo";renderHistorico();
    msg($("salesReportImportMsg"),`Revertendo lote ${lote}...`);
    await executarEmLotes(snaps,async s=>{
      const atual=vendas.find(v=>v.id===s.vendaId);if(atual&&s.antes){await atualizarDocumento("vendas",s.vendaId,{...s.antes,ultimaImportacaoLoteId:s.antes.ultimaImportacaoLoteId||"",ultimaImportacaoEm:s.antes.ultimaImportacaoEm||""});vendasRestauradas++}
    },{tamanho:20,onProgress:(feito,total)=>msg($("salesReportImportMsg"),`Lote ${lote} · restaurando ${feito} de ${total} venda(s)...`)});
    await executarEmLotes(novas,async v=>{await excluirDocumento("vendas",v.id);vendasExcluidas++},{tamanho:25,onProgress:(feito,total)=>msg($("salesReportImportMsg"),`Lote ${lote} · excluindo ${feito} de ${total} venda(s)...`)});
    const vendasDepois=await listarDocumentos("vendas");
    const clientesLote=clientes.filter(x=>x.empresaId===imp.empresaId&&x.importacaoLoteId===lote);
    for(const cliente of clientesLote){if(!vendasDepois.some(v=>v.clienteId===cliente.id)){await excluirDocumento("clientesComerciais",cliente.id);clientesExcluidos++}}
    const configsLote=configs.filter(x=>x.empresaId===imp.empresaId&&x.importacaoLoteId===lote&&x.configuracaoPendente===true);
    for(const cfg of configsLote){if(!vendasDepois.some(v=>v.vendedorId===cfg.id)){await excluirDocumento("vendedores",cfg.id);configsExcluidas++}}
    for(const s of snaps){await excluirDocumento("importacoesVendasAlteracoes",s.id);snapshotsExcluidos++}
    await atualizarDocumento("importacoesVendas",id,{status:"excluida",excluidoEm:agora,excluidoPor:uid,exclusaoMotivo:motivo.trim(),quantidadeVendasExcluidas:vendasExcluidas,quantidadeVendasRestauradas:vendasRestauradas,quantidadeClientesExcluidos:clientesExcluidos,quantidadeConfigsExcluidas:configsExcluidas,quantidadeSnapshotsExcluidos:snapshotsExcluidos});
    await carregarBases();renderHistorico();if(analise)render();emitirAlteracao("vendas");msg($("salesReportImportMsg"),`Lote ${lote} revertido: ${vendasExcluidas} nova(s) apagada(s) e ${vendasRestauradas} venda(s) restaurada(s).`,true)
  }catch(e){
    console.error("Exclusão de importação:",e);
    try{await atualizarDocumento("importacoesVendas",id,{status:"exclusao_parcial",erroExclusao:String(e?.message||e).slice(0,500),quantidadeVendasExcluidas:vendasExcluidas,quantidadeVendasRestauradas:vendasRestauradas,quantidadeClientesExcluidos:clientesExcluidos,quantidadeConfigsExcluidas:configsExcluidas})}catch{}
    msg($("salesReportImportMsg"),"A exclusão/reversão do lote foi interrompida. Execute novamente para concluir e confira as Rules publicadas.")
  }finally{busy=false}
}

function consolidarVendedores(){
  const mapa=new Map();
  analise.linhas.forEach(r=>{const k=chaveCodigo(r.vendedorCodigo),z=mapa.get(k)||{codigo:r.vendedorCodigo,nome:r.vendedorNome,qtd:0,rh:null,cfg:null};z.qtd++;mapa.set(k,z)});
  const arr=[...mapa.values()];arr.forEach(x=>{x.rh=rhPorCodigo(x.codigo);x.cfg=x.rh?cfgPorRh(x.rh.id):null});return arr
}
function render(){
  if(!analise)return;const emp=empresaUnicaSelecionadaId(),vend=consolidarVendedores(),novosClientes=new Set(analise.linhas.filter(r=>!clientePorCodigo(r.clienteCodigo,emp)).map(r=>chaveCodigo(r.clienteCodigo))),semRh=vend.filter(x=>!x.rh).length,semCfg=vend.filter(x=>x.rh&&!x.cfg).length;
  const classes=analise.linhas.map(r=>({r,...classificarLinha(r,emp)})),novas=classes.filter(x=>x.tipo==="nova").length,atualizar=classes.filter(x=>x.tipo==="atualizar").length,iguais=classes.filter(x=>x.tipo==="igual").length,conflitos=classes.filter(x=>x.tipo==="conflito").length;
  $("salesReportImportResumo").innerHTML=`<div><span>Pedidos / parcelas</span><strong>${analise.linhas.length} / ${analise.quantidadeParcelas||0}</strong><small>${analise.erros.length} aviso(s) ignorado(s)</small></div><div><span>Valor total vendido</span><strong>${moeda(analise.total)}</strong><small>Aba: ${esc(analise.aba||"—")}</small></div><div><span>Novas / atualizações</span><strong>${novas} / ${atualizar}</strong><small>${iguais} já idêntica(s) · ${conflitos} conflito(s)</small></div><div><span>Clientes novos</span><strong>${novosClientes.size}</strong><small>Cadastro automático por CD_CLIENTE</small></div><div><span>Vendedores</span><strong>${vend.length}</strong><small>${semRh} sem vínculo RH · ${semCfg} sem vínculo técnico</small></div>`;
  $("salesReportVendedores").innerHTML=vend.map(x=>`<tr><td><strong>${esc(x.codigo)}</strong></td><td>${esc(x.nome||"—")}</td><td>${x.rh?`<strong>${esc(x.rh.nome)}</strong><small>${esc(x.rh.cargoNome||"")}</small>`:'<span class="status-inativo">Código não vinculado no RH</span>'}</td><td>${x.cfg?'<span class="status-ativo">Vinculado</span>':x.rh?'<span class="status-pendente">Vínculo técnico será criado na importação</span>':'<span class="status-inativo">Código não vinculado no RH</span>'}</td><td>${x.qtd}</td></tr>`).join("");
  const preview=classes.slice(0,120);$("salesReportPreviewInfo").textContent=`${analise.linhas.length} pedido(s) · ${analise.quantidadeParcelas||0} parcela(s) · ${novas} nova(s) · ${atualizar} atualização(ões) · ${iguais} sem alteração · ${conflitos} conflito(s). Exibindo ${preview.length}.`;
  $("salesReportPreview").innerHTML=preview.map(x=>{const r=x.r,rh=x.rh,cl=x.cl,tipo=x.tipo,label=tipo==="nova"?"Nova":tipo==="atualizar"?"Atualizar":tipo==="igual"?"Já atualizada":"Conflito",klass=tipo==="conflito"?"status-inativo":"status-ativo",primeira=r.parcelas?.[0]?.vencimento||"",ultima=r.parcelas?.[r.parcelas.length-1]?.vencimento||"";return`<tr class="${tipo==="igual"?"sales-import-dup":""}"><td>${esc(r.data.split("-").reverse().join("/"))}</td><td><strong>${esc(r.vendaCodigo)}</strong><small>${r.lojaCodigo?"Loja "+esc(r.lojaCodigo):""}</small></td><td><strong>${esc(cl?.nome||r.clienteNome)}</strong><small>Cód. ${esc(r.clienteCodigo)}${cl?" · cadastrado":" · será cadastrado"}</small></td><td><strong>${esc(rh?.nome||r.vendedorNome)}</strong><small>Cód. ${esc(r.vendedorCodigo)}</small></td><td><strong>${r.quantidadeParcelas}</strong><small>${primeira?primeira.split("-").reverse().join("/"):"—"}${ultima&&ultima!==primeira?" → "+ultima.split("-").reverse().join("/"):""}</small></td><td>${moeda(r.valor)}</td><td><span class="${klass}">${label}</span>${x.motivo?`<small>${esc(x.motivo)}</small>`:""}</td></tr>`}).join("");
  $("salesReportImportResultado")?.classList.remove("hidden");renderHistorico()
}
async function analisar(){
  if(busy)return;const emp=empresaUnicaSelecionadaId(),file=$("salesReportArquivo")?.files?.[0],btn=$("btnSalesReportImportAnalisar");if(!emp)return msg($("salesReportImportMsg"),"Selecione uma única empresa.");if(!file)return msg($("salesReportImportMsg"),"Selecione o relatório de vendas.");
  busy=true;if(btn){btn.disabled=true;btn.textContent="Analisando..."}
  try{
    msg($("salesReportImportMsg"),String(file.name||"").toLowerCase().endsWith(".csv")?"Lendo CSV separado por |...":"Carregando leitor do Excel...");
    arquivoAtual=file.name;analise=await lerPlanilha(file);
    if(!analise.linhas.length)throw new Error(analise.erros?.slice(0,3).join(" | ")||"sem-vendas-validas");
    msg($("salesReportImportMsg"),"Relatório lido. Consolidando pedidos, parcelas, clientes e vendedores...");
    await carregarBases();render();msg($("salesReportImportMsg"),`Relatório reconhecido: ${analise.linhas.length} pedido(s) e ${analise.quantidadeParcelas||0} parcela(s).`,true)
  }catch(e){
    console.error("Importação de vendas:",e);analise=null;$("salesReportImportResultado")?.classList.add("hidden");
    const cod=String(e?.message||e||"");
    const texto=cod==="csv-separador-invalido"?"O CSV precisa estar separado por | (barra vertical).":/biblioteca|cdn|timeout|leitor-excel/i.test(cod)?"Não consegui carregar o leitor de Excel pelos servidores disponíveis. Atualize a página e tente novamente.":cod==="cabecalho-nao-reconhecido"?"Não encontrei o cabeçalho esperado. Preciso de CD_CLIENTE, NOME_PESSOA, CD_VENDA, CD_FUNCIONARIOVENDA, NOME_FUNCIONARIO, DATA_VENDA, VALOR_RECEITA e VENCIMENTO_RECEITA.":"Não consegui analisar este arquivo. Detalhe técnico: "+cod;
    msg($("salesReportImportMsg"),texto)
  }finally{busy=false;if(btn){btn.disabled=false;btn.textContent="Analisar arquivo"}}
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
async function garantirConfigs(emp,linhas,lote){
  const mapa=new Map();
  const codigos=[...new Set(linhas.map(r=>chaveCodigo(r.vendedorCodigo)))];
  for(const k of codigos){
    const rh=vendedoresRh.find(x=>chaveCodigo(x.codigoVendedor)===k);if(!rh)throw new Error(`Código de vendedor ${linhas.find(r=>chaveCodigo(r.vendedorCodigo)===k)?.vendedorCodigo||k} não está vinculado a um colaborador vendedor no RH.`);
    let cfg=cfgPorRh(rh.id);
    if(!cfg){
      const id=await criarDocumento("vendedores",{empresaId:emp,rhColaboradorId:rh.id,nome:rh.nome||"",email:rh.email||"",cargoNome:rh.cargoNome||"",codigoVendedor:rh.codigoVendedor||"",tipoComissao:"vendedor",metaMensal:0,comissaoPct:0,baseComissao:"recebido",status:"ativo",configuracaoPendente:true,origem:"importacao_relatorio_vendas",importacaoLoteId:lote});
      cfg={id,empresaId:emp,rhColaboradorId:rh.id,nome:rh.nome||"",codigoVendedor:rh.codigoVendedor||"",tipoComissao:"vendedor",metaMensal:0,comissaoPct:0,baseComissao:"recebido",status:"ativo",configuracaoPendente:true,origem:"importacao_relatorio_vendas",importacaoLoteId:lote};configs.push(cfg)
    }
    mapa.set(k,{rh,cfg})
  }
  return mapa
}
function snapshotVenda(v){
  const campos=["data","dataRecebimento","valorRecebido","vendedorId","vendedorRhId","vendedorNome","vendedorCodigo","vendedorNomeOrigem","clienteId","clienteCodigo","cliente","clienteNomeOrigem","documento","lojaOrigem","descricao","itens","valor","parcelas","parcelasVersao","baseComissao","comissaoPct","comissaoBaseValor","comissaoValor","comissaoStatus","status","observacao","origemImportacao","arquivoImportacao","importacaoLoteId","importacaoChave","ultimaImportacaoLoteId","ultimaImportacaoEm"];
  const antes={};campos.forEach(k=>{if(Object.prototype.hasOwnProperty.call(v,k))antes[k]=v[k]});return antes
}
async function registrarSnapshot(lote,emp,v){
  const existente=snapshots.find(s=>s.empresaId===emp&&s.loteId===lote&&s.vendaId===v.id);if(existente)return existente.id;
  const id=await criarDocumento("importacoesVendasAlteracoes",{empresaId:emp,loteId:lote,vendaId:v.id,pedido:v.documento||"",antes:snapshotVenda(v),registradoEm:new Date().toISOString()});
  snapshots.push({id,empresaId:emp,loteId:lote,vendaId:v.id,pedido:v.documento||"",antes:snapshotVenda(v)});return id
}
function parcelasParaVenda(r,existente=null){
  const antigas=parcelasAntigas(existente),mapa=new Map(antigas.map(p=>[p.id,p]));
  let legado=antigas.length?0:arredondarCentavos(n(existente?.valorRecebido));
  return r.parcelas.map((p,i)=>{
    const anterior=mapa.get(p.id);
    let valorRec=anterior?arredondarCentavos(n(anterior.valorRecebido)):0;
    let dataUltimo=anterior?.dataUltimoRecebimento||null;
    if(!antigas.length&&legado>0){
      valorRec=arredondarCentavos(Math.min(n(p.valor),legado));legado=arredondarCentavos(legado-valorRec);
      if(valorRec>0)dataUltimo=existente?.dataRecebimento||null
    }
    if(valorRec>n(p.valor)+0.009)throw new Error(`parcela-${p.id}-recebida-acima-do-valor`);
    return{id:p.id,ordem:i+1,vencimento:p.vencimento,valor:arredondarCentavos(n(p.valor)),valorRecebido:valorRec,dataUltimoRecebimento:dataUltimo}
  })
}
function dadosVendaImportada(r,cl,v,lote,existente=null){
  const pct=n(v.cfg.comissaoPct),parcelas=parcelasParaVenda(r,existente),valorRec=arredondarCentavos(parcelas.reduce((s,p)=>s+n(p.valorRecebido),0));
  const datas=parcelas.map(p=>p.dataUltimoRecebimento).filter(Boolean).sort(),dataRec=datas.length?datas[datas.length-1]:(existente?.dataRecebimento||null);
  const comStatus=valorRec>0?(existente?.comissaoStatus||"provisionada"):"aguardando_recebimento";
  return{data:r.data,dataRecebimento:dataRec,valorRecebido:valorRec,vendedorId:v.cfg.id,vendedorRhId:v.rh.id,vendedorNome:v.rh.nome||r.vendedorNome,vendedorCodigo:r.vendedorCodigo,vendedorNomeOrigem:r.vendedorNome,clienteId:cl.id,clienteCodigo:cl.codigo,cliente:cl.nome||r.clienteNome,clienteNomeOrigem:r.clienteNome,documento:r.vendaCodigo,lojaOrigem:r.lojaCodigo||"",descricao:"Venda importada de relatório · parcelas por vencimento",itens:Array.isArray(existente?.itens)?existente.itens:[],valor:r.valor,parcelas,parcelasVersao:1,baseComissao:"recebido",comissaoPct:pct,comissaoBaseValor:valorRec,comissaoValor:valorRec*pct/100,comissaoStatus:comStatus,status:existente?.status==="cancelada"?"cancelada":"confirmada",observacao:existente?.observacao||"",origemImportacao:"relatorio_vendas",arquivoImportacao:arquivoAtual,importacaoChave:chaveVenda(r,empresaUnicaSelecionadaId()),ultimaImportacaoLoteId:lote,ultimaImportacaoEm:new Date().toISOString()}
}

async function confirmar(){
  if(busy||!analise||!podeImportar())return;const emp=empresaUnicaSelecionadaId();if(!emp)return alert("Selecione uma única empresa.");
  const classes=analise.linhas.map(r=>({r,...classificarLinha(r,emp)})),operacoes=classes.filter(x=>x.tipo==="nova"||x.tipo==="atualizar"),conflitos=classes.filter(x=>x.tipo==="conflito");
  if(!operacoes.length)return alert(conflitos.length?"Não há vendas prontas para importar. Revise os conflitos apresentados.":"O relatório já está totalmente atualizado no SIG.");
  const lojas=[...new Set(operacoes.map(x=>x.r.lojaCodigo).filter(Boolean))],novas=operacoes.filter(x=>x.tipo==="nova").length,atualizacoes=operacoes.filter(x=>x.tipo==="atualizar").length,qtdParcelas=operacoes.reduce((s,x)=>s+(x.r.parcelas?.length||0),0);
  if(!confirm(`Processar ${operacoes.length} pedido(s) / ${qtdParcelas} parcela(s) para ${nomeEmpresa(emp)}?\n\n${novas} novo(s) · ${atualizacoes} atualização(ões) · ${conflitos.length} conflito(s) ignorado(s).\nLoja(s): ${lojas.length?lojas.join(", "):"não identificada"}.\n\nCada pedido será gravado uma única vez com sua grade de vencimentos. Recebimentos existentes serão preservados.`))return;
  busy=true;let logId="",lote="",criadas=0,atualizadas=0;
  try{
    lote=loteId();
    logId=await criarDocumento("importacoesVendas",{empresaId:emp,loteId:lote,origem:"relatorio_vendas",arquivo:arquivoAtual||"arquivo_excel",aba:analise.aba||"",lojasOrigem:lojas,status:"processando",quantidadePrevista:operacoes.length,quantidadeNovasPrevista:novas,quantidadeAtualizacoesPrevista:atualizacoes,quantidadeConflitos:conflitos.length,quantidadeParcelasPrevista:qtdParcelas,valorPrevisto:operacoes.reduce((s,x)=>s+n(x.r.valor),0),iniciadoEm:new Date().toISOString(),importadoPor:state.usuario?.id||""});
    msg($("salesReportImportMsg"),`Lote ${lote} · validando clientes e vendedores...`);
    const linhasOp=operacoes.map(x=>x.r),clienteMap=await garantirClientes(emp,linhasOp,lote),vendMap=await garantirConfigs(emp,linhasOp,lote);
    for(let i=0;i<operacoes.length;i++){
      const op=operacoes[i],r=op.r,cl=clienteMap.get(chaveCodigo(r.clienteCodigo)),v=vendMap.get(chaveCodigo(r.vendedorCodigo));if(!cl||!v)throw new Error("vinculo-incompleto");
      msg($("salesReportImportMsg"),`Lote ${lote} · processando ${i+1} de ${operacoes.length}...`);
      if(op.tipo==="nova"){
        await criarDocumento("vendas",{...dadosVendaImportada(r,cl,v,lote),empresaId:emp,importacaoLoteId:lote});criadas++
      }else{
        const atual=vendas.find(x=>x.id===op.existente.id)||op.existente;
        await registrarSnapshot(lote,emp,atual);
        await atualizarDocumento("vendas",atual.id,dadosVendaImportada(r,cl,v,lote,atual));atualizadas++
      }
    }
    const qtdClientes=clientes.filter(x=>x.empresaId===emp&&x.importacaoLoteId===lote).length;
    await atualizarDocumento("importacoesVendas",logId,{status:"concluida",quantidadeVendas:criadas+atualizadas,quantidadeVendasNovas:criadas,quantidadeVendasAtualizadas:atualizadas,quantidadeClientesNovos:qtdClientes,quantidadeParcelas:qtdParcelas,valorTotal:operacoes.reduce((s,x)=>s+n(x.r.valor),0),concluidoEm:new Date().toISOString()});
    const logLocal=importacoes.find(x=>x.id===logId);if(logLocal)Object.assign(logLocal,{status:"concluida",quantidadeVendas:criadas+atualizadas,quantidadeVendasNovas:criadas,quantidadeVendasAtualizadas:atualizadas,quantidadeClientesNovos:qtdClientes,quantidadeParcelas:qtdParcelas,valorTotal:operacoes.reduce((s,x)=>s+n(x.r.valor),0),concluidoEm:new Date().toISOString()});
    renderHistorico();emitirAlteracao("vendas");msg($("salesReportImportMsg"),`Lote ${lote} concluído: ${criadas} pedido(s) novo(s), ${atualizadas} atualizado(s) e ${qtdParcelas} parcela(s) processada(s).`,true);
    try{await carregarBases();renderHistorico();if(analise)render()}catch(refreshErr){console.warn("Importação concluída; falha apenas ao recarregar a tela:",refreshErr)}
  }catch(e){
    console.error(e);
    if(logId){try{await atualizarDocumento("importacoesVendas",logId,{status:criadas||atualizadas?"parcial":"erro",quantidadeVendasNovas:criadas,quantidadeVendasAtualizadas:atualizadas,erro:String(e?.message||e).slice(0,500),finalizadoEm:new Date().toISOString()});await carregarBases();renderHistorico()}catch(logErr){console.error("Falha ao registrar log da importação",logErr)}}
    msg($("salesReportImportMsg"),(e?.message||"A importação não pôde ser concluída.")+(lote?` · Lote: ${lote}`:""))
  }finally{busy=false}
}
function tentar(){if(montar())setTimeout(async()=>{atualizarPermissao();try{if(empresaUnicaSelecionadaId()){await carregarBases();renderHistorico()}}catch{}},20);else atualizarPermissao()}
const obs=new MutationObserver(tentar);obs.observe(document.body,{childList:true,subtree:true});
window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="vendas")setTimeout(async()=>{montar();atualizarPermissao();try{await carregarBases();renderHistorico()}catch{}},120)});
window.addEventListener("sig:ready",tentar);
window.addEventListener("sig:data-changed",e=>{if(["vendas","rh"].includes(e.detail?.modulo)&&analise)setTimeout(async()=>{try{await carregarBases();render()}catch{}},120)});
tentar();
