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
        IMPORTANT: When reporting driver information or Order Information, always include the driver_id or Order_id exactly as returned by the tool. Never omit IDs from responses.
        STRICT RULES — follow exactly:
        - Call ONE tool per response then STOP
        - After receiving a tool result, write your final answer immediately
        - NEVER call a second tool to verify the first result
        - NEVER call get_orders after update_order_status
        - If a tool succeeds, confirm it to the user and stop
        - Answer in one or two short sentences`
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