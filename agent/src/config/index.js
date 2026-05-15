import dotenv from "dotenv";

dotenv.config();

export const config = {
    groq: {
        apiKey: process.env.GROQ_API_KEY,
        model: "llama-3.1-8b-instant"
    },
    api: {
        baseUrl: process.env.DISPATCHLINK_API_URL,
        secret: process.env.DISPATCHLINK_API_SECRET
    },
    agent: {
        port: process.env.AGENT_PORT,
        maxIterations: 6
    }
}

const required = ["GROQ_API_KEY", "DISPATCHLINK_API_SECRET"];

for(const key of required){
    if(!process.env[key]){
        console.error(`Missing required environment variable: ${key}`);
        process.exit(1);
    }
}