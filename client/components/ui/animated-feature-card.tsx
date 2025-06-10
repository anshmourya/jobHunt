"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { LucideProps } from "lucide-react";
import { ComponentType, Suspense } from "react";

interface AnimatedFeatureCardProps {
  icon: string;
  title: string;
  description: string;
  animationDelay?: number;
}

// Create a mapping of icon names to their dynamic imports
const iconComponents: Record<string, ComponentType<LucideProps>> = {
  FileText: dynamic(() => import("lucide-react").then((mod) => mod.FileText)),
  Search: dynamic(() => import("lucide-react").then((mod) => mod.Search)),
  BarChart3: dynamic(() => import("lucide-react").then((mod) => mod.BarChart3)),
};

export default function AnimatedFeatureCard({
  icon,
  title,
  description,
  animationDelay = 0,
}: AnimatedFeatureCardProps) {
  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, delay: animationDelay },
    },
  };

  const Icon = iconComponents[icon];

  if (!Icon) {
    console.error(`Icon "${icon}" not found`);
    return null;
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      <Card className="h-full overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl">
        <CardHeader className="flex flex-row items-center gap-4 bg-muted/30 p-6">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: animationDelay + 0.2,
            }}
          >
            <Suspense fallback={<div className="h-10 w-10" />}>
              <Icon className="h-10 w-10 text-primary" />
            </Suspense>
          </motion.div>
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
