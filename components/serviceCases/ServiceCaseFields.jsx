/** One input for a field defined in lib/serviceCaseTypes.js. */
export default function ServiceCaseField({ field, value, onChange, disabled = false }) {
  const common = {
    name: field.name,
    value: value ?? "",
    onChange,
    disabled,
    required: field.required,
    className:
      "w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-50",
  };

  return (
    <div className={`flex flex-col space-y-2 ${field.type === "textarea" ? "md:col-span-2 lg:col-span-3" : ""}`}>
      <label className="text-sm font-medium text-slate-700">
        {field.label}
        {field.required && <span className="text-rose-600"> *</span>}
      </label>
      {field.type === "textarea" ? (
        <textarea rows={3} {...common} />
      ) : field.type === "select" ? (
        <select {...common}>
          <option value="">Select</option>
          {field.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input type={field.type === "number" ? "number" : "text"} min={field.type === "number" ? 0 : undefined} {...common} />
      )}
    </div>
  );
}
