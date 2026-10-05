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
  title: "Learning Journey Assistant",
  description: "Track your mastery of each learning outcome and get personalised study recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <noscript>
          <div className="mx-auto max-w-md px-4 py-20 text-center">
            <h1 className="text-xl font-semibold">Learning Journey Assistant</h1>
            <p className="mt-3 text-sm">
              Please enable JavaScript in your browser to use this app, then reload the page.
            </p>
          </div>
        </noscript>
        {children}
      </body>
    </html>
  );
}
