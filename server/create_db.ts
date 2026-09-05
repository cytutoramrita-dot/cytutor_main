import pg from 'pg';
const { Client } = pg;

async function createDb() {
    const client = new Client({
        connectionString: 'postgresql://postgres:Kavya%402005@localhost:5432/postgres',
    });

    try {
        await client.connect();
        await client.query('CREATE DATABASE cytutor');
        console.log('Database cytutor created successfully');
    } catch (err: any) {
        if (err.code === '42P04') {
            console.log('Database cytutor already exists');
        } else {
            console.error('Error creating database:', err);
            process.exit(1);
        }
    } finally {
        await client.end();
    }
}

createDb();
