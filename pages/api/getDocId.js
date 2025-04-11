import { db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ 
            success: false,
            error: 'Email parameter is required'
        });
    }

    try {
        // Query users collection for document with matching email
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return res.status(404).json({
                success: false,
                error: 'No user found with this email'
            });
        }

        // Return the document ID of first matching document
        const docId = querySnapshot.docs[0].id;
        res.status(200).json({
            success: true,
            docId: docId
        });

    } catch (error) {
        console.error('Error fetching document ID:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch document ID',
            details: error.message
        });
    }
}