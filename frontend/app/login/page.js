"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    const verifyJwt = async () => {
      try {
        const res = await fetch("http://localhost:8000/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (res.ok) {
          router.replace("/upload");
          return;
        }

        localStorage.removeItem("token");
        document.cookie = "token=; path=/; max-age=0; samesite=lax";
      } catch {
        localStorage.removeItem("token");
        document.cookie = "token=; path=/; max-age=0; samesite=lax";
      }
    };

    verifyJwt();
  }, [router]);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);

    try {
      const res = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        body: form,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.access_token);
        document.cookie = `token=${encodeURIComponent(data.access_token)}; path=/; max-age=3600; samesite=lax`;
        setMessage("Login successful. Redirecting to upload...");
        router.push("/upload");
      } else {
        setMessage(formatApiMessage(data?.detail, "Unable to sign in."));
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
          <h2>Sign In to Your Account</h2>
          <p>Access your secure document workspace with your credentials.</p>
          
          <div className="auth-left-features">
            <div className="auth-feature">
              <div className="auth-feature-icon">🔐</div>
              <div className="auth-feature-text">
                <strong>Secure Login</strong>
                <span>Your credentials are encrypted</span>
              </div>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon">👤</div>
              <div className="auth-feature-text">
                <strong>Role-Based Access</strong>
                <span>Admin and user permissions</span>
              </div>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon">📤</div>
              <div className="auth-feature-text">
                <strong>Upload PDFs</strong>
                <span>Extract text instantly</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrapper">
          <div className="auth-header">
            <h1>Login</h1>
            <p>Enter your credentials to continue</p>
          </div>

          {message && (
            <div className={`message ${message.includes("successful") ? "success" : "error"}`}>
              {message}
            </div>
          )}

          <form onSubmit={submit}>
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
                placeholder="••••••••"
                required
              />
            </div>

            <div className="form-buttons">
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? "Signing in..." : "Login"}
              </button>
            </div>
          </form>

          <div className="form-footer">
            New here? <Link href="/register">Create an account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
