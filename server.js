import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import Veiculo from './models/veiculo.js';
import DetalhesTecnicos from './models/detalhesTecnicos.js';
import { authenticateToken } from './middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import authRoutes from './routes/auth.js';
import publicVehiclesRouter from './routes/publicVehicles.js';

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;
const apiKey = process.env.API_KEY;

const mongoUriCrud = process.env.MONGO_URI_CRUD;

async function connectCrudDB() {
    if (mongoose.connections[0].readyState) return;
    if (!mongoUriCrud) {
        console.error("ERRO FATAL: MONGO_URI_CRUD não definida!");
        process.exit(1);
    }
    try {
        await mongoose.connect(mongoUriCrud);
        console.log("🚀 Conectado ao MongoDB Atlas!");
    } catch (err) {
        console.error("❌ ERRO FATAL ao conectar ao MongoDB:", err.message);
        process.exit(1);
    }
}
connectCrudDB();

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

const apiReadOnlyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Muitas requisições de leitura enviadas, por favor, tente novamente mais tarde.'
});

const apiMutationLimiter = rateLimit({
    windowMs: 30 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Muitas requisições de modificação enviadas, por favor, tente novamente após 30 minutos.'
});

// --- ROTAS DE VEÍCULOS (PROTEGIDAS) ---

// Criar veículo - vincula ao userId
app.post('/api/veiculos', authenticateToken, apiMutationLimiter, async (req, res) => {
    try {
        const veiculoData = { 
            ...req.body, 
            userId: req.userId // Adiciona o userId do token
        };
        const v = await Veiculo.create(veiculoData);
        res.status(201).json(v);
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
});

// Listar veículos do usuário logado
app.get('/api/veiculos', authenticateToken, apiReadOnlyLimiter, async (req, res) => {
    try {
        // Busca veículos próprios OU compartilhados com o usuário
        const v = await Veiculo.find({
            $or: [
                { userId: req.userId },
                { 'sharedWith.userId': req.userId }
            ]
        }).sort({ _id: -1 });
        res.json(v);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// Buscar veículo específico (apenas do usuário)
app.get('/api/veiculos/:id', authenticateToken, apiReadOnlyLimiter, async (req, res) => {
    try {
        const v = await Veiculo.findOne({ _id: req.params.id, userId: req.userId });
        if (!v) return res.status(404).json({ message: "Veículo não encontrado." });
        res.json(v);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// Atualizar veículo (apenas do usuário)
app.put('/api/veiculos/:id', authenticateToken, apiMutationLimiter, async (req, res) => {
    try {
        const v = await Veiculo.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            req.body,
            { new: true, runValidators: true }
        );
        if (!v) return res.status(404).json({ message: "Veículo não encontrado." });
        res.json(v);
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
});

// Deletar veículo (apenas do usuário)
app.delete('/api/veiculos/:id', authenticateToken, apiMutationLimiter, async (req, res) => {
    try {
        const v = await Veiculo.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!v) return res.status(404).json({ message: "Veículo não encontrado." });
        res.json({ message: "Veículo deletado." });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// Atualizar estado do veículo
app.put('/api/veiculos/:id/estado', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { ligado, velocidade, turboAtivado } = req.body;
        const v = await Veiculo.findOneAndUpdate(
            { _id: id, userId: req.userId },
            { ligado, velocidade, turboAtivado },
            { new: true }
        );
        if (!v) return res.status(404).json({ message: "Veículo não encontrado." });
        res.json(v);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// Gerenciar carga do caminhão
app.post('/api/veiculos/:id/carga', authenticateToken, async (req, res) => {
    try {
        const v = await Veiculo.findOne({ _id: req.params.id, userId: req.userId });
        if (!v || v.tipo !== 'caminhao' || v.ligado) {
            return res.status(400).json({ message: "Ação inválida." });
        }
        const q = parseFloat(req.body.quantidade);
        if (isNaN(q) || q <= 0) {
            return res.status(400).json({ message: "Quantidade inválida." });
        }
        if (req.body.acao === 'carregar') {
            if (v.cargaAtual + q > v.capacidadeCarga) {
                return res.status(400).json({ message: "Capacidade excedida!" });
            }
            v.cargaAtual += q;
        } else if (req.body.acao === 'descarregar') {
            if (v.cargaAtual - q < 0) {
                return res.status(400).json({ message: "Carga insuficiente." });
            }
            v.cargaAtual -= q;
        }
        const va = await v.save();
        res.json(va);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// Tornar veículo público/privado
app.patch('/api/veiculos/:id/visibility', authenticateToken, apiMutationLimiter, async (req, res) => {
    try {
        const { isPublic } = req.body;
        const v = await Veiculo.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            { isPublic: !!isPublic },
            { new: true }
        );
        if (!v) return res.status(404).json({ message: "Veículo não encontrado." });
        res.json(v);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// Compartilhar veículo com outro usuário
app.post('/api/veiculos/:id/share', authenticateToken, apiMutationLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: "E-mail é obrigatório." });
        }

        // Busca o veículo (só o dono pode compartilhar)
        const veiculo = await Veiculo.findOne({ _id: req.params.id, userId: req.userId });
        if (!veiculo) {
            return res.status(404).json({ message: "Veículo não encontrado ou você não é o dono." });
        }

        // Busca o usuário pelo e-mail
        const User = mongoose.model('User');
        const targetUser = await User.findOne({ email: email.toLowerCase() });
        if (!targetUser) {
            return res.status(404).json({ message: "Usuário com este e-mail não encontrado." });
        }

        // Não pode compartilhar consigo mesmo
        if (targetUser._id.toString() === req.userId.toString()) {
            return res.status(400).json({ message: "Você não pode compartilhar com você mesmo!" });
        }

        // Verifica se já está compartilhado
        const jaCompartilhado = veiculo.sharedWith.some(
            share => share.userId.toString() === targetUser._id.toString()
        );
        
        if (jaCompartilhado) {
            return res.status(400).json({ message: "Veículo já compartilhado com este usuário." });
        }

        // Adiciona ao array de compartilhamentos
        veiculo.sharedWith.push({
            userId: targetUser._id,
            email: targetUser.email,
            sharedAt: new Date()
        });

        await veiculo.save();
        res.json({ message: `Veículo compartilhado com ${email}!`, veiculo });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// Remover compartilhamento
app.delete('/api/veiculos/:id/share/:shareUserId', authenticateToken, apiMutationLimiter, async (req, res) => {
    try {
        // Busca o veículo (só o dono pode remover compartilhamento)
        const veiculo = await Veiculo.findOne({ _id: req.params.id, userId: req.userId });
        if (!veiculo) {
            return res.status(404).json({ message: "Veículo não encontrado ou você não é o dono." });
        }

        // Remove do array
        veiculo.sharedWith = veiculo.sharedWith.filter(
            share => share.userId.toString() !== req.params.shareUserId
        );

        await veiculo.save();
        res.json({ message: "Compartilhamento removido!", veiculo });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// Previsão do tempo
app.get('/api/previsao/:cidade', authenticateToken, apiReadOnlyLimiter, async (req, res) => {
    const u = `https://api.openweathermap.org/data/2.5/forecast?q=${req.params.cidade}&appid=${apiKey}&units=metric&lang=pt_br`;
    try {
        const r = await axios.get(u);
        res.json(r.data);
    } catch (e) {
        res.status(e.response?.status || 500).json({ error: e.response?.data?.message || 'Erro.' });
    }
});

// Manutenções
app.post('/api/veiculos/:id/manutencoes', authenticateToken, apiMutationLimiter, async (req, res) => {
    try {
        const v = await Veiculo.findOne({ _id: req.params.id, userId: req.userId });
        if (!v) return res.status(404).json({ message: "Veículo não encontrado." });
        v.manutencoes.push(req.body);
        await v.save();
        res.status(201).json(v);
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
});

app.put('/api/veiculos/:id/manutencoes/:manutencaoId', authenticateToken, apiReadOnlyLimiter, async (req, res) => {
    try {
        const v = await Veiculo.findOne({ _id: req.params.id, userId: req.userId });
        if (!v) return res.status(404).json({ message: "Veículo não encontrado." });
        const m = v.manutencoes.id(req.params.manutencaoId);
        m.set(req.body);
        await v.save();
        res.json(v);
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
});

app.delete('/api/veiculos/:id/manutencoes/:manutencaoId', authenticateToken, apiMutationLimiter, async (req, res) => {
    try {
        const v = await Veiculo.findOne({ _id: req.params.id, userId: req.userId });
        if (!v) return res.status(404).json({ message: "Veículo não encontrado." });
        v.manutencoes.pull({ _id: req.params.manutencaoId });
        await v.save();
        res.json(v);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// Detalhes técnicos
app.post('/api/detalhes-tecnicos/find', authenticateToken, apiReadOnlyLimiter, async (req, res) => {
    try {
        const { marca, modelo } = req.body;
        if (!marca || !modelo) return res.status(400).json({ message: "Marca e modelo são obrigatórios." });
        const query = { marca: marca.toUpperCase(), modelo: modelo.toUpperCase() };
        const update = {
            $setOnInsert: {
                marca: marca.toUpperCase(),
                modelo: modelo.toUpperCase(),
                proximaRevisaoKm: "A cada 10.000 km",
                pontosVerificar: ["Nível do óleo", "Pressão dos pneus"],
                recallInfo: "Nenhum recall ativo encontrado."
            }
        };
        const options = { upsert: true, new: true, setDefaultsOnInsert: true };
        const detalhes = await DetalhesTecnicos.findOneAndUpdate(query, update, options);
        res.json(detalhes);
    } catch (e) {
        res.status(500).json({ message: "Erro ao buscar ou criar detalhes técnicos." });
    }
});

app.put('/api/detalhes-tecnicos/:id', authenticateToken, apiMutationLimiter, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const detalhesAtualizados = await DetalhesTecnicos.findByIdAndUpdate(id, updates, { new: true });
        if (!detalhesAtualizados) return res.status(404).json({ message: "Registro de detalhes não encontrado." });
        res.json(detalhesAtualizados);
    } catch (e) {
        res.status(400).json({ message: "Erro ao atualizar detalhes técnicos." });
    }
});

// Rotas públicas
app.use('/api/auth', authRoutes);
app.use('/api/public-vehicles', publicVehiclesRouter);

app.get("/", (req, res) => { res.sendFile(path.join(__dirname, "public", "index.html")); });
app.get("/public-garage", (req, res) => { res.sendFile(path.join(__dirname, "public", "publicGarage.html")); });

app.listen(port, () => { console.log(`✅ Servidor rodando em http://localhost:${port}`); });