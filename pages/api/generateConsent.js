import { createConsent } from '../../lib/consentGenerator';
import { sendEmail } from '../../lib/mailer';
import { getStaticContent } from '../../lib/firestore';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { recipientEmail, documentData } = req.body;

        // Get static content from Firestore
        const staticContent = await getStaticContent();

        // Generate document
        const documentBuffer = await createConsent(documentData, staticContent);

        // Send email with document
        await sendEmail({
            to: recipientEmail,
            subject: 'Consent Letter - ClaimantMitra',
            text: "Kindly find the attached Consent Letter and digitally sign it.",
            attachments: [{
                filename: 'Consent.docx',
                content: documentBuffer
            }]
        });

        res.status(200).json({ message: 'Document generated and sent successfully' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error processing request', error: error.message });
    }
} 