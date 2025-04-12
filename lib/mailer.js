import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',  // or your preferred service
    auth: {
        user: "claimantmitra@gmail.com",
        pass: "ghgl lqnv jafn jdaa"
    }
});

export async function sendEmail({ to, subject, text, html, attachments }) {
    try {
        const mailOptions = {
            from: "claimantmitra@gmail.com",
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