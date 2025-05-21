import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    company_name: String,
    position: String,
    keywords: [String],
    important_details: [String],
    additional_info: Object,
    summary: String,
  },
  {
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

const Job = mongoose.model("Job", jobSchema);

export default Job;
