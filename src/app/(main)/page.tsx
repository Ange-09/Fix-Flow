"use client";

import UpperSection from "./UpperSection/UpperSection";
import DashboardSection from "./DashboardSection/DashboardSection";
import styles from "./styles/page.module.css";

export default function HomePage() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <UpperSection />
        <DashboardSection />
      </main>
    </div>
  );
}
