import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import path from 'path';

export async function createConsent(dynamicData, staticContent) {
    try {
        // Load the document template
        const template = fs.readFileSync(path.resolve('./templates/consent.docx'), 'binary');
        
        const zip = new PizZip(template);
        
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        // Combine static and dynamic content
        const templateData = {
            ...staticContent,
            ...dynamicData,
        };

        // Render the document
        doc.render(templateData);

        // Generate buffer
        const buffer = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE'
        });

        return buffer;
    } catch (error) {
        throw new Error(`Error generating document: ${error.message}`);
    }
} 