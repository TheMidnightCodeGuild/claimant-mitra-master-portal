import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',  // or your preferred service
    auth: {
        user: "ak.963c@gmail.com",
        pass: "qvmr dxln rtan yojl"
    }
});

export async function sendEmail({ to, subject, text, attachments }) {
    try {
        const mailOptions = {
            from: "ak.963c@gmail.com",
            to,
            subject,
            text: text || 'Kindly find the attached letter and digitally sign it.',
            attachments
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        throw new Error(`Error sending email: ${error.message}`);
    }
} 