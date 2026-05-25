import nodemailer from 'nodemailer';

const gmailUser = process.env.GMAIL_USER || 'claimantmitra@gmail.com';
const gmailPass = process.env.GMAIL_APP_PASSWORD || 'ghgl lqnv jafn jdaa';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: gmailUser,
        pass: gmailPass,
    },
});

export async function sendEmail({ to, subject, text, html, attachments }) {
    try {
        const mailOptions = {
            from: gmailUser,
            to,
            subject,
            text: text || 'Kindly find the attached letter and digitally sign it.',
            html,
            attachments
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        throw new Error(`Error sending email: ${error.message}`);
    }
} 