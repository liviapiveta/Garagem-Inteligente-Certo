import mongoose from 'mongoose';

const manutencaoSchema = new mongoose.Schema({
    data: { type: Date, required: true },
    tipoServico: { type: String, required: true, trim: true, maxlength: 100 },
    descricao: { type: String, trim: true, maxlength: 500 },
    custo: { type: Number, min: 0, default: 0 }
});

const veiculoSchema = new mongoose.Schema({
    // Adiciona o userId para vincular o veículo ao usuário
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    // Array de usuários que têm acesso compartilhado
    sharedWith: [{
        userId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User'
        },
        email: String,
        sharedAt: { type: Date, default: Date.now }
    }],
    placa: { 
        type: String, 
        required: true, 
        trim: true, 
        uppercase: true, 
        minlength: 7, 
        maxlength: 7 
    },
    marca: { type: String, required: true, trim: true, maxlength: 50 },
    modelo: { type: String, required: true, trim: true, maxlength: 50 },
    ano: { type: Number, required: true, min: 1900, max: 2030 },
    cor: { type: String, trim: true, maxlength: 30 },
    tipo: { type: String, required: true, enum: ['carro', 'esportivo', 'caminhao'] },
    ligado: { type: Boolean, default: false },
    velocidade: { type: Number, default: 0, min: 0 },
    turboAtivado: { type: Boolean, default: false },
    capacidadeCarga: { type: Number, default: 0, min: 0 },
    cargaAtual: { type: Number, default: 0, min: 0 },
    isPublic: { type: Boolean, default: false },
    manutencoes: [manutencaoSchema]
});

// Índice composto: placa única apenas para o mesmo usuário
veiculoSchema.index({ placa: 1, userId: 1 }, { unique: true });

const Veiculo = mongoose.model('Veiculo', veiculoSchema);

export default Veiculo;