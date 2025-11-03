import { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import Navbar from "../components/Navbar";
import ChangePasswordModal from "../components/ChangePasswordModal";
import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function Dashboard() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showChangePass, setShowChangePass] = useState(false);
  const [role, setRole] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    if (storedRole) setRole(storedRole);
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:8000/alerts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setAlerts(res.data.alerts || []);
    } catch (err) {
      console.error("Error fetching alerts:", err);
      toast.error("Failed to fetch alerts.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (filename) => {
    try {
      const res = await axios.get(`http://localhost:8000/download/${filename}`, {
        responseType: "blob",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      toast.success("Downloaded successfully!");
    } catch {
      toast.error("Download failed.");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  // 🔹 Aggregate alert data by date for daily upload counts
  const aggregateDailyData = (alerts) => {
    const dailyMap = {};

    alerts.forEach((a) => {
      const date = new Date(a.created_at).toLocaleDateString();
      if (!dailyMap[date]) {
        dailyMap[date] = { date, total: 0, realAttacks: 0, legitTraffic: 0 };
      }
      dailyMap[date].total += 1;
      if (a.verdict === "Real Attack") dailyMap[date].realAttacks += 1;
      if (a.verdict === "Legit Traffic") dailyMap[date].legitTraffic += 1;
    });

    return Object.values(dailyMap).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  };

  // 📊 Chart Data
  const COLORS = ["#ef4444", "#22c55e", "#eab308"]; // red, green, yellow

  const pieData = [
    { name: "Real Attacks", value: alerts.filter((a) => a.verdict === "Real Attack").length },
    { name: "Legit Traffic", value: alerts.filter((a) => a.verdict === "Legit Traffic").length },
    { name: "Pending", value: alerts.filter((a) => a.verdict === "Pending").length },
  ];

  // 📁 Export CSV
  const handleExportCSV = async () => {
    try {
      const res = await axios.get("http://localhost:8000/export/csv", {
        responseType: "blob",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = "alerts_export.csv";
      link.click();
      toast.success("CSV exported successfully!");
    } catch {
      toast.error("Failed to export CSV.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 p-8 dark:bg-gray-900 dark:text-white transition-colors duration-300">
      <Toaster position="top-right" />

      {/* Navbar */}
      <Navbar
        onChangePasswordClick={() => setShowChangePass(true)}
        onExportClick={handleExportCSV}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePass}
        onClose={() => setShowChangePass(false)}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card color="bg-blue-600" label="Total Alerts" value={alerts.length} />
        <Card
          color="bg-red-600"
          label="Real Attacks"
          value={alerts.filter((a) => a.verdict === "Real Attack").length}
        />
        <Card
          color="bg-green-600"
          label="Legit Traffic"
          value={alerts.filter((a) => a.verdict === "Legit Traffic").length}
        />
        <Card
          color="bg-yellow-500"
          label="Pending"
          value={alerts.filter((a) => a.verdict === "Pending").length}
        />
      </div>

      {/* Graphs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* 🥧 Traffic Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h3 className="text-center font-semibold mb-4 text-gray-900 dark:text-white">
            Traffic Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "none",
                  borderRadius: "0.5rem",
                  color: "white",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 📈 Daily Upload & Verdict Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h3 className="text-center font-semibold mb-4 text-gray-900 dark:text-white">
            Daily Uploads & Verdict Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={aggregateDailyData(alerts)}>
              <defs>
                <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="attackGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                  <stop offset="100%" stopColor="#fca5a5" stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="legitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={1} />
                  <stop offset="100%" stopColor="#86efac" stopOpacity={0.3} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "none",
                  borderRadius: "0.5rem",
                  color: "white",
                }}
              />
              <Legend />

              <Line
                type="monotone"
                dataKey="total"
                stroke="url(#totalGradient)"
                strokeWidth={3}
                dot={{ fill: "#3b82f6", r: 5 }}
                activeDot={{ r: 7 }}
                name="Total Uploads"
              />
              <Line
                type="monotone"
                dataKey="realAttacks"
                stroke="url(#attackGradient)"
                strokeWidth={3}
                dot={{ fill: "#ef4444", r: 5 }}
                activeDot={{ r: 7 }}
                name="Real Attacks"
              />
              <Line
                type="monotone"
                dataKey="legitTraffic"
                stroke="url(#legitGradient)"
                strokeWidth={3}
                dot={{ fill: "#22c55e", r: 5 }}
                activeDot={{ r: 7 }}
                name="Legit Traffic"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts Table */}
      {loading ? (
        <p className="text-center text-gray-500">Loading alerts...</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl overflow-hidden">
          <table className="min-w-full border-collapse">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="px-6 py-3 text-left">Filename</th>
                <th className="px-6 py-3 text-left">Verdict</th>
                <th className="px-6 py-3 text-left">Confidence</th>
                <th className="px-6 py-3 text-left">Timestamp</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a, i) => (
                <tr
                  key={i}
                  className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  <td className="px-6 py-3">{a.filename}</td>
                  <td className="px-6 py-3 font-semibold">{a.verdict}</td>
                  <td className="px-6 py-3">{a.confidence}</td>
                  <td className="px-6 py-3">
                    {new Date(a.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => handleDownload(a.filename)}
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// 🔹 Card Component
const Card = ({ color, label, value }) => (
  <div
    className={`${color} text-white rounded-2xl p-6 shadow-lg text-center transition-transform hover:scale-[1.02]`}
  >
    <h2 className="text-lg font-semibold">{label}</h2>
    <p className="text-3xl font-bold mt-2">{value}</p>
  </div>
);
