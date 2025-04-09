import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',  // or your preferred service
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

export async function sendEmail({ to, subject, text, attachments }) {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            text: text || 'Please find your document attached.',
            attachments
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        throw new Error(`Error sending email: ${error.message}`);
    }
} 