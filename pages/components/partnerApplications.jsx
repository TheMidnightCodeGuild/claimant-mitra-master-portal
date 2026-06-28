import { useState, useEffect, useCallback } from "react";
import { fetchCollectionCached } from "../../lib/collectionCache";

function PartnerApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("source");
  const [filteredApplications, setFilteredApplications] = useState([]);

  const loadApplications = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      const applicationsList = await fetchCollectionCached("partnerApplications", {
        forceRefresh,
      });
      setApplications(applicationsList);
      setFilteredApplications(applicationsList);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredApplications(applications);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = applications.filter((application) => {
      switch (searchField) {
        case "source":
          return application.source?.toLowerCase().includes(query);
        case "name":
          return application.name?.toLowerCase().includes(query);
        case "email":
          return application.email?.toLowerCase().includes(query);
        case "phone":
          return application.mobile?.toString().includes(query);
        case "status":
          return application.status?.toLowerCase().includes(query);
        case "all":
          return (
            application.source?.toLowerCase().includes(query) ||
            application.name?.toLowerCase().includes(query) ||
            application.email?.toLowerCase().includes(query) ||
            application.mobile?.toString().includes(query) ||
            application.status?.toLowerCase().includes(query)
          );
        default:
          return true;
      }
    });

    setFilteredApplications(filtered);
  }, [searchQuery, searchField, applications]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <div className="ui-spinner" />
        <div className="text-sm font-medium text-slate-600">Loading applications...</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="max-w-6xl mx-auto">
        <div className="ui-page-intro mb-8">
          <p className="ui-section-eyebrow">Partners</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">New Partner Applications</h1>
        </div>

        <div className="ui-search-panel mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search applications..."
                className="ui-input"
              />
            </div>

            <div className="sm:w-48">
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                className="ui-input sm:w-48"
              >
                <option value="all">All Fields</option>
                <option value="source">Source</option>
                <option value="name">Name</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>

          <div className="text-sm text-slate-600">
            Found {filteredApplications.length} applications
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
        </div>

        <div className="grid gap-6">
          {filteredApplications.map((application) => (
            <div
              key={application.id}
              className="ui-card-padded"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h2 className="text-xl font-semibold mb-2">
                    {application.source || "Unnamed Source"}
                  </h2>
                  <p className="text-slate-600">
                    <span className="font-medium">Name:</span>{" "}
                    {application.name}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-medium">Email:</span>{" "}
                    {application.email}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-medium">Phone:</span>{" "}
                    {application.mobile}
                  </p>
                </div>
                <div>
                  <p className="text-slate-600">
                    <span className="font-medium">Application Date:</span>{" "}
                    {new Date(application.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-medium">Status:</span>{" "}
                    <span
                      className={`px-2 py-1 rounded-full text-sm ${
                        application.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : application.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {application.status || "pending"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Documents Section */}
              {application.fileBucket && application.fileBucket.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h3 className="font-medium text-slate-900 mb-2">Documents</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {application.fileBucket.map((fileUrl, index) => (
                      <a
                        key={index}
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 p-2 rounded-md hover:bg-blue-50"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                        Document {index + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredApplications.length === 0 && (
          <div className="text-center text-slate-500 mt-8">
            {searchQuery
              ? "No matching applications found"
              : "No applications found"}
          </div>
        )}
      </div>
    </div>
  );
}

export default PartnerApplications;
