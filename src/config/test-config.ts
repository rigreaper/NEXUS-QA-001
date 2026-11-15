export const testConfig = {
    baseURL: process.env.QASHOP_BASE_URL ?? 'https://learnqa.dev',

    qaShopPath: '/en/qa-shop/',

    apiBaseURL: process.env.QASHOP_API_BASE_URL ?? 'http://localhost:4000',

    storeCredentials: {
        email: process.env.QASHOP_STORE_EMAIL ?? 'demo@qashop.test',
        password: process.env.QASHOP_STORE_PASSWORD ?? 'Password123!',
    },
};
