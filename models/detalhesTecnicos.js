import mongoose from 'mongoose';

const detalhesSchema = new mongoose.Schema({
    marca: { type: String, required: true, uppercase: true, trim: true, maxlength: 50 },
    modelo: { type: String, required: true, uppercase: true, trim: true, maxlength: 50 },
    proximaRevisaoKm: { type: String, default: "Não definido", maxlength: 100 },
    pontosVerificar: { type: [String], default: ["Verificar documentação"] },
    recallInfo: { type: String, default: "Nenhuma informação de recall.", maxlength: 1000 }
});

detalhesSchema.index({ marca: 1, modelo: 1 }, { unique: true });

const DetalhesTecnicos = mongoose.model('DetalhesTecnicos', detalhesSchema);

export default DetalhesTecnicos;