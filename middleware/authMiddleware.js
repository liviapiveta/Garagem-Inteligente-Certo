// middleware/authMiddleware.js

import jwt from 'jsonwebtoken';

/**
 * Middleware para verificar o token JWT e autenticar o usuário
 */
export const authenticateToken = (req, res, next) => {
    // Pega o token do header Authorization
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: 'Token não fornecido. Acesso negado.' });
    }

    try {
        // Verifica e decodifica o token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Adiciona o userId ao objeto req para uso nas rotas
        req.userId = decoded.userId;
        
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Token inválido ou expirado.' });
    }
};