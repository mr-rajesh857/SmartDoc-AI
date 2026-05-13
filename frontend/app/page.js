"use client";

export default function Home() {
  return (
    <main className="home-shell">
      <section className="home-hero">
        <div className="home-copy">
          <p className="eyebrow">Secure document workspace</p>
          <h1>Fast PDF extraction with clean, role-based access.</h1>
          <p className="lede">
            DocuMind gives you a simple landing page, secure login, and
            registration flow. Use your account to access the document upload
            workspace after signing in.
          </p>

          <div className="feature-list">
            <div className="feature-item">White, green, and yellow visual theme</div>
            <div className="feature-item">Login and register only in the navbar</div>
            <div className="feature-item">One-screen layout with no unnecessary scroll</div>
            <div className="feature-item">RBAC-ready backend integration</div>
          </div>
        </div>

        <div className="home-panel">
          <div className="panel-badge">DocuMind</div>
          <div className="panel-card">
            <h2>One place to start, one place to sign in.</h2>
            <p>
              Keep the landing page focused on the product story while login
              and registration stay easy to reach.
            </p>
          </div>
          <div className="panel-stats">
            <div>
              <strong>Login</strong>
              <span>Secure access</span>
            </div>
            <div>
              <strong>Register</strong>
              <span>Quick onboarding</span>
            </div>
            <div>
              <strong>Upload</strong>
              <span>After sign-in</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
