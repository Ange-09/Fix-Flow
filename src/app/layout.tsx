import type { Metadata } from "next";
import Script from "next/script";
import "@/app/styles/globals.css";

import Header from "./components/Header/Header";

export const metadata: Metadata = {
  title: {
    default: "Fix Flow",
    template: "%s | Fix Flow",
  },
  description:
    "Fix Flow is a web-based platform designed to support machine maintenance decision-making and performance monitoring. It features a centralized dashboard that integrates machine criticality assessment using the Analytic Hierarchy Process (AHP), PF Curve-based maintenance scheduling, KPI tracking (OEE, MTBF, MTTR), and spare parts management—helping optimize maintenance strategies, improve equipment reliability, and streamline operations.",
  keywords: [
    "Fix Flow",
    "Machine Maintenance"
  ],
  authors: [{ name: "Ryan Santiago" }],
  creator: "Ryan Santiago",
  //* add when a url is made metadataBase: new URL("WEBSITEURL.COM"),

  openGraph: {
    title: "Ryan Santiago | System Design & Optimization",
    description:
      "Systems-focused professional specializing in ISO-based management systems, web systems, and data analytics. Designing efficient, compliant, and scalable solutions.",
    //url:"WEBSITEURL",
    siteName: "Ryan Santiago | System Design & Optimization",
    images: [
      {
        //edit url once website is complete
        url: "/image.png",
        width: 1200,
        height: 630,
        alt: "Ryan Santiago | System Design & Optimization",
      },
    ],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Script /> {/* Add Web Analytics Script If Applicable*/}
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
