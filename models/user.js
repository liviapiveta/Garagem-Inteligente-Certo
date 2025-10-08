// models/User.js

import mongoose from 'mongoose'
const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: {
        type: String,
        required: [true, 'O e-mail é obrigatório'],
        unique: true, // Garante que não haverá dois usuários com o mesmo e-mail
        lowercase: true, // Salva sempre o e-mail em minúsculas
        trim: true // Remove espaços em branco do início e do fim
    },
    password: {
        type: String,
        required: [true, 'A senha é obrigatória']
    }
}, {
    timestamps: true // Adiciona os campos createdAt e updatedAt automaticamente
});

export default mongoose.model('User', userSchema);