"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  GraduationCap,
  Briefcase,
  Code,
  Cpu,
} from "lucide-react";
import { ResumeUploadDialog } from "@/components/resume-upload-dialog";

const profileData = {
  personal_info: {
    name: "Ansh Mourya",
    title: "Full Stack Engineer",
    email: "anshmourya2002@gmail.com",
    phone: "+91 9167220139",
    location: "Mumbai, Maharashtra",
    links: {
      github: "https://github.com/anshmourya",
      linkedin: "https://linkedin.com/in/anshmourya",
      twitter: "https://twitter.com/anshmourya",
      portfolio: "https://anshmourya.vercel.app",
    },
  },
  summary:
    "Two years plus of Full Stack Engineer Experience in MERN stack. Demonstrated ability to develop efficient, secure, and user-friendly front-end applications. I am looking to expand my skillset in the full-stack development role.",
  experience: [
    {
      title: "Full Stack Developer",
      company: "Levitation Infotech",
      location: "Noida, UP",
      duration: "02/2024 - Present",
      achievements: [
        "Led the entire project from scratch, managing client interactions and requirements effectively.",
        "Designed and developed a scalable website ecosystem for artworks and artists.",
        "Successfully migrated data worth ₹1 crore from SQL to NoSQL databases, ensuring data integrity and performance.",
      ],
    },
    {
      title: "Software Developer Intern",
      company: "Javeo-Traveller",
      location: "Mumbai, Maharashtra",
      duration: "09/2023 - 02/2024",
      achievements: [
        "Architected and executed the development of a dynamic tourism website, leveraging React, Node.js, and MongoDB, resulting in a 40% increase in user engagement and a 25% boost in conversion rate.",
        "Conducted bug fixing and code refactoring.",
        "Optimized webpage rendering speed by 70% and implemented automated builds, leading to a 25% improvement in development velocity.",
      ],
    },
    {
      title: "Full Stack Developer",
      company: "SpineHealth - Freelance",
      location: "Mumbai, Maharashtra",
      duration: "08/2023 - 09/2023",
      achievements: [
        "Developed dynamic websites using HTML, CSS, JavaScript, and React, resulting in a 25% increase in customer engagement through improved user experience and interactive features.",
        "Developed RESTful API services using ASP.NET Core and Node.js.",
        "Created a patient-centered web app for tracking and feedback, resulting in a 39% reduction in response time.",
      ],
    },
    {
      title: "Frontend Developer",
      company: "4thwallstudios - Freelance",
      location: "Mumbai, Maharashtra",
      duration: "08/2023 - 08/2023",
      achievements: [
        "Developed a highly optimized website with interactive components, leading to a 40% increase in customer retention and a 15% revenue boost.",
      ],
    },
  ],
  projects: [
    {
      name: "AI-Powered TODO Assistant CLI",
      description:
        "Built a TypeScript/Node.js CLI TODO assistant with Express and Ollama's gemma:2b, using a START→PLAN→ACTION→OBSERVATION→OUTPUT workflow.",
      technologies: ["TypeScript", "Node.js", "Express", "Ollama's gemma:2b"],
      url: "#",
    },
    {
      name: "Swing - A Food Website",
      description:
        "Created a food website (Swing) with an advanced filter and secure Stripe payment.",
      technologies: [
        "ReactJS",
        "Stripe Integration",
        "Google Auth",
        "Passport JS",
      ],
      url: "#",
    },
    {
      name: "Attendance Tracking Website for Students and Teachers",
      description:
        "Built attendance-taking web platform using React, Express, and MySQL.",
      technologies: ["React", "Express", "MySQL"],
      url: "",
    },
  ],
  education: [
    {
      degree: "BSc (Bachelor of Science) in IT",
      institution: "Prahladrai Dalmia Lions College",
      location: "Mumbai, Maharashtra",
      year: "03/2024",
    },
  ],
  skills: {
    frontend: [
      "HTML",
      "CSS",
      "Tailwind",
      "JavaScript",
      "React",
      "Nextjs",
      "shadCN",
    ],
    backend: ["NodeJs", "ExpressJS"],
    databases: ["MongoDB", "Chromadb", "PostgreSQL"],
    devops: [
      "Git",
      "GitHub",
      "Langchain",
      "Langraph",
      "Ollama",
      "AWS",
      "Digital Ocean",
      "Dockploy",
    ],
  },
};

export default function ProfilePage() {
  const { personal_info, summary, experience, projects, education, skills } =
    profileData;

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div className="flex items-center gap-6">
          <Avatar className="h-24 w-24">
            <AvatarFallback className="text-2xl bg-primary/10">
              {personal_info.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">{personal_info.name}</h1>
            <p className="text-lg text-muted-foreground">
              {personal_info.title}
            </p>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{personal_info.location}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <ResumeUploadDialog
            trigger={
              <Button variant="outline">
                <span>Update Resume</span>
              </Button>
            }
          />
          <Button>Download Resume</Button>
        </div>
      </div>

      {/* Contact & Links */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <a
              href={`mailto:${personal_info.email}`}
              className="hover:underline"
            >
              {personal_info.email}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a href={`tel:${personal_info.phone}`} className="hover:underline">
              {personal_info.phone}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
            <a
              href={personal_info.links.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              LinkedIn
            </a>
          </div>
          <div className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
            <a
              href={personal_info.links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              GitHub
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Professional Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{summary}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Experience */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                <span>Work Experience</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {experience.map((exp, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between">
                    <h3 className="font-semibold">{exp.title}</h3>
                    <span className="text-sm text-muted-foreground">
                      {exp.duration}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{exp.company}</span>
                    <span>{exp.location}</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {exp.achievements.map((achievement, i) => (
                      <li key={i}>{achievement}</li>
                    ))}
                  </ul>
                  {index < experience.length - 1 && (
                    <Separator className="my-4" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Projects */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                <span>Projects</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {projects.map((project, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between">
                    <h3 className="font-semibold">{project.name}</h3>
                    {project.url && (
                      <a
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {project.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {project.technologies.map((tech, i) => (
                      <Badge key={i} variant="secondary">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                  {index < projects.length - 1 && (
                    <Separator className="my-4" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Education */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                <span>Education</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {education.map((edu, index) => (
                <div key={index} className="space-y-1">
                  <h3 className="font-semibold">{edu.degree}</h3>
                  <p className="text-sm">{edu.institution}</p>
                  <p className="text-sm text-muted-foreground">
                    {edu.location}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Graduated: {edu.year}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                <span>Skills</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {Object.entries(skills).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <h4 className="font-medium mb-2 capitalize">{key}</h4>
                    <div className="flex flex-wrap gap-2">
                      {value.map((skill) => (
                        <Badge key={skill} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
