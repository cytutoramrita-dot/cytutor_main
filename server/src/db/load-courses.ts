import { readFileSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { query, pool } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface CourseModule {
  id: string;
  title: string;
  description: string;
  estimated_time: number;
  prerequisites: string[];
  route: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  total_modules: number;
  total_time: number;
  icon: string;
  color: string;
  tags: string[];
  learning_objectives: string[];
  modules: CourseModule[];
}

interface CourseData {
  courses: Course[];
  featured_courses: string[];
  categories: string[];
}

async function loadCourses() {
  try {
    console.log('📚 Loading courses from courseApi.ts data...');
    
    // Read course data from the courseApi.ts file structure
    const coursesData: CourseData = {
      "courses": [
        {
          "id": "cybersecurity-fundamentals",
          "title": "Cybersecurity Fundamentals",
          "description": "Comprehensive cybersecurity course aligned with CompTIA Security+ certification. Master security concepts, threats, cryptography, identity management, network security, and incident response.",
          "category": "Cybersecurity",
          "level": "beginner",
          "total_modules": 6,
          "total_time": 235,
          "icon": "Shield",
          "color": "neon-purple",
          "tags": ["Security", "CompTIA Security+", "Cryptography", "IAM", "Incident Response"],
          "learning_objectives": [
            "Understand core security principles and the CIA triad",
            "Identify and defend against common threats and attacks",
            "Master cryptography and PKI concepts",
            "Implement identity and access management",
            "Design and secure network infrastructure",
            "Respond to security incidents effectively"
          ],
          "modules": [
            {
              "id": "security-fundamentals-intro",
              "title": "Introduction to Security",
              "description": "Understand core security concepts, the CIA triad, security principles, and the cybersecurity landscape.",
              "estimated_time": 30,
              "prerequisites": [],
              "route": "/tutorial/security-fundamentals-intro"
            },
            {
              "id": "security-threats-attacks",
              "title": "Threats and Attacks",
              "description": "Learn about malware types, social engineering, application attacks, and network-based threats.",
              "estimated_time": 45,
              "prerequisites": ["security-fundamentals-intro"],
              "route": "/tutorial/security-threats-attacks"
            },
            {
              "id": "security-cryptography",
              "title": "Cryptography",
              "description": "Master encryption algorithms, hashing, digital signatures, PKI, and cryptographic protocols.",
              "estimated_time": 40,
              "prerequisites": ["security-threats-attacks"],
              "route": "/tutorial/security-cryptography"
            },
            {
              "id": "security-identity-access",
              "title": "Identity and Access Management",
              "description": "Master authentication methods, access control models, identity management, and account security.",
              "estimated_time": 35,
              "prerequisites": ["security-cryptography"],
              "route": "/tutorial/security-identity-access"
            },
            {
              "id": "security-network-defense",
              "title": "Network Security and Defense",
              "description": "Learn network security devices, secure network design, VPNs, wireless security, and network monitoring.",
              "estimated_time": 40,
              "prerequisites": ["security-identity-access"],
              "route": "/tutorial/security-network-defense"
            },
            {
              "id": "security-incident-response",
              "title": "Incident Response and Security Operations",
              "description": "Learn incident response procedures, digital forensics, disaster recovery, and security operations best practices.",
              "estimated_time": 45,
              "prerequisites": ["security-network-defense"],
              "route": "/tutorial/security-incident-response"
            }
          ]
        },
        {
          "id": "linux-fundamentals",
          "title": "Linux Fundamentals",
          "description": "Complete tutorial series covering Linux fundamentals for cybersecurity professionals. Master the command line, file systems, permissions, and system administration.",
          "category": "Operating Systems",
          "level": "beginner",
          "total_modules": 7,
          "total_time": 215,
          "icon": "Terminal",
          "color": "neon-green",
          "tags": ["Linux", "Command Line", "System Administration", "Security"],
          "learning_objectives": [
            "Master Linux command line interface",
            "Understand file systems and permissions",
            "Learn process and service management",
            "Configure networking and security",
            "Develop system administration skills"
          ],
          "modules": [
            {
              "id": "linux-basics-introduction",
              "title": "Introduction to Linux",
              "description": "Get started with Linux! Learn what Linux is, its history, and why it's essential for cybersecurity professionals.",
              "estimated_time": 20,
              "prerequisites": [],
              "route": "/tutorial/linux-basics-introduction"
            },
            {
              "id": "linux-file-system",
              "title": "File System & Permissions",
              "description": "Master the Linux file system hierarchy and understand how directories are organized in Linux.",
              "estimated_time": 25,
              "prerequisites": ["linux-basics-introduction"],
              "route": "/tutorial/linux-file-system"
            },
            {
              "id": "linux-basic-commands",
              "title": "Essential Commands",
              "description": "Learn the most important Linux commands for navigation, file manipulation, and basic system operations.",
              "estimated_time": 35,
              "prerequisites": ["linux-file-system"],
              "route": "/tutorial/linux-basic-commands"
            },
            {
              "id": "linux-text-processing",
              "title": "Text Processing & Search",
              "description": "Master powerful Linux text processing tools like grep, sed, awk, and learn to search and manipulate text efficiently.",
              "estimated_time": 30,
              "prerequisites": ["linux-basic-commands"],
              "route": "/tutorial/linux-text-processing"
            },
            {
              "id": "linux-permissions-users",
              "title": "Users, Groups & Permissions",
              "description": "Understand Linux user management, file permissions, and security fundamentals essential for system administration.",
              "estimated_time": 40,
              "prerequisites": ["linux-text-processing"],
              "route": "/tutorial/linux-permissions-users"
            },
            {
              "id": "linux-processes-services",
              "title": "Processes & System Management",
              "description": "Learn to manage processes, services, and system resources in Linux. Essential skills for system administration and troubleshooting.",
              "estimated_time": 35,
              "prerequisites": ["linux-permissions-users"],
              "route": "/tutorial/linux-processes-services"
            },
            {
              "id": "linux-networking-basics",
              "title": "Networking Fundamentals",
              "description": "Master Linux networking basics including network configuration, troubleshooting tools, and security fundamentals.",
              "estimated_time": 30,
              "prerequisites": ["linux-processes-services"],
              "route": "/tutorial/linux-networking-basics"
            }
          ]
        },
        {
          "id": "computer-networks",
          "title": "Computer Networks",
          "description": "Comprehensive introduction to computer networking using a top-down approach. Learn network protocols, Internet architecture, and modern networking technologies based on Kurose-Ross textbook.",
          "category": "Networking",
          "level": "intermediate",
          "total_modules": 8,
          "total_time": 320,
          "icon": "Network",
          "color": "neon-blue",
          "tags": ["Networking", "Internet", "Protocols", "TCP/IP", "OSI Model"],
          "learning_objectives": [
            "Understand Internet architecture and protocols",
            "Master application layer protocols (HTTP, DNS, SMTP)",
            "Learn transport layer mechanisms (TCP, UDP)",
            "Understand network layer routing and addressing",
            "Master link layer and wireless technologies",
            "Learn network security fundamentals",
            "Develop practical networking skills"
          ],
          "modules": [
            {
              "id": "networks-internet-intro",
              "title": "Computer Networks and the Internet",
              "description": "Introduction to computer networks, Internet structure, protocols, and network performance fundamentals.",
              "estimated_time": 45,
              "prerequisites": [],
              "route": "/tutorial/networks-internet-intro"
            },
            {
              "id": "application-layer",
              "title": "Application Layer",
              "description": "Learn HTTP, DNS, SMTP, and other application layer protocols that power Internet applications.",
              "estimated_time": 50,
              "prerequisites": ["networks-internet-intro"],
              "route": "/tutorial/application-layer"
            },
            {
              "id": "transport-layer",
              "title": "Transport Layer",
              "description": "Master TCP and UDP protocols, reliable data transfer, flow control, and congestion control.",
              "estimated_time": 45,
              "prerequisites": ["application-layer"],
              "route": "/tutorial/transport-layer"
            },
            {
              "id": "network-layer-data",
              "title": "Network Layer: Data Plane",
              "description": "Understand IP addressing, routing algorithms, and packet forwarding in the network layer.",
              "estimated_time": 40,
              "prerequisites": ["transport-layer"],
              "route": "/tutorial/network-layer-data"
            },
            {
              "id": "network-layer-control",
              "title": "Network Layer: Control Plane",
              "description": "Learn routing protocols, network management, and control plane operations.",
              "estimated_time": 35,
              "prerequisites": ["network-layer-data"],
              "route": "/tutorial/network-layer-control"
            },
            {
              "id": "link-layer",
              "title": "Link Layer and LANs",
              "description": "Master Ethernet, switching, VLANs, and link layer protocols for local area networks.",
              "estimated_time": 40,
              "prerequisites": ["network-layer-control"],
              "route": "/tutorial/link-layer"
            },
            {
              "id": "wireless-mobile",
              "title": "Wireless and Mobile Networks",
              "description": "Understand WiFi, cellular networks, mobility management, and wireless security.",
              "estimated_time": 35,
              "prerequisites": ["link-layer"],
              "route": "/tutorial/wireless-mobile"
            },
            {
              "id": "network-security",
              "title": "Network Security",
              "description": "Learn cryptography, authentication, network security protocols, and security threats.",
              "estimated_time": 30,
              "prerequisites": ["wireless-mobile"],
              "route": "/tutorial/network-security"
            }
          ]
        }
      ],
      "featured_courses": ["cybersecurity-fundamentals", "linux-fundamentals", "computer-networks"],
      "categories": ["Operating Systems", "Cybersecurity", "Programming", "Networking"]
    };
    
    console.log(`📊 Found ${coursesData.courses.length} courses`);

    // Reseed atomically: readers must never observe a course with zero
    // linked modules mid-reseed, and a bad module (e.g. an unknown
    // tutorial_id) must roll back its whole course rather than leaving an
    // orphaned course row with no modules.
    const client = await pool.connect();
    let loaded = 0;

    try {
      await client.query('BEGIN');

      await client.query('DELETE FROM course_modules');
      await client.query('DELETE FROM courses');
      console.log('🗑️  Cleared existing courses and modules');

      for (const course of coursesData.courses) {
        // Insert course
        await client.query(`
          INSERT INTO courses (
            id, title, description, category, level, total_modules, total_time,
            icon, color, tags, learning_objectives, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        `, [
          course.id,
          course.title,
          course.description,
          course.category,
          course.level,
          course.total_modules,
          course.total_time,
          course.icon,
          course.color,
          course.tags,
          course.learning_objectives
        ]);

        // Insert course modules
        for (let i = 0; i < course.modules.length; i++) {
          const module = course.modules[i];
          await client.query(`
            INSERT INTO course_modules (
              id, course_id, tutorial_id, order_index, title, description,
              estimated_time, prerequisites, route
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            module.id,
            course.id,
            module.id, // tutorial_id same as module id
            i + 1, // order_index starts from 1
            module.title,
            module.description,
            module.estimated_time,
            module.prerequisites,
            module.route
          ]);
        }

        loaded++;
        console.log(`✅ Loaded course: ${course.title} (${course.modules.length} modules)`);
      }

      await client.query('COMMIT');
      console.log(`🎉 Successfully loaded ${loaded} courses`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Failed to load courses, rolled back:', error);
      throw error;
    } finally {
      client.release();
    }

    // Update course statistics
    await updateCourseStatistics();

  } catch (error) {
    console.error('❌ Failed to load courses:', error);
    throw error;
  }
}

async function updateCourseStatistics() {
  try {
    console.log('📈 Updating course statistics...');
    
    // Update completion rates based on user progress
    await query(`
      UPDATE courses 
      SET completion_rate = COALESCE(stats.completion_rate, 0.00)
      FROM (
        SELECT 
          c.id,
          ROUND(
            (COUNT(CASE WHEN ucp.status = 'completed' THEN 1 END) * 100.0 / 
             NULLIF(COUNT(ucp.user_id), 0))::numeric, 2
          ) as completion_rate
        FROM courses c
        LEFT JOIN user_course_progress ucp ON c.id = ucp.course_id
        GROUP BY c.id
      ) stats
      WHERE courses.id = stats.id
    `);
    
    console.log('✅ Course statistics updated');
  } catch (error) {
    console.error('❌ Failed to update course statistics:', error);
  }
}

// Run if called directly
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  loadCourses()
    .then(() => {
      console.log('✅ Course loading completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Course loading failed:', error);
      process.exit(1);
    });
}

export { loadCourses, updateCourseStatistics };