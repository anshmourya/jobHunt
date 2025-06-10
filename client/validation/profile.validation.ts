// src/validations/profile.validation.ts
import * as yup from "yup";
import { IUser } from "@/types/user.types";

// Define interfaces for form data that extends IUser
interface ILinkField {
  key: string;
  value: string;
}

export interface IFormData
  extends Omit<IUser, "skills" | "clerkId" | "profileCompletedPercentage"> {
  skillsArray: Array<{
    category: string;
    values: string;
  }>;
  education: IUser["education"];
  experience: IUser["experience"];
  projects: IUser["projects"];
  linksArray: ILinkField[];
  clerkId?: string;
  profileCompletedPercentage?: number;
}
// Validation schema
export const profileSchema = yup.object().shape({
  personalInfo: yup.object().shape({
    name: yup.string().required("Full name is required"),
    email: yup
      .string()
      .email("Please enter a valid email")
      .required("Email is required"),
    phone: yup
      .string()
      .matches(/^[0-9]{10}$/, "Phone number must be 10 digits")
      .nullable(),
    title: yup.string().nullable(),
    location: yup.string().nullable().optional(),
  }),
  summary: yup.string().required("Summary is required"),
  education: yup.array().of(
    yup.object().shape({
      degree: yup.string().required("Degree is required"),
      institution: yup.string().required("Institution is required"),
      location: yup.string().nullable(),
      year: yup.string().nullable(),
    })
  ),
  experience: yup.array().of(
    yup.object().shape({
      title: yup.string().required("Job title is required"),
      company: yup.string().required("Company name is required"),
      location: yup.string().nullable(),
      duration: yup.string().required("Duration is required"),
    })
  ),
  projects: yup.array().of(
    yup.object().shape({
      name: yup.string().required("Project name is required"),
      description: yup.string().nullable(),
      technologies: yup.array().of(yup.string()).nullable(),
      url: yup.string().url("Please enter a valid URL").nullable().optional(),
    })
  ),
  skillsArray: yup.array().of(
    yup.object().shape({
      category: yup.string().required("Category is required"),
      values: yup.string().required("Please add at least one skill"),
    })
  ),
  linksArray: yup.array().of(
    yup.object().shape({
      key: yup.string().required("Platform is required"),
      value: yup
        .string()
        .url("Please enter a valid URL")
        .required("URL is required"),
    })
  ),
});

// Default form values
export const defaultValues: IFormData = {
  personalInfo: {
    name: "",
    email: "",
    phone: "",
    title: "",
    location: "",
  },
  summary: "",
  education: [],
  experience: [],
  projects: [],
  skillsArray: [],
  linksArray: [],
};
