import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.office365.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || '',
    },
});

export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject,
            text,
            html,
        });
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

export const sendWelcomeEmail = async (email: string, username?: string, fullName?: string) => {
    try {
        // Read the welcome email template
        const templatePath = path.join(__dirname, '../../email-templates/welcome-email.html');
        let template = await fs.readFile(templatePath, 'utf-8');

        // Prepare user data
        const name = fullName || username || email.split('@')[0];
        const displayUsername = username || email.split('@')[0];
        const joinDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const dashboardUrl = process.env.FRONTEND_URL
            ? `${process.env.FRONTEND_URL}/dashboard`
            : 'http://localhost:3000/dashboard';

        // Replace placeholders
        template = template.replace(/{{name}}/g, name);
        template = template.replace(/{{username}}/g, displayUsername);
        template = template.replace(/{{email}}/g, email);
        template = template.replace(/{{joinDate}}/g, joinDate);
        template = template.replace(/{{dashboardUrl}}/g, dashboardUrl);

        // Replace optional placeholder URLs (use dashboard URL as fallback)
        template = template.replace(/{{unsubscribeUrl}}/g, dashboardUrl);
        template = template.replace(/{{privacyUrl}}/g, dashboardUrl);
        template = template.replace(/{{termsUrl}}/g, dashboardUrl);

        // Send the email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: '🛡️ Welcome to CyTutor - Start Your Cybersecurity Journey!',
            text: `Welcome to CyTutor, ${name}! Your account has been successfully created. Visit ${dashboardUrl} to get started.`,
            html: template,
        });

        console.log(`Welcome email sent to: ${email}`);
    } catch (error) {
        // Non-blocking: log error but don't throw
        console.error('Error sending welcome email:', error);
    }
};

export const sendStreakReminderEmail = async (
    email: string,
    name: string,
    currentStreak: number,
    maxStreak: number,
    freezesAvailable: number
) => {
    try {
        // Read the streak reminder template
        const templatePath = path.join(__dirname, '../../email-templates/streak-reminder.html');
        let template = await fs.readFile(templatePath, 'utf-8');

        // Prepare URLs
        const challengesUrl = process.env.FRONTEND_URL
            ? `${process.env.FRONTEND_URL}/challenges`
            : 'http://localhost:3000/challenges';
        const dashboardUrl = process.env.FRONTEND_URL
            ? `${process.env.FRONTEND_URL}/dashboard`
            : 'http://localhost:3000/dashboard';

        // Replace placeholders
        template = template.replace(/{{name}}/g, name);
        template = template.replace(/{{currentStreak}}/g, currentStreak.toString());
        template = template.replace(/{{maxStreak}}/g, maxStreak.toString());
        template = template.replace(/{{freezesAvailable}}/g, freezesAvailable.toString());
        template = template.replace(/{{challengesUrl}}/g, challengesUrl);
        template = template.replace(/{{dashboardUrl}}/g, dashboardUrl);

        // Send the email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: '🔥 Keep Your Streak Alive!',
            text: `Hey ${name}! Your ${currentStreak}-day streak is on fire! Complete a challenge today to keep the momentum going.`,
            html: template,
        });

        console.log(`Streak reminder sent to: ${email}`);
    } catch (error) {
        console.error('Error sending streak reminder:', error);
        throw error;
    }
};

export const sendStreakLostEmail = async (
    email: string,
    name: string,
    lostStreak: number,
    maxStreak: number,
    canRestore: boolean
) => {
    try {
        // Read the streak lost template
        const templatePath = path.join(__dirname, '../../email-templates/streak-lost.html');
        let template = await fs.readFile(templatePath, 'utf-8');

        // Prepare URLs
        const dashboardUrl = process.env.FRONTEND_URL
            ? `${process.env.FRONTEND_URL}/dashboard`
            : 'http://localhost:3000/dashboard';

        // Replace placeholders
        template = template.replace(/{{name}}/g, name);
        template = template.replace(/{{lostStreak}}/g, lostStreak.toString());
        template = template.replace(/{{maxStreak}}/g, maxStreak.toString());
        template = template.replace(/{{restoreCost}}/g, '100');
        template = template.replace(/{{dashboardUrl}}/g, dashboardUrl);

        // Handle conditional content (simple approach)
        if (canRestore) {
            // Remove the {{else}} block
            template = template.replace(/{{#if canRestore}}/g, '');
            template = template.replace(/{{\/if}}/g, '');
            template = template.replace(/{{else}}[\s\S]*?(?={{\/if}})/g, '');
        } else {
            // Remove the {{#if}} block and keep {{else}}
            template = template.replace(/{{#if canRestore}}[\s\S]*?{{else}}/g, '');
            template = template.replace(/{{\/if}}/g, '');
        }

        // Send the email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: '😔 Streak Broken',
            text: `Hey ${name}, we noticed you missed a day yesterday. Your ${lostStreak}-day streak has ended. ${canRestore ? 'You can restore it for 100 points!' : 'Start a new streak today!'}`,
            html: template,
        });

        console.log(`Streak lost notification sent to: ${email}`);
    } catch (error) {
        console.error('Error sending streak lost email:', error);
        throw error;
    }
};

export const verifyConnection = async () => {
    try {
        await transporter.verify();
        console.log('Email service connected successfully');
        return true;
    } catch (error) {
        console.error('Email service connection failed:', error);
        return false;
    }
};
