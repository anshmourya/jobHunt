import schedule from "node-schedule";
import { getUnreadMessages } from "../telegram";

const jobs = [
  {
    name: "add job in sheet",
    cronTime: "0 0 * * *",
    job: () =>
      getUnreadMessages(["TechUprise_Updates", "jobs_and_internships_updates"]),
  },
];

jobs.forEach((job) => {
  console.log(`Scheduling job: ${job.name}`);
  schedule.scheduleJob(job.name, job.cronTime, job.job);
});

export default jobs;
