import { useState } from "react";

export async function sendConsent(
  email,
  name,
  docId,
  address,
  policyHolder,
  policyNo,
  claimNo,
  complaintDate,
  companyName,
  estimatedClaimAmount,
  processingFee,
  commission
) {
  try {
    const response = await fetch("/api/generateConsent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipientEmail: email,
        documentData: {
          name,
          docId,
          address,
          policyHolder,
          policyNo,
          claimNo,
          complaintDate,
          companyName,
          estimatedClaimAmount,
          processingFee: processingFee || "NIL/-",
          commission: commission || "20",
        },
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate consent");
    }

    return { success: true };
  } catch (err) {
    throw new Error(err.message);
  }
}

const fields = [
  {
    name: "recipientEmail",
    label: "Recipient Email",
    type: "email",
    required: true,
  },
  {
    name: "name",
    label: "Name",
    type: "text",
    required: true,
  },
  {
    name: "address",
    label: "Address",
    type: "textarea",
    required: true,
    rows: 3,
  },
  {
    name: "policyHolder",
    label: "Policy Holder",
    type: "text",
    required: true,
  },
  {
    name: "policyNo",
    label: "Policy Number",
    type: "text",
    required: true,
  },
  {
    name: "claimNo",
    label: "Claim Number",
    type: "text",
    required: true,
  },
  {
    name: "complaintDate",
    label: "Complaint Date",
    type: "date",
    required: true,
  },
  {
    name: "companyName",
    label: "Company Name",
    type: "text",
    required: true,
  },
  {
    name: "estimatedClaimAmount",
    label: "Estimated Claim Amount",
    type: "number",
    required: true,
  },
  {
    name: "processingFee",
    label: "Processing Fee",
    type: "text",
    required: true,
  },
  {
    name: "commission",
    label: "Commission (%)",
    type: "number",
    required: true,
  },
];

export default function Consent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    recipientEmail: "",
    name: "",
    address: "",
    policyHolder: "",
    policyNo: "",
    claimNo: "",
    complaintDate: "",
    companyName: "",
    estimatedClaimAmount: "",
    processingFee: "",
    commission: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const docIdResponse = await fetch(
        `/api/getDocId?email=${encodeURIComponent(formData.recipientEmail)}`
      );
      if (!docIdResponse.ok) {
        throw new Error("Failed to fetch document ID");
      }
      const { docId } = await docIdResponse.json();

      if (!docId) {
        throw new Error("Document ID not available");
      }

      await sendConsent(
        formData.recipientEmail,
        formData.name,
        docId,
        formData.address,
        formData.policyHolder,
        formData.policyNo,
        formData.claimNo,
        formData.complaintDate,
        formData.companyName,
        formData.estimatedClaimAmount,
        formData.processingFee,
        formData.commission
      );

      setSuccess(true);
      setFormData({
        recipientEmail: "",
        name: "",
        address: "",
        policyHolder: "",
        policyNo: "",
        claimNo: "",
        complaintDate: "",
        companyName: "",
        estimatedClaimAmount: "",
        processingFee: "",
        commission: "",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-2 sm:px-4 py-8">
      <div className="bg-white rounded-xl shadow-lg p-6 sm:p-10 border border-gray-100">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center text-blue-700">
          Generate Consent Document
        </h2>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md border border-red-200 text-center animate-fade-in">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-md border border-green-200 text-center animate-fade-in">
            Document generated and sent successfully!
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 sm:grid-cols-2 gap-6"
        >
          {fields.map((field) => (
            <div
              key={field.name}
              className={`flex flex-col ${
                field.type === "textarea" ? "sm:col-span-2" : ""
              }`}
            >
              <label
                htmlFor={field.name}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  id={field.name}
                  name={field.name}
                  value={formData[field.name]}
                  onChange={handleChange}
                  rows={field.rows || 3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 resize-none"
                  required={field.required}
                  autoComplete="off"
                />
              ) : (
                <input
                  id={field.name}
                  name={field.name}
                  type={field.type}
                  value={formData[field.name]}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required={field.required}
                  autoComplete="off"
                  min={field.type === "number" ? 0 : undefined}
                />
              )}
            </div>
          ))}

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-150 ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    ></path>
                  </svg>
                  Generating...
                </span>
              ) : (
                "Generate Document"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
