import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ReactQueryProvider from "@/hook/react-query";
import { Toaster } from "react-hot-toast";
import { ClerkProvider, SignedIn, SignedOut, SignIn } from "@clerk/nextjs";
import Header from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JobHunt - Find Your Dream Job",
  description:
    "Discover the latest job opportunities and advance your career with JobHunt. Find remote, full-time, and part-time jobs from top companies.",
  keywords: [
    "jobs",
    "career",
    "employment",
    "hiring",
    "job search",
    "job portal",
    "remote jobs",
  ],
  authors: [{ name: "JobHunt Team" }],
  openGraph: {
    title: "JobHunt - Find Your Dream Job",
    description:
      "Discover the latest job opportunities and advance your career with JobHunt.",
    url: "https://jobhunt.example.com",
    siteName: "JobHunt",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "JobHunt - Find Your Dream Job",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JobHunt - Find Your Dream Job",
    description:
      "Discover the latest job opportunities and advance your career with JobHunt.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en" data-oid=":y100a4">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          data-oid="9pp4prn"
        >
          <SignedOut>
            <section className="h-dvh w-dvw grid place-items-center">
              <SignIn />
            </section>
          </SignedOut>
          <SignedIn>
            <ReactQueryProvider>
              <Header />
              {children}
            </ReactQueryProvider>
          </SignedIn>
          <Toaster position="bottom-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
