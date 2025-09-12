import mongoose from 'mongoose';

const manutencaoSchema = new mongoose.Schema({
    data: { type: Date, required: true },
    tipoServico: { type: String, required: true, trim: true, maxlength: 100 },
    descricao: { type: String, trim: true, maxlength: 500 },
    custo: { type: Number, min: 0, default: 0 }
});

const veiculoSchema = new mongoose.Schema({
    placa: { type: String, required: true, unique: true, trim: true, uppercase: true, minlength: 7, maxlength: 7 },
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
    manutencoes: [manutencaoSchema]
});

const Veiculo = mongoose.model('Veiculo', veiculoSchema);

export default Veiculo;