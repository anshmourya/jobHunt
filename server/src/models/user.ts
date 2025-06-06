import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    personal_info: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String },
      location: { type: String },
      links: Object, // { linkedin: string; behance: string }s
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
        year: { type: Number },
        achievements: { type: String },
      },
    ],
    skills: Object, // { frontend: string[]; backend: string[]; databases: string[]; devops: string[]; tools: string[] }
    projects: [
      {
        name: { type: String, required: true },
        description: { type: String },
        technologies: [{ type: String }],
        url: { type: String },
      },
    ],
    clerk_id: { type: String, required: true },
  },
  {
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

const User = mongoose.model("User", userSchema);

export default User;
