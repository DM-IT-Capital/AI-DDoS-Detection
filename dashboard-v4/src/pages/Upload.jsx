import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function Upload() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files || []));
  };

  const handleUpload = async () => {
    if (!files.length) {
      toast.error("Please choose at least one PDF file.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      for (const f of files) form.append("files", f);

      await api.post("/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("✅ Upload successful");
      setFiles([]);
      setTimeout(() => navigate("/dashboard"), 1000);
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
        <h1 className="text-2xl font-bold text-blue-600 mb-6">📤 Upload Alert Files</h1>

        <input
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileChange}
          className="border border-gray-300 p-3 rounded-lg w-full mb-4"
        />

        {files.length > 0 && (
          <p className="text-gray-600 mb-3">
            Selected {files.length} file{files.length > 1 ? "s" : ""}
          </p>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading}
          className={`w-full py-2 rounded-lg font-semibold text-white transition ${
            uploading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {uploading ? "Uploading..." : "Upload Files"}
        </button>
      </div>
    </div>
  );
}
