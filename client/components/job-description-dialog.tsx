"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import useJobApi from "@/apis/job";

type JobDescriptionDialogProps = {
  trigger?: React.ReactNode;
};

export function JobDescriptionDialog({ trigger }: JobDescriptionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const jobApi = useJobApi();

  const { mutate: generateResume, isPending: isGenerating } = useMutation({
    mutationFn: jobApi.getResumeBasedOnJobDesc,
    onSuccess: (data) => {
      if (data?.downloadUrl) {
        setDownloadUrl(data.downloadUrl);
        toast.success("Resume generated successfully! Click to download.");
      } else {
        toast.error("No download URL found in the response");
      }
    },
    onError: (error) => {
      console.error("Error generating resume:", error);
      toast.error("Failed to generate resume. Please try again.");
    },
  });

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, "_blank");
      // Reset after download
      setDownloadUrl(null);
      setJobDescription("");
      setIsOpen(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobDescription.trim()) {
      toast.error("Please enter a job description");
      return;
    }
    generateResume(jobDescription);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Generate Resume</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Generate Resume</DialogTitle>
            <DialogDescription>
              Enter the job description to generate a tailored resume.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="job-description">Job Description</Label>
              <Textarea
                id="job-description"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here..."
                className="min-h-[200px] max-h-[400px] overflow-y-auto"
                disabled={isGenerating}
                required
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {downloadUrl ? (
              <Button
                type="button"
                onClick={handleDownload}
                className="bg-green-600 hover:bg-green-700"
              >
                Download Resume
              </Button>
            ) : (
              <Button type="submit" disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Resume"
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
