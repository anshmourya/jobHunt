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
  FileX,
  Plus,
} from "lucide-react";
import { ResumeUploadDialog } from "@/components/resume-upload-dialog";
import { useQuery } from "@tanstack/react-query";
import useUserApi from "@/apis/user";

// Empty state component
function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
}: {
  icon: any;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-muted/50 p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        {description}
      </p>
      {actionText && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          <Plus className="h-4 w-4 mr-2" />
          {actionText}
        </Button>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { getMyProfile } = useUserApi();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: getMyProfile,
  });

  if (!profile || isLoading) {
    return <div>Loading...</div>;
  }

  const { personalInfo, summary, experience, education, skills, projects } =
    profile;

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div className="flex items-center gap-6">
          <Avatar className="h-24 w-24">
            <AvatarFallback className="text-2xl bg-primary/10">
              {personalInfo.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">{personalInfo.name}</h1>
            <p className="text-lg text-muted-foreground">
              {personalInfo?.title}
            </p>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{personalInfo.location}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <ResumeUploadDialog
            requestType="generate"
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
              href={`mailto:${personalInfo.email}`}
              className="hover:underline"
            >
              {personalInfo.email}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a href={`tel:${personalInfo.phone}`} className="hover:underline">
              {personalInfo.phone}
            </a>
          </div>
          {personalInfo?.links &&
            Object.entries(personalInfo.links).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <a
                  href={value as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {key}
                </a>
              </div>
            ))}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Professional Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {summary ? (
            <p className="text-muted-foreground">{summary}</p>
          ) : (
            <EmptyState
              icon={FileX}
              title="No Summary Available"
              description="Add a professional summary to highlight your key qualifications and career objectives."
              actionText="Add Summary"
              onAction={() => console.log("Add summary")}
            />
          )}
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
            <CardContent>
              {experience && experience.length > 0 ? (
                <div className="space-y-6">
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
                        {exp.achievements?.map((achievement, i) => (
                          <li key={i}>{achievement}</li>
                        ))}
                      </ul>
                      {index < experience.length - 1 && (
                        <Separator className="my-4" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Briefcase}
                  title="No Work Experience"
                  description="Showcase your professional experience by adding your previous roles and achievements."
                  actionText="Add Experience"
                  onAction={() => console.log("Add experience")}
                />
              )}
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
            <CardContent>
              {projects && projects.length > 0 ? (
                <div className="space-y-6">
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
                        {project?.technologies?.map((tech) => (
                          <Badge key={tech} variant="secondary">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                      {index < projects.length - 1 && (
                        <Separator className="my-4" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Code}
                  title="No Projects Available"
                  description="Display your best work by adding projects that demonstrate your skills and expertise."
                  actionText="Add Project"
                  onAction={() => console.log("Add project")}
                />
              )}
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
            <CardContent>
              {education && education.length > 0 ? (
                <div className="space-y-4">
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
                </div>
              ) : (
                <EmptyState
                  icon={GraduationCap}
                  title="No Education Listed"
                  description="Add your educational background to showcase your academic achievements."
                  actionText="Add Education"
                  onAction={() => console.log("Add education")}
                />
              )}
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
            <CardContent>
              {skills && Object.keys(skills).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(skills).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <h4 className="font-medium mb-2 capitalize">{key}</h4>
                      <div className="flex flex-wrap gap-2">
                        {value?.map((skill) => (
                          <Badge key={skill} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Cpu}
                  title="No Skills Listed"
                  description="Highlight your technical and professional skills to stand out to potential employers."
                  actionText="Add Skills"
                  onAction={() => console.log("Add skills")}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
