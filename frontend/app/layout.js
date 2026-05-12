import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "DocOCR — RAG Project",
  description: "Extract text from PDFs using Gemini",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav className="navbar">
          <Link href="/" className="navbar-brand">
            <span>◈</span>
            <strong>DocOCR</strong>
          </Link>
          <div className="navbar-links">
            <Link href="/login" className="navbar-link btn-login">
              Login
            </Link>
            <Link href="/register" className="navbar-link btn-register">
              Register
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}