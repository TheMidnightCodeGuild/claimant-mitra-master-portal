import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import path from 'path';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from './firebase';

export async function createContract(dynamicData, staticContent) {
    try {
        // Load the document template
        const template = fs.readFileSync(path.resolve('./templates/contract.docx'), 'binary');
        
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

        const storageRef = ref(storage, `contracts/${dynamicData.docId}.docx`);
        await uploadBytes(storageRef, buffer);
        
        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);

        // Update Firestore document
        const userDocRef = doc(db, 'users', dynamicData.docId);
        await updateDoc(userDocRef, {
            contract: downloadURL
        });

        return buffer;
    } catch (error) {
        throw new Error(`Error generating document: ${error.message}`);
    }
} 