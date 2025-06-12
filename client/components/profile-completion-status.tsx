"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  X,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  FileText,
  Zap,
} from "lucide-react";

interface ProfileCompletionStatusProps {
  completionPercentage: number;
  onUpdateProfile?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export default function ProfileCompletionStatus({
  completionPercentage,
  onUpdateProfile,
  onDismiss,
  className = "",
}: ProfileCompletionStatusProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if profile is complete or dismissed
  if (completionPercentage >= 100 || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const getStatusConfig = (percentage: number) => {
    if (percentage >= 80) {
      return {
        color: "bg-blue-500",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        textColor: "text-blue-800",
        icon: CheckCircle,
        iconColor: "text-blue-600",
        status: "Almost Complete",
        message:
          "Your profile is looking great! Just a few more details to make it ATS-perfect.",
        urgency: "low",
      };
    } else if (percentage >= 50) {
      return {
        color: "bg-amber-500",
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200",
        textColor: "text-amber-800",
        icon: AlertCircle,
        iconColor: "text-amber-600",
        status: "Good Progress",
        message:
          "You're halfway there! Complete your profile to maximize ATS compatibility.",
        urgency: "medium",
      };
    } else {
      return {
        color: "bg-red-500",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        textColor: "text-red-800",
        icon: AlertCircle,
        iconColor: "text-red-600",
        status: "Needs Attention",
        message:
          "Your profile needs more information to be ATS-friendly and stand out to employers.",
        urgency: "high",
      };
    }
  };

  const config = getStatusConfig(completionPercentage);
  const StatusIcon = config.icon;

  const getCompletionTips = (percentage: number) => {
    const tips = [];

    if (percentage < 30) {
      tips.push("Add professional summary");
      tips.push("Complete work experience");
      tips.push("Add education details");
    } else if (percentage < 60) {
      tips.push("Add key skills");
      tips.push("Include project details");
      tips.push("Add professional links");
    } else if (percentage < 80) {
      tips.push("Enhance job descriptions");
      tips.push("Add more achievements");
      tips.push("Include certifications");
    } else {
      tips.push("Review and polish content");
      tips.push("Add portfolio links");
      tips.push("Optimize keywords");
    }

    return tips.slice(0, 3);
  };

  const tips = getCompletionTips(completionPercentage);

  return (
    <Card
      className={`relative overflow-hidden border-l-4 ${config.borderColor} ${config.bgColor} shadow-sm hover:shadow-md transition-all duration-300 ${className}`}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-pulse opacity-30" />

      <div className="relative p-4 md:p-6">
        {/* Dismiss button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-white/50 transition-colors duration-200"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>

        <div className="flex flex-col lg:flex-row lg:items-center gap-4 pr-8">
          {/* Left section - Status and progress */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full bg-white shadow-sm`}>
                <StatusIcon className={`h-5 w-5 ${config.iconColor}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`font-semibold text-lg ${config.textColor}`}>
                    Profile Completion: {completionPercentage}%
                  </h3>
                  <Badge
                    variant="secondary"
                    className={`${config.bgColor} ${config.textColor} border-0 font-medium`}
                  >
                    {config.status}
                  </Badge>
                </div>
                <p
                  className={`text-sm ${config.textColor} opacity-90 leading-relaxed`}
                >
                  {config.message}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-medium">
                <span className={config.textColor}>Progress</span>
                <span className={config.textColor}>
                  {completionPercentage}% Complete
                </span>
              </div>
              <div className="relative">
                <Progress
                  value={completionPercentage}
                  className="h-2 bg-white/50"
                />
                <div
                  className={`absolute top-0 left-0 h-2 ${config.color} rounded-full transition-all duration-500 ease-out`}
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>

            {/* Quick tips - Mobile */}
            <div className="lg:hidden">
              <div className="flex flex-wrap gap-2 mt-3">
                {tips.map((tip, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="text-xs bg-white/70 border-current"
                  >
                    {tip}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Right section - CTA and tips */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:items-end">
            {/* Quick tips - Desktop */}
            <div className="hidden lg:block">
              <p
                className={`text-xs font-medium ${config.textColor} mb-2 opacity-75`}
              >
                Quick improvements:
              </p>
              <div className="space-y-1">
                {tips.map((tip, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${config.color}`}
                    />
                    <span className={`text-xs ${config.textColor} opacity-90`}>
                      {tip}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 min-w-fit">
              <Button
                onClick={onUpdateProfile}
                size="sm"
                className={`
                  ${
                    config.urgency === "high"
                      ? "bg-red-600 hover:bg-red-700"
                      : config.urgency === "medium"
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  } 
                  text-white shadow-sm hover:shadow-md transition-all duration-200 font-medium
                `}
              >
                <FileText className="h-4 w-4 mr-2" />
                Update Profile
              </Button>

              {completionPercentage < 80 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/70 hover:bg-white border-current text-current hover:text-current transition-all duration-200"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  ATS Tips
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom section - ATS benefits */}
        <div className={`mt-4 pt-4 border-t border-current/20`}>
          <div className="flex items-center gap-2 text-xs">
            <TrendingUp className={`h-4 w-4 ${config.iconColor}`} />
            <span className={`${config.textColor} opacity-75 font-medium`}>
              ATS-Optimized Profile Benefits:
            </span>
            <div className="flex flex-wrap gap-3 ml-2">
              <span className={`${config.textColor} opacity-90`}>
                • Higher visibility
              </span>
              <span className={`${config.textColor} opacity-90`}>
                • Better job matches
              </span>
              <span className={`${config.textColor} opacity-90`}>
                • Increased interview calls
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
