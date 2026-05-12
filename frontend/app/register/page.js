"use client";

import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const formatApiMessage = (value, fallback) => {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") {
            return item.msg || item.message || JSON.stringify(item);
          }
          return String(item);
        })
        .join("; ");
    }
    if (value && typeof value === "object") {
      return value.detail || value.msg || fallback;
    }
    return fallback;
  };

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("http://localhost:8000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, role }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage("Account created successfully. You can now log in.");
      } else {
        setMessage(formatApiMessage(data?.detail, "Unable to register."));
      }
    } catch (error) {
      setMessage("Unable to reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-left-content">
          <h2>Create Your Account</h2>
          <p>Join DocOCR and unlock secure access to the document workspace.</p>

          <div className="auth-left-features">
            <div className="auth-feature">
              <div className="auth-feature-icon">✨</div>
              <div className="auth-feature-text">
                <strong>Quick Setup</strong>
                <span>Register with email and password</span>
              </div>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon">🛡️</div>
              <div className="auth-feature-text">
                <strong>Protected Access</strong>
                <span>Your account stays secure</span>
              </div>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon">⚙️</div>
              <div className="auth-feature-text">
                <strong>Choose a Role</strong>
                <span>User or admin access level</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrapper">
          <div className="auth-header">
            <h1>Register</h1>
            <p>Create a new account to get started</p>
          </div>

          {message && (
            <div className={`message ${message.includes("successfully") ? "success" : "error"}`}>
              {message}
            </div>
          )}

          <form onSubmit={submit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a secure password"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="user">User - Upload and view PDFs</option>
                <option value="admin">Admin - Full system access</option>
              </select>
            </div>

            <div className="form-buttons">
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? "Creating account..." : "Register"}
              </button>
            </div>
          </form>

          <div className="form-footer">
            Already have an account? <Link href="/login">Login here</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
