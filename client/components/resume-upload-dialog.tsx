"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
import { Input } from "@/components/ui/input";
import { UploadCloud, Loader2 } from "lucide-react";
import useJobApi from "@/apis/job";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import useUserApi from "@/apis/user";

interface ResumeUploadDialogProps {
  requestType: "upload" | "generate";
  trigger: React.ReactNode;
  onSuccess?: (data: {
    url: string;
    downloadUrl: string;
    company: string;
    position: string;
  }) => void;
}

export function ResumeUploadDialog({
  requestType,
  trigger,
  onSuccess,
}: ResumeUploadDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const { uploadResume } = useJobApi();
  const { makeProfile } = useUserApi();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (requestType === "upload") {
        return await uploadResume(file);
      } else {
        return await makeProfile(file);
      }
    },
    onSuccess: (data) => {
      toast.success("Resume uploaded successfully!");
      setOpen(false);
      setSelectedFile(null);
      onSuccess?.(data);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      const message = error?.response?.data?.message;
      toast.error(message ?? "Failed to upload resume");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a PDF, JPG, or PNG file");
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("File too large. Maximum file size is 5MB");
      return;
    }

    setSelectedFile(file);
  };

  const onSubmit = async () => {
    if (!selectedFile) {
      toast.error("No file selected");
      return;
    }

    try {
      await uploadMutation.mutateAsync(selectedFile);
    } catch (error) {
      console.error("Upload error:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Resume</DialogTitle>
          <DialogDescription>
            Upload your resume as a PDF or image (max 5MB).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <div
              className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                {selectedFile
                  ? selectedFile.name
                  : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, JPG, or PNG (max 5MB)
              </p>
              <Input
                id="resume"
                type="file"
                className="hidden"
                ref={fileInputRef}
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={onSubmit}
            disabled={uploadMutation.isPending || !selectedFile}
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload Resume"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
