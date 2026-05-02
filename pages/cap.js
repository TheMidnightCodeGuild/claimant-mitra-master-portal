import { useState } from 'react';
import { auth, createUserWithEmailAndPassword } from '../lib/firebase';
import { db } from '../lib/firebase';
import { doc, setDoc, collection } from 'firebase/firestore';

function CreateAccount() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState(null);
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const masterCollection = collection(db, 'master');
        await setDoc(doc(masterCollection, user.uid), {
          email: user.email,
          name: name,
          createdAt: new Date().toISOString(),
          userId: user.uid,
        });

        alert('Account created successfully!');
      } catch (error) {
        setError(error.message);
      }
    };
  
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8 ui-card-padded border-indigo-100/90 shadow-2xl shadow-indigo-950/10 ring-1 ring-white/80">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Create Account</h2>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <div>
                <label htmlFor="name" className="sr-only">Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  required
                  className="ui-input relative block py-2.5 placeholder:text-slate-400"
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
                  className="ui-input relative block py-2.5 placeholder:text-slate-400"
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
                  className="ui-input relative block py-2.5 placeholder:text-slate-400"
                />
              </div>
             
            </div>
            <button
              type="submit"
              className="ui-btn-primary w-full shadow-sm"
            >
              Create Account
            </button>
          </form>
          {error && <p className="mt-2 text-center text-sm text-rose-600">{error}</p>}
        </div>
      </div>
    );
}
  
export default CreateAccount;