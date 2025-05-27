import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    company_name: String,
    position: String,
    keywords: [String],
    important_details: [String],
    additional_info: Object,
    summary: String,
    status: {
      type: String,
      enum: [
        "applied",
        "not_applied",
        "pending",
        "rejected",
        "interview",
        "offer",
        "hired",
        "not_interested",
      ],
      default: "pending",
    },
    source: {
      type: String,
      enum: ["telegram", "website"],
      default: "telegram",
    },
    apply_link: String,
  },
  {
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

const Job = mongoose.model("Job", jobSchema);

export default Job;
