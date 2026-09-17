from pathlib import Path
R=Path(__file__).resolve().parents[1]
def rw(p): return (R/p).read_text(encoding='utf-8')
def wr(p,s): (R/p).write_text(s,encoding='utf-8')

# RH Cultura: exclusão física administrativa auditada, além do estorno
p='js/hr-culture.js';s=rw(p)
s=s.replace("import { confirmarAcaoAdministrativa, atualizarComAuditoria } from './admin-actions.js';","import { confirmarAcaoAdministrativa, atualizarComAuditoria, excluirComAuditoria } from './admin-actions.js';")
anchor="async function estornar(k,id){if(!admin())return;"
if anchor not in s: raise SystemExit('estornar cultura nao encontrado')
pos=s.index('function render(k)',s.index(anchor))
extra="""async function excluirAdm(k,id){if(!admin())return;const x=registros[k].find(v=>v.id===id);if(!x)return;const ok=await confirmarAcaoAdministrativa({titulo:'Excluir fisicamente registro de RH',descricao:'Use apenas para cadastro duplicado ou teste. A auditoria será preservada.',motivoLabel:'Motivo obrigatório',confirmarTexto:'Excluir definitivamente',perigosa:true});if(!ok)return;try{await excluirComAuditoria({colecao:MOD[k].colecao,id,empresaId:x.empresaId,modulo:MOD[k].perfil,motivo:ok.motivo,resumo:`Exclusão física ${MOD[k].titulo}`,snapshotAntes:x});emitirAlteracao('rh');await carregar(k)}catch(e){console.error(e);alert('Não foi possível excluir. Confira as Rules administrativas.')}}\n"""
if 'async function excluirAdm(k,id)' not in s:s=s[:pos]+extra+s[pos:]
old="${x.status==='ativo'&&admin()?`<button class=\"btn-acao perigo\" type=\"button\" data-rhc-estorno=\"${x.id}\">Estornar ADM</button>`:''}"
new="${admin()?`${x.status==='ativo'?`<button class=\"btn-acao perigo\" type=\"button\" data-rhc-estorno=\"${x.id}\">Estornar ADM</button>`:''}<button class=\"btn-acao perigo\" type=\"button\" data-rhc-excluir=\"${x.id}\">Excluir ADM</button>`:''}"
if old not in s: raise SystemExit('acoes cultura nao encontradas')
s=s.replace(old,new)
old2="document.querySelectorAll('[data-rhc-estorno]').forEach(b=>b.addEventListener('click',()=>estornar(k,b.dataset.rhcEstorno)))"
new2=old2+";document.querySelectorAll('[data-rhc-excluir]').forEach(b=>b.addEventListener('click',()=>excluirAdm(k,b.dataset.rhcExcluir)))"
if old2 not in s: raise SystemExit('listener estorno cultura nao encontrado')
s=s.replace(old2,new2)
wr(p,s)

# Rules: Administrador pode excluir fisicamente itens RH, sempre com documento dentro do grupo/empresa.
p='firestore.rules';s=rw(p)
# replace only RH-specific delete false occurrences by context
s=s.replace("      allow delete: if false;\n    }\n    match /{colecao}/{id} {\n      allow read: if colecao in ['rhAusencias','rhHorasColaboradores']", "      allow delete: if administrador() && documentoAcessivel(resource.data);\n    }\n    match /{colecao}/{id} {\n      allow read: if colecao in ['rhAusencias','rhHorasColaboradores']",1)
s=s.replace("      allow delete: if false;\n    }\n    function rhAvaliacaoValida", "      allow delete: if colecao in ['rhAusencias','rhHorasColaboradores'] && administrador() && documentoAcessivel(resource.data);\n    }\n    function rhAvaliacaoValida",1)
s=s.replace("      allow delete: if false;\n    }\n    function rhAcaoValida", "      allow delete: if administrador() && documentoAcessivel(resource.data);\n    }\n    function rhAcaoValida",1)
s=s.replace("      allow delete: if false;\n    }\n\n    function moduloIndicador", "      allow delete: if administrador() && documentoAcessivel(resource.data);\n    }\n\n    function moduloIndicador",1)
wr(p,s)
print('admin RH v2 aplicado')
