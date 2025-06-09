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
        url: "/og-image.jpg",
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
    images: [`${SITE_URL}/og-image.jpg`],
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
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png" },
      { url: "/safari-pinned-tab.svg", rel: "mask-icon" },
    ],
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
