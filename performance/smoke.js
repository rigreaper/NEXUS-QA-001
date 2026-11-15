import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export const options = {
    vus: 1,
    duration: '10s',

    thresholds: {
        http_req_failed: ['rate<0.01'],
        'http_req_duration{endpoint:products}': ['p(95)<500'],
        'http_req_duration{endpoint:product-search}': ['p(95)<500'],
    },
};

export function setup() {
    const response = http.post(
        `${BASE_URL}/api/v1/sandbox`,
        JSON.stringify({
            label: 'nexus-qa-k6-smoke',
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

    const created = check(response, {
        'sandbox created successfully': (r) => r.status === 201,
    });

    if (!created) {
        throw new Error(`Sandbox creation failed: ${response.status}`);
    }

    const sandbox = response.json();

    if (!sandbox.apiKey) {
        throw new Error('Sandbox response does not contain an API key');
    }

    return {
        apiKey: sandbox.apiKey,
    };
}

export default function (data) {

    const searchResponse = http.get(
        `${BASE_URL}/api/v1/search?q=Dress`,
        {
            headers: {
                'X-Sandbox-Key': data.apiKey,
            },
            tags: {
                endpoint: 'product-search',
            },
        }
    );

    const searchBody = searchResponse.status === 200
        ? searchResponse.json()
        : {};

    check(searchResponse, {
        'search endpoint returns HTTP 200': (r) => r.status === 200,
        'search returns product items': () =>
            Array.isArray(searchBody.items) &&
            searchBody.items.length > 0,
    });

    const response = http.get(
        `${BASE_URL}/api/v1/products`,
        {
            headers: {
                'X-Sandbox-Key': data.apiKey,
            },
            tags: {
                endpoint: 'products',
            },
        }
    );

    const body = response.status === 200 ? response.json() : {};

    check(response, {
        'products endpoint returns HTTP 200': (r) => r.status === 200,
        'response contains product items': () =>
            Array.isArray(body.items) && body.items.length > 0,
        'response contains pagination data': () =>
            body.total > 0 && body.page >= 1,
    });

    sleep(1);
}
