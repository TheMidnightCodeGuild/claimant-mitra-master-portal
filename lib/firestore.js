import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function getStaticContent() {
    try {
        const docRef = doc(db, 'templates', 'documentTemplate');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            // Return hardcoded content if no Firestore document exists
            return {
                header: "Standard Document Header",
                footer: "Standard Document Footer",
                // ... other static content
            };
        }
    } catch (error) {
        console.error('Error fetching static content:', error);
        // Return hardcoded fallback content
        return {
            header: "Standard Document Header",
            footer: "Standard Document Footer",
            // ... other static content
        };
    }
} 