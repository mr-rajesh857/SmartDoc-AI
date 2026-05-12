"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import "./globals.css";

export default function RootLayout({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem("token");
        const role = localStorage.getItem("role");
        
        console.log("Token:", token ? "exists" : "missing");
        console.log("Role:", role || "not set");
        
        if (token) {
          setIsLoggedIn(true);
          setIsAdmin(role === "admin");
        } else {
          setIsLoggedIn(false);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setIsLoggedIn(false);
        setIsAdmin(false);
      }
    };

    // Check auth on mount and whenever route changes
    checkAuth();
  }, [pathname]);

  return (
    <html lang="en">
      <body>
        <nav className="navbar">
          <Link href="/" className="navbar-brand">
            <span>◈</span>
            <strong>DocOCR</strong>
          </Link>
          <div className="navbar-links">
            {isLoggedIn && isAdmin && (
              <Link href="/analytics" className="navbar-link btn-analytics">
                📊 Analytics
              </Link>
            )}
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