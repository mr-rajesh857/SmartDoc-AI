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

  const [queryText, setQueryText] = useState("");
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState("");
  const [queryResult, setQueryResult] = useState(null);

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
    setQueryResult(null);

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
        throw new Error(`Server error: ${res.statusText}`);
      }

      const data = await res.json();
      setResults(data.results || []);

      if ((data.results || []).length > 0) {
        setActiveFile(0);
        setActivePage(0);
      }
    } catch (submitError) {
      setError(submitError.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const askQuestion = async () => {
    setQueryError("");
    setQueryResult(null);

    if (!queryText.trim()) {
      setQueryError("Please type a question.");
      return;
    }

    const activeResult = results[activeFile];
    if (!activeResult?.document_id) {
      setQueryError("Upload and process a document before asking questions.");
      return;
    }

    try {
      setQueryLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/rag/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query: queryText.trim(),
          document_uuid: activeResult.document_id,
          top_k: 10,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "Failed to get answer");
      }

      setQueryResult(data);
    } catch (queryErr) {
      setQueryError(queryErr.message || "Failed to run query.");
    } finally {
      setQueryLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user_id");
    document.cookie = "token=; path=/; max-age=0; samesite=lax";
    router.push("/login");
  };

  const activeResult = results[activeFile];
  const pages = activeResult?.pages || [];
  const activePageData = pages?.[activePage];

  return (
    <main className="upload-shell">
      <section className="dashboard-grid">
        <aside className="panel panel-upload">
          <div className="panel-head-row">
            <Link href="/" className="upload-brand">
              <span>◈</span>
              <strong>DocOCR</strong>
            </Link>
            <button type="button" className="logout-btn" onClick={logout}>
              Logout
            </button>
          </div>

          <h2>Upload</h2>
          <p className="panel-copy">Add PDFs and run OCR.</p>

          <div {...getRootProps()} className={`dropzone ${isDragActive ? "active" : ""}`}>
            <input {...getInputProps()} />
            <div className="drop-icon">↑</div>
            <div className="drop-text">{isDragActive ? "Drop PDFs here" : "Drag and drop PDFs"}</div>
            <div className="drop-sub">or click to browse</div>
          </div>

          {files.length > 0 && (
            <div className="file-stack">
              {files.map((file, index) => (
                <div key={index} className="file-chip">
                  <strong title={file.name}>{file.name}</strong>
                  <button type="button" onClick={() => removeFile(index)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <div className="error-msg">{error}</div>}

          <button type="button" className="extract-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? "Extracting..." : "Extract Text"}
          </button>
        </aside>

        <section className="panel panel-summary">
          {!results.length && !loading && (
            <div className="state-card">
              <h2>Page-wise Summary</h2>
              <p>Process a PDF to see per-page extraction and summary previews.</p>
            </div>
          )}

          {loading && (
            <div className="state-card">
              <h2>Processing pages...</h2>
              <p>OCR is running page by page.</p>
            </div>
          )}

          {activeResult && (
            <div className="summary-shell">
              <div className="summary-header">
                <h2>Page-wise Summary</h2>
                <div className="summary-meta">
                  <span>{activeResult.filename}</span>
                  <span>{activeResult.total_pages} pages</span>
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
                      setQueryResult(null);
                    }}
                  >
                    {result.filename.length > 18 ? `${result.filename.slice(0, 16)}...` : result.filename}
                  </button>
                ))}
              </div>

              <div className="page-pills">
                {pages.map((page, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`page-pill ${activePage === index ? "active" : ""} ${page.status === "error" ? "err" : ""}`}
                    onClick={() => setActivePage(index)}
                  >
                    P{page.page}
                  </button>
                ))}
              </div>

              <div className="summary-card">
                {activePageData?.status === "error" ? (
                  <div className="page-error">Error: {activePageData.error}</div>
                ) : activePageData?.text ? (
                  <>
                    <div className="summary-card-head">
                      <strong>Page {activePageData.page}</strong>
                      <span>{activePageData.text.length} chars</span>
                    </div>
                    <pre className="page-preview">{activePageData.text.slice(0, 1500)}</pre>
                  </>
                ) : (
                  <div className="page-error">No text found on this page.</div>
                )}
              </div>
            </div>
          )}
        </section>

        <aside className="panel panel-query">
          <h2>Ask Document</h2>
          <p className="panel-copy">Ask questions from the currently selected document.</p>

          <textarea
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Ask anything about this PDF..."
            className="query-input"
            rows={6}
          />

          {queryError && <div className="error-msg">{queryError}</div>}

          <button type="button" className="ask-btn" onClick={askQuestion} disabled={queryLoading}>
            {queryLoading ? "Thinking..." : "Ask"}
          </button>

          <div className="query-result-card">
            {!queryResult && <p className="placeholder-text">Answers with source citations will appear here.</p>}
            {queryResult && (
              <>
                <h3>Answer</h3>
                <p className="answer-text">{queryResult.answer}</p>
                <h4>Sources</h4>
                <div className="source-list">
                  {(queryResult.sources || []).map((src, idx) => (
                    <div key={idx} className="source-item">
                      <strong>Page {src.page_number}</strong>
                      <span>{src.section || "UNSPECIFIED"}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </aside>
      </section>

      <style jsx>{`
        .upload-shell {
          flex: 1;
          min-height: calc(100vh - 80px);
          padding: 20px;
          background:
            radial-gradient(circle at top left, rgba(24, 168, 91, 0.08), transparent 28%),
            radial-gradient(circle at bottom right, rgba(242, 183, 5, 0.12), transparent 24%),
            var(--page-bg);
        }

        .dashboard-grid {
          width: min(1520px, 100%);
          min-height: calc(100vh - 120px);
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(280px, 0.7fr) minmax(0, 1.35fr) minmax(320px, 0.95fr);
          gap: 16px;
        }

        .panel {
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.93);
          border: 1px solid rgba(227, 234, 223, 0.95);
          box-shadow: var(--shadow);
          padding: 18px;
        }

        .panel-upload,
        .panel-query {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .panel-summary {
          display: flex;
          align-items: stretch;
          justify-content: center;
        }

        .panel-head-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .upload-brand {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          font-weight: 800;
          font-size: 19px;
          letter-spacing: -0.03em;
        }

        .upload-brand span {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--primary-green), var(--primary-yellow));
          color: #fff;
        }

        .logout-btn {
          min-height: 34px;
          padding: 0 12px;
          border-radius: 10px;
          border: 1px solid rgba(24, 168, 91, 0.2);
          background: #fff;
          color: var(--primary-green);
          font-weight: 800;
          cursor: pointer;
        }

        h2 {
          font-size: 1.35rem;
          letter-spacing: -0.02em;
        }

        .panel-copy,
        .placeholder-text {
          color: var(--text-muted);
          line-height: 1.6;
        }

        .dropzone {
          border: 2px dashed rgba(24, 168, 91, 0.24);
          background: linear-gradient(180deg, rgba(246, 251, 245, 0.95), #fff);
          border-radius: 16px;
          padding: 20px 14px;
          text-align: center;
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .dropzone.active,
        .dropzone:hover {
          transform: translateY(-1px);
          border-color: var(--primary-green);
        }

        .drop-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          margin: 0 auto 8px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--primary-green), var(--primary-yellow));
          color: #fff;
          font-size: 18px;
        }

        .drop-text {
          font-size: 15px;
          font-weight: 800;
        }

        .drop-sub {
          margin-top: 4px;
          color: var(--text-muted);
          font-size: 12px;
        }

        .file-stack {
          display: grid;
          gap: 8px;
          max-height: 180px;
          overflow: auto;
        }

        .file-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 12px;
          background: var(--surface-soft);
          border: 1px solid rgba(24, 168, 91, 0.08);
        }

        .file-chip strong {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .file-chip button {
          width: 26px;
          height: 26px;
          border: none;
          border-radius: 999px;
          background: rgba(24, 168, 91, 0.1);
          color: var(--primary-green);
          font-size: 16px;
          cursor: pointer;
        }

        .extract-btn,
        .ask-btn {
          min-height: 44px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--primary-green), #1fbe67);
          color: #fff;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
        }

        .extract-btn:disabled,
        .ask-btn:disabled {
          opacity: 0.64;
          cursor: not-allowed;
        }

        .state-card {
          width: 100%;
          min-height: 100%;
          display: grid;
          place-items: center;
          text-align: center;
          gap: 8px;
          padding: 24px;
          border-radius: 18px;
          background: linear-gradient(180deg, #ffffff 0%, #fcfffb 100%);
          border: 1px solid var(--border-light);
        }

        .summary-shell {
          width: 100%;
          display: grid;
          gap: 12px;
        }

        .summary-header {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: flex-start;
        }

        .summary-meta {
          display: grid;
          gap: 4px;
          text-align: right;
          color: var(--text-muted);
          font-weight: 700;
          font-size: 12px;
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
          padding: 8px 12px;
          font-size: 12px;
        }

        .page-pill {
          min-width: 36px;
          min-height: 32px;
          padding: 0 10px;
          font-size: 12px;
        }

        .result-tab.active,
        .page-pill.active {
          border-color: rgba(24, 168, 91, 0.42);
          background: rgba(24, 168, 91, 0.08);
          color: var(--primary-green);
        }

        .page-pill.err {
          border-color: rgba(239, 68, 68, 0.22);
          color: #b42318;
        }

        .summary-card,
        .query-result-card {
          min-height: 260px;
          padding: 14px;
          border-radius: 14px;
          background: linear-gradient(180deg, #ffffff 0%, #fcfffb 100%);
          border: 1px solid var(--border-light);
        }

        .summary-card-head {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          color: var(--text-muted);
          font-size: 12px;
        }

        .page-preview {
          white-space: pre-wrap;
          word-break: break-word;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 13px;
          line-height: 1.65;
          color: var(--text-dark);
          max-height: 420px;
          overflow: auto;
        }

        .query-input {
          width: 100%;
          resize: vertical;
          border: 1px solid var(--border-light);
          border-radius: 12px;
          padding: 10px 12px;
          font: inherit;
          min-height: 140px;
        }

        .query-input:focus {
          outline: none;
          border-color: rgba(24, 168, 91, 0.65);
          box-shadow: 0 0 0 3px rgba(24, 168, 91, 0.1);
        }

        .answer-text {
          color: var(--text-dark);
          line-height: 1.7;
          white-space: pre-wrap;
          margin-top: 8px;
        }

        .source-list {
          display: grid;
          gap: 8px;
          margin-top: 10px;
        }

        .source-item {
          padding: 8px 10px;
          border-radius: 10px;
          background: var(--surface-soft);
          border: 1px solid rgba(24, 168, 91, 0.12);
          display: flex;
          justify-content: space-between;
          gap: 8px;
          font-size: 12px;
        }

        .error-msg,
        .page-error {
          padding: 10px;
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.18);
          color: #b42318;
          font-size: 13px;
        }

        @media (max-width: 1200px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }

          .panel-summary {
            min-height: 460px;
          }

          .summary-meta {
            text-align: left;
          }
        }
      `}</style>
    </main>
  );
}
