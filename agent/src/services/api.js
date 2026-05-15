import { config } from '../config/index.js';

let serviceToken = null;

async function getServiceToken() {
    if (serviceToken) return serviceToken;

    console.log('  [auth] logging in...');

    const response = await fetch(`${config.api.baseUrl}/api/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
            phone:    '0900000000',
            password: 'admin123'
        })
    });

    if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
    }

    const data = await response.json();  // ✅ await
    serviceToken = data.token;

    if (!serviceToken) {
        throw new Error(`No token in login response: ${JSON.stringify(data)}`);
    }

    console.log('  [auth] token acquired');
    return serviceToken;
}

export async function apiCall(method, path, body = null) {
    const token = await getServiceToken();

    const options = {
        method,
        headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${token}`  // ✅ correct spelling
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const url = `${config.api.baseUrl}${path}`;
    console.log(`  [api] ${method} ${path}`);

    const response = await fetch(url, options);

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`API ${response.status} on ${method} ${path}: ${error}`);
    }

    return response.json();
}