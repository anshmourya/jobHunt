"use client";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import useJobApi from "@/apis/job";
import { Button } from "./ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
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

// Status badge colors
const statusColors: Record<Job["status"], string> = {
  applied: "bg-blue-100 text-blue-800",
  not_applied: "bg-gray-100 text-gray-800",
  pending: "bg-yellow-100 text-yellow-800",
  rejected: "bg-red-100 text-red-800",
  interview: "bg-purple-100 text-purple-800",
  offer: "bg-green-100 text-green-800",
  hired: "bg-emerald-100 text-emerald-800",
  not_interested: "bg-slate-100 text-slate-800",
};

export default function JobsTable({ jobs }: { jobs: Job[] }) {
  const queryClient = useQueryClient();
  const [currentRunningJobIds, setCurrentRunningJobIds] = useState<string[]>(
    [],
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
      return keywords.join(","); // Return a string ID for tracking
    },
    onSuccess: () => {
      toast.success("Resume downloaded successfully", {
        id: "resume",
      });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      const message =
        error.response?.data?.message ??
        error.message ??
        "Something went wrong";
      toast.error(message, {
        id: "resume",
      });
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
      toast.loading("Updating job status", {
        id: "job",
      });
      addJobToCurrentRunningJobIds(variables.job_id);
    },
    onSuccess: (variables) => {
      toast.success("Job status updated successfully", {
        id: "job",
      });
      removeJobFromCurrentRunningJobIds(variables.job_id);
      queryClient.invalidateQueries({
        queryKey: ["jobs"],
      });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      const message =
        error.response?.data?.message ??
        error.message ??
        "Something went wrong";
      toast.error(message, {
        id: "job",
      });
    },
    onSettled: (_data, _error, variables) => {
      removeJobFromCurrentRunningJobIds(variables.job_id);
    },
  });

  return (
    <Table>
      <TableCaption>A list of your job applications.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Company</TableHead>
          <TableHead>Position</TableHead>
          <TableHead>Keywords</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job._id}>
            <TableCell className="font-medium">{job.company_name}</TableCell>
            <TableCell>{job.position}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {job.keywords.slice(0, 3).map((keyword, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
                {job.keywords.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{job.keywords.length - 3}
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Select
                value={job.status}
                onValueChange={(value) =>
                  updateJobMutation({ job_id: job._id, status: value })
                }
                disabled={currentRunningJobIds.includes(job._id)}
              >
                <SelectTrigger
                  className={cn("w-fit", statusColors[job.status])}
                >
                  <SelectValue placeholder="Select a status" />
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
                      {status.replace("_", " ").toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{job.source}</Badge>
            </TableCell>
            <TableCell>
              {formatDistanceToNow(new Date(job.createdAt), {
                addSuffix: true,
              })}
            </TableCell>
            <TableCell className="flex gap-2">
              <Button
                onClick={() => getResumeMutation(job.keywords)}
                disabled={currentRunningJobIds.includes(job.keywords.join(","))}
                size="sm"
              >
                {currentRunningJobIds.includes(job.keywords.join(",")) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Resume"
                )}
              </Button>
              <Button
                onClick={() => window.open(job.apply_link, "_blank")}
                disabled={currentRunningJobIds.includes(job.keywords.join(","))}
                size="sm"
              >
                Apply
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
