"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function UploadClient() {
  const router = useRouter();
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeFile, setActiveFile] = useState(null);
  const [activePage, setActivePage] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const pdfs = acceptedFiles.filter((file) => file.type === "application/pdf");
    setFiles((prev) => [...prev, ...pdfs]);
    setError("");
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
  });

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
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
    files.forEach((file) => formData.append("files", file));

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/ocr", {
        method: "POST",
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) {
        throw new Error("Server error: " + res.statusText);
      }

      const data = await res.json();
      setResults(data.results);

      if (data.results.length > 0) {
        setActiveFile(0);
        setActivePage(0);
      }
    } catch (submitError) {
      setError(submitError.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const activeResult = results[activeFile];
  const activepageData = activeResult?.pages?.[activePage];

  const logout = () => {
    localStorage.removeItem("token");
    document.cookie = "token=; path=/; max-age=0; samesite=lax";
    router.push("/login");
  };

  return (
    <main className="upload-shell">
      <section className="upload-grid">
        <aside className="upload-panel upload-panel-left">
          <div className="upload-brand-row">
            <Link href="/" className="upload-brand">
              <span>◈</span>
              <strong>DocOCR</strong>
            </Link>
            <button type="button" className="logout-btn" onClick={logout}>
              Logout
            </button>
          </div>

          <p className="upload-eyebrow">Upload workspace</p>
          <h1>Drop PDFs, extract text, and review results in one screen.</h1>
          <p className="upload-copy">
            Keep the workflow simple: add files, extract text, and move through
            pages without leaving the page.
          </p>

          <div
            {...getRootProps()}
            className={`dropzone ${isDragActive ? "active" : ""}`}
          >
            <input {...getInputProps()} />
            <div className="drop-icon">↑</div>
            <div className="drop-text">
              {isDragActive ? "Drop PDFs here" : "Drag and drop PDFs"}
            </div>
            <div className="drop-sub">or click to browse files</div>
          </div>

          {files.length > 0 && (
            <div className="file-stack">
              <div className="stack-title">Selected files</div>
              {files.map((file, index) => (
                <div key={index} className="file-chip">
                  <span>📄</span>
                  <strong title={file.name}>{file.name}</strong>
                  <button type="button" onClick={() => removeFile(index)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <div className="error-msg">{error}</div>}

          <button
            type="button"
            className="extract-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Extracting..." : "Extract Text"}
          </button>

          <div className="mini-links">
            <Link href="/">Home</Link>
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
          </div>
        </aside>

        <section className="upload-panel upload-panel-right">
          {!results.length && !loading && (
            <div className="state-card">
              <div className="state-icon">⬡</div>
              <h2>No extractions yet</h2>
              <p>Upload PDFs on the left and click Extract Text.</p>
            </div>
          )}

          {loading && (
            <div className="state-card">
              <div className="pulse-ring" />
              <h2>Processing your PDFs...</h2>
              <p>Gemini is reading your documents page by page.</p>
            </div>
          )}

          {activeResult && activepageData && (
            <div className="result-shell">
              <div className="result-header">
                <div>
                  <div className="result-label">Current result</div>
                  <h2>{activeResult.filename}</h2>
                </div>
                <div className="result-meta">
                  <span>{activeResult.total_pages} pages</span>
                  <span>
                    Page {activepageData.page} of {activeResult.total_pages}
                  </span>
                </div>
              </div>

              <div className="result-tabs">
                {results.map((result, fileIndex) => (
                  <button
                    key={fileIndex}
                    type="button"
                    className={`result-tab ${activeFile === fileIndex ? "active" : ""}`}
                    onClick={() => {
                      setActiveFile(fileIndex);
                      setActivePage(0);
                    }}
                  >
                    {result.filename.length > 20
                      ? `${result.filename.slice(0, 18)}...`
                      : result.filename}
                  </button>
                ))}
              </div>

              {activeResult.pages && (
                <div className="page-pills">
                  {activeResult.pages.map((page, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`page-pill ${activePage === index ? "active" : ""} ${page.status === "error" ? "err" : ""}`}
                      onClick={() => setActivePage(index)}
                    >
                      {page.page}
                    </button>
                  ))}
                </div>
              )}

              <div className="result-card">
                {activepageData.status === "error" ? (
                  <div className="page-error">Error: {activepageData.error}</div>
                ) : activepageData.text ? (
                  <pre className="extracted-text">{activepageData.text}</pre>
                ) : (
                  <div className="page-error">No text found on this page.</div>
                )}
              </div>
            </div>
          )}
        </section>
      </section>

      <style jsx>{`
        .upload-shell {
          flex: 1;
          min-height: calc(100vh - 80px);
          padding: 28px;
          background:
            radial-gradient(circle at top left, rgba(24, 168, 91, 0.08), transparent 28%),
            radial-gradient(circle at bottom right, rgba(242, 183, 5, 0.12), transparent 24%),
            var(--page-bg);
        }

        .upload-grid {
          width: min(1400px, 100%);
          min-height: calc(100vh - 136px);
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(360px, 0.95fr) minmax(0, 1.05fr);
          gap: 20px;
        }

        .upload-panel {
          border-radius: 30px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(227, 234, 223, 0.95);
          box-shadow: var(--shadow);
        }

        .upload-panel-left {
          padding: 26px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .upload-brand-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .upload-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-weight: 800;
          font-size: 22px;
          letter-spacing: -0.04em;
        }

        .upload-brand span {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--primary-green), var(--primary-yellow));
          color: #fff;
        }

        .logout-btn {
          min-height: 40px;
          padding: 0 14px;
          border-radius: 12px;
          border: 1px solid rgba(24, 168, 91, 0.2);
          background: #fff;
          color: var(--primary-green);
          font-weight: 800;
          cursor: pointer;
        }

        .upload-eyebrow {
          width: fit-content;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(24, 168, 91, 0.1);
          color: var(--primary-green);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .upload-panel-left h1 {
          font-size: clamp(2.2rem, 3.4vw, 3.8rem);
          line-height: 0.98;
          letter-spacing: -0.06em;
          max-width: 12ch;
        }

        .upload-copy {
          color: var(--text-muted);
          line-height: 1.7;
          max-width: 48ch;
        }

        .dropzone {
          border: 2px dashed rgba(24, 168, 91, 0.22);
          background: linear-gradient(180deg, rgba(246, 251, 245, 0.95), #fff);
          border-radius: 24px;
          padding: 34px 24px;
          text-align: center;
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .dropzone:hover,
        .dropzone.active {
          transform: translateY(-1px);
          border-color: var(--primary-green);
          box-shadow: 0 16px 30px rgba(24, 168, 91, 0.1);
        }

        .drop-icon {
          width: 56px;
          height: 56px;
          display: grid;
          place-items: center;
          margin: 0 auto 12px;
          border-radius: 18px;
          background: linear-gradient(135deg, var(--primary-green), var(--primary-yellow));
          color: #fff;
          font-size: 22px;
        }

        .drop-text {
          font-size: 18px;
          font-weight: 800;
          color: var(--text-dark);
        }

        .drop-sub {
          margin-top: 6px;
          color: var(--text-muted);
          font-size: 14px;
        }

        .file-stack {
          display: grid;
          gap: 10px;
        }

        .stack-title {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .file-chip {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 16px;
          background: var(--surface-soft);
          border: 1px solid rgba(24, 168, 91, 0.08);
        }

        .file-chip strong {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
        }

        .file-chip button {
          width: 30px;
          height: 30px;
          border: none;
          border-radius: 999px;
          background: rgba(24, 168, 91, 0.1);
          color: var(--primary-green);
          font-size: 18px;
          cursor: pointer;
        }

        .error-msg {
          padding: 12px 14px;
          border-radius: 16px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.18);
          color: #b42318;
        }

        .extract-btn {
          min-height: 52px;
          border: none;
          border-radius: 16px;
          background: linear-gradient(135deg, var(--primary-green), #1fbe67);
          color: #fff;
          font-size: 16px;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
          margin-top: auto;
        }

        .extract-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 14px 28px rgba(24, 168, 91, 0.2);
        }

        .extract-btn:disabled {
          opacity: 0.62;
          cursor: not-allowed;
        }

        .mini-links {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          padding-top: 4px;
        }

        .mini-links a {
          color: var(--text-muted);
          font-weight: 700;
        }

        .upload-panel-right {
          padding: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .state-card {
          width: 100%;
          min-height: 100%;
          display: grid;
          place-items: center;
          text-align: center;
          gap: 12px;
          padding: 24px;
          border-radius: 24px;
          background: linear-gradient(180deg, #ffffff 0%, #fcfffb 100%);
          border: 1px solid var(--border-light);
        }

        .state-card h2 {
          font-size: clamp(1.6rem, 2.4vw, 2.3rem);
          letter-spacing: -0.05em;
        }

        .state-card p {
          color: var(--text-muted);
          max-width: 42ch;
          line-height: 1.7;
        }

        .state-icon {
          width: 64px;
          height: 64px;
          display: grid;
          place-items: center;
          border-radius: 20px;
          background: rgba(24, 168, 91, 0.1);
          color: var(--primary-green);
          font-size: 30px;
        }

        .pulse-ring {
          width: 72px;
          height: 72px;
          border-radius: 999px;
          border: 2px solid rgba(24, 168, 91, 0.28);
          animation: pulse 1.4s ease-in-out infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            transform: scale(0.9);
            opacity: 0.65;
          }

          50% {
            transform: scale(1.08);
            opacity: 1;
          }
        }

        .result-shell {
          width: 100%;
          display: grid;
          gap: 16px;
        }

        .result-header {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
        }

        .result-label {
          display: inline-flex;
          margin-bottom: 8px;
          padding: 7px 11px;
          border-radius: 999px;
          background: rgba(242, 183, 5, 0.16);
          color: #9a6d00;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .result-header h2 {
          font-size: clamp(1.6rem, 2.4vw, 2.4rem);
          line-height: 1.05;
          letter-spacing: -0.05em;
          max-width: 16ch;
        }

        .result-meta {
          display: grid;
          gap: 6px;
          text-align: right;
          color: var(--text-muted);
          font-weight: 700;
        }

        .result-tabs,
        .page-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .result-tab,
        .page-pill {
          border: 1px solid var(--border-light);
          background: #fff;
          color: var(--text-dark);
          border-radius: 999px;
          cursor: pointer;
          font-weight: 700;
        }

        .result-tab {
          padding: 10px 14px;
        }

        .result-tab.active,
        .page-pill.active {
          border-color: rgba(24, 168, 91, 0.42);
          background: rgba(24, 168, 91, 0.08);
          color: var(--primary-green);
        }

        .page-pill {
          min-width: 36px;
          min-height: 36px;
          padding: 0 10px;
        }

        .page-pill.err {
          border-color: rgba(239, 68, 68, 0.22);
          color: #b42318;
        }

        .result-card {
          min-height: 320px;
          padding: 24px;
          border-radius: 24px;
          background: linear-gradient(180deg, #ffffff 0%, #fcfffb 100%);
          border: 1px solid var(--border-light);
        }

        .extracted-text {
          white-space: pre-wrap;
          word-break: break-word;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 15px;
          line-height: 1.8;
          color: var(--text-dark);
        }

        .page-error {
          color: #b42318;
          font-weight: 700;
        }

        @media (max-width: 980px) {
          .upload-shell {
            padding: 20px;
          }

          .upload-grid {
            grid-template-columns: 1fr;
            min-height: auto;
          }

          .upload-panel-right {
            min-height: 460px;
          }
        }

        @media (max-width: 640px) {
          .upload-shell {
            padding: 16px;
          }

          .upload-panel-left,
          .upload-panel-right {
            padding: 20px;
            border-radius: 22px;
          }

          .upload-brand-row,
          .result-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .result-meta {
            text-align: left;
          }
        }
      `}</style>
    </main>
  );
}