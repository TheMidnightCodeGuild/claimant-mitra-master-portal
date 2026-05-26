import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { db } from "../../lib/firebase";

function filterCustomersBySearch(customers, searchQuery, searchField) {
  if (!searchQuery) return customers;
  const q = searchQuery.toLowerCase();
  return customers.filter((customer) => {
    switch (searchField) {
      case "name":
        return customer.name?.toLowerCase().includes(q);
      case "email":
        return customer.email?.toLowerCase().includes(q);
      case "mobile":
        return customer.mobile?.toString().includes(q);
      case "id":
        return customer.id?.toLowerCase().includes(q);
      case "all":
        return (
          customer.name?.toLowerCase().includes(q) ||
          customer.email?.toLowerCase().includes(q) ||
          customer.mobile?.toString().includes(q) ||
          customer.id?.toLowerCase().includes(q)
        );
      default:
        return true;
    }
  });
}

function formatCreatedAt(value) {
  if (!value) return "—";
  try {
    const d =
      typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function ViewAllCustomers() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("name");
  const [deleting, setDeleting] = useState(false);
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const snap = await getDocs(collection(db, "customers"));
        const rows = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        rows.sort((a, b) =>
          String(a.name || a.email || "").localeCompare(
            String(b.name || b.email || ""),
            undefined,
            { sensitivity: "base" }
          )
        );
        setCustomers(rows);
        setFilteredCustomers(rows);
      } catch (err) {
        console.error("Error fetching customers:", err);
        setError("Failed to fetch customers");
      } finally {
        setLoading(false);
      }
    }
    fetchCustomers();
  }, []);

  useEffect(() => {
    setFilteredCustomers(
      filterCustomersBySearch(customers, searchQuery, searchField)
    );
  }, [searchQuery, searchField, customers]);

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleDelete = async (customer) => {
    const ok = window.confirm(
      `Delete customer "${customer.name || customer.email}"?\n\nThis removes their Firestore profile only. Their Firebase Auth account is not deleted. Linked cases may still reference UID ${customer.id} until delinked.`
    );
    if (!ok) return;

    setDeleting(true);
    setError(null);
    try {
      await deleteDoc(doc(db, "customers", customer.id));
      setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
      showSuccess("Customer profile deleted");
    } catch (err) {
      console.error("Error deleting customer:", err);
      setError(err.message || "Failed to delete customer");
    } finally {
      setDeleting(false);
    }
  };

  const handlePasswordReset = async (email) => {
    if (!email) {
      alert("Customer has no email address");
      return;
    }

    setPasswordResetLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(getAuth(), email);
      showSuccess(`Password reset email sent to ${email}`);
    } catch (err) {
      console.error("Error sending password reset:", err);
      setError(err.message || "Failed to send password reset");
    } finally {
      setPasswordResetLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="ui-spinner" />
      </div>
    );
  }

  if (error && customers.length === 0) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4 text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="ui-content-max">
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-emerald-600 px-6 py-3 text-sm text-white shadow-lg">
          {successMessage}
        </div>
      )}

      <div className="ui-page-intro mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="ui-section-eyebrow">Directory</p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            All Customers
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Password changes are sent by email; the customer completes reset in
            CCM.
          </p>
        </div>
        <span className="ui-stat-pill">
          {customers.length} {customers.length === 1 ? "Customer" : "Customers"}
        </span>
      </div>

      <div className="ui-search-panel mb-6">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customers..."
              className="ui-input w-full"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="ui-input w-full"
            >
              <option value="all">All Fields</option>
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="mobile">Mobile</option>
              <option value="id">Customer ID</option>
            </select>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          Found {filteredCustomers.length} customers
          {searchQuery ? ` matching "${searchQuery}"` : ""}
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      {customers.length === 0 ? (
        <p className="text-center text-slate-600">No customers found.</p>
      ) : filteredCustomers.length === 0 ? (
        <p className="text-center text-slate-600">No customers match your search.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-3 py-2 font-semibold text-slate-700">Name</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Email</th>
                <th className="hidden px-3 py-2 font-semibold text-slate-700 sm:table-cell">
                  Mobile
                </th>
                <th className="px-3 py-2 font-semibold text-slate-700">Cases</th>
                <th className="hidden px-3 py-2 font-semibold text-slate-700 md:table-cell">
                  Created
                </th>
                <th className="px-3 py-2 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredCustomers.map((customer) => {
                const caseCount = Array.isArray(customer.cases)
                  ? customer.cases.length
                  : 0;
                return (
                  <tr key={customer.id} className="hover:bg-slate-50">
                    <td className="max-w-[10rem] truncate px-3 py-2 font-medium text-slate-900">
                      {customer.name || "—"}
                    </td>
                    <td className="max-w-[12rem] truncate px-3 py-2 text-slate-700">
                      {customer.email || "—"}
                    </td>
                    <td className="hidden px-3 py-2 text-slate-700 sm:table-cell">
                      {customer.mobile ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{caseCount}</td>
                    <td className="hidden whitespace-nowrap px-3 py-2 text-slate-600 md:table-cell">
                      {formatCreatedAt(customer.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap">
                        <button
                          type="button"
                          disabled={passwordResetLoading || !customer.email}
                          onClick={() => handlePasswordReset(customer.email)}
                          className="rounded-lg bg-slate-600 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                        >
                          {passwordResetLoading ? "Sending..." : "Change Password"}
                        </button>
                        <button
                          type="button"
                          disabled={deleting}
                          onClick={() => handleDelete(customer)}
                          className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                      <p
                        className="mt-1 font-mono text-[10px] text-slate-400"
                        title={customer.id}
                      >
                        {customer.id.slice(0, 8)}…
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
