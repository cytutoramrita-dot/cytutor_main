export type PathNodeRef =
  | { type: 'course'; courseId: string }
  | { type: 'module'; courseId: string; moduleId: string }
  | { type: 'challenge'; challengeId: string };

export interface PathStage {
  label: string;
  nodes: PathNodeRef[];
}

export type PathColor = 'neon-green' | 'neon-blue' | 'neon-purple' | 'yellow-400';

export interface LearningPathDef {
  id: string;
  title: string;
  goal: string;
  skills: string[];
  color: PathColor;
  icon: string;
  stages: PathStage[];
}

const course = (courseId: string): PathNodeRef => ({ type: 'course', courseId });
const module_ = (courseId: string, moduleId: string): PathNodeRef => ({ type: 'module', courseId, moduleId });
const challenge = (challengeId: string): PathNodeRef => ({ type: 'challenge', challengeId });

export const LEARNING_PATHS: LearningPathDef[] = [
  {
    id: 'beginner',
    title: 'Beginner Path — Start Here',
    goal: 'Build foundational OS and security literacy before attempting interactive challenges.',
    skills: ['Linux', 'Security Fundamentals', 'Base64', 'Caesar Cipher', 'XSS', 'Cookies'],
    color: 'neon-green',
    icon: 'Terminal',
    stages: [
      { label: 'Foundations', nodes: [course('linux-fundamentals'), course('cybersecurity-fundamentals')] },
      {
        label: 'Easy Challenges',
        nodes: [challenge('crypto-basics'), challenge('c1'), challenge('ref-xss'), challenge('power-cookie'), challenge('bookmarklet')],
      },
    ],
  },
  {
    id: 'web-security',
    title: 'Web Security Path',
    goal: 'For learners focused on web application exploitation.',
    skills: ['XSS', 'Cookie Manipulation', 'Path Traversal', 'SSTI', 'JWT Attacks', 'SSRF', 'Log Leakage', 'Git Exposure'],
    color: 'neon-blue',
    icon: 'Globe',
    stages: [
      { label: 'Foundations', nodes: [course('linux-fundamentals'), course('cybersecurity-fundamentals')] },
      { label: 'Easy', nodes: [challenge('ref-xss'), challenge('power-cookie'), challenge('bookmarklet')] },
      {
        label: 'Medium',
        nodes: [
          challenge('hidden-pages'),
          challenge('path-traversal'),
          challenge('logfile-challenge'),
          challenge('ssti'),
          challenge('jwt'),
          challenge('ssrf'),
          challenge('python-compiler'),
          challenge('git-challenge'),
        ],
      },
      { label: 'Hard', nodes: [challenge('secret-jwt')] },
    ],
  },
  {
    id: 'advanced-web-exploitation',
    title: 'Advanced Web Exploitation Path',
    goal:
      "A follow-on path for learners who've completed the Web Security Path's Easy tier — skips the course prerequisites and sequences the remaining web challenges by attack technique.",
    skills: ['SSTI', 'Sandbox Escape', 'JWT Algorithm Attacks', 'SSRF', 'Recon', 'Encoded Path Traversal', 'Log Leakage', 'Git History Recovery'],
    color: 'neon-purple',
    icon: 'Code',
    stages: [
      { label: 'Server-Side Logic Abuse', nodes: [challenge('ssti'), challenge('python-compiler')] },
      { label: 'Access & Trust Boundary Attacks', nodes: [challenge('jwt'), challenge('ssrf')] },
      {
        label: 'Reconnaissance & Information Disclosure',
        nodes: [challenge('hidden-pages'), challenge('path-traversal'), challenge('logfile-challenge'), challenge('git-challenge')],
      },
      { label: 'Capstone', nodes: [challenge('secret-jwt')] },
    ],
  },
  {
    id: 'ctf-competitor',
    title: 'CTF Competitor Path',
    goal: 'Broad coverage across all challenge categories to prepare for CTF competitions.',
    skills: ['Web Exploitation', 'Cryptography', 'Forensics', 'OSINT', 'Network Security', 'Privilege Escalation'],
    color: 'yellow-400',
    icon: 'Shield',
    stages: [
      { label: 'Foundations', nodes: [course('linux-fundamentals'), course('cybersecurity-fundamentals')] },
      {
        label: 'Web Exploitation',
        nodes: [
          challenge('ref-xss'),
          challenge('power-cookie'),
          challenge('bookmarklet'),
          challenge('hidden-pages'),
          challenge('path-traversal'),
          challenge('logfile-challenge'),
          challenge('ssti'),
          challenge('jwt'),
          challenge('ssrf'),
          challenge('python-compiler'),
          challenge('git-challenge'),
          challenge('secret-jwt'),
        ],
      },
      {
        label: 'Cryptography',
        nodes: [
          challenge('crypto-basics'),
          challenge('c1'),
          challenge('c2'),
          challenge('c5'),
          challenge('c14'),
          challenge('BabyRSA'),
          challenge('SecretStrand'),
          challenge('c3'),
          challenge('c3-1'),
          challenge('c6'),
          challenge('c6-1'),
          challenge('c6-2'),
          challenge('c7'),
          challenge('c10'),
          challenge('c13'),
          challenge('c11'),
          challenge('Death_note'),
        ],
      },
      { label: 'Forensics', nodes: [challenge('last_call'), challenge('layers of trust')] },
      { label: 'OSINT', nodes: [challenge('Historic_Site'), challenge('beautifulDate'), challenge('Skating')] },
      { label: 'Network Security', nodes: [challenge('dos-challenge')] },
      { label: 'Privilege Escalation', nodes: [challenge('old_system')] },
    ],
  },
  {
    id: 'cryptography',
    title: 'Cryptography Path',
    goal: 'Deep focus on cryptographic concepts, from encoding to advanced RSA/DH attacks.',
    skills: [
      'Base64', 'Caesar/ROT', 'ASCII', 'JWT Decoding', 'SHA-256 Brute Force', 'Modular Inverse', 'Primitive Roots',
      'RSA Decryption', 'Low-Exponent Attack', 'Small-Modulus Factoring', 'AES-ECB Dictionary Attack',
      'Lagrange Interpolation', 'ECDSA Verification', 'AES-GCM', 'Partial Key Leakage',
    ],
    color: 'neon-purple',
    icon: 'Lock',
    stages: [
      { label: 'Foundations', nodes: [module_('cybersecurity-fundamentals', 'security-cryptography')] },
      { label: 'Encoding & Classic Ciphers', nodes: [challenge('crypto-basics'), challenge('c1'), challenge('c2'), challenge('c5')] },
      { label: 'Hashing', nodes: [challenge('c14')] },
      {
        label: 'Asymmetric Cryptography',
        nodes: [challenge('c3'), challenge('c3-1'), challenge('c6'), challenge('c6-1'), challenge('c6-2'), challenge('BabyRSA')],
      },
      { label: 'Symmetric Cryptography', nodes: [challenge('c7')] },
      {
        label: 'Advanced / Hard',
        nodes: [challenge('c13'), challenge('c10'), challenge('c11'), challenge('Death_note')],
      },
    ],
  },
  {
    id: 'osint',
    title: 'OSINT Path',
    goal: 'For learners interested in open-source intelligence and geolocation.',
    skills: ['Reverse Image Search', 'Geolocation', 'Landmark Identification', 'Stadium/Venue Recognition'],
    color: 'neon-blue',
    icon: 'Search',
    stages: [
      { label: 'Easy', nodes: [challenge('Historic_Site'), challenge('beautifulDate')] },
      { label: 'Medium', nodes: [challenge('Skating')] },
    ],
  },
  {
    id: 'digital-forensics',
    title: 'Digital Forensics Path',
    goal: 'For learners focused on evidence analysis, steganography, and hidden-data recovery.',
    skills: ['DTMF Decoding', 'Audio Channel/XOR Analysis', 'MIME/Email Inspection', 'PGP', 'Argon2 KDF', 'PNG Steganography', 'Metadata Correlation'],
    color: 'neon-purple',
    icon: 'Search',
    stages: [
      { label: 'Foundations', nodes: [module_('cybersecurity-fundamentals', 'security-cryptography')] },
      { label: 'Audio & Signal Forensics', nodes: [challenge('last_call')] },
      { label: 'Email, Metadata & Steganography', nodes: [challenge('layers of trust')] },
    ],
  },
  {
    id: 'systems-network-security',
    title: 'Systems & Network Security Path',
    goal: 'For learners focused on infrastructure-level attacks — from network protocol abuse to privilege escalation on live systems.',
    skills: ['TCP Connection Exhaustion', 'SSH Terminal Exploitation', 'Sudo Auditing', 'Outdated Binary Exploitation'],
    color: 'yellow-400',
    icon: 'Network',
    stages: [
      { label: 'Foundations', nodes: [course('linux-fundamentals'), module_('computer-networks', 'network-security')] },
      { label: 'Network-Layer Attacks', nodes: [challenge('dos-challenge')] },
      { label: 'Host-Level Exploitation', nodes: [challenge('old_system')] },
    ],
  },
];
