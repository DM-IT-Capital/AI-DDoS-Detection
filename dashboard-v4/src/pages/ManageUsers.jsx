import { useEffect, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://localhost:8000/auth/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403) {
        toast.error("❌ You don’t have permission to view users.");
        navigate("/dashboard");
      } else {
        toast.error("Failed to fetch users.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (username) => {
    if (!window.confirm(`Delete user "${username}"?`)) return;
    try {
      await axios.delete(`http://localhost:8000/auth/delete-user/${username}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`User ${username} deleted`);
      setUsers(users.filter((u) => u.username !== username));
    } catch (err) {
      toast.error("Failed to delete user.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-700">👥 Manage Users</h1>
        <button
          onClick={() => navigate("/add-user")}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          ➕ Add New User
        </button>
      </div>

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <div className="bg-white shadow-md rounded-2xl overflow-hidden">
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
                <tr key={u.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-3">{u.username}</td>
                  <td className="px-6 py-3 capitalize">{u.role}</td>
                  <td className="px-6 py-3">
                    {new Date(u.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-3">
                    {u.role !== "superadmin" && (
                      <button
                        onClick={() => handleDelete(u.username)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition"
                      >
                        Delete
                      </button>
                    )}
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
