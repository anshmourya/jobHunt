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
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useState } from "react";
import { Loader2 } from "lucide-react";
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
  const [currentRunningJobIds, setCurrentRunningJobIds] = useState<string[]>([]);
  const { getResume } = useJobApi();
  const { mutate: getResumeMutation } = useMutation({
    mutationFn: async (keywords: string[]) => {
      await getResume(keywords);
      return keywords.join(','); // Return a string ID for tracking
    },
    onSuccess: () => {
      toast.success("Resume downloaded successfully", {
        toastId: "resume",
      });
    },
    onError: () => {
      toast.error("Error downloading resume", {
        toastId: "resume",
      });
    },
    onMutate: (keywords: string[]) => {
      const id = keywords.join(',');
      setCurrentRunningJobIds((prev) => [...prev, id]);
    },
    onSettled: (_data, _error, variables) => {
      const id = variables.join(",");
      setCurrentRunningJobIds((prev) =>
        prev.filter((existingId) => existingId !== id)
      );
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
              <Badge className={`${statusColors[job.status]}`}>
                {job.status.replace("_", " ")}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{job.source}</Badge>
            </TableCell>
            <TableCell>
              {formatDistanceToNow(new Date(job.createdAt), {
                addSuffix: true,
              })}
            </TableCell>
            <TableCell>
              <Button
                onClick={() => getResumeMutation(job.keywords)}
                disabled={currentRunningJobIds.includes(
                  job.keywords.join(",")
                )}
              >
                {currentRunningJobIds.includes(job.keywords.join(",")) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Resume"
                )}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
