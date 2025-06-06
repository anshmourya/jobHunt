"use client";
import useJobApi from "@/apis/job";
import JobsTable from "@/components/jobs-table";
import { useQuery } from "@tanstack/react-query";
import { JobDescriptionDialog } from "@/components/job-description-dialog";
import { Button } from "@/components/ui/button";
import { ResumeUploadDialog } from "@/components/resume-upload-dialog";

export default function Page() {
  const { getJobs } = useJobApi();

  const { data } = useQuery({
    queryKey: ["jobs"],
    queryFn: getJobs,
  });

  return (
    <div className=" mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Job Applications Tracker</h1>
        <div className="flex gap-2">
          <JobDescriptionDialog trigger={<Button>Generate Resume</Button>} />
          <ResumeUploadDialog trigger={<Button>Upload Resume</Button>} />
        </div>
      </div>
      <JobsTable jobs={data ?? []} />
    </div>
  );
}
