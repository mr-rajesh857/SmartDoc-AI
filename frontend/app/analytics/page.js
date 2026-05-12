"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./analytics.module.css";

export default function AnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem("token");
        const role = localStorage.getItem("role");
        
        if (!token) {
          router.push("/login");
          return;
        }

        // Check if user is admin
        if (role !== "admin") {
          setError("Access denied. Only admins can view analytics.");
          setLoading(false);
          return;
        }

        // Fetch analytics
        const analyticsRes = await fetch("http://localhost:8000/analytics", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!analyticsRes.ok) {
          throw new Error("Failed to fetch analytics");
        }

        const data = await analyticsRes.json();
        setAnalytics(data);
        setError("");
      } catch (err) {
        setError(err.message || "Error loading analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [router]);

  if (loading) {
    return (
      <main className={styles["analytics-main"]}>
        <div className={styles["analytics-container"]}>
          <p>Loading analytics...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles["analytics-main"]}>
        <div className={styles["analytics-container"]}>
          <div className={styles["error-box"]}>
            <p>{error}</p>
            <Link href="/upload" className={styles["btn-back"]}>
              Back to Upload
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles["analytics-main"]}>
      <div className={styles["analytics-container"]}>
        <div className={styles["analytics-header"]}>
          <h1>📊 Analytics Dashboard</h1>
          <Link href="/upload" className={styles["btn-back"]}>
            Back to Upload
          </Link>
        </div>

        {/* Summary Cards */}
        <div className={styles["summary-grid"]}>
          <div className={styles["summary-card"]}>
            <div className={styles["card-icon"]}>👥</div>
            <div className={styles["card-content"]}>
              <p className={styles["card-label"]}>Total Users</p>
              <p className={styles["card-value"]}>{analytics.total_users}</p>
            </div>
          </div>

          <div className={styles["summary-card"]}>
            <div className={styles["card-icon"]}>📄</div>
            <div className={styles["card-content"]}>
              <p className={styles["card-label"]}>Total Documents</p>
              <p className={styles["card-value"]}>{analytics.total_documents}</p>
            </div>
          </div>

          <div className={styles["summary-card"]}>
            <div className={styles["card-icon"]}>📑</div>
            <div className={styles["card-content"]}>
              <p className={styles["card-label"]}>Total Pages</p>
              <p className={styles["card-value"]}>{analytics.total_pages}</p>
            </div>
          </div>
        </div>

        {/* User Analytics Table */}
        <div className={styles["user-analytics-section"]}>
          <h2>User Breakdown</h2>
          <div className={styles["table-wrapper"]}>
            <table className={styles["analytics-table"]}>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Documents</th>
                  <th>Total Pages</th>
                </tr>
              </thead>
              <tbody>
                {analytics.user_analytics.map((user) => (
                  <tr key={user.user_id}>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`${styles["role-badge"]} ${styles[`role-${user.role}`]}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className={styles["text-center"]}>{user.document_count}</td>
                    <td className={styles["text-center"]}>{user.total_pages}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
