import { useEffect, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function Download() {
  const [alerts, setAlerts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await axios.get("http://localhost:8000/alerts");
      setAlerts(res.data.alerts || []);
    } catch (err) {
      toast.error("❌ Failed to load alerts");
    }
  };

  const handleDownload = async (filename) => {
    try {
      const res = await axios.get(`http://localhost:8000/download/${filename}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`📥 Downloaded ${filename}`);
    } catch {
      toast.error("File not found or not ready yet.");
    }
  };

  const handleExportCSV = async () => {
    const res = await axios.get("http://localhost:8000/export/csv", {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "alerts_export.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success("✅ CSV exported successfully");
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 p-8">
      <Toaster position="top-right" />
      <h1 className="text-3xl font-bold text-center text-blue-700 mb-6">
        📊 Download / Export Alerts
      </h1>

      <div className="flex justify-center mb-6">
        <button
          onClick={() => navigate("/dashboard")}
          className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition mx-2"
        >
          ← Back
        </button>
        <button
          onClick={handleExportCSV}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition mx-2"
        >
          Export All as CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="px-6 py-3 text-left">Filename</th>
              <th className="px-6 py-3 text-left">Verdict</th>
              <th className="px-6 py-3 text-left">Confidence</th>
              <th className="px-6 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {alerts.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-6 text-gray-500 italic">
                  No alerts found.
                </td>
              </tr>
            ) : (
              alerts.map((alert, i) => (
                <tr
                  key={i}
                  className={`border-b ${
                    alert.verdict === "Real Attack"
                      ? "bg-red-50"
                      : alert.verdict === "Legit Traffic"
                      ? "bg-green-50"
                      : "bg-yellow-50"
                  }`}
                >
                  <td className="px-6 py-3">{alert.filename}</td>
                  <td className="px-6 py-3">{alert.verdict}</td>
                  <td className="px-6 py-3">{alert.confidence}</td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => handleDownload(alert.filename)}
                      className="bg-blue-600 text-white px-4 py-1 rounded-lg hover:bg-blue-700 transition"
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
