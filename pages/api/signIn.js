import { auth, signInWithEmailAndPassword } from '../../lib/firebase';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
const cookie = require('cookie');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.log(`Invalid method: ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;
  
  // Validate input
  if (!email || !password) {
    console.log('Missing credentials:', { email: !!email, password: !!password });
    return res.status(400).json({ error: 'Email and password are required' });
  }

  console.log('Attempting sign in for email:', email);
  const db = getFirestore();

  try {
    // Check if the email exists in the master collection
    console.log('Checking master collection for email...');
    const masterCollection = collection(db, 'master');
    const q = query(masterCollection, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('Email not found in master collection:', email);
      return res.status(404).json({ error: 'Email not found in master collection' });
    }

    console.log('Email found in master collection, attempting authentication...');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('Authentication successful for user:', user.uid);

    // Set a cookie with the user's UID
    const sessionCookie = cookie.serialize('session', user.uid, {
      httpOnly: true, // Changed back to true for security
      secure: process.env.NODE_ENV === 'production', // Add secure flag in production
      maxAge: 60 * 60 * 24, // 1 day
      sameSite: 'lax',
      path: '/',
    });

    console.log('Setting session cookie for user:', user.uid);
    res.setHeader('Set-Cookie', sessionCookie);
    res.status(200).json({ message: 'Sign-in successful', userId: user.uid });
  } catch (error) {
    console.error('Sign-in error:', {
      code: error.code,
      message: error.message,
      email: email
    });
    res.status(401).json({ error: error.message });
  }
}