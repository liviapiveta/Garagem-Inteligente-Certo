// URL base do seu backend
const backendUrl = 'https://garagem-inteligente-certo.vercel.app';

// --- Variáveis de Estado da Aplicação ---
let veiculoSelecionado = null;
let previsaoCompleta = [];
let detalhesTecnicosSelecionados = null;

// --- ELEMENTOS DE AUTENTICAÇÃO E UI PRINCIPAL ---
const authSection = document.getElementById('auth-section');
const appSections = document.getElementById('app-sections');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const registerEmail = document.getElementById('registerEmail');
const registerPassword = document.getElementById('registerPassword');
const authTitle = document.getElementById('auth-title');
const switchToRegister = document.getElementById('switchToRegister');
const switchToLogin = document.getElementById('switchToLogin');
const logoutBtn = document.getElementById('logoutBtn');
const showLoginBtn = document.getElementById('showLoginBtn');
const showRegisterBtn = document.getElementById('showRegisterBtn');
const listaVeiculos = document.getElementById('listaVeiculos');
const areaVeiculoSelecionado = document.getElementById('areaVeiculoSelecionado');

// --- FUNÇÕES AUXILIARES DE AUTENTICAÇÃO ---

function getToken() {
    return localStorage.getItem('token');
}

function isAuthenticated() {
    return !!getToken();
}

function getAuthHeaders() {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

// --- LÓGICA DE GERENCIAMENTO DE UI (AUTENTICAÇÃO) ---

function updateAuthUI() {
    if (isAuthenticated()) {
        authSection.classList.add('hidden');
        appSections.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        showLoginBtn.classList.add('hidden');
        showRegisterBtn.classList.add('hidden');
        carregarVeiculos();
    } else {
        authSection.classList.remove('hidden');
        appSections.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        showLoginBtn.classList.remove('hidden');
        showRegisterBtn.classList.remove('hidden');
        
        authTitle.textContent = 'Login';
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        listaVeiculos.innerHTML = '<li>Faça login para ver seus veículos.</li>';
        areaVeiculoSelecionado.classList.add('hidden');
    }
}

// --- FUNÇÕES DE INTERAÇÃO COM API DE AUTENTICAÇÃO ---

async function handleRegister(event) {
    event.preventDefault();
    const email = registerEmail.value;
    const password = registerPassword.value;

    try {
        const response = await fetch(`${backendUrl}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Erro ao registrar.');
        }

        showNotification('Usuário registrado com sucesso! Faça o login.', 'success');
        registerForm.reset();
        switchToLogin.click();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const email = loginEmail.value;
    const password = loginPassword.value;

    try {
        const response = await fetch(`${backendUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'E-mail ou senha inválidos.');
        }

        localStorage.setItem('token', data.token);
        showNotification('Login realizado com sucesso!', 'success');
        loginForm.reset();
        updateAuthUI();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    showNotification('Você saiu da sua conta.', 'info');
    veiculoSelecionado = null;
    updateAuthUI();
}

// --- FUNÇÃO PARA TORNAR VEÍCULO PÚBLICO/PRIVADO ---

async function togglePublicStatus() {
    if (!veiculoSelecionado) return showNotification("Nenhum veículo selecionado!", "error");

    const newStatus = !veiculoSelecionado.isPublic;
    const confirmMsg = newStatus 
        ? "Deseja tornar este veículo PÚBLICO? Ele será visível para todos."
        : "Deseja tornar este veículo PRIVADO? Apenas você poderá vê-lo.";

    if (!confirm(confirmMsg)) return;

    try {
        const response = await fetch(`${backendUrl}/api/veiculos/${veiculoSelecionado._id}/visibility`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ isPublic: newStatus })
        });

        if (response.status === 401) {
            showNotification('Sessão expirada. Faça login novamente.', 'error');
            handleLogout();
            return;
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao alterar visibilidade.');
        }

        veiculoSelecionado = await response.json();
        updatePublicButton();
        showNotification(
            newStatus ? 'Veículo agora é PÚBLICO! 🌍' : 'Veículo agora é PRIVADO! 🔒',
            'success'
        );
    } catch (error) {
        showNotification(`Erro: ${error.message}`, 'error');
    }
}

function updatePublicButton() {
    const btn = document.getElementById('btnTogglePublic');
    if (!btn || !veiculoSelecionado) return;
    
    // Verifica se o usuário é o dono
    const isOwner = veiculoSelecionado.userId === getUserIdFromToken();
    
    if (!isOwner) {
        btn.style.display = 'none';
        return;
    }
    
    btn.style.display = 'block';
    
    if (veiculoSelecionado.isPublic) {
        btn.textContent = '🔒 Tornar Privado';
        btn.style.backgroundColor = '#6c757d';
    } else {
        btn.textContent = '🌍 Tornar Público';
        btn.style.backgroundColor = '#198754';
    }
}

function getUserIdFromToken() {
    const token = getToken();
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId;
    } catch (e) {
        return null;
    }
}

// --- FUNÇÕES DE COMPARTILHAMENTO ---

async function compartilharVeiculo() {
    if (!veiculoSelecionado) return showNotification("Nenhum veículo selecionado!", "error");
    
    const email = document.getElementById('shareEmailInput').value.trim();
    if (!email) return showNotification("Digite um e-mail válido!", "error");
    
    // Verifica se é o dono
    const isOwner = veiculoSelecionado.userId === getUserIdFromToken();
    if (!isOwner) {
        return showNotification("Apenas o dono pode compartilhar o veículo!", "error");
    }
    
    try {
        const response = await fetch(`${backendUrl}/api/veiculos/${veiculoSelecionado._id}/share`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message);
        }
        
        veiculoSelecionado = data.veiculo;
        document.getElementById('shareEmailInput').value = '';
        renderizarUsuariosCompartilhados();
        showNotification(data.message, 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function removerCompartilhamento(shareUserId) {
    if (!veiculoSelecionado) return;
    
    if (!confirm('Deseja remover o compartilhamento com este usuário?')) return;
    
    try {
        const response = await fetch(`${backendUrl}/api/veiculos/${veiculoSelecionado._id}/share/${shareUserId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message);
        }
        
        veiculoSelecionado = data.veiculo;
        renderizarUsuariosCompartilhados();
        showNotification(data.message, 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function renderizarUsuariosCompartilhados() {
    const container = document.getElementById('sharedUsersList');
    const shareContainer = document.querySelector('.share-container');
    
    if (!veiculoSelecionado || !container || !shareContainer) return;
    
    // Verifica se é o dono
    const isOwner = veiculoSelecionado.userId === getUserIdFromToken();
    
    // Esconde toda a seção se não for o dono
    if (!isOwner) {
        shareContainer.style.display = 'none';
        return;
    }
    
    shareContainer.style.display = 'block';
    
    if (!veiculoSelecionado.sharedWith || veiculoSelecionado.sharedWith.length === 0) {
        container.innerHTML = '<p class="no-shares">Nenhum compartilhamento ativo</p>';
        return;
    }
    
    container.innerHTML = '<h4>Compartilhado com:</h4>';
    const ul = document.createElement('ul');
    ul.className = 'shared-users-list';
    
    veiculoSelecionado.sharedWith.forEach(share => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="shared-user-info">
                <span class="shared-email">👤 ${share.email}</span>
                <span class="shared-date">Desde: ${new Date(share.sharedAt).toLocaleDateString('pt-BR')}</span>
            </div>
            <button class="btn-pequeno btn-excluir" onclick="removerCompartilhamento('${share.userId}')">Remover</button>
        `;
        ul.appendChild(li);
    });
    
    container.appendChild(ul);
}

// --- FUNÇÕES EXISTENTES DA APLICAÇÃO ---

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
        placa: document.getElementById('placaInput').value.trim().toUpperCase(),
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
            headers: getAuthHeaders(),
            body: JSON.stringify(veiculo),
        });

        if (response.status === 401) {
            showNotification('Sessão expirada. Faça login novamente.', 'error');
            handleLogout();
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            let errorMessage = data.message || 'Não foi possível adicionar o veículo.';
            
            // Mensagem amigável para erro de placa duplicada
            if (errorMessage.includes('E11000') || errorMessage.includes('duplicate key') || errorMessage.includes('já tem')) {
                errorMessage = `Você já tem um veículo com a placa ${veiculo.placa} cadastrado na sua garagem!`;
            }
            
            throw new Error(errorMessage);
        }

        // Só mostra sucesso se realmente foi criado
        showNotification('Veículo adicionado com sucesso!', 'success');
        document.getElementById('formAdicionarVeiculo').reset();
        document.querySelector('details.card-collapsible').removeAttribute('open');
        verificarTipoVeiculo();
        carregarVeiculos();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function carregarVeiculos() {
    if (!isAuthenticated()) return;

    try {
        const response = await fetch(`${backendUrl}/api/veiculos`, {
            headers: getAuthHeaders()
        });

        if (response.status === 401) {
            showNotification('Sessão expirada. Faça login novamente.', 'error');
            handleLogout();
            return;
        }

        if (!response.ok) throw new Error('Falha ao carregar veículos.');
        
        const veiculos = await response.json();
        listaVeiculos.innerHTML = '';
        if (veiculos.length === 0) {
            listaVeiculos.innerHTML = '<li>Nenhum veículo cadastrado na garagem.</li>';
            return;
        }
        veiculos.forEach(veiculo => {
            const item = document.createElement('li');
            item.dataset.veiculoId = veiculo._id;
            const capitalize = s => s && s.charAt(0).toUpperCase() + s.slice(1);
            const publicBadge = veiculo.isPublic ? '<span style="color: #198754; font-weight: bold;">🌍 Público</span>' : '<span style="color: #6c757d;">🔒 Privado</span>';
            
            // Verifica se é compartilhado (não é o dono)
            const currentUserId = getUserIdFromToken();
            const isShared = veiculo.userId !== currentUserId;
            const sharedBadge = isShared ? '<span style="color: #0d6efd; font-weight: bold;">🤝 Compartilhado</span>' : '';
            
            item.innerHTML = `
                <div class="info-veiculo-lista">
                    <strong>${veiculo.marca} ${veiculo.modelo}</strong> (${veiculo.ano})
                    <small>Placa: ${veiculo.placa} | Tipo: ${capitalize(veiculo.tipo)} | ${publicBadge} ${sharedBadge}</small>
                </div>
                <div class="botoes-acao-lista">
                    ${!isShared ? `<button class="btn-editar" data-id="${veiculo._id}">Editar</button>` : ''}
                    ${!isShared ? `<button class="btn-excluir" data-id="${veiculo._id}">Excluir</button>` : ''}
                </div>`;
            listaVeiculos.appendChild(item);
        });
    } catch (error) {
        showNotification('Não foi possível carregar os veículos.', 'error');
        listaVeiculos.innerHTML = '<li>Erro ao carregar veículos.</li>';
    }
}

async function selecionarVeiculo(id) {
    try {
        if (!id) return;
        const response = await fetch(`${backendUrl}/api/veiculos/${id}`, {
            headers: getAuthHeaders()
        });
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
        updatePublicButton();
        renderizarUsuariosCompartilhados();
        document.getElementById('areaDetalhesExtras').classList.add('hidden');
        document.getElementById('btnEditarDetalhes').classList.add('hidden');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function interagir(acao) {
    if (!veiculoSelecionado) return showNotification("Nenhum veículo selecionado!", "error");

    if (acao === 'carregar' || acao === 'descarregar') {
        const quantidadeStr = prompt(`Quanto deseja ${acao}? (Atual: ${veiculoSelecionado.cargaAtual} kg)`);
        if (!quantidadeStr) return;
        const quantidade = parseFloat(quantidadeStr);
        if (isNaN(quantidade) || quantidade <= 0) return showNotification("Valor inválido.", "error");
        try {
            const response = await fetch(`${backendUrl}/api/veiculos/${veiculoSelecionado._id}/carga`, { 
                method: 'POST', 
                headers: getAuthHeaders(),
                body: JSON.stringify({ acao, quantidade }) 
            });
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
            const response = await fetch(`${backendUrl}/api/veiculos/${veiculoSelecionado._id}/estado`, { 
                method: 'PUT', 
                headers: getAuthHeaders(),
                body: JSON.stringify(estadoOtimista) 
            });
            if (!response.ok) throw new Error((await response.json()).message);
            veiculoSelecionado = await response.json();
        } catch (error) {
            showNotification(`Erro de sincronização: ${error.message}`, 'error');
            exibirInformacoesVeiculoSelecionado();
        }
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

// Clima
document.getElementById('buscar-clima-btn').addEventListener('click', async () => {
    const cidade = document.getElementById('cidade-input').value.trim();
    if (!cidade) return showNotification('Por favor, digite uma cidade.', 'error');
    const resultadoDiv = document.getElementById('previsao-resultado');
    resultadoDiv.innerHTML = '<p>Buscando previsão...</p>';
    try {
        const response = await fetch(`${backendUrl}/api/previsao/${cidade}`, { headers: getAuthHeaders() });
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

// Manutenções
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
        const response = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(registro) });
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
        const response = await fetch(`${backendUrl}/api/veiculos/${veiculoSelecionado._id}/manutencoes/${manutencaoId}`, { 
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const veiculoAtualizado = await response.json();
        if (!response.ok) throw new Error(veiculoAtualizado.message);
        veiculoSelecionado = veiculoAtualizado;
        renderizarHistoricoManutencao();
        showNotification('Registro deletado!', 'success');
    } catch (error) {
        showNotification(`Erro: ${error.message}`, 'error');
    }
}

// Lista de veículos - editar/excluir/selecionar
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
                const response = await fetch(`${backendUrl}/api/veiculos/${id}`, { 
                    method: 'DELETE',
                    headers: getAuthHeaders()
                });
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
            const response = await fetch(`${backendUrl}/api/veiculos/${id}`, { headers: getAuthHeaders() });
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

const formEdicao = document.getElementById('form-edicao');
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
        const response = await fetch(`${backendUrl}/api/veiculos/${id}`, { 
            method: 'PUT', 
            headers: getAuthHeaders(),
            body: JSON.stringify(dados) 
        });
        if(response.ok) {
            showNotification('Veículo atualizado!', 'success');
            fecharModal();
            carregarVeiculos();
            if (veiculoSelecionado && veiculoSelecionado._id === id) {
                await selecionarVeiculo(id);
            }
        } else { throw new Error((await response.json()).message) }
    } catch(error) { showNotification(`Erro: ${error.message}`, 'error'); }
});

const modalEdicao = document.getElementById('modal-edicao');
const modalDetalhes = document.getElementById('modal-detalhes');
const closeButton = modalEdicao.querySelector('.close-button');
const fecharModal = () => modalEdicao.classList.remove('active');
if (closeButton) closeButton.onclick = fecharModal;
window.onclick = (event) => { 
    if (event.target == modalEdicao || event.target == modalDetalhes) { 
        fecharModal(); 
        modalDetalhes.classList.remove('active'); 
    } 
}

function playSound(id) {
    const sound = document.getElementById(`som${id.charAt(0).toUpperCase() + id.slice(1)}`);
    if(sound) { sound.currentTime = 0; sound.play().catch(() => {}); }
}

function verificarTipoVeiculo() {
    const tipo = document.getElementById('tipoInput').value;
    document.getElementById('campoCapacidade').classList.toggle('hidden', tipo !== 'caminhao');
    document.getElementById('capacidadeInput').required = tipo === 'caminhao';
}

async function mostrarDetalhesExtras() {
    if (!veiculoSelecionado) return;
    const detalhesDiv = document.getElementById('areaDetalhesExtras');
    detalhesDiv.innerHTML = '<p>Buscando detalhes do modelo...</p>';
    detalhesDiv.classList.remove('hidden');

    try {
        const response = await fetch(`${backendUrl}/api/detalhes-tecnicos/find`, {
            method: 'POST',
            headers: getAuthHeaders(),
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
            headers: getAuthHeaders(),
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

// --- EVENT LISTENERS E INICIALIZAÇÃO ---

loginForm.addEventListener('submit', handleLogin);
registerForm.addEventListener('submit', handleRegister);
logoutBtn.addEventListener('click', handleLogout);

switchToRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    authTitle.textContent = 'Registro';
});

switchToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    authTitle.textContent = 'Login';
});

showLoginBtn.addEventListener('click', () => { authSection.classList.remove('hidden'); });
showRegisterBtn.addEventListener('click', () => { 
    authSection.classList.remove('hidden');
    switchToRegister.click();
});

document.getElementById('formAdicionarVeiculo').addEventListener('submit', adicionarVeiculo);

document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
});