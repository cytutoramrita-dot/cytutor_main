import { exec } from 'child_process';
import { promisify } from 'util';
import { networkInterfaces } from 'os';
import config from '../config/index.js';
import { query } from '../db/index.js';
import { portManager } from './portManager.js';
import registry from './challenge-registry.json';
import { logger } from '../utils/logger.js';

const execAsync = promisify(exec);

const CONTAINER_TIMEOUT = config.challenges.timeoutMinutes * 60 * 1000;

// Auto-detect network IP
function getNetworkIP(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      // Skip internal (localhost) and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

interface ChallengeDefinition {
  id: string;
  name: string;
  image: string;
  internalPort: number;
  description: string;
  category: string;
  difficulty: string;
}

export class ChallengeManager {
  private registry: ChallengeDefinition[] = registry;

  getChallengeDefinition(challengeId: string): ChallengeDefinition | undefined {
    return this.registry.find(c => c.id === challengeId);
  }

  async startChallenge(userId: string, challengeId: string): Promise<{ url: string; port: number } | null> {
    // Check if challenge requires Docker (web/terminal types only)
    const challengeInfo = await query('SELECT challenge_type FROM challenges WHERE id = $1', [challengeId]);
    if (challengeInfo.rows.length === 0) {
      throw new Error('Challenge not found');
    }
    
    const challengeType = challengeInfo.rows[0].challenge_type;
    if (challengeType === 'description' || challengeType === 'downloadable') {
      throw new Error('This challenge does not require an instance');
    }
    
    const definition = this.getChallengeDefinition(challengeId);
    if (!definition) {
      throw new Error('Challenge not found in registry');
    }

    // Stop ALL other running instances for this user (enforce single instance)
    const allRunning = await query(
      'SELECT challenge_id, container_id FROM user_challenges WHERE user_id = $1 AND status = $2 AND challenge_id != $3',
      [userId, 'running', challengeId]
    );

    for (const row of allRunning.rows) {
      logger.info('Stopping previous instance', { userId, challengeId: row.challenge_id });
      await this.stopChallenge(userId, row.challenge_id);
    }

    const existing = await query(
      'SELECT container_id, instance_port, status FROM user_challenges WHERE user_id = $1 AND challenge_id = $2',
      [userId, challengeId]
    );

    if (existing.rows.length > 0 && existing.rows[0].status === 'running') {
      const host = config.challenges.hostIp || getNetworkIP();
      logger.debug('Reusing existing challenge instance', { userId, challengeId, port: existing.rows[0].instance_port });
      return {
        url: `http://${host}:${existing.rows[0].instance_port}`,
        port: existing.rows[0].instance_port
      };
    }

    if (existing.rows.length > 0 && existing.rows[0].container_id) {
      await this.stopChallenge(userId, challengeId);
    }

    const port = await portManager.allocate();
    if (!port) {
      throw new Error('No available ports');
    }

    const containerName = `user-${userId.substring(0, 8)}-${challengeId}`;

    try {
      const { stdout } = await execAsync(
        `docker run -d --name ${containerName} -p ${port}:${definition.internalPort} --memory="256m" --cpus="0.5" ${definition.image}`
      );

      const containerId = stdout.trim();

      await query(
        `INSERT INTO user_challenges (user_id, challenge_id, status, container_id, instance_port, last_started_at)
         VALUES ($1, $2, 'running', $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, challenge_id)
         DO UPDATE SET status = 'running', container_id = $3, instance_port = $4, last_started_at = CURRENT_TIMESTAMP`,
        [userId, challengeId, containerId, port]
      );

      setTimeout(() => this.autoCleanup(userId, challengeId), CONTAINER_TIMEOUT);

      const host = config.challenges.hostIp || getNetworkIP();
      logger.info('Challenge instance started', { userId, challengeId, port, containerId });
      
      return {
        url: `http://${host}:${port}`,
        port
      };
    } catch (error) {
      await portManager.free(port);
      logger.error('Failed to start challenge instance', { userId, challengeId, error });
      throw error;
    }
  }

  async stopChallenge(userId: string, challengeId: string): Promise<boolean> {
    const result = await query(
      'SELECT container_id, instance_port FROM user_challenges WHERE user_id = $1 AND challenge_id = $2',
      [userId, challengeId]
    );

    if (result.rows.length === 0 || !result.rows[0].container_id) {
      return false;
    }

    const { container_id, instance_port } = result.rows[0];

    try {
      await execAsync(`docker stop ${container_id}`);
      await execAsync(`docker rm ${container_id}`);
      logger.info('Challenge instance stopped', { userId, challengeId, containerId: container_id });
    } catch (error) {
      logger.error('Error stopping container', { userId, challengeId, containerId: container_id, error });
    }

    if (instance_port) {
      await portManager.free(instance_port);
    }

    await query(
      `UPDATE user_challenges SET status = 'stopped', container_id = NULL, instance_port = NULL WHERE user_id = $1 AND challenge_id = $2`,
      [userId, challengeId]
    );

    return true;
  }

  async resetChallenge(userId: string, challengeId: string): Promise<{ url: string; port: number } | null> {
    await this.stopChallenge(userId, challengeId);
    return this.startChallenge(userId, challengeId);
  }

  async getChallengeStatus(userId: string, challengeId: string): Promise<any> {
    const result = await query(
      'SELECT status, instance_port, last_started_at FROM user_challenges WHERE user_id = $1 AND challenge_id = $2',
      [userId, challengeId]
    );

    if (result.rows.length === 0) {
      return { status: 'available' };
    }

    return result.rows[0];
  }

  private async autoCleanup(userId: string, challengeId: string) {
    const status = await this.getChallengeStatus(userId, challengeId);

    if (status.status === 'running') {
      const elapsed = Date.now() - new Date(status.last_started_at).getTime();

      if (elapsed >= CONTAINER_TIMEOUT) {
        logger.info('Auto-cleaning up expired challenge', { userId, challengeId, elapsed });
        await this.stopChallenge(userId, challengeId);

        await query(
          `UPDATE user_challenges SET status = 'expired' WHERE user_id = $1 AND challenge_id = $2`,
          [userId, challengeId]
        );
      }
    }
  }

  async cleanupAllUserChallenges(userId: string) {
    const result = await query(
      'SELECT challenge_id FROM user_challenges WHERE user_id = $1 AND status = $2',
      [userId, 'running']
    );

    for (const row of result.rows) {
      await this.stopChallenge(userId, row.challenge_id);
    }
  }

  async cleanupExpiredChallenges() {
    const result = await query(
      `SELECT user_id, challenge_id, last_started_at FROM user_challenges 
       WHERE status = 'running' AND last_started_at < NOW() - ($1 || ' minutes')::INTERVAL`,
      [CONTAINER_TIMEOUT / 60000]
    );

    for (const row of result.rows) {
      logger.info('Cleaning up expired challenge', { userId: row.user_id, challengeId: row.challenge_id });
      await this.stopChallenge(row.user_id, row.challenge_id);

      await query(
        `UPDATE user_challenges SET status = 'expired' WHERE user_id = $1 AND challenge_id = $2`,
        [row.user_id, row.challenge_id]
      );
    }
  }
}

export const challengeManager = new ChallengeManager();
