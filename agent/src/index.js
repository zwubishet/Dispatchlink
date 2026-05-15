import { app } from './server.js';
import { config } from './config/index.js';

const port = config.agent.port || 5000;

app.listen(port, () => {
    console.log(`Dispatchlink Agent running on port ${port}`);
});