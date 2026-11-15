import { faker } from '@faker-js/faker';
import { customerSchema } from '../schemas/customer.schema.js';

export type CustomerData = {
    name: string;
    email: string;
    city: string;
    address: string;
    postcode: string;
};

export function setCustomerDataSeed(seed: number): void {
    faker.seed(seed);
}

export function createCustomer(): CustomerData {
    return customerSchema.parse({
        name: faker.person.fullName(),
        email: `customer-${faker.string.uuid()}@example.com`,
        city: faker.location.city(),
        address: faker.location.streetAddress(),
        postcode: faker.location.zipCode(),
    });
}