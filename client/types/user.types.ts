// types/user.types.ts

export interface ILink {
  [key: string]: string | undefined; // For any additional link types
}

export interface IExperience {
  title: string;
  company: string;
  location?: string;
  duration: string;
  achievements?: string[];
  _id?: string;
}

export interface IEducation {
  degree: string;
  institution: string;
  location?: string;
  year?: number;
  achievements?: string;
  _id?: string;
}

export interface ISkills {
  [key: string]: string[] | undefined; // For any additional skill categories
}

export interface IProject {
  name: string;
  description?: string;
  technologies?: string[];
  url?: string;
  _id?: string;
}

export interface IPersonalInfo {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  links?: ILink;
  title?: string;
}

export interface IUser {
  _id?: string;
  personalInfo: IPersonalInfo;
  summary?: string;
  experience: IExperience[];
  education: IEducation[];
  skills?: ISkills;
  projects: IProject[];
  clerkId: string;
  profileCompletedPercentage: number;
  createdAt?: Date;
  updatedAt?: Date;
}
