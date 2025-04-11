import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import path from 'path';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from './firebase';

export async function createConsent(dynamicData, staticContent) {
    try {
        // Load the document template
        const template = fs.readFileSync(path.resolve('./templates/consent.docx'), 'binary');
        
        const zip = new PizZip(template);
        
        let docx = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        // Combine static and dynamic content
        const templateData = {
            ...staticContent,
            ...dynamicData,
        };

        // Render the document
        docx.render(templateData);

        // Generate buffer
        const buffer = docx.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE'
        });

        // Upload to Firebase Storage
        const storageRef = ref(storage, `consent_forms/${dynamicData.docId}.docx`);
        await uploadBytes(storageRef, buffer);
        
        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);

        // Update Firestore document
        const userDocRef = doc(db, 'users', dynamicData.docId);
        await updateDoc(userDocRef, {
            consentForm: downloadURL
        });

        return buffer;
    } catch (error) {
        throw new Error(`Error generating document: ${error.message}`);
    }
}