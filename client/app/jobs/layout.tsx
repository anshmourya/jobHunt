"use client";

import Header from "@/components/Header";

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto container">
      <Header />
      {children}
    </section>
  );
}
