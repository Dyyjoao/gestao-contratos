from pathlib import Path
R=Path(__file__).resolve().parents[1]
def rw(p): return (R/p).read_text(encoding='utf-8')
def wr(p,s): (R/p).write_text(s,encoding='utf-8')

p='js/hr-culture.js';s=rw(p)
s=s.replace("import { confirmarAcaoAdministrativa, atualizarComAuditoria } from './admin-actions.js';","import { confirmarAcaoAdministrativa, atualizarComAuditoria, excluirComAuditoria } from './admin-actions.js';")
anchor="async function estornar(k,id){if(!admin())return;"
if anchor not in s: raise SystemExit('estornar cultura nao encontrado')
pos=s.index('function render(k)',s.index(anchor))
extra="""async function excluirAdm(k,id){if(!admin())return;const x=registros[k].find(v=>v.id===id);if(!x)return;const ok=await confirmarAcaoAdministrativa({titulo:'Excluir fisicamente registro de RH',descricao:'Use apenas para cadastro duplicado ou teste. A auditoria será preservada.',motivoLabel:'Motivo obrigatório',confirmarTexto:'Excluir definitivamente',perigosa:true});if(!ok)return;try{await excluirComAuditoria({colecao:MOD[k].colecao,id,empresaId:x.empresaId,modulo:MOD[k].perfil,motivo:ok.motivo,resumo:`Exclusão física ${MOD[k].titulo}`,snapshotAntes:x});emitirAlteracao('rh');await carregar(k)}catch(e){console.error(e);alert('Não foi possível excluir. Confira as Rules administrativas.')}}\n"""
if 'async function excluirAdm(k,id)' not in s:s=s[:pos]+extra+s[pos:]
old="${x.status==='ativo'&&admin()?`<button type=\"button\" class=\"btn-acao perigo\" data-cult-estorno=\"${esc(x.id)}\">Estornar ADM</button>`:''}"
new=old+"${admin()?`<button type=\"button\" class=\"btn-acao perigo\" data-cult-excluir=\"${esc(x.id)}\">Excluir ADM</button>`:''}"
if 'data-cult-excluir=' not in s:
    if old not in s: raise SystemExit('acao Estornar ADM cultura nao encontrada')
    s=s.replace(old,new,1)
listener="document.querySelectorAll(`#pagina-rh-${k} [data-cult-estorno]`).forEach(b=>b.addEventListener('click',()=>estornar(k,b.dataset.cultEstorno)))"
if '[data-cult-excluir]' not in s:
    if listener not in s: raise SystemExit('listener estorno cultura nao encontrado')
    s=s.replace(listener,listener+";document.querySelectorAll(`#pagina-rh-${k} [data-cult-excluir]`).forEach(b=>b.addEventListener('click',()=>excluirAdm(k,b.dataset.cultExcluir)))",1)
wr(p,s)

p='firestore.rules';s=rw(p)
subs=[
("      allow delete: if false;\n    }\n    match /{colecao}/{id} {\n      allow read: if colecao in ['rhAusencias','rhHorasColaboradores']", "      allow delete: if administrador() && documentoAcessivel(resource.data);\n    }\n    match /{colecao}/{id} {\n      allow read: if colecao in ['rhAusencias','rhHorasColaboradores']"),
("      allow delete: if false;\n    }\n    function rhAvaliacaoValida", "      allow delete: if colecao in ['rhAusencias','rhHorasColaboradores'] && administrador() && documentoAcessivel(resource.data);\n    }\n    function rhAvaliacaoValida"),
("      allow delete: if false;\n    }\n    function rhAcaoValida", "      allow delete: if administrador() && documentoAcessivel(resource.data);\n    }\n    function rhAcaoValida"),
("      allow delete: if false;\n    }\n\n    function moduloIndicador", "      allow delete: if administrador() && documentoAcessivel(resource.data);\n    }\n\n    function moduloIndicador")]
for old,new in subs:
    if old in s:s=s.replace(old,new,1)
if "match /rhColaboradores/{id}" not in s or "match /rhAvaliacoes360/{id}" not in s or "match /rhAcoes/{id}" not in s: raise SystemExit('bloco RH ausente')
if "colecao in ['rhAusencias','rhHorasColaboradores'] && administrador()" not in s: raise SystemExit('delete admin ausencias/horas nao aplicado')
wr(p,s)
print('admin RH v2 aplicado')
