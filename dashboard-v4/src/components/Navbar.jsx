import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Upload, Users, Lock, FileDown, Sun, Moon } from "lucide-react";

export default function Navbar({ onChangePasswordClick }) {
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();
  const [role, setRole] = useState("");

  useEffect(() => {
    setRole(localStorage.getItem("role"));
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-2xl font-bold text-blue-700 flex items-center gap-2">
        🧠 Antarex AI Dashboard
      </h1>

      <div className="flex gap-3 items-center">
        {(role === "superadmin" || role === "admin") && (
          <>
            <button
              onClick={() => navigate("/upload")}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Upload size={16} /> Upload
            </button>

            <button
              onClick={() => {
                const link = document.createElement("a");
                link.href = "http://localhost:8000/export/csv";
                link.setAttribute("download", "alerts_export.csv");
                document.body.appendChild(link);
                link.click();
                link.remove();
              }}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              <FileDown size={16} /> Export CSV
            </button>
          </>
        )}

        {role === "superadmin" && (
          <button
            onClick={() => navigate("/manage-users")}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
          >
            <Users size={16} /> Manage Users
          </button>
        )}

        <button
          onClick={onChangePasswordClick}
          className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition"
        >
          <Lock size={16} /> Change Password
        </button>

        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 bg-gray-700 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition"
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </div>
  );
}
