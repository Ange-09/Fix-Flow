"use client";
import { useAppContext, type UserRole } from "@/app/context/AppContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { type ReactNode } from "react";
import Header from "./components/Header/Header";
import UpperSection from "./components/UpperSection/UpperSection";

// Which roles can access which paths
const ROLE_ACCESS: Record<string, UserRole[]> = {
  "/dashboard": ["manager", "full"],
  "/criticality": ["operator", "full"],
  "/pf-curve": ["operator", "full"],
  "/kpi": ["operator", "full"],
  "/spare-parts": ["operator", "full"],
  "/consumables": ["operator", "full"],
};

// Home page per role — used for redirect on unauthorized access
const ROLE_HOME: Record<string, string> = {
  manager: "/dashboard",
  operator: "/criticality",
  full: "/dashboard",
};

// Nav links per role
const NAV_ITEMS: Record<string, { href: string; label: string }[]> = {
  manager: [{ href: "/dashboard", label: "Dashboard" }],
  operator: [
    { href: "/criticality", label: "Criticality" },
    { href: "/kpi", label: "KPI" },
    { href: "/spare-parts", label: "Spare Parts" },
    { href: "/consumables", label: "Consumables" },
  ],
  full: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/criticality", label: "Criticality" },
    { href: "/kpi", label: "KPI" },
    { href: "/spare-parts", label: "Spare Parts" },
    { href: "/consumables", label: "Consumables" },
  ],
};

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { userRole } = useAppContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!userRole) {
      router.replace("/login");
      return;
    }
    const allowed = ROLE_ACCESS[pathname];
    if (allowed && !allowed.includes(userRole)) {
      router.replace(ROLE_HOME[userRole]);
    }
  }, [userRole, pathname]);

  if (!userRole) return null;

  return (
    <>
      <Header navItems={NAV_ITEMS[userRole ?? "full"]} />
      <UpperSection />
      <main>{children}</main>
    </>
  );
}
