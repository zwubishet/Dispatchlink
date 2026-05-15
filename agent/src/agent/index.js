import Groq from 'groq-sdk';
import { config } from '../config/index.js';
import { tools } from './tools.js';
import { executeTool } from './executor.js';

export async function runAgent(userMessage, userId) {
    const groq = new Groq({ apiKey: config.groq.apiKey });  // ✅ correct init
    console.log(`\n[${userId}]: ${userMessage}`);
    console.log('  [API-KEY]:', config.groq.apiKey ? '***' : 'missing');
    console.log('  [agent] running...');


    const messages = [
        {
            role: 'system',
            content: `You are an operations assistant for Dispachlink, a B2B 
distribution management platform in Addis Ababa, Ethiopia. 
You help dispatchers manage orders, check driver availability, 
monitor inventory, and get business summaries.

RULES:
- Call ONE tool at a time
- After getting a tool result, give your final answer immediately
- Never call the same tool twice in one turn
- Answer in clear, direct sentences`
        },
        { role: 'user', content: userMessage }
    ];

    let iterations = 0;

    while (iterations < config.agent.maxIterations) {
        iterations++;

        const response = await groq.chat.completions.create({  // ✅ correct method
            model: config.groq.model,
            messages,
            tools,
            tool_choice: 'auto',
            max_tokens:  1024
        });

        const choice = response.choices[0];                    // ✅ correct path
        const toolCalls = choice.message.tool_calls;

        // no tool calls — agent has final answer
        if (!toolCalls || toolCalls.length === 0) {
            return choice.message.content;
        }

        messages.push(choice.message);                         // ✅ push assistant message first

        for (const call of toolCalls) {
            const name = call.function.name;                   // ✅ correct path
            const args = JSON.parse(call.function.arguments);  // ✅ parse JSON string

            try {
                const result = await executeTool(name, args);
                messages.push({
                    role: 'tool',
                    tool_call_id: call.id,                     // ✅ required by Groq
                    content:      String(result)               // ✅ always string
                });
            } catch (err) {
                messages.push({
                    role: 'tool',
                    tool_call_id: call.id,
                    content: `Error: ${err.message}`
                });
            }
        }
    }

    return 'I could not complete your request. Please try again.';
}