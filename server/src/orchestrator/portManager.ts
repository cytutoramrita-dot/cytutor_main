import { query, pool } from '../db/index.js';

export class PortManager {
  async initialize() {
    // No initialization needed for DB-backed allocation
    console.log('Port manager initialized (DB-backed)');
  }

  async allocate(): Promise<number | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Find a free port and lock it atomically
      const result = await client.query(`
        SELECT port FROM ports 
        WHERE is_allocated = FALSE 
        ORDER BY port ASC 
        LIMIT 1 
        FOR UPDATE SKIP LOCKED
      `);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const port = result.rows[0].port;

      await client.query(`
        UPDATE ports 
        SET is_allocated = TRUE, allocated_at = NOW() 
        WHERE port = $1
      `, [port]);

      await client.query('COMMIT');
      return port;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error allocating port:', error);
      return null;
    } finally {
      client.release();
    }
  }

  async free(port: number) {
    try {
      await query(`
        UPDATE ports 
        SET is_allocated = FALSE, allocated_at = NULL, allocated_to = NULL 
        WHERE port = $1
      `, [port]);
    } catch (error) {
      console.error(`Error freeing port ${port}:`, error);
    }
  }

  async isAllocated(port: number): Promise<boolean> {
    const result = await query('SELECT is_allocated FROM ports WHERE port = $1', [port]);
    return result.rows.length > 0 && result.rows[0].is_allocated;
  }
}

export const portManager = new PortManager();
