import 'dotenv/config';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// console.log('DB_PORT:', process.env.DB_PORT);
// console.log('DB_HOST:', process.env.DB_HOST);
// console.log('DB_NAME:', process.env.DB_NAME);
// console.log('DB_USER:', process.env.DB_USER);
// console.log('DB_PASSWORD:', process.env.DB_PASSWORD);

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

export async function query<T extends Record<string, unknown>>(
    sql: string,
    params: unknown[] = []
): Promise<T[]> {
    const result = await pool.query<T>(sql, params);
    return result.rows;
}

export async function closeDatabase(): Promise<void> {
    await pool.end();
}
