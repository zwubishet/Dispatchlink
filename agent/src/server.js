import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { runAgent } from './agent/index.js';

const app = express();

// security and logging
app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://dispatchlink-backend.onrender.com',
        'https://dispatchlink-git-main-addes-projects-6aacb88f.vercel.app',
        'https://dispatchlink-gamma.vercel.app',
    ],
    methods: ['GET', 'POST'],
}));
app.use(express.json({ limit: '10mb' }));

// rate limiting — 100 requests per 15 minutes per IP
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'dispatchlink-agent' });
});

// main chat endpoint
app.post('/chat', async (req, res) => {
    try {
        const { userMessage, userId } = req.body;

        if (!userMessage || !userId) {
            return res.status(400).json({
                error: 'userMessage and userId are required'
            });
        }

        console.log(`\n[${userId}]: ${userMessage}`);

        const answer = await runAgent(userMessage, userId);
        res.json({ answer });

    } catch (err) {
        console.error('Agent error:', err.message);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

export { app };
export default app;