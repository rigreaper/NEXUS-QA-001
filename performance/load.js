
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export const options = {
    scenarios: {
        product_api_load: {
            executor: 'ramping-vus',
            startVUs: 1,
            stages: [
                { duration: '30s', target: 5 },
                { duration: '1m', target: 10 },
                { duration: '30s', target: 0 },
            ],
            gracefulRampDown: '10s',
        },
    },

    thresholds: {
        http_req_failed: ['rate<0.01'],
        checks: ['rate>0.99'],
        'http_req_duration{endpoint:products}': ['p(95)<500'],
        'http_req_duration{endpoint:product-search}': ['p(95)<500'],
    },
};

export function setup() {
    const response = http.post(
        `${BASE_URL}/api/v1/sandbox`,
        JSON.stringify({
            label: 'nexus-qa-k6-load',
        }),
        {
            headers: {
                'Content-Type': 'application/json',
            },
            tags: {
                endpoint: 'sandbox-setup',
            },
        }
    );

    const success = check(response, {
        'sandbox created successfully': (r) => r.status === 201,
    });

    if (!success) {
        throw new Error(`Sandbox creation failed: ${response.status}`);
    }

    const sandbox = response.json();

    if (!sandbox.apiKey) {
        throw new Error('Sandbox API key missing');
    }

    return { apiKey: sandbox.apiKey };
}

export default function (data) {
    const headers = {
        'X-Sandbox-Key': data.apiKey,
    };

    const productsResponse = http.get(
        `${BASE_URL}/api/v1/products`,
        {
            headers,
            tags: { endpoint: 'products' },
            
        }
    );

    check(productsResponse, {
        'products returns HTTP 200': (r) => r.status === 200,
        'products response has items': (r) => {
            if (r.status !== 200) return false;
            const body = r.json();
            return Array.isArray(body.items) && body.items.length > 0;
        },
    });

    sleep(1);

    const searchResponse = http.get(
        `${BASE_URL}/api/v1/search?q=Dress`,
        {
            headers,
            tags: { endpoint: 'product-search' },
        }
    );

    check(searchResponse, {
        'search returns HTTP 200': (r) => r.status === 200,
        'search response has items': (r) => {
            if (r.status !== 200) return false;
            const body = r.json();
            return Array.isArray(body.items) && body.items.length > 0;
        },
    });

    sleep(1);
}
