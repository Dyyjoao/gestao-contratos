const styleLink=document.createElement("link");
styleLink.rel="stylesheet";
styleLink.href="modules.css?v=12";
document.head.appendChild(styleLink);

const menuContratos=document.getElementById("menuContratos");
const separador=document.querySelector(".sidebar-menu .menu-separador");
if(menuContratos&&separador){
  [
    ["menuPrestadores","prestadores","Prestadores"],
    ["menuFrota","frota","Frota"],
    ["menuAlmoxarifado","almoxarifado","Almoxarifado"],
    ["menuCotacoes","cotacoes","Cotações"],
    ["menuControladoria","controladoria","Controladoria"]
  ].forEach(([id,pagina,label])=>{
    if(document.getElementById(id))return;
    const b=document.createElement("button");
    b.id=id;b.className="menu-item hidden";b.dataset.pagina=pagina;b.type="button";b.textContent=label;
    separador.before(b);
  });
}

const dashboard=document.getElementById("pagina-dashboard");
if(dashboard){dashboard.innerHTML=`
  <div class="welcome modulo-hero">
    <div>
      <span class="eyebrow">VISÃO INTEGRADA</span>
      <h2>Central de Gestão</h2>
      <p>Indicadores dos módulos operacionais, administrativos e de planejamento.</p>
    </div>
    <span id="dashAtualizadoEm" class="hero-meta">Atualizando...</span>
  </div>
  <div class="kpi-grid kpi-grid-6">
    <div class="kpi-card"><span>Contratos ativos</span><strong id="dashContratosAtivos">—</strong><small id="dashContratosVencer">— a vencer</small></div>
    <div class="kpi-card"><span>Frota ativa</span><strong id="dashFrotaAtiva">—</strong><small id="dashFrotaManutencao">— em manutenção</small></div>
    <div class="kpi-card"><span>Estoque crítico</span><strong id="dashEstoqueCritico">—</strong><small>itens abaixo do mínimo</small></div>
    <div class="kpi-card"><span>Cotações pendentes</span><strong id="dashCotacoesPendentes">—</strong><small id="dashCotacoesAprovacao">— em aprovação</small></div>
    <div class="kpi-card"><span>Prestadores ativos</span><strong id="dashPrestadoresAtivos">—</strong><small>base homologada</small></div>
    <div class="kpi-card"><span>Resultado gerencial</span><strong id="dashResultadoGerencial">—</strong><small id="dashVariacaoBudget">— vs. budget</small></div>
  </div>
  <div class="dashboard-grid">
    <section class="lista-card dashboard-panel">
      <div class="lista-cabecalho"><div><h3>Pendências prioritárias</h3><p>Itens que merecem atenção agora.</p></div></div>
      <div id="dashPendencias" class="pendencias-lista"><div class="empty-state">Carregando pendências...</div></div>
    </section>
    <section class="lista-card dashboard-panel">
      <div class="lista-cabecalho"><div><h3>Acesso rápido</h3><p>Atalhos para as rotinas mais usadas.</p></div></div>
      <div class="quick-grid">
        <button type="button" data-ir-pagina="contratos" class="quick-card"><span>Contratos</span><small>Vencimentos e valores</small></button>
        <button type="button" data-ir-pagina="frota" class="quick-card"><span>Frota</span><small>Veículos e revisões</small></button>
        <button type="button" data-ir-pagina="almoxarifado" class="quick-card"><span>Almoxarifado</span><small>Saldo e movimentações</small></button>
        <button type="button" data-ir-pagina="cotacoes" class="quick-card"><span>Cotações</span><small>Solicitar e aprovar</small></button>
        <button type="button" data-ir-pagina="controladoria" class="quick-card"><span>Controladoria</span><small>Budget e forecast</small></button>
        <button type="button" data-ir-pagina="prestadores" class="quick-card"><span>Prestadores</span><small>Fornecedores e oficinas</small></button>
      </div>
    </section>
  </div>`}

const contratos=document.getElementById("pagina-contratos");
if(contratos){contratos.innerHTML=`
  <div class="pagina-cabecalho"><div><span class="eyebrow">CONTRATOS</span><h2>Gestão de Contratos</h2><p>Controle de vigência, valores, responsáveis e vencimentos.</p></div><button id="btnNovoContrato" class="btn-primario" type="button">+ Novo contrato</button></div>
  <div class="kpi-grid kpi-grid-4"><div class="kpi-card"><span>Ativos</span><strong id="contratosAtivos">—</strong></div><div class="kpi-card"><span>A vencer em 60 dias</span><strong id="contratosAVencer">—</strong></div><div class="kpi-card"><span>Vencidos</span><strong id="contratosVencidos">—</strong></div><div class="kpi-card"><span>Valor mensal</span><strong id="contratosValorMensal">—</strong></div></div>
  <section id="formContratoContainer" class="form-card hidden"><div class="form-card-titulo"><div><h3 id="tituloFormContrato">Novo contrato</h3><p>Cadastre os dados essenciais para acompanhamento.</p></div></div><form id="formContrato">
    <div class="form-grid form-grid-3">
      <div class="campo"><label for="contratoEmpresa">Empresa</label><select id="contratoEmpresa" required></select></div>
      <div class="campo"><label for="contratoNumero">Número / referência</label><input id="contratoNumero" type="text" placeholder="Ex.: CTR-2026-014"></div>
      <div class="campo"><label for="contratoFornecedor">Contratada / fornecedor</label><input id="contratoFornecedor" type="text" required></div>
      <div class="campo campo-span-3"><label for="contratoObjeto">Objeto</label><input id="contratoObjeto" type="text" required></div>
      <div class="campo"><label for="contratoInicio">Início</label><input id="contratoInicio" type="date" required></div>
      <div class="campo"><label for="contratoFim">Término</label><input id="contratoFim" type="date" required></div>
      <div class="campo"><label for="contratoValor">Valor mensal</label><input id="contratoValor" type="number" min="0" step="0.01" inputmode="decimal"></div>
      <div class="campo"><label for="contratoResponsavel">Responsável</label><input id="contratoResponsavel" type="text"></div>
      <div class="campo"><label for="contratoStatus">Status</label><select id="contratoStatus"><option value="ativo">Ativo</option><option value="suspenso">Suspenso</option><option value="encerrado">Encerrado</option></select></div>
      <div class="campo"><label for="contratoReajuste">Próximo reajuste</label><input id="contratoReajuste" type="date"></div>
      <div class="campo campo-span-3"><label for="contratoObservacoes">Observações</label><input id="contratoObservacoes" type="text"></div>
    </div><div class="form-acoes"><button id="btnCancelarContrato" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Salvar contrato</button></div><p id="mensagemContrato" class="mensagem-form" aria-live="polite"></p></form></section>
  <section class="lista-card"><div class="lista-cabecalho"><div><h3>Contratos cadastrados</h3><p id="quantidadeContratos">Carregando...</p></div><input id="buscaContrato" class="campo-busca" type="search" placeholder="Buscar contrato, objeto ou fornecedor"></div><div class="tabela-container"><table class="tabela"><thead><tr><th>Contrato</th><th>Empresa</th><th>Vigência</th><th>Valor mensal</th><th>Status</th><th>Ações</th></tr></thead><tbody id="listaContratos"><tr><td colspan="6">Carregando...</td></tr></tbody></table></div></section>`}

const conteudo=document.querySelector("main.conteudo");
function adicionarPagina(id,html){if(!conteudo||document.getElementById(`pagina-${id}`))return;const s=document.createElement("section");s.id=`pagina-${id}`;s.className="pagina hidden";s.innerHTML=html;conteudo.appendChild(s)}

adicionarPagina("prestadores",`
  <div class="pagina-cabecalho"><div><span class="eyebrow">REDE DE APOIO</span><h2>Prestadores & Oficinas</h2><p>Base única de fornecedores, prestadores de serviço e oficinas.</p></div><button id="btnNovoPrestador" class="btn-primario" type="button">+ Novo prestador</button></div>
  <div class="kpi-grid kpi-grid-3"><div class="kpi-card"><span>Ativos</span><strong id="prestadoresAtivos">—</strong></div><div class="kpi-card"><span>Oficinas</span><strong id="prestadoresOficinas">—</strong></div><div class="kpi-card"><span>Fornecedores</span><strong id="prestadoresFornecedores">—</strong></div></div>
  <section id="formPrestadorContainer" class="form-card hidden"><div class="form-card-titulo"><div><h3 id="tituloFormPrestador">Novo prestador</h3><p>Cadastre contatos e especialidades para uso nos demais módulos.</p></div></div><form id="formPrestador"><div class="form-grid form-grid-3">
    <div class="campo"><label for="prestadorEmpresa">Empresa</label><select id="prestadorEmpresa" required></select></div><div class="campo"><label for="prestadorCategoria">Categoria</label><select id="prestadorCategoria" required><option value="prestador">Prestador de serviço</option><option value="oficina">Oficina</option><option value="fornecedor">Fornecedor</option></select></div><div class="campo"><label for="prestadorNome">Nome / Razão social</label><input id="prestadorNome" required></div>
    <div class="campo"><label for="prestadorDocumento">CPF/CNPJ</label><input id="prestadorDocumento"></div><div class="campo"><label for="prestadorEspecialidade">Especialidade</label><input id="prestadorEspecialidade" placeholder="Ex.: mecânica diesel"></div><div class="campo"><label for="prestadorContato">Contato</label><input id="prestadorContato"></div>
    <div class="campo"><label for="prestadorTelefone">Telefone</label><input id="prestadorTelefone" inputmode="tel"></div><div class="campo"><label for="prestadorEmail">E-mail</label><input id="prestadorEmail" type="email"></div><div class="campo"><label for="prestadorStatus">Status</label><select id="prestadorStatus"><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></div>
  </div><div class="form-acoes"><button id="btnCancelarPrestador" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Salvar prestador</button></div><p id="mensagemPrestador" class="mensagem-form"></p></form></section>
  <section class="lista-card"><div class="lista-cabecalho"><div><h3>Prestadores cadastrados</h3><p id="quantidadePrestadores">Carregando...</p></div><input id="buscaPrestador" class="campo-busca" type="search" placeholder="Buscar nome, especialidade ou documento"></div><div class="tabela-container"><table class="tabela"><thead><tr><th>Prestador</th><th>Categoria</th><th>Especialidade</th><th>Contato</th><th>Status</th><th>Ações</th></tr></thead><tbody id="listaPrestadores"><tr><td colspan="6">Carregando...</td></tr></tbody></table></div></section>`);

adicionarPagina("frota",`
  <div class="pagina-cabecalho"><div><span class="eyebrow">FROTA</span><h2>Gestão de Frota</h2><p>Veículos, quilometragem, manutenção e vencimentos documentais.</p></div><button id="btnNovoVeiculo" class="btn-primario" type="button">+ Novo veículo</button></div>
  <div class="kpi-grid kpi-grid-4"><div class="kpi-card"><span>Veículos ativos</span><strong id="frotaAtivos">—</strong></div><div class="kpi-card"><span>Em manutenção</span><strong id="frotaManutencao">—</strong></div><div class="kpi-card"><span>Revisão próxima</span><strong id="frotaRevisao">—</strong></div><div class="kpi-card"><span>Documentos a vencer</span><strong id="frotaDocumentos">—</strong></div></div>
  <section id="formVeiculoContainer" class="form-card hidden"><div class="form-card-titulo"><div><h3 id="tituloFormVeiculo">Novo veículo</h3><p>Cadastre dados operacionais e pontos de controle.</p></div></div><form id="formVeiculo"><div class="form-grid form-grid-3">
    <div class="campo"><label for="veiculoEmpresa">Empresa</label><select id="veiculoEmpresa" required></select></div><div class="campo"><label for="veiculoPlaca">Placa</label><input id="veiculoPlaca" maxlength="8" required></div><div class="campo"><label for="veiculoStatus">Status</label><select id="veiculoStatus"><option value="ativo">Ativo</option><option value="manutencao">Em manutenção</option><option value="inativo">Inativo</option></select></div>
    <div class="campo"><label for="veiculoMarca">Marca</label><input id="veiculoMarca"></div><div class="campo"><label for="veiculoModelo">Modelo</label><input id="veiculoModelo" required></div><div class="campo"><label for="veiculoAno">Ano</label><input id="veiculoAno" type="number" min="1980" max="2100"></div>
    <div class="campo"><label for="veiculoKm">Km atual</label><input id="veiculoKm" type="number" min="0" step="1"></div><div class="campo"><label for="veiculoRevisaoKm">Próxima revisão (km)</label><input id="veiculoRevisaoKm" type="number" min="0" step="1"></div><div class="campo"><label for="veiculoSeguro">Vencimento seguro</label><input id="veiculoSeguro" type="date"></div>
    <div class="campo"><label for="veiculoLicenciamento">Vencimento licenciamento</label><input id="veiculoLicenciamento" type="date"></div><div class="campo campo-span-2"><label for="veiculoObservacoes">Observações</label><input id="veiculoObservacoes"></div>
  </div><div class="form-acoes"><button id="btnCancelarVeiculo" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Salvar veículo</button></div><p id="mensagemVeiculo" class="mensagem-form"></p></form></section>
  <section class="lista-card"><div class="lista-cabecalho"><div><h3>Veículos</h3><p id="quantidadeVeiculos">Carregando...</p></div><input id="buscaVeiculo" class="campo-busca" type="search" placeholder="Buscar placa, marca ou modelo"></div><div class="tabela-container"><table class="tabela"><thead><tr><th>Veículo</th><th>Empresa</th><th>Km</th><th>Próxima revisão</th><th>Status</th><th>Ações</th></tr></thead><tbody id="listaVeiculos"><tr><td colspan="6">Carregando...</td></tr></tbody></table></div></section>`);

adicionarPagina("almoxarifado",`
  <div class="pagina-cabecalho"><div><span class="eyebrow">ALMOXARIFADO</span><h2>Controle de Estoque</h2><p>Cadastro de itens, saldo, ponto mínimo e movimentações.</p></div><div class="acoes-cabecalho"><button id="btnMovimentarEstoque" class="btn-secundario" type="button">Movimentar</button><button id="btnNovoItem" class="btn-primario" type="button">+ Novo item</button></div></div>
  <div class="kpi-grid kpi-grid-4"><div class="kpi-card"><span>Itens ativos</span><strong id="estoqueItens">—</strong></div><div class="kpi-card"><span>Abaixo do mínimo</span><strong id="estoqueCritico">—</strong></div><div class="kpi-card"><span>Valor estimado</span><strong id="estoqueValor">—</strong></div><div class="kpi-card"><span>Movimentos no mês</span><strong id="estoqueMovimentosMes">—</strong></div></div>
  <section id="formItemContainer" class="form-card hidden"><div class="form-card-titulo"><div><h3 id="tituloFormItem">Novo item</h3><p>Defina saldo e parâmetros de reposição.</p></div></div><form id="formItem"><div class="form-grid form-grid-3">
    <div class="campo"><label for="itemEmpresa">Empresa</label><select id="itemEmpresa" required></select></div><div class="campo"><label for="itemCodigo">Código</label><input id="itemCodigo" required></div><div class="campo"><label for="itemDescricao">Descrição</label><input id="itemDescricao" required></div>
    <div class="campo"><label for="itemUnidade">Unidade</label><select id="itemUnidade"><option>UN</option><option>KG</option><option>L</option><option>CX</option><option>PCT</option><option>M</option></select></div><div class="campo"><label for="itemLocal">Local</label><input id="itemLocal" placeholder="Ex.: Almox. Central"></div><div class="campo"><label for="itemCusto">Custo médio</label><input id="itemCusto" type="number" min="0" step="0.01"></div>
    <div class="campo"><label for="itemSaldo">Saldo inicial/atual</label><input id="itemSaldo" type="number" min="0" step="0.001"></div><div class="campo"><label for="itemMinimo">Estoque mínimo</label><input id="itemMinimo" type="number" min="0" step="0.001"></div><div class="campo"><label for="itemStatus">Status</label><select id="itemStatus"><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></div>
  </div><div class="form-acoes"><button id="btnCancelarItem" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Salvar item</button></div><p id="mensagemItem" class="mensagem-form"></p></form></section>
  <section id="formMovimentoContainer" class="form-card hidden"><div class="form-card-titulo"><div><h3>Movimentar estoque</h3><p>Entradas e saídas atualizam o saldo do item.</p></div></div><form id="formMovimento"><div class="form-grid form-grid-3"><div class="campo"><label for="movimentoItem">Item</label><select id="movimentoItem" required></select></div><div class="campo"><label for="movimentoTipo">Tipo</label><select id="movimentoTipo"><option value="entrada">Entrada</option><option value="saida">Saída</option></select></div><div class="campo"><label for="movimentoQuantidade">Quantidade</label><input id="movimentoQuantidade" type="number" min="0.001" step="0.001" required></div><div class="campo campo-span-3"><label for="movimentoObservacao">Observação</label><input id="movimentoObservacao"></div></div><div class="form-acoes"><button id="btnCancelarMovimento" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Confirmar movimento</button></div><p id="mensagemMovimento" class="mensagem-form"></p></form></section>
  <section class="lista-card"><div class="lista-cabecalho"><div><h3>Itens em estoque</h3><p id="quantidadeItens">Carregando...</p></div><input id="buscaItem" class="campo-busca" type="search" placeholder="Buscar código, item ou local"></div><div class="tabela-container"><table class="tabela"><thead><tr><th>Item</th><th>Local</th><th>Saldo</th><th>Mínimo</th><th>Custo médio</th><th>Ações</th></tr></thead><tbody id="listaItens"><tr><td colspan="6">Carregando...</td></tr></tbody></table></div></section>`);

adicionarPagina("cotacoes",`
  <div class="pagina-cabecalho"><div><span class="eyebrow">WORKFLOW</span><h2>Solicitações & Cotações</h2><p>Fluxo simples: solicitar, cotar, aprovar e finalizar — sem duplicar o Pangeia.</p></div><button id="btnNovaCotacao" class="btn-primario" type="button">+ Nova solicitação</button></div>
  <div class="kpi-grid kpi-grid-4"><div class="kpi-card"><span>Solicitadas</span><strong id="cotacoesSolicitadas">—</strong></div><div class="kpi-card"><span>Em cotação</span><strong id="cotacoesEmCotacao">—</strong></div><div class="kpi-card"><span>Aguardando aprovação</span><strong id="cotacoesAprovacao">—</strong></div><div class="kpi-card"><span>Aprovadas/finalizadas</span><strong id="cotacoesConcluidas">—</strong></div></div>
  <section id="formCotacaoContainer" class="form-card hidden"><div class="form-card-titulo"><div><h3 id="tituloFormCotacao">Nova solicitação</h3><p>Operação solicita; comprador completa a cotação e envia para aprovação.</p></div></div><form id="formCotacao"><div class="form-grid form-grid-3">
    <div class="campo"><label for="cotacaoEmpresa">Empresa</label><select id="cotacaoEmpresa" required></select></div><div class="campo"><label for="cotacaoTitulo">Item / serviço</label><input id="cotacaoTitulo" required></div><div class="campo"><label for="cotacaoPrioridade">Prioridade</label><select id="cotacaoPrioridade"><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></div>
    <div class="campo"><label for="cotacaoSolicitante">Solicitante</label><input id="cotacaoSolicitante"></div><div class="campo"><label for="cotacaoPrazo">Necessidade até</label><input id="cotacaoPrazo" type="date"></div><div class="campo"><label for="cotacaoEstimado">Valor estimado</label><input id="cotacaoEstimado" type="number" min="0" step="0.01"></div>
    <div class="campo"><label for="cotacaoFornecedor">Fornecedor cotado/escolhido</label><input id="cotacaoFornecedor"></div><div class="campo"><label for="cotacaoValorProposto">Valor proposto</label><input id="cotacaoValorProposto" type="number" min="0" step="0.01"></div><div class="campo"><label for="cotacaoReferenciaPangeia">Referência Pangeia</label><input id="cotacaoReferenciaPangeia" placeholder="Opcional"></div>
    <div class="campo campo-span-3"><label for="cotacaoDescricao">Descrição / observação</label><input id="cotacaoDescricao"></div>
  </div><div class="form-acoes"><button id="btnCancelarCotacao" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Salvar solicitação</button></div><p id="mensagemCotacao" class="mensagem-form"></p></form></section>
  <section class="lista-card"><div class="lista-cabecalho"><div><h3>Fluxo de solicitações</h3><p id="quantidadeCotacoes">Carregando...</p></div><input id="buscaCotacao" class="campo-busca" type="search" placeholder="Buscar item, solicitante ou fornecedor"></div><div class="tabela-container"><table class="tabela"><thead><tr><th>Solicitação</th><th>Empresa</th><th>Prazo</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead><tbody id="listaCotacoes"><tr><td colspan="6">Carregando...</td></tr></tbody></table></div></section>`);

adicionarPagina("controladoria",`
  <div class="pagina-cabecalho"><div><span class="eyebrow">CONTROLADORIA & PLANEJAMENTO</span><h2>Budget, Forecast & Resultado</h2><p>Camada gerencial para orçamento, realizado, projeções e caixa 30/60/90.</p></div><button id="btnNovaLinhaGerencial" class="btn-primario" type="button">+ Nova linha</button></div>
  <div class="filtros-linha"><div class="campo"><label for="controladoriaCompetenciaFiltro">Competência</label><input id="controladoriaCompetenciaFiltro" type="month"></div><div class="campo"><label for="controladoriaEmpresaFiltro">Empresa</label><select id="controladoriaEmpresaFiltro"></select></div></div>
  <div class="kpi-grid kpi-grid-4"><div class="kpi-card"><span>Receita realizada</span><strong id="ctrlReceita">—</strong></div><div class="kpi-card"><span>Despesa realizada</span><strong id="ctrlDespesa">—</strong></div><div class="kpi-card"><span>Resultado realizado</span><strong id="ctrlResultado">—</strong></div><div class="kpi-card"><span>Variação vs Budget</span><strong id="ctrlVariacao">—</strong></div></div>
  <div class="kpi-grid kpi-grid-3 caixa-grid"><div class="kpi-card"><span>Caixa projetado D+30</span><strong id="ctrlD30">—</strong></div><div class="kpi-card"><span>Caixa projetado D+60</span><strong id="ctrlD60">—</strong></div><div class="kpi-card"><span>Caixa projetado D+90</span><strong id="ctrlD90">—</strong></div></div>
  <section id="formLinhaGerencialContainer" class="form-card hidden"><div class="form-card-titulo"><div><h3 id="tituloFormLinhaGerencial">Nova linha gerencial</h3><p>Registre uma linha da DRE gerencial para comparação orçado × forecast × realizado.</p></div></div><form id="formLinhaGerencial"><div class="form-grid form-grid-3">
    <div class="campo"><label for="ctrlEmpresa">Empresa</label><select id="ctrlEmpresa" required></select></div><div class="campo"><label for="ctrlCompetencia">Competência</label><input id="ctrlCompetencia" type="month" required></div><div class="campo"><label for="ctrlGrupoDre">Grupo DRE</label><select id="ctrlGrupoDre"><option value="receita">Receita</option><option value="custos">Custos</option><option value="despesas">Despesas Operacionais</option><option value="financeiro">Resultado Financeiro</option><option value="impostos">Impostos</option><option value="outros">Outros</option></select></div>
    <div class="campo"><label for="ctrlConta">Conta gerencial</label><input id="ctrlConta" required placeholder="Ex.: Receita Hospedagem"></div><div class="campo"><label for="ctrlNatureza">Natureza</label><select id="ctrlNatureza"><option value="receita">Receita</option><option value="despesa">Despesa</option></select></div><div class="campo"><label for="ctrlOrcado">Budget</label><input id="ctrlOrcado" type="number" step="0.01"></div>
    <div class="campo"><label for="ctrlForecast">Forecast</label><input id="ctrlForecast" type="number" step="0.01"></div><div class="campo"><label for="ctrlRealizado">Realizado</label><input id="ctrlRealizado" type="number" step="0.01"></div><div class="campo"><label for="ctrlD30Input">Caixa D+30</label><input id="ctrlD30Input" type="number" step="0.01"></div>
    <div class="campo"><label for="ctrlD60Input">Caixa D+60</label><input id="ctrlD60Input" type="number" step="0.01"></div><div class="campo"><label for="ctrlD90Input">Caixa D+90</label><input id="ctrlD90Input" type="number" step="0.01"></div><div class="campo"><label for="ctrlObservacao">Comentário</label><input id="ctrlObservacao" placeholder="Justificativa ou premissa"></div>
  </div><div class="form-acoes"><button id="btnCancelarLinhaGerencial" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Salvar linha</button></div><p id="mensagemLinhaGerencial" class="mensagem-form"></p></form></section>
  <div class="controladoria-grid"><section class="lista-card"><div class="lista-cabecalho"><div><h3>DRE Gerencial</h3><p id="ctrlResumoCompetencia">Competência selecionada</p></div></div><div id="ctrlDreResumo" class="dre-resumo"><div class="empty-state">Carregando...</div></div></section><section class="lista-card"><div class="lista-cabecalho"><div><h3>Prestação de contas</h3><p>Linhas com desvio relevante contra o orçamento.</p></div></div><div id="ctrlDesvios" class="desvios-lista"><div class="empty-state">Carregando...</div></div></section></div>
  <section class="lista-card"><div class="lista-cabecalho"><div><h3>Linhas gerenciais</h3><p id="quantidadeLinhasGerenciais">Carregando...</p></div><input id="buscaLinhaGerencial" class="campo-busca" type="search" placeholder="Buscar conta gerencial"></div><div class="tabela-container"><table class="tabela"><thead><tr><th>Conta</th><th>Budget</th><th>Forecast</th><th>Realizado</th><th>Variação</th><th>Ações</th></tr></thead><tbody id="listaLinhasGerenciais"><tr><td colspan="6">Carregando...</td></tr></tbody></table></div></section>`);
