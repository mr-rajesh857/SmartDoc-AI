"use client";

import { useEffect, useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeFile, setActiveFile] = useState(null);
  const [activePage, setActivePage] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login?next=/upload");
      return;
    }

    setCheckingAuth(false);
  }, [router]);

  const onDrop = useCallback((acceptedFiles) => {
    const pdfs = acceptedFiles.filter((f) => f.type === "application/pdf");
    setFiles((prev) => [...prev, ...pdfs]);
    setError("");
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
  });

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      setError("Please upload at least one PDF.");
      return;
    }

    setLoading(true);
    setResults([]);
    setError("");
    setActiveFile(null);
    setActivePage(null);

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    try {
      const res = await fetch("http://localhost:8000/ocr", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Server error: " + res.statusText);

      const data = await res.json();
      setResults(data.results);
      if (data.results.length > 0) {
        setActiveFile(0);
        setActivePage(0);
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const activeResult = results[activeFile];
  const activepageData = activeResult?.pages?.[activePage];

  if (checkingAuth) {
    return (
      <main className="guard-shell">
        <div className="guard-card">
          <div className="guard-mark">◈</div>
          <h1>Checking your access…</h1>
          <p>
            You need to sign in before you can use the upload workspace.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="mobile-topbar">
        <Link href="/" className="mobile-brand">
          <span>◈</span>
          <strong>DocOCR</strong>
        </Link>

        <div className="mobile-actions">
          <Link href="/">Home</Link>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("token");
              router.push("/login");
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="sidebar">
        <div className="brand">
          <span className="brand-icon">◈</span>
          <span className="brand-name">DocOCR</span>
        </div>

        <div className="nav-links">
          <Link href="/">Home</Link>
          <Link href="/login">Login</Link>
          <Link href="/register">Register</Link>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("token");
              router.push("/login");
            }}
          >
            Logout
          </button>
        </div>

        <div className="section-label">Upload PDFs</div>

        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? "active" : ""}`}
        >
          <input {...getInputProps()} />
          <div className="drop-icon">↑</div>
          <div className="drop-text">
            {isDragActive ? "Drop here" : "Drag & drop PDFs"}
          </div>
          <div className="drop-sub">or click to browse</div>
        </div>

        {files.length > 0 && (
          <div className="file-list">
            <div className="section-label">Files ({files.length})</div>
            {files.map((f, i) => (
              <div key={i} className="file-item">
                <span className="file-icon">📄</span>
                <span className="file-name" title={f.name}>
                  {f.name.length > 20 ? f.name.slice(0, 18) + "…" : f.name}
                </span>
                <button className="remove-btn" onClick={() => removeFile(i)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <div className="error-msg">{error}</div>}

        <button
          className={`extract-btn ${loading ? "loading" : ""}`}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <span className="spinner-wrap">
              <span className="spinner" /> Extracting…
            </span>
          ) : (
            "Extract Text"
          )}
        </button>

        {results.length > 0 && (
          <div className="result-nav">
            <div className="section-label">Results</div>
            {results.map((r, fi) => (
              <div key={fi}>
                <button
                  className={`nav-file ${activeFile === fi ? "active" : ""}`}
                  onClick={() => {
                    setActiveFile(fi);
                    setActivePage(0);
                  }}
                >
                  📄 {r.filename.length > 18
                    ? r.filename.slice(0, 16) + "…"
                    : r.filename}
                </button>
                {activeFile === fi && r.pages && (
                  <div className="page-pills">
                    {r.pages.map((p, pi) => (
                      <button
                        key={pi}
                        className={`page-pill ${activePage === pi ? "active" : ""} ${p.status === "error" ? "err" : ""}`}
                        onClick={() => setActivePage(pi)}
                      >
                        {p.page}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="content">
        {!results.length && !loading && (
          <div className="empty-state">
            <div className="empty-icon">⬡</div>
            <div className="empty-title">No extractions yet</div>
            <div className="empty-sub">
              Upload PDFs on the left and click Extract Text
            </div>
          </div>
        )}

        {loading && (
          <div className="empty-state">
            <div className="pulse-ring" />
            <div className="empty-title">Processing your PDFs…</div>
            <div className="empty-sub">
              Gemini is reading your documents page by page
            </div>
          </div>
        )}

        {activeResult && activepageData && (
          <div className="result-view">
            <div className="result-header">
              <div className="result-meta">
                <h2 className="result-filename">{activeResult.filename}</h2>
                <span className="result-badge">
                  {activeResult.total_pages} pages
                </span>
              </div>
              <div className="page-info">
                Page {activepageData.page} of {activeResult.total_pages}
              </div>
            </div>

            <div className="text-block">
              {activepageData.status === "error" ? (
                <div className="page-error">
                  ⚠ Error on this page: {activepageData.error}
                </div>
              ) : activepageData.text ? (
                <pre className="extracted-text">{activepageData.text}</pre>
              ) : (
                <div className="page-error">No text found on this page.</div>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap");

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0c0c0f;
          --sidebar: #111116;
          --surface: #18181f;
          --border: #2a2a35;
          --accent: #7fff6e;
          --accent2: #6ebaff;
          --text: #e8e8f0;
          --muted: #6b6b80;
          --error: #ff6e6e;
          --radius: 10px;
        }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: "Syne", sans-serif;
          min-height: 100vh;
          overflow: hidden;
        }

        .guard-shell {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          background:
            radial-gradient(circle at top left, rgba(91, 140, 255, 0.2), transparent 28%),
            linear-gradient(135deg, #07111f 0%, #0f172a 48%, #111827 100%);
        }

        .guard-card {
          width: min(520px, 100%);
          text-align: center;
          padding: 28px;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(15, 23, 42, 0.72);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
        }

        .guard-mark {
          width: 62px;
          height: 62px;
          margin: 0 auto 16px;
          display: grid;
          place-items: center;
          border-radius: 18px;
          background: linear-gradient(135deg, #7c5cff, #5b8cff);
          font-size: 1.2rem;
        }

        .guard-card h1 {
          font-size: 2rem;
          letter-spacing: -0.05em;
        }

        .guard-card p {
          margin-top: 12px;
          color: rgba(226, 232, 240, 0.74);
          line-height: 1.7;
        }

        .mobile-topbar {
          display: none;
        }

        .app {
          display: flex;
          min-height: 100vh;
        }

        .sidebar {
          width: 260px;
          min-width: 260px;
          background: var(--sidebar);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 20px 16px;
          overflow-y: auto;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .brand-icon {
          font-size: 22px;
          color: var(--accent);
          line-height: 1;
        }

        .brand-name {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: var(--text);
        }

        .nav-links {
          display: grid;
          gap: 8px;
          margin-bottom: 8px;
        }

        .nav-links a,
        .nav-links button,
        .mobile-actions a,
        .mobile-actions button {
          display: block;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--surface);
          color: var(--text);
          font-size: 13px;
          text-align: left;
          cursor: pointer;
          width: 100%;
        }

        .section-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--muted);
          padding: 4px 0 2px;
        }

        .dropzone {
          border: 1.5px dashed var(--border);
          border-radius: var(--radius);
          padding: 20px 12px;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
        }

        .dropzone:hover, .dropzone.active {
          border-color: var(--accent);
          background: rgba(127, 255, 110, 0.04);
        }

        .drop-icon {
          font-size: 22px;
          color: var(--accent);
          margin-bottom: 6px;
        }

        .drop-text {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
        }

        .drop-sub {
          font-size: 11px;
          color: var(--muted);
          margin-top: 3px;
        }

        .file-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .file-item {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 7px;
          padding: 7px 10px;
          font-size: 12px;
        }

        .file-icon { font-size: 14px; }

        .file-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-family: "DM Mono", monospace;
          font-size: 11px;
          color: var(--text);
        }

        .remove-btn {
          background: none;
          border: none;
          color: var(--muted);
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          padding: 0 2px;
          transition: color 0.15s;
        }

        .remove-btn:hover { color: var(--error); }

        .error-msg {
          background: rgba(255, 110, 110, 0.1);
          border: 1px solid rgba(255, 110, 110, 0.3);
          color: var(--error);
          border-radius: 7px;
          padding: 8px 12px;
          font-size: 12px;
        }

        .extract-btn {
          background: var(--accent);
          color: #0c0c0f;
          border: none;
          border-radius: var(--radius);
          padding: 12px;
          font-family: "Syne", sans-serif;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          margin-top: auto;
        }

        .extract-btn:hover:not(:disabled) {
          opacity: 0.88;
          transform: translateY(-1px);
        }

        .extract-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinner-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(12,12,15,0.3);
          border-top-color: #0c0c0f;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .result-nav {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .nav-file {
          width: 100%;
          text-align: left;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          font-size: 12px;
          cursor: pointer;
        }

        .nav-file.active { border-color: var(--accent); }

        .page-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 6px;
          padding-left: 2px;
        }

        .page-pill {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          cursor: pointer;
        }

        .page-pill.active { border-color: var(--accent); }
        .page-pill.err { border-color: var(--error); color: var(--error); }

        .content {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: radial-gradient(circle at top, rgba(110, 186, 255, 0.06), transparent 32%);
        }

        .empty-state {
          display: grid;
          place-items: center;
          gap: 10px;
          text-align: center;
          color: var(--muted);
        }

        .empty-icon {
          font-size: 48px;
          color: var(--accent);
        }

        .empty-title {
          color: var(--text);
          font-size: 28px;
          font-weight: 800;
        }

        .pulse-ring {
          width: 72px;
          height: 72px;
          border-radius: 999px;
          border: 2px solid rgba(127, 255, 110, 0.35);
          animation: pulse 1.4s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.08); opacity: 1; }
        }

        .result-view {
          width: min(100%, 920px);
          border: 1px solid var(--border);
          border-radius: 18px;
          background: rgba(17, 17, 22, 0.92);
          overflow: hidden;
        }

        .result-header {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: center;
          padding: 18px 20px;
          border-bottom: 1px solid var(--border);
        }

        .result-meta {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .result-filename {
          font-size: 18px;
          font-weight: 800;
        }

        .result-badge,
        .page-info {
          font-size: 12px;
          color: var(--muted);
        }

        .text-block {
          padding: 20px;
        }

        .extracted-text {
          white-space: pre-wrap;
          word-break: break-word;
          font-family: "DM Mono", monospace;
          font-size: 13px;
          line-height: 1.7;
        }

        .page-error {
          color: var(--error);
          font-size: 14px;
        }

        @media (max-width: 920px) {
          body {
            overflow: auto;
          }

          .mobile-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 14px 16px;
            border-bottom: 1px solid var(--border);
            background: rgba(17, 17, 22, 0.94);
            position: sticky;
            top: 0;
            z-index: 10;
          }

          .mobile-brand {
            display: inline-flex;
            align-items: center;
            gap: 10px;
          }

          .mobile-brand span {
            width: 38px;
            height: 38px;
            display: grid;
            place-items: center;
            border-radius: 12px;
            background: linear-gradient(135deg, #7c5cff, #5b8cff);
          }

          .mobile-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }

          .mobile-actions a,
          .mobile-actions button {
            width: auto;
            padding: 10px 14px;
          }

          .app {
            flex-direction: column;
          }

          .sidebar {
            width: 100%;
            min-width: 0;
            border-right: none;
            border-bottom: 1px solid var(--border);
          }

          .content {
            min-height: calc(100vh - 280px);
          }

          .result-header {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </main>
  );
}
