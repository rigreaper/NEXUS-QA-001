import { test, expect } from '@playwright/test';
import { query, closeDatabase } from '../../src/database/clients/postgres-client.js';

test('NEXUS-QA can connect to PostgreSQL', async () => {
    const result = await query<{
        database_name: string;
        database_time: Date;
    }>(
        'SELECT current_database() AS database_name, NOW() AS database_time'
    );

    expect(result).toHaveLength(1);

    const row = result[0];

    if (!row) {
        throw new Error('Database query returned no rows');
    }

    expect(row.database_name).toBe('qashop');
    expect(row.database_time).toBeInstanceOf(Date);
    
});


