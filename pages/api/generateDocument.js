import { createDocument } from '../../lib/documentGenerator';
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
        const documentBuffer = await createDocument(documentData, staticContent);

        // Send email with document
        await sendEmail({
            to: recipientEmail,
            subject: 'Your Document',
            attachments: [{
                filename: 'document.docx',
                content: documentBuffer
            }]
        });

        res.status(200).json({ message: 'Document generated and sent successfully' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error processing request', error: error.message });
    }
} 