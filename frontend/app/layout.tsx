import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Learning Journey Assistant",
  description:
    "From feedback to mastery — track your learning outcomes, understand your gaps, and practise what matters.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}