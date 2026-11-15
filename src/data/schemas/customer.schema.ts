import { z } from 'zod';

export const customerSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    city: z.string().min(1),
    address: z.string().min(1),
    postcode: z.string().min(1),
});