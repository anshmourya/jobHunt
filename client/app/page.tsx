"use client";
import useJobApi from "@/apis/job";
import JobsTable from "@/components/jobs-table";
import { useQuery } from "@tanstack/react-query";

export default function Page() {
  const { getJobs } = useJobApi();

  const { data } = useQuery({
    queryKey: ["jobs"],
    queryFn: getJobs,
  });

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Job Applications Tracker</h1>
      <JobsTable jobs={data ?? []} />
    </div>
  );
}
 