import { AxiosError } from "axios";
import { apis } from ".";

const useJobApi = () => {
  //get all jobs
  const getJobs = async () => {
    try {
      const response = await apis.get("/jobs");
      return response.data;
    } catch (error) {
      console.error(error);
    }
  };

  //get resume
  const getResume = async (keywords: string[]) => {
    try {
      const response = await apis.get("/resume-builder", {
        params: { keywords: keywords.join(",") },
        responseType: "arraybuffer",
      });

      const file = new Blob([response.data], { type: "application/pdf" });

      const fileURL = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = fileURL;

      // Optional: cleaner filename
      const timestamp = new Date().toISOString().split("T")[0];
      link.download = `Resume_${timestamp}.pdf`;

      document.body.appendChild(link); // Needed for Firefox
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(fileURL);
    } catch (error) {
      console.error("Error downloading resume PDF:", error);
    }
  };

  //update job status
  const updateJobStatus = async ({
    job_id,
    status,
  }: {
    job_id: string;
    status: string;
  }) => {
    try {
      const response = await apis.put("/update-job-status", {
        params: { job_id, status },
      });
      return response.data;
    } catch (error) {
      console.error(error);
    }
  };

  //get resume based on the job desc
  const getResumeBasedOnJobDesc = async (
    jobDescription: string
  ): Promise<{
    url: string;
    downloadUrl: string;
    company: string;
    position: string;
  }> => {
    try {
      const { data } = await apis.post("/jd-resume", {
        data: { jobDescription },
      });

      return data.data;
    } catch (error) {
      console.error("Error getting resume based on job description:", error);
      throw error;
    }
  };

  //upload resume
  const uploadResume = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("resume", file);

      const response = await apis.post("/extract-resume-image", {
        data: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data;
    } catch (error) {
      console.error("Error uploading resume:", error);
      if (error && typeof error === "object" && "isAxiosError" in error) {
        // Now TypeScript knows this is an AxiosError
        const axiosError = error as AxiosError<{ message?: string }>;
        throw new Error(
          axiosError.response?.data?.message ?? "Failed to upload resume"
        );
      }
      throw error;
    }
  };

  return {
    getJobs,
    getResume,
    updateJobStatus,
    getResumeBasedOnJobDesc,
    uploadResume,
  };
};

export default useJobApi;
