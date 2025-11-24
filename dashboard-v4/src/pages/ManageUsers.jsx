import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import api from "../api"; // auto-attaches Authorization header

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  // everything downstream should use these same keys
  const role = localStorage.getItem("role") || "";
  const me = localStorage.getItem("username") || ""; // store this at login

  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/auth/users"); // token added by api.js
      const list = Array.isArray(res.data) ? res.data : (res.data.users || []);
      setUsers(list);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) {
        localStorage.removeItem("access_token");
        toast.error("Session expired. Please sign in again.");
        navigate("/login");
        return;
      }
      toast.error("Failed to fetch users.");
      console.error("fetchUsers error:", err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (username) => {
    if (!window.confirm(`Delete user "${username}"?`)) return;
    try {
      await api.delete(`/auth/delete-user/${username}`);
      toast.success(`User ${username} deleted`);
      setUsers((prev) => prev.filter((u) => u.username !== username));
    } catch (err) {
      toast.error("Failed to delete user.");
      console.error(err?.response?.data || err);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      toast.error("Enter a new password.");
      return;
    }
    try {
      await api.post(`/auth/reset-password/${selectedUser}`, {
        new_password: newPassword,
      });
      toast.success(`Password reset for ${selectedUser}`);
      setSelectedUser(null);
      setNewPassword("");
    } catch (err) {
      toast.error("Failed to reset password.");
      console.error(err?.response?.data || err);
    }
  };

  // UI permissions, matching backend rules:
  const canDelete = (u) => role === "superadmin" && u.role !== "superadmin";

  const canReset = (u) => {
    if (role === "superadmin") return true; // can reset anyone
    if (role === "admin") {
      // admin can reset read_only and their own admin account
      if (u.role === "read_only") return true;
      if (u.role === "admin" && u.username === me) return true;
      return false;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8 text-gray-900 dark:text-white">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-600 flex items-center gap-2">
          👥 Manage Users
        </h1>
        {role === "superadmin" && (
          <button
            onClick={() => navigate("/add-user")}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            ➕ Add New User
          </button>
        )}
      </div>

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl overflow-hidden">
          <table className="min-w-full border-collapse">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="px-6 py-3 text-left">Username</th>
                <th className="px-6 py-3 text-left">Role</th>
                <th className="px-6 py-3 text-left">Created At</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id ?? u.username}
                  className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  <td className="px-6 py-3">{u.username}</td>
                  <td className="px-6 py-3 capitalize">{u.role}</td>
                  <td className="px-6 py-3">
                    {u.created_at ? new Date(u.created_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-6 py-3 flex gap-2">
                    {canDelete(u) && (
                      <button
                        onClick={() => handleDelete(u.username)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition"
                      >
                        Delete
                      </button>
                    )}

                    {canReset(u) && (
                      <button
                        onClick={() => setSelectedUser(u.username)}
                        className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition"
                      >
                        {u.username === me ? "Change My Password" : "Reset Password"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Password Reset Modal */}
      {selectedUser && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-semibold mb-4 text-blue-600">
              🔐 Set New Password for {selectedUser}
            </h2>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full border border-gray-300 dark:border-gray-600 p-2 rounded-lg mb-4 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setSelectedUser(null); setNewPassword(""); }}
                className="px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
