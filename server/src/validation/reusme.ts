import * as yup from "yup";

// Enhanced validation schema with better error messages
const schema = yup.object({
  personalInfo: yup
    .object({
      name: yup.string().required("personalInfo.name is missing or empty"),
      email: yup
        .string()
        .email("personalInfo.email must be a valid email format")
        .required("personalInfo.email is missing"),
      phone: yup.string().required("personalInfo.phone is missing"),
      location: yup.string().required("personalInfo.location is missing"),
      title: yup
        .string()
        .required("personalInfo.title (job title/role) is missing"),
      links: yup.object().optional(),
    })
    .required("personalInfo object is missing"),
  summary: yup
    .string()
    .required("summary field is missing")
    .min(10, "summary must be at least 10 characters long"),
  experience: yup
    .array()
    .of(
      yup.object({
        title: yup
          .string()
          .required("experience[].title (job title) is required"),
        company: yup.string().required("experience[].company name is required"),
        location: yup.string().optional(),
        duration: yup.string().optional(),
        achievements: yup.array().of(yup.string()).optional(),
      })
    )
    .optional(),
  education: yup
    .array()
    .of(
      yup.object({
        degree: yup.string().required("education[].degree is required"),
        institution: yup
          .string()
          .required("education[].institution name is required"),
        location: yup.string().optional(),
        year: yup.string().optional(),
        achievements: yup.array().of(yup.string()).optional(),
      })
    )
    .optional(),
  skills: yup.object().optional(),
  projects: yup
    .array()
    .of(
      yup.object({
        name: yup.string().required("projects[].name is required"),
        technologies: yup
          .array()
          .of(yup.string())
          .min(
            1,
            "projects[].technologies must contain at least one technology"
          )
          .required("projects[].technologies array is required"),
        url: yup
          .string()
          .url("projects[].url must be a valid URL format")
          .optional(),
        duration: yup.string().optional(),
        achievements: yup.array().of(yup.string()).optional(),
      })
    )
    .optional(),
});

export default schema;
