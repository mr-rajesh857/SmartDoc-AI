"use client";

import Link from "next/link";

const highlights = [
  "RBAC with admin and user roles",
  "MySQL-backed authentication",
  "Protected upload workspace",
];

export default function Home() {
  return (
    <main className="landing-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">◈</span>
          <span className="brand-text">
            <strong>DocOCR</strong>
            <small>RAG project workspace</small>
          </span>
        </Link>

        <nav className="topbar-actions">
          <Link className="nav-link ghost" href="/upload">
            Upload
          </Link>
          <Link className="nav-link soft" href="/login">
            Login
          </Link>
          <Link className="nav-link primary" href="/register">
            Register
          </Link>
        </nav>
      </header>

      <section className="hero-card">
        <div className="hero-copy">
          <div className="eyebrow">Secure document workflow</div>
          <h1>Login, register, then upload PDFs in a polished workspace.</h1>
          <p>
            This interface keeps the entry page focused on navigation while the
            upload area stays behind authentication.
          </p>

          <div className="hero-actions">
            <Link className="primary-btn" href="/login">
              Login
            </Link>
            <Link className="secondary-btn" href="/register">
              Register
            </Link>
          </div>

          <ul className="highlights">
            {highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="feature-panel">
          <div className="panel-card panel-card-main">
            <div className="panel-label">Start here</div>
            <h2>Access control first, OCR second</h2>
            <p>
              Use the login and registration buttons from the header. After
              signing in, open the upload page to process PDF files.
            </p>
            <Link className="panel-cta" href="/upload">
              Open upload workspace
            </Link>
          </div>

          <div className="panel-card panel-card-grid">
            <div>
              <strong>Admin</strong>
              <span>Can manage roles and users</span>
            </div>
            <div>
              <strong>User</strong>
              <span>Can upload and extract PDFs</span>
            </div>
            <div>
              <strong>MySQL</strong>
              <span>Seeded from `.env` values</span>
            </div>
            <div>
              <strong>Upload</strong>
              <span>Protected by token check</span>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .landing-shell {
          min-height: 100vh;
          padding: 28px;
          background:
            radial-gradient(circle at top left, rgba(91, 140, 255, 0.22), transparent 28%),
            radial-gradient(circle at bottom right, rgba(34, 197, 94, 0.18), transparent 30%),
            linear-gradient(135deg, #07111f 0%, #0f172a 48%, #111827 100%);
        }

        .topbar {
          width: min(1180px, 100%);
          margin: 0 auto 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 18px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(7, 17, 31, 0.7);
          backdrop-filter: blur(14px);
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.22);
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 12px;
        }

        .brand-mark {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #7c5cff, #5b8cff);
          color: white;
          font-size: 1.05rem;
          box-shadow: 0 10px 24px rgba(91, 140, 255, 0.28);
        }

        .brand-text {
          display: grid;
          gap: 2px;
          line-height: 1;
        }

        .brand-text strong {
          font-size: 1.1rem;
          letter-spacing: -0.03em;
        }

        .brand-text small {
          color: rgba(226, 232, 240, 0.66);
          font-size: 0.82rem;
        }

        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .nav-link {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 16px;
          border-radius: 12px;
          font-weight: 700;
          transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
        }

        .nav-link.primary {
          background: linear-gradient(135deg, #7c5cff, #5b8cff);
          color: white;
        }

        .nav-link.soft {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          color: #e2e8f0;
        }

        .nav-link.ghost {
          border: 1px solid rgba(34, 197, 94, 0.28);
          background: rgba(34, 197, 94, 0.08);
          color: #bbf7d0;
        }

        .nav-link:hover,
        .primary-btn:hover,
        .secondary-btn:hover,
        .panel-cta:hover {
          transform: translateY(-2px);
        }

        .hero-card {
          width: min(1180px, 100%);
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.06fr 0.94fr;
          gap: 24px;
          padding: 28px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 28px;
          background: rgba(7, 17, 31, 0.72);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(18px);
        }

        .hero-copy,
        .feature-panel {
          position: relative;
          overflow: hidden;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(15, 23, 42, 0.6);
          padding: 28px;
        }

        .eyebrow {
          display: inline-flex;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(124, 92, 255, 0.16);
          color: #c4b5fd;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          font-size: 12px;
          margin-bottom: 18px;
        }

        h1 {
          font-size: clamp(2.6rem, 5vw, 4.8rem);
          line-height: 0.95;
          letter-spacing: -0.06em;
          margin: 0;
          max-width: 12ch;
        }

        p {
          color: rgba(226, 232, 240, 0.82);
          font-size: 1.05rem;
          line-height: 1.7;
          max-width: 58ch;
          margin-top: 18px;
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 28px;
        }

        .primary-btn,
        .secondary-btn,
        .ghost-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 0 18px;
          border-radius: 14px;
          font-weight: 700;
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
        }

        .primary-btn {
          background: linear-gradient(135deg, #7c5cff, #5b8cff);
          color: white;
        }

        .secondary-btn {
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          color: #e2e8f0;
        }

        .highlights {
          list-style: none;
          display: grid;
          gap: 10px;
          margin-top: 28px;
        }

        .highlights li {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #dbeafe;
        }

        .highlights li::before {
          content: "";
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: linear-gradient(135deg, #22c55e, #5b8cff);
          box-shadow: 0 0 0 6px rgba(91, 140, 255, 0.08);
        }

        .feature-panel {
          display: grid;
          gap: 14px;
        }

        .panel-card {
          border-radius: 22px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
          padding: 20px;
        }

        .panel-card-main h2 {
          font-size: 1.8rem;
          letter-spacing: -0.04em;
          margin-top: 10px;
        }

        .panel-card-main p {
          margin-top: 12px;
          max-width: 40ch;
        }

        .panel-label {
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          color: rgba(226, 232, 240, 0.6);
        }

        .panel-cta {
          display: inline-flex;
          margin-top: 18px;
          min-height: 44px;
          align-items: center;
          justify-content: center;
          padding: 0 16px;
          border-radius: 12px;
          background: rgba(127, 255, 110, 0.12);
          border: 1px solid rgba(127, 255, 110, 0.24);
          color: #d9f99d;
          font-weight: 700;
        }

        .panel-card-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .panel-card-grid > div {
          padding: 16px;
          border-radius: 16px;
          background: rgba(15, 23, 42, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .panel-card-grid strong {
          display: block;
          font-size: 1rem;
          margin-bottom: 6px;
        }

        .panel-card-grid span {
          color: rgba(226, 232, 240, 0.72);
          font-size: 0.98rem;
        }

        @media (max-width: 960px) {
          .topbar {
            flex-direction: column;
            align-items: flex-start;
          }

          .hero-card {
            grid-template-columns: 1fr;
          }

          .panel-card-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .landing-shell {
            padding: 16px;
          }

          .hero-card,
          .hero-copy,
          .feature-panel {
            padding: 18px;
            border-radius: 20px;
          }

          h1 {
            max-width: none;
          }
        }
      `}</style>
    </main>
  );
}
