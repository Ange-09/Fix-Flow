"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./LoginForm.module.css";
import { useAppContext, type UserRole } from "@/app/context/AppContext";

const ROLE_CONFIG: {
  role: UserRole;
  label: string;
}[] = [
  {
    role: "manager",
    label: "Manager",
  },
  {
    role: "operator",
    label: "Operator",
  },
  {
    role: "full",
    label: "Full",
  },
];

const ROLE_HOME: Record<string, string> = {
  manager: "/dashboard",
  operator: "/criticality",
  full: "/dashboard",
};

export default function LoginForm() {
  const router = useRouter();
  const { setUserRole } = useAppContext();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);

  function handleRoleLogin(role: UserRole) {
    if (!username.trim() || !password.trim()) {
      setError("Please enter a username and password.");
      return;
    }
    if (!role) return;

    setSelectedRole(role);
    setError("");
    setUserRole(role);
    router.push(ROLE_HOME[role]);
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && selectedRole) handleRoleLogin(selectedRole);
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
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
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
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}

        {/* Divider */}
        <div className={styles.divider}>
          <span>Sign in as</span>
        </div>

        {/* Role buttons */}
        <div className={styles.roleButtons}>
          {ROLE_CONFIG.map(({ role, label }) => (
            <button
              key={role}
              type="button"
              className={`${styles.roleBtn} ${
                selectedRole === role ? styles.roleBtnActive : ""
              }`}
              onClick={() => handleRoleLogin(role)}
            >
              <span className={styles.roleBtnLabel}>{label}</span>
              <span className={styles.roleBtnDesc}></span>
            </button>
          ))}
        </div>
      </div>

      <p className={styles.footer}>
        © {new Date().getFullYear()} Fix Flow · Machine Maintenance Platform
      </p>
    </div>
  );
}
