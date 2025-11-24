import { useState } from "react";

export default function SafeLogin() {
  const [u, setU] = useState("");
  const [p, setP] = useState("");

  return (
    <div
      style={{
        position: "relative",
        zIndex: 2147483647,
        minHeight: "100vh",
        background: "#f3f4f6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "auto",       // ensure clicks pass through
        userSelect: "auto",
      }}
      onClick={() => console.log("root click ok")}
    >
      <div
        style={{
          background: "#fff",
          padding: 24,
          borderRadius: 12,
          width: 360,
          boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
        }}
      >
        <h1 style={{ margin: 0, marginBottom: 16, fontSize: 20, fontWeight: 700 }}>
          Safe Login (Isolated)
        </h1>

        <label>Username</label>
        <input
          value={u}
          onChange={(e) => setU(e.target.value)}
          placeholder="type here"
          style={{
            width: "100%",
            display: "block",
            marginTop: 6,
            marginBottom: 16,
            padding: "10px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
          }}
        />

        <label>Password</label>
        <input
          type="password"
          value={p}
          onChange={(e) => setP(e.target.value)}
          placeholder="secret"
          style={{
            width: "100%",
            display: "block",
            marginTop: 6,
            marginBottom: 16,
            padding: "10px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
          }}
        />

        <button
          onClick={() => alert(`Clicked. u=${u}`)}
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "#2563eb",
            color: "white",
            border: 0,
            borderRadius: 8,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Test Click
        </button>
      </div>
    </div>
  );
}
