import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Maryland Property Search - SDAT",
  description: "Search for property information in Maryland - Department of Assessments and Taxation",
  icons: {
    icon: [
      { url: "https://sdat.dat.maryland.gov/RealProperty/egov/dist/img/favicon.ico?v=1" },
      { url: "https://sdat.dat.maryland.gov/RealProperty/egov/dist/img/logo.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "https://sdat.dat.maryland.gov/RealProperty/egov/dist/img/favicon.ico?v=1",
    apple: "https://sdat.dat.maryland.gov/RealProperty/egov/dist/img/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
