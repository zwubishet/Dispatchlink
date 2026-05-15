// src/index.js
import { app } from './server.js';
import { config } from './config/index.js';

app.listen(config.agent.port, () => {
    console.log(`Dispatchlink Agent running on port ${config.agent.port}`);
});