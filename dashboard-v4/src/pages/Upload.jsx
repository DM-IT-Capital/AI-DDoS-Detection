import { useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file first!");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post("http://localhost:8000/upload", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success(`✅ ${res.data.message}`);
      setFile(null);
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      console.error(err);
      toast.error("❌ Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
      <Toaster position="top-center" />
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-blue-600 mb-6">
          📤 Upload Alert File
        </h1>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="border border-gray-300 p-3 rounded-lg w-full mb-4"
        />
        <button
          onClick={handleUpload}
          disabled={uploading}
          className={`w-full py-2 rounded-lg font-semibold text-white transition ${
            uploading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {uploading ? "Uploading..." : "Upload File"}
        </button>
      </div>
    </div>
  );
}
