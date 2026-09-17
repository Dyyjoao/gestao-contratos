import { admin } from './core.js';
import { $, esc, state, listarDocumentos, criarDocumento, atualizarDocumento, empresaUnicaSelecionadaId, emitirAlteracao } from './shared.js';

const MODULO='rhCargosCentral';
let base=null,cargos=[],colaboradores=[],timer=0,observador=null;
const normaliza=s=>String(s||'').trim().toUpperCase();
const empresa=()=>empresaUnicaSelecionadaId();
const funcoesPadrao=['MOTORISTA','VENDEDOR','SUPERVISOR_VENDAS'];

async function carregar(){
  if(!empresa())return;
  try{
    const [cfgs,pessoas]=await Promise.all([listarDocumentos('configuracoesModulos'),listarDocumentos('rhColaboradores')]);
    base=cfgs.find(x=>x.modulo===MODULO&&x.empresaId===empresa())||null;
    cargos=Array.isArray(base?.cargos)?base.cargos:[];
    colaboradores=pessoas.filter(x=>x.empresaId===empresa()&&x.status!=='estornado');
    decorar();
  }catch(e){console.warn('Base central de cargos indisponível',e)}
}

async function garantirBase(){
  if(base)return base;
  if(!admin())throw new Error('O cadastro central de cargos precisa ser criado por um administrador.');
  const id=await criarDocumento('configuracoesModulos',{empresaId:empresa(),modulo:MODULO,cargos:[],vinculos:{}});
  base={id,empresaId:empresa(),modulo:MODULO,cargos:[],vinculos:{}};
  return base;
}

async function salvarBase(alteracoes){
  const b=await garantirBase();
  await atualizarDocumento('configuracoesModulos',b.id,alteracoes);
  Object.assign(b,alteracoes);
  cargos=Array.isArray(b.cargos)?b.cargos:[];
  emitirAlteracao('rh');
}

export async function carregarBaseCargos(){await carregar();return{cargos:[...cargos],vinculos:{...(base?.vinculos||{})},colaboradores:[...colaboradores]}}
export async function colaboradoresPorFuncao(funcao){
  await carregar();const alvo=normaliza(funcao),v=base?.vinculos||{};
  return colaboradores.filter(p=>{const c=cargos.find(x=>x.id===v[p.id]&&x.ativo!==false);return c&&Array.isArray(c.funcoesSistema)&&c.funcoesSistema.map(normaliza).includes(alvo)}).map(p=>({...p,cargoId:v[p.id],cargoNome:cargos.find(c=>c.id===v[p.id])?.nome||''}));
}

function opcoesCargo(valor=''){
  return '<option value="">Sem cargo definido</option>'+cargos.filter(x=>x.ativo!==false).sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'pt-BR')).map(c=>`<option value="${esc(c.id)}" ${valor===c.id?'selected':''}>${esc(c.nome)}</option>`).join('');
}
function colaboradorAtualFormulario(){
  const codigo=normaliza($('rhCodigo')?.value),nome=normaliza($('rhNome')?.value);
  return colaboradores.find(p=>normaliza(p.codigo)===codigo&&(!nome||normaliza(p.nome)===nome))||null;
}
function injetarCargoAdmissao(){
  const campos=$('rhCampos'),setor=$('rhSetorForm');if(!campos||!setor||$('rhCargoForm'))return;
  const atual=colaboradorAtualFormulario(),cargoId=base?.vinculos?.[atual?.id]||'';
  const div=document.createElement('div');div.className='campo';div.innerHTML=`<label for="rhCargoForm">Cargo</label><select id="rhCargoForm">${opcoesCargo(cargoId)}</select><small>Base central usada por Frota, Vendas e outros módulos.</small>`;
  setor.closest('.campo')?.insertAdjacentElement('afterend',div);
  const form=$('rhForm');if(form&&form.dataset.cargoBound!=='1'){
    form.dataset.cargoBound='1';
    form.addEventListener('submit',()=>{const codigo=normaliza($('rhCodigo')?.value),nome=normaliza($('rhNome')?.value),cargo=$('rhCargoForm')?.value||'';setTimeout(()=>vincularDepoisDoSalvar(codigo,nome,cargo),500)},true);
  }
}
async function vincularDepoisDoSalvar(codigo,nome,cargoId){
  if(!codigo||!admin())return;
  try{
    await new Promise(r=>setTimeout(r,150));
    const pessoas=await listarDocumentos('rhColaboradores'),p=pessoas.find(x=>x.empresaId===empresa()&&x.status!=='estornado'&&normaliza(x.codigo)===codigo&&(!nome||normaliza(x.nome)===nome));
    if(!p)return;
    await garantirBase();const vinculos={...(base?.vinculos||{})};if(cargoId)vinculos[p.id]=cargoId;else delete vinculos[p.id];
    await salvarBase({vinculos});
  }catch(e){console.error('Não foi possível vincular o cargo ao colaborador',e)}
}

function garantirPainel(){
  const pagina=$('pagina-rh');if(!pagina||$('rhCargosCentralBox'))return;
  const box=document.createElement('section');box.id='rhCargosCentralBox';box.className='form-card hidden';box.innerHTML=`<div class="form-card-titulo"><div><h3>Cadastro central de cargos</h3><p>Defina o cargo uma vez e marque quais funções do SIG ele habilita.</p></div></div><form id="rhCargoCadastroForm"><div class="form-grid form-grid-3"><div class="campo"><label for="rhCargoNome">Cargo</label><input id="rhCargoNome" maxlength="80" required placeholder="Ex.: Motorista de carreta"></div><div class="campo"><label>Funções sistêmicas</label><label><input type="checkbox" name="rhCargoFuncao" value="MOTORISTA"> Motorista</label><label><input type="checkbox" name="rhCargoFuncao" value="VENDEDOR"> Vendedor</label><label><input type="checkbox" name="rhCargoFuncao" value="SUPERVISOR_VENDAS"> Supervisora de vendas</label></div><div class="campo"><label for="rhCargoExtras">Outras funções</label><input id="rhCargoExtras" placeholder="Ex.: COMPRADOR, GESTOR"><small>Separe por vírgulas.</small></div></div><div class="form-acoes"><button id="rhCargoFechar" class="btn-secundario" type="button">Fechar</button><button class="btn-primario" type="submit">Adicionar cargo</button></div></form><div id="rhCargosLista" class="tabela-container"></div>`;
  const aviso=$('rhAviso');aviso?.insertAdjacentElement('afterend',box);
  $('rhCargoFechar').addEventListener('click',()=>box.classList.add('hidden'));
  $('rhCargoCadastroForm').addEventListener('submit',salvarCargo);
}
function garantirBotao(){
  if(!admin())return;const acoes=$('pagina-rh')?.querySelector('.rh-module-head .acoes-cabecalho');if(!acoes||$('rhGerirCargos'))return;
  const b=document.createElement('button');b.id='rhGerirCargos';b.className='btn-secundario';b.type='button';b.textContent='Cargos';b.addEventListener('click',()=>{garantirPainel();renderCargos();$('rhCargosCentralBox').classList.remove('hidden');$('rhCargosCentralBox').scrollIntoView({behavior:'smooth',block:'start'})});acoes.prepend(b);
}
async function salvarCargo(e){
  e.preventDefault();if(!admin())return;
  const nome=normaliza($('rhCargoNome').value),marcadas=[...document.querySelectorAll('input[name="rhCargoFuncao"]:checked')].map(x=>x.value),extras=String($('rhCargoExtras').value||'').split(',').map(normaliza).filter(Boolean),funcoes=[...new Set([...funcoesPadrao.filter(x=>marcadas.includes(x)),...extras])];
  if(!nome)return;
  await garantirBase();if(cargos.some(c=>normaliza(c.nome)===nome&&c.ativo!==false))return alert('Este cargo já está cadastrado.');
  const novo={id:globalThis.crypto?.randomUUID?.()||`${Date.now()}`,nome,funcoesSistema:funcoes,ativo:true};await salvarBase({cargos:[...cargos,novo]});e.target.reset();renderCargos();
}
async function alternarCargo(id){if(!admin())return;await garantirBase();await salvarBase({cargos:cargos.map(c=>c.id===id?{...c,ativo:c.ativo===false}:c)});renderCargos()}
function renderCargos(){
  const el=$('rhCargosLista');if(!el)return;el.innerHTML=`<table class="tabela"><thead><tr><th>Cargo</th><th>Funções no SIG</th><th>Status</th><th>Ação</th></tr></thead><tbody>${cargos.map(c=>`<tr><td>${esc(c.nome)}</td><td>${esc((c.funcoesSistema||[]).join(', ')||'—')}</td><td>${c.ativo===false?'Inativo':'Ativo'}</td><td><button type="button" class="btn-acao" data-cargo-toggle="${esc(c.id)}">${c.ativo===false?'Reativar':'Inativar'}</button></td></tr>`).join('')||'<tr><td colspan="4">Nenhum cargo cadastrado.</td></tr>'}</tbody></table>`;el.querySelectorAll('[data-cargo-toggle]').forEach(b=>b.addEventListener('click',()=>alternarCargo(b.dataset.cargoToggle)));
}
function decorar(){garantirBotao();garantirPainel();injetarCargoAdmissao()}
function agendar(){clearTimeout(timer);timer=setTimeout(()=>{carregar().then(decorar)},80)}
function instalar(){if(observador)return;observador=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(decorar,50)});observador.observe(document.body,{childList:true,subtree:true});agendar()}
window.addEventListener('sig:ready',agendar);window.addEventListener('sig:empresa-contexto',agendar);window.addEventListener('sig:data-changed',e=>{if(e.detail?.modulo==='rh')agendar()});
instalar();
