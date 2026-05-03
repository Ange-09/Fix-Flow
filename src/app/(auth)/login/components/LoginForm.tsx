"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./LoginForm.module.css";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (!username.trim() || !password.trim()) {
      setError("Please enter both a username and password.");
      return;
    }

    router.push("/dashboard");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}>
            <Image
              src="/images/logologin.png"
              alt="Fix Flow Logo"
              width={44}
              height={44}
              priority
            />
          </div>
        </div>

        <div className={styles.headingGroup}>
          <h1 className={styles.heading}>Welcome back</h1>
          <p className={styles.subheading}>
            Sign in to your maintenance dashboard
          </p>
        </div>

        <div className={styles.fields}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="username">
              Username
            </label>

            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12"
                    cy="8"
                    r="4"
                    stroke="#7a9e84"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M4 20c0-4 3.582-7 8-7s8 3 8 7"
                    stroke="#7a9e84"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </span>

              <input
                id="username"
                type="text"
                className={styles.input}
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>

            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="5"
                    y="11"
                    width="14"
                    height="10"
                    rx="2"
                    stroke="#7a9e84"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M8 11V7a4 4 0 0 1 8 0v4"
                    stroke="#7a9e84"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </span>

              <input
                id="password"
                type="password"
                className={styles.input}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}

        <button
          type="button"
          className={styles.loginBtn}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? <span className={styles.spinner} /> : "Sign In"}
        </button>
      </div>

      <p className={styles.footer}>
        © {new Date().getFullYear()} Fix Flow · Machine Maintenance Platform
      </p>
    </div>
  );
}
