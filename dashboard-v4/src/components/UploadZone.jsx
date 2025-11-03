import React from "react";
import { useDropzone } from "react-dropzone";
import { FaUpload } from "react-icons/fa";
import axios from "axios";
import toast from "react-hot-toast";

export default function UploadZone() {
  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length > 10) {
      toast.error("⚠️ Max 10 files at once");
      return;
    }
    try {
      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        await axios.post("http://localhost:8000/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      toast.success("✅ Uploaded successfully!");
    } catch {
      toast.error("Upload failed!");
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div
      {...getRootProps()}
      className={`mt-10 border-4 border-dashed rounded-2xl p-10 text-center cursor-pointer ${
        isDragActive ? "border-blue-600 bg-blue-50" : "border-gray-400"
      }`}
    >
      <input {...getInputProps()} />
      <FaUpload className="text-4xl mx-auto mb-4 text-blue-600" />
      <p className="text-lg">
        {isDragActive
          ? "Drop files here..."
          : "Drag & drop up to 10 PDF alerts, or click to browse."}
      </p>
    </div>
  );
}
