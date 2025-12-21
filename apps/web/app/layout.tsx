import type { Metadata } from "next";
import { Inter } from "next/font/google"; // <--- Switch to Inter
import "./globals.css";

// Configure Inter (Standard for Figma/Shadcn)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Diviora",
  description: "Enterprise Data Integration Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
