// routes/auth.js

import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import User from '../models/user.js'

const router = express.Router();

// --- ROTA DE REGISTRO ---
// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Validar se os dados foram enviados
        if (!email || !password) {
            return res.status(400).json({ message: 'Por favor, forneça e-mail e senha.' });
        }

        // 2. Verificar se o usuário já existe no banco
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'Este e-mail já está cadastrado.' });
        }

        // 3. Criptografar a senha
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Criar o novo usuário
        const newUser = new User({
            email,
            password: hashedPassword
        });

        // 5. Salvar o usuário no banco de dados
        await newUser.save();

        // 6. Retornar uma resposta de sucesso
        res.status(201).json({ message: 'Usuário registrado com sucesso!' });

    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});


// --- ROTA DE LOGIN ---
// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Validar se os dados foram enviados
        if (!email || !password) {
            return res.status(400).json({ message: 'Por favor, forneça e-mail e senha.' });
        }

        // 2. Buscar o usuário pelo e-mail
        const user = await User.findOne({ email });
        if (!user) {
            // Mensagem genérica por segurança
            return res.status(400).json({ message: 'Credenciais inválidas.' });
        }

        // 3. Comparar a senha enviada com a senha criptografada no banco
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Credenciais inválidas.' });
        }

        // 4. Se as senhas baterem, gerar um JWT
        const payload = {
            userId: user._id // Incluímos o ID do usuário no token
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET, // Nosso segredo do arquivo .env
            { expiresIn: '1h' } // Token expira em 1 hora
        );

        // 5. Retornar o token para o cliente
        res.status(200).json({ 
            message: 'Login bem-sucedido!',
            token: token 
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

export default router