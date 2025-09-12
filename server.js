import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import Veiculo from './models/veiculo.js';
import DetalhesTecnicos from './models/detalhesTecnicos.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

// --- CONFIGURAÇÃO DOS LIMITADORES DE REQUISIÇÃO ---

// Limite mais generoso para rotas de leitura (GET)
const apiReadOnlyLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutos
	max: 300, // Permite 100 requisições a cada 15 minutos por IP
	standardHeaders: true,
	legacyHeaders: false,
    message: 'Muitas requisições de leitura enviadas, por favor, tente novamente mais tarde.'
});

// Limite mais rigoroso para rotas que modificam dados
const apiMutationLimiter = rateLimit({
	windowMs: 30 * 60 * 1000, // 30 minutos
	max: 20, // Permite 20 requisições de modificação a cada 30 minutos por IP
	standardHeaders: true,
	legacyHeaders: false,
    message: 'Muitas requisições de modificação enviadas, por favor, tente novamente após 30 minutos.'
});


// --- APLICAÇÃO SELETIVA DOS LIMITADORES NAS ROTAS ---

app.post('/api/veiculos', apiMutationLimiter, async (req, res) => { try { const v = await Veiculo.create(req.body); res.status(201).json(v); } catch (e) { res.status(400).json({ message: e.message }); } });
app.get('/api/veiculos', apiReadOnlyLimiter, async (req, res) => { try { const v = await Veiculo.find().sort({ _id: -1 }); res.json(v); } catch (e) { res.status(500).json({ message: e.message }); } });
app.get('/api/veiculos/:id', apiReadOnlyLimiter, async (req, res) => { try { const v = await Veiculo.findById(req.params.id); if (!v) return res.status(404).json({ message: "Veículo não encontrado." }); res.json(v); } catch (e) { res.status(500).json({ message: e.message }); } });
app.put('/api/veiculos/:id', apiMutationLimiter, async (req, res) => { try { const v = await Veiculo.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!v) return res.status(404).json({ message: "Veículo não encontrado." }); res.json(v); } catch (e) { res.status(400).json({ message: e.message }); } });
app.delete('/api/veiculos/:id', apiMutationLimiter, async (req, res) => { try { const v = await Veiculo.findByIdAndDelete(req.params.id); if (!v) return res.status(404).json({ message: "Veículo não encontrado." }); res.json({ message: "Veículo deletado." }); } catch (e) { res.status(500).json({ message: e.message }); } });
app.put('/api/veiculos/:id/estado', async (req, res) => { try { const { id } = req.params; const { ligado, velocidade, turboAtivado } = req.body; const v = await Veiculo.findByIdAndUpdate(id, { ligado, velocidade, turboAtivado }, { new: true }); if (!v) return res.status(404).json({ message: "Veículo não encontrado." }); res.json(v); } catch (e) { res.status(500).json({ message: e.message }); } });
app.post('/api/veiculos/:id/carga', async (req, res) => { try { const v = await Veiculo.findById(req.params.id); if (!v || v.tipo !== 'caminhao' || v.ligado) return res.status(400).json({ message: "Ação inválida." }); const q = parseFloat(req.body.quantidade); if (isNaN(q) || q <= 0) return res.status(400).json({ message: "Quantidade inválida." }); if (req.body.acao === 'carregar') { if (v.cargaAtual + q > v.capacidadeCarga) return res.status(400).json({ message: "Capacidade excedida!" }); v.cargaAtual += q; } else if (req.body.acao === 'descarregar') { if (v.cargaAtual - q < 0) return res.status(400).json({ message: "Carga insuficiente." }); v.cargaAtual -= q; } const va = await v.save(); res.json(va); } catch (e) { res.status(500).json({ message: e.message }); } });
app.get('/api/previsao/:cidade', apiReadOnlyLimiter, async (req, res) => { const u = `https://api.openweathermap.org/data/2.5/forecast?q=${req.params.cidade}&appid=${apiKey}&units=metric&lang=pt_br`; try { const r = await axios.get(u); res.json(r.data); } catch (e) { res.status(e.response?.status || 500).json({ error: e.response?.data?.message || 'Erro.' }); } });
app.post('/api/veiculos/:id/manutencoes', apiMutationLimiter, async (req, res) => { try { const v = await Veiculo.findById(req.params.id); v.manutencoes.push(req.body); await v.save(); res.status(201).json(v); } catch (e) { res.status(400).json({ message: e.message }); } });
app.put('/api/veiculos/:id/manutencoes/:manutencaoId', apiReadOnlyLimiter, async (req, res) => { try { const v = await Veiculo.findById(req.params.id); const m = v.manutencoes.id(req.params.manutencaoId); m.set(req.body); await v.save(); res.json(v); } catch (e) { res.status(400).json({ message: e.message }); } });
app.delete('/api/veiculos/:id/manutencoes/:manutencaoId', apiMutationLimiter, async (req, res) => { try { const v = await Veiculo.findById(req.params.id); v.manutencoes.pull({ _id: req.params.manutencaoId }); await v.save(); res.json(v); } catch (e) { res.status(500).json({ message: e.message }); } });

app.post('/api/detalhes-tecnicos/find', apiReadOnlyLimiter, async (req, res) => {
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

app.put('/api/detalhes-tecnicos/:id', apiMutationLimiter, async (req, res) => {
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

app.get("/", (req, res) => { res.sendFile(path.join(__dirname, "index.html")); });
app.listen(port, () => { console.log(`✅ Servidor rodando em http://localhost:${port}`); });