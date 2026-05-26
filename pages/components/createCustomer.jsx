import { useState } from "react";
import { auth, createUserWithEmailAndPassword } from "../../lib/firebase";
import { db } from "../../lib/firebase";
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { invalidateCollection } from "../../lib/collectionCache";

function CreateCustomer() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [aadharNo, setAadharNo] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkIfExists = async (field, value) => {
    const customersRef = collection(db, "customers");
    const q = query(customersRef, where(field, "==", value));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    const mobileDigits = String(mobile).replace(/\D/g, "");
    const aadharDigits = String(aadharNo).replace(/\D/g, "");

    if (mobileDigits.length !== 10) {
      setError("Mobile must be a valid 10-digit number");
      setLoading(false);
      return;
    }

    if (aadharDigits.length !== 12) {
      setError("Aadhar must be 12 digits");
      setLoading(false);
      return;
    }

    try {
      const emailExists = await checkIfExists("email", trimmedEmail);
      if (emailExists) {
        setError("Email already exists in customers");
        setLoading(false);
        return;
      }

      const mobileExists = await checkIfExists("mobile", mobileDigits);
      if (mobileExists) {
        setError("This mobile number is already registered");
        setLoading(false);
        return;
      }

      const aadharExists = await checkIfExists("aadharNo", aadharDigits);
      if (aadharExists) {
        setError("This Aadhar number is already registered");
        setLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        password
      );
      const user = userCredential.user;

      await setDoc(doc(collection(db, "customers"), user.uid), {
        userId: user.uid,
        email: user.email,
        name: trimmedName,
        mobile: mobileDigits,
        aadharNo: aadharDigits,
        cases: [],
        createdAt: new Date().toISOString(),
      });
      invalidateCollection("customers");

      setError("Customer created successfully! You may need to sign in again as master if your session switched to the new account.");
      setEmail("");
      setPassword("");
      setName("");
      setMobile("");
      setAadharNo("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-5 flex min-h-[50vh] items-start justify-center bg-gradient-to-b from-slate-100/80 to-indigo-50/40">
      <div className="ui-card-padded max-w-md w-full space-y-6 !p-8 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Create Customer</h2>
          <p className="mt-2 text-sm text-gray-600">
            Creates a CCM customer account (same fields as self-signup).
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="cust-name" className="sr-only">
              Name
            </label>
            <input
              id="cust-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
              className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="cust-email" className="sr-only">
              Email
            </label>
            <input
              id="cust-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="cust-password" className="sr-only">
              Password
            </label>
            <input
              id="cust-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="cust-mobile" className="sr-only">
              Mobile
            </label>
            <input
              id="cust-mobile"
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="Mobile (10 digits)"
              required
              className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="cust-aadhar" className="sr-only">
              Aadhar
            </label>
            <input
              id="cust-aadhar"
              type="text"
              inputMode="numeric"
              value={aadharNo}
              onChange={(e) => setAadharNo(e.target.value)}
              placeholder="Aadhar (12 digits)"
              required
              className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              "Create customer"
            )}
          </button>
        </form>
        {error && (
          <p
            className={`mt-2 text-center text-sm ${
              error.startsWith("Customer created successfully")
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default CreateCustomer;
