import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    personalInfo: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String },
      location: { type: String },
      links: Object, // { linkedin: string; behance: string }
      title: { type: String },
    },
    summary: { type: String },
    experience: [
      {
        title: { type: String, required: true },
        company: { type: String, required: true },
        location: { type: String },
        duration: { type: String, required: true },
        achievements: [{ type: String }],
      },
    ],
    education: [
      {
        degree: { type: String, required: true },
        institution: { type: String, required: true },
        location: { type: String },
        year: { type: String },
        achievements: [{ type: String }],
      },
    ],
    skills: Object, // { frontend: string[]; backend: string[]; databases: string[]; devops: string[]; tools: string[] }
    projects: [
      {
        name: { type: String, required: true },
        description: { type: String },
        technologies: [{ type: String }],
        url: { type: String },
        duration: { type: String },
        achievements: [{ type: String }],
      },
    ],
    clerkId: { type: String, required: true, unique: true },
    profileCompletedPercentage: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

const User = mongoose.model("User", userSchema);

export default User;
