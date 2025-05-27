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

  return {
    getJobs,
    getResume,
    updateJobStatus,
  };
};

export default useJobApi;
