"use client";
import useJobApi from "@/apis/job";
import JobsTable from "@/components/jobs-table";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

export default function Page() {
  const { getJobs } = useJobApi();

  const { data } = useQuery({
    queryKey: ["jobs"],
    queryFn: getJobs,
  });

  return (
    <div className=" mx-auto py-10 container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Job Applications Tracker</h1>
        <Badge variant="outline" className="text-sm">
          {data?.length ?? 0}{" "}
          {data?.length === 1 ? "application" : "applications"}
        </Badge>
      </div>
      <JobsTable jobs={data ?? []} />
    </div>
  );
}
