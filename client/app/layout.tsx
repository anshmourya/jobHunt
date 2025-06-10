import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ReactQueryProvider from "@/hook/react-query";
import { Toaster } from "react-hot-toast";
import { ClerkProvider } from "@clerk/nextjs";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://job-hunt.live";
const SITE_NAME = "JobHunt";
const SITE_DESCRIPTION =
  "Find your dream job with JobHunt - The ultimate job search platform with AI-powered resume optimization and personalized job matching.";

export const metadata: Metadata = {
  title: {
    default: "JobHunt - AI-Powered Job Search & Resume Optimization",
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "job hunt",
    "resume optimizer",
    "job search",
    "career opportunities",
    "employment",
    "hiring",
    "job portal",
    "remote jobs",
    "job application tracker",
    "AI resume builder",
    "ATS resume checker",
    "professional resume",
  ],
  authors: [{ name: "JobHunt Team" }],
  creator: "JobHunt",
  publisher: "JobHunt",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "JobHunt - AI-Powered Job Search & Resume Optimization",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/favicon-32x32.png",
        width: 1200,
        height: 630,
        alt: "JobHunt - Find Your Dream Job",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JobHunt - AI-Powered Job Search & Resume Optimization",
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/favicon-32x32.png`],
    creator: "@jobhunt",
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
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      appearance={{
        layout: {
          unsafe_disableDevelopmentModeWarnings:
            process.env.NODE_ENV !== "development",
        },
      }}
    >
      <html lang="en" data-oid=":y100a4">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
          data-oid="9pp4prn"
        >
          <main className="flex-1">
            <ReactQueryProvider>{children}</ReactQueryProvider>
          </main>
          <Footer />
          <Toaster position="bottom-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
