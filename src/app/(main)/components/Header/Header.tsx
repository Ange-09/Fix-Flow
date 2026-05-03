"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import styles from "./Header.module.css";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/criticality", label: "Criticality" },
    { href: "/kpi", label: "KPI" },
    { href: "/spare-parts", label: "Spare Parts" },
    { href: "/consumables", label: "Consumables" },
  ];

  return (
    <>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logo}>
            <Image
              src="/images/logo.png"
              alt="Fix Flow Logo"
              width={40}
              height={40}
              priority
            />
          </div>

          <span className={styles.brandName}>Fix Flow</span>
        </div>

        {/* Desktop nav */}
        <nav className={styles.nav}>
          <ul className={styles.navList}>
            {navItems.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={`${styles.navLink} ${
                    pathname === href ? styles.active : ""
                  }`}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Hamburger button (mobile only) */}
        <button
          className={`${styles.hamburger} ${
            menuOpen ? styles.hamburgerOpen : ""
          }`}
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          <span className={styles.bar} />
          <span className={styles.bar} />
          <span className={styles.bar} />
        </button>
      </header>

      {/* Mobile drawer overlay */}
      {menuOpen && (
        <div
          className={styles.overlay}
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <nav
        className={`${styles.mobileNav} ${
          menuOpen ? styles.mobileNavOpen : ""
        }`}
        aria-hidden={!menuOpen}
      >
        <ul className={styles.mobileNavList}>
          {navItems.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={`${styles.mobileNavLink} ${
                  pathname === href ? styles.active : ""
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
