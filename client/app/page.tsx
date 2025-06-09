"use client";
import useJobApi from "@/apis/job";
import JobsTable from "@/components/jobs-table";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import Script from "next/script";

interface Job {
  position: string;
  companyName: string;
  location: string;
  description?: string;
  createdAt?: string;
  employmentType?: string;
  [key: string]: unknown;
}

// Structured data for job posting
const addStructuredData = () => {
  return {
    __html: `{
      "@context": "https://schema.org/",
      "@type": "WebSite",
      "name": "JobHunt",
      "url": "https://job-hunt.live",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://job-hunt.live/search?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    }`,
  };
};

export default function Page() {
  const { getJobs } = useJobApi();

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: getJobs,
  });

  // Generate structured data for jobs
  const jobsStructuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: jobs.map((job: Job) => ({
      "@type": "JobPosting",
      position: job.position,
      datePosted: job.createdAt ?? new Date().toISOString(),
      description: job.description ?? "",
      hiringOrganization: {
        "@type": "Organization",
        name: job.companyName ?? "Company",
      },
      jobLocation: {
        "@type": "Place",
        address: job.location ?? "Remote",
      },
      employmentType: job.employmentType ?? "FULL_TIME",
    })),
  };

  return (
    <>
      {/* Add structured data */}
      <Script
        id="website-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={addStructuredData()}
      />
      <Script
        id="jobs-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobsStructuredData) }}
      />

      <main className="mx-auto py-10 container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold">Latest Job Openings</h2>
            <p className="text-muted-foreground">
              Browse through the latest job postings from top companies
            </p>
          </div>
          <Badge variant="outline" className="text-sm px-4 py-2">
            {jobs.length} {jobs.length === 1 ? "Job" : "Jobs"} Available
          </Badge>
        </div>

        <JobsTable jobs={jobs} />
      </main>
    </>
  );
}
