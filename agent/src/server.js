import express from 'express';
import cors from 'cors';
import { runAgent } from './agent/index.js';
import { config } from './config/index.js';

const app = express();
app.use(cors());
app.use(express.json());

// health check — useful for Docker and monitoring
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'dispatchlink-agent' });
});

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

export { app };
export default app;