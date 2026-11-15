import { test, expect } from '@playwright/test';
import { customerSchema } from '../../src/data/schemas/customer.schema.js';
import {
    createCustomer,
    setCustomerDataSeed,
} from '../../src/data/factories/customer.factory.js';

test('should generate reproducible customer data with the same seed', () => {
    setCustomerDataSeed(12345);
    const firstCustomer = createCustomer();

    setCustomerDataSeed(12345);
    const secondCustomer = createCustomer();

    expect(secondCustomer).toEqual(firstCustomer);

    const result = customerSchema.safeParse(firstCustomer);
    expect(result.success).toBe(true);
});

test('should reject invalid customer data', () => {
    const invalidCustomer = {
        name: '',
        email: 'not-an-email',
        city: 'Kuala Lumpur',
        address: 'Jalan Example',
        postcode: '50000',
    };

    const result = customerSchema.safeParse(invalidCustomer);
    expect(result.success).toBe(false);
});