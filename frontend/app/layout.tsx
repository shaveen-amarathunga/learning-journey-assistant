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
      <body>
        <noscript>
          <p style={{ padding: "4rem 1.5rem", textAlign: "center" }}>
            Please enable JavaScript in your browser to use the Learning Journey
            Assistant, then reload the page.
          </p>
        </noscript>
        {children}
      </body>
    </html>
  );
}