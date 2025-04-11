import { useState } from 'react';
import { auth, createUserWithEmailAndPassword } from '../../lib/firebase';
import { db } from '../../lib/firebase';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

function CreateAccount() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [source, setsource] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState(null);

    const checkIfExists = async (field, value) => {
        const partnersRef = collection(db, 'partners');
        const q = query(partnersRef, where(field, '==', value));
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    };
  
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Check if email exists
            const emailExists = await checkIfExists('email', email);
            if (emailExists) {
                setError('Email already exists');
                return;
            }

            // Check if name exists
            const nameExists = await checkIfExists('name', name);
            if (nameExists) {
                setError('Name already exists');
                return;
            }

            // Check if phone number exists
            const phoneExists = await checkIfExists('phoneNumber', phoneNumber);
            if (phoneExists) {
                setError('Phone number already exists');
                return;
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const partnersCollection = collection(db, 'partners');
            await setDoc(doc(partnersCollection, user.uid), {
                email: user.email,
                source,
                phoneNumber,
                name,
                partnerRef: (name.substring(0, 4) + phoneNumber.slice(-4)).toUpperCase(),
                createdAt: new Date().toISOString(),
                userId: user.uid,
            });

            alert('Account created successfully!');
        } catch (error) {
            setError(error.message);
        }
    };
  
    return (
        <div className="h-[50vh] flex items-start justify-center bg-gray-50 mt-5">
            <div className="max-w-md w-full space-y-6 p-8 bg-white border-2 border-gray-700 rounded-lg ">
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
                </div>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="name" className="sr-only">Name</label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Name"
                            required
                            className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="email" className="sr-only">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            required
                            className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="sr-only">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            required
                            className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="sourceName" className="sr-only">source Name</label>
                        <input
                            id="source"
                            type="text"
                            value={source}
                            onChange={(e) => setsource(e.target.value)}
                            placeholder="source"
                            required
                            className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="phoneNumber" className="sr-only">Phone Number</label>
                        <input
                            id="phoneNumber"
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="Phone Number"
                            required
                            className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Create Account
                    </button>
                </form>
                {error && <p className="mt-2 text-center text-sm text-red-600">{error}</p>}
            </div>
        </div>
    );
}
  
export default CreateAccount;