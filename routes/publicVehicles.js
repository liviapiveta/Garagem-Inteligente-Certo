import express from 'express';
import Veiculo from '../models/veiculo.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const publicVehicles = await Veiculo.find({ isPublic: true });
        res.json(publicVehicles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
