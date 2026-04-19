import Link from "next/link";
import styles from "./Header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.logo}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="#0A6EFF" />
            <path d="M8 10H18M8 16H22M8 22H15" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="23" cy="22" r="4" fill="white" />
            <path d="M21.5 22H24.5M23 20.5V23.5" stroke="#0A6EFF" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <span className={styles.brandName}>Fix Flow</span>
      </div>
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          <li>
            <Link href="/" className={styles.navLink}>Dashboard</Link>
          </li>
          <li>
            <Link href="/criticality" className={styles.navLink}>Criticality</Link>
          </li>
          <li>
            <Link href="/pf-curve" className={styles.navLink}>PF Curve</Link>
          </li>
          <li>
            <Link href="/kpi" className={styles.navLink}>KPI</Link>
          </li>
          <li>
            <Link href="/spare-parts" className={styles.navLink}>Spare Parts</Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
