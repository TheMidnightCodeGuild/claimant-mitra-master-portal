// pages/api/send-consent.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: "claimantmitra@gmail.com",
        pass: "ghgl lqnv jafn jdaa"
    }
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { email, consentFormUrl } = req.body;

    if (!email || !consentFormUrl) {
        return res.status(400).json({ message: 'Email and consent form URL are required' });
    }

    try {
        const mailOptions = {
            from: "claimantmitra@gmail.com",
            to: email,
            subject: 'Digitally Signed Consent Form',
            html: `
                <p>Here is a copy of your digitally signed consent form.</p>
                <p>You can download your consent form by clicking <a href="${consentFormUrl}">here</a>.</p>
                
            `
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Consent form sent successfully' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ message: 'Failed to send consent form' });
    }
}