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

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("token")) {
      router.replace("/upload");
    }
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
        setMessage("Login successful. Redirecting to upload...");
        router.push("/upload");
      } else {
        setMessage(data.detail || "Unable to sign in.");
      }
    } catch (error) {
      setMessage("Unable to reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card login-card">
        <div className="auth-brand">
          <Link href="/" className="auth-logo">
            <span>◈</span>
            <strong>DocOCR</strong>
          </Link>
          <p className="auth-kicker">Secure access to your document workspace</p>
        </div>

        <div className="auth-copy">
          <h1>Sign in and continue to the upload workspace.</h1>
          <p>
            Extract PDFs, review pages, and keep access limited to authorized
            users with role-based permissions.
          </p>

          <div className="auth-points">
            <div>
              <strong>Fast access</strong>
              <span>One secure login for your session</span>
            </div>
            <div>
              <strong>Role-aware</strong>
              <span>Admin and user permissions are enforced</span>
            </div>
          </div>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <div className="form-header">
            <h2>Login</h2>
            <p>Use your registered email and password.</p>
          </div>

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          {message && <div className="form-message">{message}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Login"}
          </button>

          <p className="form-footer">
            New here? <Link href="/register">Create an account</Link>
          </p>
        </form>
      </section>

      <style jsx>{`
        .auth-shell {
          min-height: 100vh;
          padding: 28px;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at top left, rgba(91, 140, 255, 0.18), transparent 28%),
            radial-gradient(circle at bottom right, rgba(34, 197, 94, 0.14), transparent 26%),
            linear-gradient(135deg, #07111f 0%, #0f172a 48%, #111827 100%);
        }

        .auth-card {
          width: min(1180px, 100%);
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          padding: 18px;
          border-radius: 28px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(7, 17, 31, 0.74);
          box-shadow: 0 28px 80px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(18px);
        }

        .login-card {
          grid-template-columns: 1.02fr 0.98fr;
        }

        .auth-brand,
        .auth-copy,
        .auth-form {
          border-radius: 22px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(15, 23, 42, 0.56);
          padding: 24px;
        }

        .auth-brand {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 18px;
          background:
            radial-gradient(circle at top right, rgba(124, 92, 255, 0.22), transparent 34%),
            rgba(15, 23, 42, 0.58);
        }

        .auth-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          width: fit-content;
        }

        .auth-logo span {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: linear-gradient(135deg, #7c5cff, #5b8cff);
          color: white;
        }

        .auth-logo strong {
          font-size: 1.15rem;
        }

        .auth-kicker {
          color: rgba(226, 232, 240, 0.74);
          font-size: 0.96rem;
        }

        .auth-copy h1 {
          margin: 0;
          font-size: clamp(2.2rem, 4vw, 3.8rem);
          line-height: 0.98;
          max-width: 11ch;
          letter-spacing: -0.06em;
        }

        .auth-copy p {
          margin-top: 16px;
          color: rgba(226, 232, 240, 0.8);
          line-height: 1.7;
          max-width: 46ch;
        }

        .auth-points {
          display: grid;
          gap: 12px;
          margin-top: 26px;
        }

        .auth-points > div {
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.05);
        }

        .auth-points strong,
        .form-header h2 {
          display: block;
          font-size: 1.05rem;
        }

        .auth-points span,
        .form-header p {
          color: rgba(226, 232, 240, 0.72);
          font-size: 0.94rem;
          margin-top: 4px;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 14px;
        }

        .form-header {
          margin-bottom: 4px;
        }

        label {
          display: grid;
          gap: 8px;
          font-size: 0.92rem;
          color: #e2e8f0;
        }

        input {
          width: 100%;
          min-height: 50px;
          padding: 0 14px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          outline: none;
          font: inherit;
        }

        input:focus {
          border-color: rgba(124, 92, 255, 0.72);
          box-shadow: 0 0 0 4px rgba(124, 92, 255, 0.12);
        }

        button {
          min-height: 50px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #7c5cff, #5b8cff);
          color: white;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.18s ease, opacity 0.18s ease;
        }

        button:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .form-message {
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #dbeafe;
          line-height: 1.5;
        }

        .form-footer {
          text-align: center;
          color: rgba(226, 232, 240, 0.72);
          font-size: 0.95rem;
        }

        .form-footer a {
          color: #bfdbfe;
          font-weight: 700;
        }

        @media (max-width: 920px) {
          .auth-card,
          .login-card {
            grid-template-columns: 1fr;
          }

          .auth-copy h1 {
            max-width: none;
          }
        }
      `}</style>
    </main>
  );
}
