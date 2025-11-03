import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "admin" });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const res = await axios.get("http://localhost:8000/users");
    setUsers(res.data.users);
  };

  const addUser = async () => {
    await axios.post("http://localhost:8000/auth/add-user", newUser);
    toast.success("User added!");
    setNewUser({ username: "", password: "", role: "admin" });
    fetchUsers();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-6">👤 User Management</h1>

      <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
        <h2 className="font-semibold mb-3">Add New User</h2>
        <div className="flex gap-3">
          <input
            placeholder="Username"
            className="border p-2 rounded flex-1"
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
          />
          <input
            placeholder="Password"
            type="password"
            className="border p-2 rounded flex-1"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
          />
          <select
            className="border p-2 rounded"
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          >
            <option value="admin">Admin</option>
            <option value="superadmin">SuperAdmin</option>
            <option value="read_only">Read Only</option>
          </select>
          <button
            onClick={addUser}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="font-semibold mb-3">Existing Users</h2>
        <table className="min-w-full border-collapse">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="px-6 py-3 text-left">Username</th>
              <th className="px-6 py-3 text-left">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3">{u.username}</td>
                <td className="px-6 py-3 capitalize">{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
