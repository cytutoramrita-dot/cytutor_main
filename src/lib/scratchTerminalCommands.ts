// Client-side command engine for the challenge-page scratch terminal.
// Most commands (base64, xor, hashing, etc.) are pure text transforms that run
// entirely in the browser. `start`/`stop`/`status`/`challenges` are the exception —
// they call the real challenge orchestration API to launch/inspect Docker instances,
// mirroring picoCTF's "type the challenge name, get connection details" shell flow.

import { challenges } from '../services/api';
import type { Challenge } from '../types';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const cleaned = b64.replace(/\s+/g, '');
  const binary = atob(cleaned);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const cleaned = hex.replace(/\s+/g, '');
  if (cleaned.length % 2 !== 0) throw new Error('odd-length hex string');
  if (!/^[0-9a-fA-F]*$/.test(cleaned)) throw new Error('invalid hex characters');
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes[i / 2] = parseInt(cleaned.slice(i, i + 2), 16);
  }
  return bytes;
}

// Pure-JS MD5 (RFC 1321). Web Crypto's SubtleCrypto has no MD5, so this fills the gap
// for CTF challenges that still expect it. Verified against the standard RFC test vectors.
function md5(input: string): string {
  const rotl = (x: number, c: number) => (x << c) | (x >>> (32 - c));

  const s = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];
  const K = new Int32Array([
    -680876936, -389564586, 606105819, -1044525330, -176418897, 1200080426, -1473231341, -45705983,
    1770035416, -1958414417, -42063, -1990404162, 1804603682, -40341101, -1502002290, 1236535329,
    -165796510, -1069501632, 643717713, -373897302, -701558691, 38016083, -660478335, -405537848,
    568446438, -1019803690, -187363961, 1163531501, -1444681467, -51403784, 1735328473, -1926607734,
    -378558, -2022574463, 1839030562, -35309556, -1530992060, 1272893353, -155497632, -1094730640,
    681279174, -358537222, -722521979, 76029189, -640364487, -421815835, 530742520, -995338651,
    -198630844, 1126891415, -1416354905, -57434055, 1700485571, -1894986606, -1051523, -2054922799,
    1873313359, -30611744, -1560198380, 1309151649, -145523070, -1120210379, 718787259, -343485551,
  ]);

  const msg = new TextEncoder().encode(input);
  const origLenBits = msg.length * 8;

  const withOne = new Uint8Array(((msg.length + 8) >> 6) * 64 + 64);
  withOne.set(msg);
  withOne[msg.length] = 0x80;
  const totalLen = withOne.length;
  const dv = new DataView(withOne.buffer);
  dv.setUint32(totalLen - 8, origLenBits >>> 0, true);
  dv.setUint32(totalLen - 4, Math.floor(origLenBits / 0x100000000) >>> 0, true);

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;

  for (let chunkStart = 0; chunkStart < totalLen; chunkStart += 64) {
    const M = new Int32Array(16);
    for (let j = 0; j < 16; j++) M[j] = dv.getInt32(chunkStart + j * 4, true);

    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      F = (F + A + K[i] + M[g]) | 0;
      A = D;
      D = C;
      C = B;
      B = (B + rotl(F, s[i])) | 0;
    }
    a0 = (a0 + A) | 0;
    b0 = (b0 + B) | 0;
    c0 = (c0 + C) | 0;
    d0 = (d0 + D) | 0;
  }

  const toHexLE = (n: number) =>
    [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

  return toHexLE(a0) + toHexLE(b0) + toHexLE(c0) + toHexLE(d0);
}

async function webCryptoDigest(algo: 'SHA-1' | 'SHA-256', input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest(algo, data);
  return bytesToHex(new Uint8Array(digest));
}

function expandSet(set: string): string {
  let result = '';
  for (let i = 0; i < set.length; i++) {
    if (set[i + 1] === '-' && i + 2 < set.length) {
      const start = set.charCodeAt(i);
      const end = set.charCodeAt(i + 2);
      for (let c = start; c <= end; c++) result += String.fromCharCode(c);
      i += 2;
    } else {
      result += set[i];
    }
  }
  return result;
}

function getData(args: string[], stdin: string): string {
  if (stdin) return stdin;
  const positional = args.filter((a) => !a.startsWith('-'));
  return positional.join(' ');
}

function requireStdin(stdin: string, name: string): string {
  if (!stdin) throw new Error(`${name}: no input — pipe data in, e.g. echo "hi" | ${name}`);
  return stdin;
}

function requireData(args: string[], stdin: string, name: string): string {
  const data = getData(args, stdin);
  if (!data) throw new Error(`${name}: no input — pipe data in or pass it as an argument`);
  return data;
}

export interface TerminalContext {
  /** id of the challenge currently open in ChallengeDetail, if any — used as the default target for start/stop/status. */
  currentChallengeId?: string;
}

export type CommandFn = (args: string[], stdin: string, ctx: TerminalContext) => string | Promise<string>;

let challengeListCache: Challenge[] | null = null;

async function getChallengeList(): Promise<Challenge[]> {
  if (!challengeListCache) {
    challengeListCache = await challenges.getAll();
  }
  return challengeListCache;
}

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function resolveChallenge(nameOrId: string): Promise<Challenge> {
  const list = await getChallengeList();
  const target = normalizeName(nameOrId);
  const found = list.find((c) => normalizeName(c.id) === target || normalizeName(c.title) === target);
  if (!found) {
    throw new Error(`no challenge matching "${nameOrId}" — type 'challenges' to list available names`);
  }
  return found;
}

function formatInstance(challenge: Challenge, result: { url: string; port: number }): string {
  const host = window.location.hostname;
  const lines = [
    `instance ready for ${challenge.title} (${challenge.id})`,
    `  ip:   ${host}`,
    `  port: ${result.port}`,
  ];
  if (challenge.challenge_type === 'web') {
    lines.push(`  url:  ${result.url}`);
  } else {
    lines.push(`  ssh:  ssh ctfuser@${host} -p ${result.port}`);
    lines.push('  (use the credentials from the challenge description)');
  }
  return lines.join('\n');
}

function targetName(args: string[], ctx: TerminalContext, usage: string): string {
  const name = args[0] || ctx.currentChallengeId;
  if (!name) throw new Error(usage);
  return name;
}

export const commands: Record<string, CommandFn> = {
  help: () =>
    [
      'Text-transform tools run locally; start/stop/status/challenges call the real backend.',
      'Chain commands with | just like a pipe, e.g.:',
      '  echo "Q3l0dXRve2hlbGxvfQ==" | base64 -d',
      '',
      'Text tools:',
      '  echo <text>            print text',
      '  base64 [-e|-d]         base64 encode/decode (whitespace stripped on decode)',
      '  hex [-e|-d]            hex encode/decode',
      '  url [-e|-d]            URL encode/decode',
      '  rot13                  ROT13 cipher',
      '  rev                    reverse text',
      '  tr <set1> <set2>       translate characters (supports a-z ranges)',
      '  xor <hexkey>           XOR stdin bytes with a repeating hex key -> hex',
      '  wc [-c|-w|-l]          count chars/words/lines',
      '  md5sum                 MD5 hash',
      '  sha1sum                SHA-1 hash',
      '  sha256sum              SHA-256 hash',
      '  clear                  clear the screen',
      '',
      'Challenge instances:',
      '  challenges              list available challenges (id, title, type)',
      '  start [challenge-id]    launch an instance (defaults to the open challenge) and print connection details',
      '  stop [challenge-id]     stop a running instance',
      '  status [challenge-id]   show instance status / connection details',
    ].join('\n'),

  challenges: async () => {
    const list = await getChallengeList();
    if (list.length === 0) return 'no challenges available';
    const header = 'ID'.padEnd(24) + 'TITLE'.padEnd(28) + 'TYPE';
    const rows = list.map((c) => c.id.padEnd(24) + c.title.padEnd(28) + c.challenge_type);
    return [header, ...rows].join('\n');
  },

  start: async (args, _stdin, ctx) => {
    const name = targetName(args, ctx, 'start: usage: start <challenge-id> (or open the challenge page to default to it)');
    const challenge = await resolveChallenge(name);
    if (challenge.challenge_type !== 'web' && challenge.challenge_type !== 'terminal') {
      throw new Error(`start: "${challenge.title}" does not need an instance — submit its flag directly`);
    }
    const result = await challenges.start(challenge.id);
    challengeListCache = null;
    return formatInstance(challenge, result);
  },

  stop: async (args, _stdin, ctx) => {
    const name = targetName(args, ctx, 'stop: usage: stop <challenge-id>');
    const challenge = await resolveChallenge(name);
    await challenges.stop(challenge.id);
    challengeListCache = null;
    return `stopped instance for ${challenge.title} (${challenge.id})`;
  },

  status: async (args, _stdin, ctx) => {
    const name = targetName(args, ctx, 'status: usage: status <challenge-id>');
    const challenge = await resolveChallenge(name);
    const fresh = await challenges.getById(challenge.id);
    if (fresh.status !== 'running' || !fresh.instance_port) {
      return `${fresh.title} (${fresh.id}): ${fresh.status}`;
    }
    return formatInstance(fresh, {
      url: `http://${window.location.hostname}:${fresh.instance_port}`,
      port: fresh.instance_port,
    });
  },

  echo: (args) => args.join(' '),

  base64: (args, stdin) => {
    const decode = args.includes('-d');
    const data = getData(args, stdin);
    if (decode) {
      return new TextDecoder().decode(base64ToBytes(data));
    }
    return bytesToBase64(new TextEncoder().encode(data));
  },

  hex: (args, stdin) => {
    const decode = args.includes('-d');
    const data = getData(args, stdin);
    if (decode) {
      return new TextDecoder().decode(hexToBytes(data));
    }
    return bytesToHex(new TextEncoder().encode(data));
  },

  url: (args, stdin) => {
    const decode = args.includes('-d');
    const data = getData(args, stdin);
    return decode ? decodeURIComponent(data) : encodeURIComponent(data);
  },

  rot13: (args, stdin) => {
    const data = getData(args, stdin);
    return data.replace(/[a-zA-Z]/g, (ch) => {
      const base = ch <= 'Z' ? 65 : 97;
      return String.fromCharCode(((ch.charCodeAt(0) - base + 13) % 26) + base);
    });
  },

  rev: (args, stdin) => Array.from(getData(args, stdin)).reverse().join(''),

  tr: (args, stdin) => {
    const data = requireStdin(stdin, 'tr');
    const [set1, set2] = args;
    if (!set1 || !set2) throw new Error('tr: usage: tr <set1> <set2>');
    const from = expandSet(set1);
    let to = expandSet(set2);
    if (to.length < from.length) {
      to = to.padEnd(from.length, to[to.length - 1] ?? '');
    }
    return Array.from(data)
      .map((ch) => {
        const idx = from.indexOf(ch);
        return idx >= 0 ? to[idx] : ch;
      })
      .join('');
  },

  xor: (args, stdin) => {
    const data = requireStdin(stdin, 'xor');
    const key = args.find((a) => !a.startsWith('-'));
    if (!key) throw new Error('xor: usage: xor <hexkey> (pipe data in)');
    const keyBytes = hexToBytes(key);
    if (keyBytes.length === 0) throw new Error('xor: key must not be empty');
    const dataBytes = new TextEncoder().encode(data);
    const out = new Uint8Array(dataBytes.length);
    for (let i = 0; i < dataBytes.length; i++) {
      out[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    return bytesToHex(out);
  },

  wc: (args, stdin) => {
    const data = getData(args, stdin);
    const chars = data.length;
    const words = data.trim() === '' ? 0 : data.trim().split(/\s+/).length;
    const lines = data === '' ? 0 : data.split('\n').length;
    if (args.includes('-c')) return String(chars);
    if (args.includes('-w')) return String(words);
    if (args.includes('-l')) return String(lines);
    return `${lines} ${words} ${chars}`;
  },

  md5sum: (args, stdin) => md5(requireData(args, stdin, 'md5sum')),

  sha1sum: (args, stdin) => webCryptoDigest('SHA-1', requireData(args, stdin, 'sha1sum')),

  sha256sum: (args, stdin) => webCryptoDigest('SHA-256', requireData(args, stdin, 'sha256sum')),
};

function tokenize(segment: string): string[] {
  const tokens: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(segment)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }
  return tokens;
}

export async function runPipeline(
  line: string,
  ctx: TerminalContext = {}
): Promise<{ output: string; error: boolean }> {
  const segments = line.split('|').map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) return { output: '', error: false };

  let stdin = '';
  try {
    for (const segment of segments) {
      const [name, ...args] = tokenize(segment);
      const fn = commands[name];
      if (!fn) throw new Error(`command not found: ${name} (type 'help' for a list)`);
      stdin = await fn(args, stdin, ctx);
    }
    return { output: stdin, error: false };
  } catch (err) {
    return { output: err instanceof Error ? err.message : String(err), error: true };
  }
}
