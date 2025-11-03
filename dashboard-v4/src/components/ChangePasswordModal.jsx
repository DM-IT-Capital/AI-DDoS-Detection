import React, { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

export default function ChangePasswordModal({ isOpen, onClose }) {
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");

  const handleChange = async () => {
    try {
      await axios.post("http://localhost:8000/auth/change-password", {
        old_password: oldPass,
        new_password: newPass,
      });
      toast.success("Password updated successfully!");
      onClose();
    } catch (err) {
      toast.error("Failed to update password.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4">Change Password</h2>
        <input
          type="password"
          placeholder="Old password"
          className="border w-full p-2 mb-3 rounded"
          value={oldPass}
          onChange={(e) => setOldPass(e.target.value)}
        />
        <input
          type="password"
          placeholder="New password"
          className="border w-full p-2 mb-3 rounded"
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="text-gray-500 hover:underline">
            Cancel
          </button>
          <button
            onClick={handleChange}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
}
