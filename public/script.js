const backendUrl = 'https://b3-p1-a1.vercel.app';
let veiculoSelecionado = null;
let previsaoCompleta = [];
let detalhesTecnicosSelecionados = null;

function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    container.appendChild(notification);
    setTimeout(() => {
        notification.classList.add('exit');
        notification.addEventListener('animationend', () => notification.remove());
    }, 4000);
}

async function adicionarVeiculo(event) {
    event.preventDefault();
    const veiculo = {
        placa: document.getElementById('placaInput').value.trim(),
        marca: document.getElementById('marcaInput').value.trim(),
        modelo: document.getElementById('modeloInput').value.trim(),
        ano: parseInt(document.getElementById('anoInput').value),
        cor: document.getElementById('corInput').value.trim(),
        tipo: document.getElementById('tipoInput').value
    };
    if (veiculo.tipo === 'caminhao') {
        veiculo.capacidadeCarga = parseInt(document.getElementById('capacidadeInput').value);
        if (isNaN(veiculo.capacidadeCarga) || veiculo.capacidadeCarga <= 0) {
            return showNotification('Capacidade de carga inválida para caminhão.', 'error');
        }
    }
    try {
        const response = await fetch(`${backendUrl}/api/veiculos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(veiculo),
        });
        if (!response.ok) throw new Error((await response.json()).message);
        showNotification('Veículo adicionado com sucesso!', 'success');
        document.getElementById('formAdicionarVeiculo').reset();
        document.querySelector('details.card-collapsible').removeAttribute('open');
        verificarTipoVeiculo();
        carregarVeiculos();
    } catch (error) {
        showNotification(`Erro: ${error.message}`, 'error');
    }
}

async function carregarVeiculos() {
    try {
        const response = await fetch(`${backendUrl}/api/veiculos`);
        if (!response.ok) throw new Error('Erro ao buscar veículos');
        const veiculos = await response.json();
        const listaVeiculos = document.getElementById('listaVeiculos');
        listaVeiculos.innerHTML = '';
        if (veiculos.length === 0) {
            listaVeiculos.innerHTML = '<li>Nenhum veículo cadastrado na garagem.</li>';
            return;
        }
        veiculos.forEach(veiculo => {
            const item = document.createElement('li');
            item.dataset.veiculoId = veiculo._id;
            const capitalize = s => s && s.charAt(0).toUpperCase() + s.slice(1);
            item.innerHTML = `
                <div class="info-veiculo-lista">
                    <strong>${veiculo.marca} ${veiculo.modelo}</strong> (${veiculo.ano})
                    <small>Placa: ${veiculo.placa} | Tipo: ${capitalize(veiculo.tipo)}</small>
                </div>
                <div class="botoes-acao-lista">
                    <button class="btn-editar" data-id="${veiculo._id}">Editar</button>
                    <button class="btn-excluir" data-id="${veiculo._id}">Excluir</button>
                </div>`;
            listaVeiculos.appendChild(item);
        });
    } catch (error) {
        showNotification('Não foi possível carregar os veículos.', 'error');
    }
}

async function selecionarVeiculo(id) {
    try {
        if (!id) return;
        const response = await fetch(`${backendUrl}/api/veiculos/${id}`);
        if (!response.ok) throw new Error('Não foi possível carregar os dados do veículo.');
        veiculoSelecionado = await response.json();
        document.querySelectorAll('#listaVeiculos li').forEach(item => {
            item.classList.toggle('selected', item.dataset.veiculoId === id);
        });
        document.getElementById('areaVeiculoSelecionado').classList.remove('hidden');
        document.getElementById('placeholder-selecao').classList.add('hidden');
        document.getElementById('conteudo-veiculo').classList.remove('hidden');
        exibirInformacoesVeiculoSelecionado();
        renderizarHistoricoManutencao();
        document.getElementById('areaDetalhesExtras').classList.add('hidden');
        document.getElementById('btnEditarDetalhes').classList.add('hidden');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function exibirInformacoesVeiculoSelecionado() {
    if (!veiculoSelecionado) return;
    const { informacoesVeiculoDiv, imagemVeiculo, btnTurboOn, btnTurboOff, btnCarregar, btnDescarregar } = {
        informacoesVeiculoDiv: document.getElementById("informacoesVeiculo"),
        imagemVeiculo: document.getElementById("imagemVeiculo"),
        btnTurboOn: document.getElementById("btnTurboOn"),
        btnTurboOff: document.getElementById("btnTurboOff"),
        btnCarregar: document.getElementById("btnCarregar"),
        btnDescarregar: document.getElementById("btnDescarregar")
    };
    const status = veiculoSelecionado.ligado ? `<span class="status-ligado">Ligado</span>` : `<span class="status-desligado">Desligado</span>`;
    const capitalize = s => s && s.charAt(0).toUpperCase() + s.slice(1);
    let turboStatusHTML = veiculoSelecionado.tipo === 'esportivo' ? `<br>Turbo: ${veiculoSelecionado.turboAtivado ? "Ativado" : "Desativado"}` : '';
    let caminhaoStatusHTML = veiculoSelecionado.tipo === 'caminhao' ? `<br>Capacidade: ${veiculoSelecionado.capacidadeCarga} kg<br>Carga Atual: ${veiculoSelecionado.cargaAtual} kg` : '';
    informacoesVeiculoDiv.innerHTML = `
        <strong>${veiculoSelecionado.marca} ${veiculoSelecionado.modelo} (${veiculoSelecionado.ano})</strong><br>
        Placa: ${veiculoSelecionado.placa} | Cor: ${veiculoSelecionado.cor || 'N/A'}<br>
        Status: ${status} ${turboStatusHTML} ${caminhaoStatusHTML}`;
    imagemVeiculo.src = `imagens/${veiculoSelecionado.tipo}.png`;
    btnTurboOn.classList.toggle('hidden', veiculoSelecionado.tipo !== 'esportivo');
    btnTurboOff.classList.toggle('hidden', veiculoSelecionado.tipo !== 'esportivo');
    btnCarregar.classList.toggle('hidden', veiculoSelecionado.tipo !== 'caminhao');
    btnDescarregar.classList.toggle('hidden', veiculoSelecionado.tipo !== 'caminhao');
    atualizarStatusVisual(veiculoSelecionado);
}

function atualizarStatusVisual(veiculo) {
    if (!veiculo) return;
    const { velocidadeProgress, statusVeiculoSpan, velocidadeTexto } = {
        velocidadeProgress: document.getElementById("velocidadeProgress"),
        statusVeiculoSpan: document.getElementById("statusVeiculo"),
        velocidadeTexto: document.getElementById("velocidadeTexto")
    };
    const velocidadeMaxima = veiculo.tipo === 'esportivo' && veiculo.turboAtivado ? 320 : 180;
    const porcentagem = veiculo.velocidade > 0 ? (veiculo.velocidade / velocidadeMaxima) * 100 : 0;
    velocidadeProgress.style.width = `${Math.min(100, Math.max(0, porcentagem))}%`;
    velocidadeTexto.textContent = `${Math.round(veiculo.velocidade)} km/h`;
    statusVeiculoSpan.className = veiculo.ligado ? "status-ligado" : "status-desligado";
    statusVeiculoSpan.textContent = veiculo.ligado ? "Ligado" : "Desligado";
}

async function interagir(acao) {
    if (!veiculoSelecionado) return showNotification("Nenhum veículo selecionado!", "error");

    if (acao === 'carregar' || acao === 'descarregar') {
        const quantidadeStr = prompt(`Quanto deseja ${acao}? (Atual: ${veiculoSelecionado.cargaAtual} kg)`);
        if (!quantidadeStr) return;
        const quantidade = parseFloat(quantidadeStr);
        if (isNaN(quantidade) || quantidade <= 0) return showNotification("Valor inválido.", "error");
        try {
            const response = await fetch(`${backendUrl}/api/veiculos/${veiculoSelecionado._id}/carga`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao, quantidade }) });
            const resultado = await response.json();
            if (!response.ok) throw new Error(resultado.message);
            veiculoSelecionado = resultado;
            exibirInformacoesVeiculoSelecionado();
            showNotification(`Operação de ${acao} realizada com sucesso!`, 'success');
        } catch (error) {
            showNotification(`Erro: ${error.message}`, 'error');
        }
        return;
    }

    let estadoOtimista = { ...veiculoSelecionado };
    let deveAtualizarServidor = true;

    switch (acao) {
        case "acelerar": if (!estadoOtimista.ligado) { deveAtualizarServidor = false; break; } estadoOtimista.velocidade += estadoOtimista.turboAtivado ? 25 : 10; playSound("acelerar"); break;
        case "frear": estadoOtimista.velocidade = Math.max(0, estadoOtimista.velocidade - 10); playSound("frear"); break;
        case "ligar": if (estadoOtimista.ligado) { deveAtualizarServidor = false; } else { estadoOtimista.ligado = true; } playSound("ligar"); break;
        case "desligar": if (!estadoOtimista.ligado || estadoOtimista.velocidade > 0) { deveAtualizarServidor = false; } else { estadoOtimista.ligado = false; estadoOtimista.turboAtivado = false; } playSound("desligar"); break;
        case "ativarTurbo": if (estadoOtimista.turboAtivado || !estadoOtimista.ligado) { deveAtualizarServidor = false; } else { estadoOtimista.turboAtivado = true; } break;
        case "desativarTurbo": if (!estadoOtimista.turboAtivado) { deveAtualizarServidor = false; } else { estadoOtimista.turboAtivado = false; } break;
        case "buzinar": playSound("buzinar"); deveAtualizarServidor = false; break;
        default: deveAtualizarServidor = false; break;
    }
    
    exibirInformacoesVeiculoSelecionadoComEstado(estadoOtimista);

    if (deveAtualizarServidor) {
        try {
            const response = await fetch(`${backendUrl}/api/veiculos/${veiculoSelecionado._id}/estado`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(estadoOtimista) });
            if (!response.ok) throw new Error((await response.json()).message);
            veiculoSelecionado = await response.json();
        } catch (error) {
            showNotification(`Erro de sincronização: ${error.message}`, 'error');
            exibirInformacoesVeiculoSelecionado();
        }
    }
}

function exibirInformacoesVeiculoSelecionadoComEstado(estado) {
    if (!estado) return;
    const informacoesVeiculoDiv = document.getElementById("informacoesVeiculo");
    const status = estado.ligado ? `<span class="status-ligado">Ligado</span>` : `<span class="status-desligado">Desligado</span>`;
    const capitalize = s => s && s.charAt(0).toUpperCase() + s.slice(1);
    let turboStatusHTML = estado.tipo === 'esportivo' ? `<br>Turbo: ${estado.turboAtivado ? "Ativado" : "Desativado"}` : '';
    let caminhaoStatusHTML = estado.tipo === 'caminhao' ? `<br>Capacidade: ${estado.capacidadeCarga} kg<br>Carga Atual: ${estado.cargaAtual} kg` : '';
    informacoesVeiculoDiv.innerHTML = `
        <strong>${estado.marca} ${estado.modelo} (${estado.ano})</strong><br>
        Placa: ${estado.placa} | Cor: ${estado.cor || 'N/A'}<br>
        Status: ${status} ${turboStatusHTML} ${caminhaoStatusHTML}`;
    atualizarStatusVisual(estado);
}

document.getElementById('buscar-clima-btn').addEventListener('click', async () => {
    const cidade = document.getElementById('cidade-input').value.trim();
    if (!cidade) return showNotification('Por favor, digite uma cidade.', 'error');
    const resultadoDiv = document.getElementById('previsao-resultado');
    resultadoDiv.innerHTML = '<p>Buscando previsão...</p>';
    try {
        const response = await fetch(`${backendUrl}/api/previsao/${cidade}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        previsaoCompleta = processarDadosPrevisao(data);
        document.querySelector('.filtro-dia[data-dias="5"]').click();
        document.getElementById('previsao-controles').classList.remove('hidden');
    } catch (error) {
        resultadoDiv.innerHTML = `<p style="color:red;">${error.message}</p>`;
    }
});

document.querySelectorAll('.filtro-dia').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filtro-dia').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderizarPrevisao(previsaoCompleta.slice(0, parseInt(btn.dataset.dias)));
    });
});

function processarDadosPrevisao(data) {
    const porDia = {};
    data.list.forEach(item => {
        const dia = item.dt_txt.split(' ')[0];
        if (!porDia[dia]) porDia[dia] = { temps: [], icons: [], descs: [] };
        porDia[dia].temps.push(item.main.temp);
        porDia[dia].icons.push(item.weather[0].icon);
        porDia[dia].descs.push(item.weather[0].description);
    });
    return Object.keys(porDia).map(dia => ({
        data: new Date(dia + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
        temp_min: Math.min(...porDia[dia].temps), temp_max: Math.max(...porDia[dia].temps),
        icone: porDia[dia].icons[Math.floor(porDia[dia].icons.length / 2)],
        descricao: porDia[dia].descs[Math.floor(porDia[dia].descs.length / 2)],
    }));
}

function renderizarPrevisao(previsao) {
    const resultadoDiv = document.getElementById('previsao-resultado');
    resultadoDiv.innerHTML = '';
    previsao.forEach(dia => {
        const card = document.createElement('div');
        card.className = 'previsao-card';
        card.innerHTML = `<h4>${dia.data}</h4><img src="https://openweathermap.org/img/wn/${dia.icone}.png" alt="${dia.descricao}"><p class="previsao-temp"><strong>${Math.round(dia.temp_max)}°</strong> / ${Math.round(dia.temp_min)}°</p>`;
        resultadoDiv.appendChild(card);
    });
}

const modalManutencao = document.getElementById('modal-manutencao');
const formManutencao = document.getElementById('form-manutencao');
document.getElementById('btnAdicionarManutencao').addEventListener('click', () => abrirModalManutencao('add'));

function renderizarHistoricoManutencao() {
    const container = document.getElementById('historicoManutencao');
    container.innerHTML = '';
    if (!veiculoSelecionado || veiculoSelecionado.manutencoes.length === 0) {
        container.innerHTML = '<p>Nenhum registro de manutenção.</p>';
        return;
    }
    const ul = document.createElement('ul');
    veiculoSelecionado.manutencoes.sort((a, b) => new Date(b.data) - new Date(a.data)).forEach(reg => {
        const li = document.createElement('li');
        li.innerHTML = `<div class="manutencao-info"><span class="servico">${reg.tipoServico}</span><span class="data">${new Date(reg.data).toLocaleDateString('pt-BR')} - Custo: R$ ${reg.custo.toFixed(2)}</span></div><div class="manutencao-acoes"><button class="btn-pequeno btn-editar" onclick="abrirModalManutencao('edit', '${reg._id}')">Editar</button><button class="btn-pequeno btn-excluir" onclick="deletarManutencao('${reg._id}')">X</button></div>`;
        ul.appendChild(li);
    });
    container.appendChild(ul);
}

function abrirModalManutencao(modo, id = null) {
    formManutencao.reset();
    document.getElementById('modal-manutencao-titulo').textContent = modo === 'add' ? 'Adicionar Manutenção' : 'Editar Manutenção';
    document.getElementById('manutencao-id').value = id;
    if (modo === 'edit' && id) {
        const reg = veiculoSelecionado.manutencoes.find(m => m._id === id);
        if (reg) {
            document.getElementById('manutencao-data').value = new Date(reg.data).toISOString().split('T')[0];
            document.getElementById('manutencao-servico').value = reg.tipoServico;
            document.getElementById('manutencao-custo').value = reg.custo;
            document.getElementById('manutencao-descricao').value = reg.descricao;
        }
    }
    modalManutencao.classList.add('active');
}

modalManutencao.querySelector('.close-button').onclick = () => modalManutencao.classList.remove('active');

formManutencao.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = document.getElementById('manutencao-id').value;
    const registro = {
        data: document.getElementById('manutencao-data').value,
        tipoServico: document.getElementById('manutencao-servico').value,
        custo: parseFloat(document.getElementById('manutencao-custo').value) || 0,
        descricao: document.getElementById('manutencao-descricao').value,
    };
    const url = id ? `${backendUrl}/api/veiculos/${veiculoSelecionado._id}/manutencoes/${id}` : `${backendUrl}/api/veiculos/${veiculoSelecionado._id}/manutencoes`;
    const method = id ? 'PUT' : 'POST';
    try {
        const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(registro) });
        const veiculoAtualizado = await response.json();
        if (!response.ok) throw new Error(veiculoAtualizado.message);
        veiculoSelecionado = veiculoAtualizado;
        renderizarHistoricoManutencao();
        modalManutencao.classList.remove('active');
        showNotification('Registro salvo!', 'success');
    } catch (error) {
        showNotification(`Erro: ${error.message}`, 'error');
    }
});

async function deletarManutencao(manutencaoId) {
    if (!confirm('Tem certeza?')) return;
    try {
        const response = await fetch(`${backendUrl}/api/veiculos/${veiculoSelecionado._id}/manutencoes/${manutencaoId}`, { method: 'DELETE' });
        const veiculoAtualizado = await response.json();
        if (!response.ok) throw new Error(veiculoAtualizado.message);
        veiculoSelecionado = veiculoAtualizado;
        renderizarHistoricoManutencao();
        showNotification('Registro deletado!', 'success');
    } catch (error) {
        showNotification(`Erro: ${error.message}`, 'error');
    }
}

async function mostrarDetalhesExtras() {
    if (!veiculoSelecionado) return;
    const detalhesDiv = document.getElementById('areaDetalhesExtras');
    detalhesDiv.innerHTML = '<p>Buscando detalhes do modelo...</p>';
    detalhesDiv.classList.remove('hidden');

    try {
        const response = await fetch(`${backendUrl}/api/detalhes-tecnicos/find`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ marca: veiculoSelecionado.marca, modelo: veiculoSelecionado.modelo })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        detalhesTecnicosSelecionados = data;
        renderizarDetalhesTecnicos(data);
        document.getElementById('btnEditarDetalhes').classList.remove('hidden');
    } catch (e) {
        detalhesDiv.innerHTML = `<p style="color:red">Erro ao buscar detalhes.</p>`;
    }
}

function renderizarDetalhesTecnicos(detalhes) {
    const detalhesDiv = document.getElementById('areaDetalhesExtras');
    const recallHTML = `<div class="recall-info"><p><strong>Recall:</strong> ${detalhes.recallInfo}</p></div>`;
    detalhesDiv.innerHTML = `
        <h4>Detalhes para ${detalhes.marca} ${detalhes.modelo}</h4>
        <p><strong>Próxima Revisão:</strong> ${detalhes.proximaRevisaoKm}</p>
        <p><strong>Itens a Verificar:</strong></p>
        <ul>${detalhes.pontosVerificar.map(p => `<li>${p}</li>`).join('')}</ul>
        ${recallHTML}`;
}

const modalDetalhes = document.getElementById('modal-detalhes');
const formDetalhes = document.getElementById('form-detalhes');
document.getElementById('btnEditarDetalhes').addEventListener('click', () => abrirModalDetalhes());

function abrirModalDetalhes() {
    if (!detalhesTecnicosSelecionados) return;
    document.getElementById('detalhes-id').value = detalhesTecnicosSelecionados._id;
    document.getElementById('detalhes-revisao').value = detalhesTecnicosSelecionados.proximaRevisaoKm;
    document.getElementById('detalhes-pontos').value = detalhesTecnicosSelecionados.pontosVerificar.join('\n');
    document.getElementById('detalhes-recall').value = detalhesTecnicosSelecionados.recallInfo;
    modalDetalhes.classList.add('active');
}

modalDetalhes.querySelector('.close-button').onclick = () => modalDetalhes.classList.remove('active');

formDetalhes.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = document.getElementById('detalhes-id').value;
    const dados = {
        proximaRevisaoKm: document.getElementById('detalhes-revisao').value,
        pontosVerificar: document.getElementById('detalhes-pontos').value.split('\n').filter(p => p.trim() !== ''),
        recallInfo: document.getElementById('detalhes-recall').value,
    };
    try {
        const response = await fetch(`${backendUrl}/api/detalhes-tecnicos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        const atualizado = await response.json();
        if (!response.ok) throw new Error(atualizado.message);
        detalhesTecnicosSelecionados = atualizado;
        renderizarDetalhesTecnicos(atualizado);
        modalDetalhes.classList.remove('active');
        showNotification('Detalhes técnicos atualizados!', 'success');
    } catch(error) {
        showNotification(`Erro ao salvar: ${error.message}`, 'error');
    }
});

function verificarTipoVeiculo() {
    const tipo = document.getElementById('tipoInput').value;
    document.getElementById('campoCapacidade').classList.toggle('hidden', tipo !== 'caminhao');
    document.getElementById('capacidadeInput').required = tipo === 'caminhao';
}

const modalEdicao = document.getElementById('modal-edicao');
const formEdicao = document.getElementById('form-edicao');
const closeButton = modalEdicao.querySelector('.close-button');
const fecharModal = () => modalEdicao.classList.remove('active');

if (closeButton) closeButton.onclick = fecharModal;
window.onclick = (event) => { if (event.target == modalEdicao || event.target == modalDetalhes) { fecharModal(); modalDetalhes.classList.remove('active'); } }

document.getElementById('listaVeiculos').addEventListener('click', async (event) => {
    const target = event.target;
    const editButton = target.closest('.btn-editar');
    const deleteButton = target.closest('.btn-excluir');
    const listItem = target.closest('li');
    if (!listItem) return;
    if (deleteButton) {
        const id = deleteButton.dataset.id;
        if (confirm('Tem certeza?')) {
            try {
                const response = await fetch(`${backendUrl}/api/veiculos/${id}`, { method: 'DELETE' });
                if (response.ok) {
                    showNotification('Veículo excluído!', 'success');
                    if (veiculoSelecionado && veiculoSelecionado._id === id) {
                        veiculoSelecionado = null;
                        document.getElementById('conteudo-veiculo').classList.add('hidden');
                        document.getElementById('placeholder-selecao').classList.remove('hidden');
                    }
                    carregarVeiculos();
                } else { throw new Error('Falha ao excluir.'); }
            } catch (error) { showNotification(`Erro: ${error.message}`, 'error'); }
        }
    } else if (editButton) {
        const id = editButton.dataset.id;
        try {
            const response = await fetch(`${backendUrl}/api/veiculos/${id}`);
            if (!response.ok) throw new Error('Não foi possível carregar dados.');
            const veiculo = await response.json();
            document.getElementById('edit-id').value = veiculo._id;
            document.getElementById('edit-placa').value = veiculo.placa;
            document.getElementById('edit-marca').value = veiculo.marca;
            document.getElementById('edit-modelo').value = veiculo.modelo;
            document.getElementById('edit-ano').value = veiculo.ano;
            document.getElementById('edit-cor').value = veiculo.cor;
            modalEdicao.classList.add('active');
        } catch(error) { showNotification(error.message, 'error'); }
    } else {
        selecionarVeiculo(listItem.dataset.veiculoId);
    }
});

if (formEdicao) formEdicao.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = document.getElementById('edit-id').value;
    const dados = {
        placa: document.getElementById('edit-placa').value,
        marca: document.getElementById('edit-marca').value,
        modelo: document.getElementById('edit-modelo').value,
        ano: document.getElementById('edit-ano').value,
        cor: document.getElementById('edit-cor').value,
    };
    try {
        const response = await fetch(`${backendUrl}/api/veiculos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
        if(response.ok) {
            showNotification('Veículo atualizado!', 'success');
            fecharModal();
            carregarVeiculos();
        } else { throw new Error((await response.json()).message) }
    } catch(error) { showNotification(`Erro: ${error.message}`, 'error'); }
});

function playSound(id) {
    const sound = document.getElementById(`som${id.charAt(0).toUpperCase() + id.slice(1)}`);
    if(sound) { sound.currentTime = 0; sound.play().catch(() => {}); }
}

document.addEventListener('DOMContentLoaded', carregarVeiculos);