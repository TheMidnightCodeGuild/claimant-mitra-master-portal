// pages/api/send-contract.js
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

    const { email, contractUrl } = req.body;

    if (!email || !contractUrl) {
        return res.status(400).json({ message: 'Email and contract URL are required' });
    }

    try {
        const mailOptions = {
            from: "claimantmitra@gmail.com",
            to: email,
            subject: 'Digitally Signed Contract',
            html: `
                <p>Here is a copy of your digitally signed contract.</p>
                <p>You can download your contract by clicking <a href="${contractUrl}">here</a>.</p>
                
            `
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Contract sent successfully' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ message: 'Failed to send contract' });
    }
}