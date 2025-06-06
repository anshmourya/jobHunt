"use client";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import useJobApi from "@/apis/job";
import { Button } from "./ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { Loader2, ExternalLink, Building2, Clock } from "lucide-react";
import type { AxiosError } from "axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { cn } from "@/lib/utils";

// Define the Job type based on the Mongoose schema
type Job = {
  _id: string;
  company_name: string;
  position: string;
  keywords: string[];
  important_details: string[];
  summary: string;
  status:
    | "applied"
    | "not_applied"
    | "pending"
    | "rejected"
    | "interview"
    | "offer"
    | "hired"
    | "not_interested";
  source: "telegram" | "website";
  createdAt: string;
  updatedAt: string;
  apply_link: string;
};

// Status badge colors and styles
const statusConfig: Record<
  Job["status"],
  { bg: string; text: string; dot: string }
> = {
  applied: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  not_applied: { bg: "bg-gray-50", text: "text-gray-700", dot: "bg-gray-400" },
  pending: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    dot: "bg-yellow-500",
  },
  rejected: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  interview: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    dot: "bg-purple-500",
  },
  offer: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  hired: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  not_interested: {
    bg: "bg-slate-50",
    text: "text-slate-700",
    dot: "bg-slate-400",
  },
};

export default function JobCards({ jobs }: { jobs: Job[] }) {
  const queryClient = useQueryClient();
  const [currentRunningJobIds, setCurrentRunningJobIds] = useState<string[]>(
    []
  );

  const addJobToCurrentRunningJobIds = (jobId: string) => {
    setCurrentRunningJobIds((prev) => [...prev, jobId]);
  };

  const removeJobFromCurrentRunningJobIds = (jobId: string) => {
    setCurrentRunningJobIds((prev) => prev.filter((id) => id !== jobId));
  };

  const { getResume, updateJobStatus } = useJobApi();

  const { mutate: getResumeMutation } = useMutation({
    mutationFn: async (keywords: string[]) => {
      if (keywords.length === 0) {
        throw new Error("No keywords provided");
      }
      await getResume(keywords);
      return keywords.join(",");
    },
    onSuccess: () => {
      toast.success("Resume downloaded successfully", { id: "resume" });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      const message =
        error.response?.data?.message ??
        error.message ??
        "Something went wrong";
      toast.error(message, { id: "resume" });
    },
    onMutate: (keywords: string[]) => {
      const id = keywords.join(",");
      addJobToCurrentRunningJobIds(id);
    },
    onSettled: (_data, _error, variables) => {
      const id = variables.join(",");
      removeJobFromCurrentRunningJobIds(id);
    },
  });

  const { mutate: updateJobMutation } = useMutation({
    mutationFn: updateJobStatus,
    onMutate: (variables) => {
      toast.loading("Updating job status", { id: "job" });
      addJobToCurrentRunningJobIds(variables.job_id);
    },
    onSuccess: (variables) => {
      toast.success("Job status updated successfully", { id: "job" });
      removeJobFromCurrentRunningJobIds(variables.job_id);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      const message =
        error.response?.data?.message ??
        error.message ??
        "Something went wrong";
      toast.error(message, { id: "job" });
    },
    onSettled: (_data, _error, variables) => {
      removeJobFromCurrentRunningJobIds(variables.job_id);
    },
  });

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No jobs found
        </h3>
        <p className="text-gray-500">
          Start by adding some job applications to track your progress.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {jobs.map((job) => {
          const statusStyle = statusConfig[job.status];
          const isLoading =
            currentRunningJobIds.includes(job._id) ||
            currentRunningJobIds.includes(job.keywords.join(","));

          return (
            <div
              key={job._id}
              className="group relative bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:border-gray-300"
            >
              {/* Status indicator */}
              <div className="absolute top-4 right-4">
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
                    statusStyle.bg,
                    statusStyle.text
                  )}
                >
                  <div
                    className={cn("w-2 h-2 rounded-full", statusStyle.dot)}
                  />
                  {job.status.replace("_", " ").toUpperCase()}
                </div>
              </div>

              <div className="p-6">
                {/* Header */}
                <div className="mb-4 pr-20">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
                    {job.position}
                  </h3>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Building2 className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {job.company_name}
                    </span>
                  </div>
                </div>

                {/* Summary */}
                {job.summary && (
                  <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                    {job.summary}
                  </p>
                )}

                {/* Keywords */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {job.keywords.slice(0, 4).map((keyword, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs px-2 py-1"
                      >
                        {keyword}
                      </Badge>
                    ))}
                    {job.keywords.length > 4 && (
                      <Badge variant="outline" className="text-xs px-2 py-1">
                        +{job.keywords.length - 4}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {formatDistanceToNow(new Date(job.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {job.source}
                  </Badge>
                </div>

                {/* Status Selector */}
                <div className="mb-4">
                  <Select
                    value={job.status}
                    onValueChange={(value) =>
                      updateJobMutation({ job_id: job._id, status: value })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-full h-9 text-sm">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "applied",
                        "not_applied",
                        "pending",
                        "rejected",
                        "interview",
                        "offer",
                        "hired",
                        "not_interested",
                      ].map((status) => (
                        <SelectItem key={status} value={status}>
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "w-2 h-2 rounded-full",
                                statusConfig[status as Job["status"]].dot
                              )}
                            />
                            {status.replace("_", " ").toUpperCase()}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => getResumeMutation(job.keywords)}
                    disabled={isLoading}
                    size="sm"
                    variant="outline"
                    className="flex-1 h-9 text-sm"
                  >
                    {currentRunningJobIds.includes(job.keywords.join(",")) ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : null}
                    Resume
                  </Button>
                  <Button
                    onClick={() => window.open(job.apply_link, "_blank")}
                    disabled={isLoading}
                    size="sm"
                    className="flex-1 h-9 text-sm"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Apply
                  </Button>
                </div>
              </div>

              {/* Loading overlay */}
              {isLoading && (
                <div className="absolute inset-0 bg-white/50 rounded-xl flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
