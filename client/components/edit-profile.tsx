import React, { useEffect, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IUser, IEducation, IExperience, IProject } from "@/types/user.types";

// Extend the default IUser type to include form-specific fields
interface IFormData extends Omit<IUser, "skills"> {
  skillsArray?: Array<{
    category: string;
    values: string;
  }>;
  education: IEducation[];
  experience: IExperience[];
  projects: IProject[];
  linksArray: ILinkField[];
}

interface ILinkField {
  key: string;
  value: string;
}

import { useMediaQuery } from "@/hook/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Textarea } from "./ui/textarea";
import { yupResolver } from "@hookform/resolvers/yup";
import { profileSchema } from "@/validation/profile.validation";
import { TagInput } from "./tag-input";

interface EditProfileProps {
  profile: IUser;
  trigger: React.ReactNode;
  onSave: (data: IUser) => void;
  isSubmitting?: boolean;
}

const EditProfile: React.FC<EditProfileProps> = ({
  profile,
  trigger,
  onSave,
  isSubmitting,
}) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [isOpen, setIsOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    ...form
  } = useForm<IFormData>({
    defaultValues: profile,
    mode: "onChange",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: yupResolver(profileSchema) as any,
  });

  const {
    fields: educationFields,
    append: appendEducation,
    remove: removeEducation,
  } = useFieldArray({
    control,
    name: "education" as const,
  });

  const {
    fields: experienceFields,
    append: appendExperience,
    remove: removeExperience,
  } = useFieldArray({
    control,
    name: "experience" as const,
  });

  const {
    fields: projectFields,
    append: appendProject,
    remove: removeProject,
  } = useFieldArray({
    control,
    name: "projects" as const,
  });

  const {
    fields: linkFields,
    append: appendLink,
    remove: removeLink,
  } = useFieldArray({
    control,
    name: "linksArray" as const,
  });

  const {
    fields: skillFields,
    append: appendSkill,
    remove: removeSkill,
  } = useFieldArray({
    control,
    name: "skillsArray" as const,
  });

  const onSubmit = (formData: IFormData) => {
    // Convert links array to object
    const links: Record<string, string> = {};

    if (formData.linksArray && Array.isArray(formData.linksArray)) {
      formData.linksArray.forEach((link) => {
        if (link.key) links[link.key] = link.value;
      });
    }

    // Convert skills array to object
    const skills: Record<string, string[]> = {};
    if (formData.skillsArray) {
      formData.skillsArray.forEach((skill) => {
        if (skill.category) {
          skills[skill.category] = skill.values
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
      });
    }

    // Prepare the final data structure
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { skillsArray: _, linksArray: __, ...restFormData } = formData;
    const updatedData: IUser = {
      ...restFormData,
      personalInfo: {
        ...formData.personalInfo,
        links,
      },
      skills,
    };

    // Ensure education and experience are arrays
    if (!Array.isArray(updatedData.education)) updatedData.education = [];
    if (!Array.isArray(updatedData.experience)) updatedData.experience = [];
    if (!Array.isArray(updatedData.projects)) updatedData.projects = [];

    console.log(updatedData);

    onSave(updatedData);
    setIsOpen(false);
  };

  const FormContent = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 ">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Edit Profile</h2>
        <p className="text-muted-foreground">
          Update your personal information and professional details.
        </p>
      </div>

      <ScrollArea className="h-[76dvh]  ">
        {/* Personal Information */}
        <Card className="my-4">
          <CardHeader>
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register("personalInfo.name", { required: true })}
                error={errors.personalInfo?.name?.message}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                {...register("personalInfo.email", { required: true })}
                error={errors.personalInfo?.email?.message}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                {...register("personalInfo.phone")}
                error={errors.personalInfo?.phone?.message}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                {...register("personalInfo.location")}
                error={errors.personalInfo?.location?.message}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Professional Title</Label>
              <Input
                id="title"
                placeholder="e.g. Senior Software Engineer"
                {...register("personalInfo.title")}
                error={errors.personalInfo?.title?.message}
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="my-4">
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Textarea
                id="summary"
                {...register("summary", { required: true })}
                error={errors.summary?.message}
              />
            </div>
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card className="my-4">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Social Links</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendLink({ key: "", value: "" })}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Link
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {linkFields.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No links added yet. Click the button above to add one.
              </div>
            ) : (
              linkFields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-12 gap-2 items-start"
                >
                  <div className="col-span-5">
                    <Input
                      {...register(`linksArray.${index}.key` as const)}
                      placeholder="Platform (e.g. LinkedIn)"
                      error={errors.linksArray?.[index]?.key?.message}
                    />
                  </div>
                  <div className="col-span-6">
                    <Input
                      {...register(`linksArray.${index}.value` as const)}
                      type="url"
                      placeholder="https://"
                      error={errors.linksArray?.[index]?.value?.message}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive/90"
                    onClick={() => removeLink(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Education */}
        <Card className="my-4">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Education</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendEducation({
                    degree: "",
                    institution: "",
                    location: "",
                    year: "",
                    achievements: [],
                  })
                }
              >
                <Plus className="h-4 w-4 mr-2" /> Add Education
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {educationFields.map((field, index) => (
              <div key={field.id} className="space-y-4 p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium">Education #{index + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive/90"
                    onClick={() => {
                      removeEducation(index);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Degree <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      {...register(`education.${index}.degree` as const, {
                        required: true,
                      })}
                      error={errors.education?.[index]?.degree?.message}
                      placeholder="e.g. Bachelor's in Computer Science"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Institution <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      {...register(`education.${index}.institution` as const, {
                        required: true,
                      })}
                      error={errors.education?.[index]?.institution?.message}
                      placeholder="e.g. University of Example"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      {...register(`education.${index}.location` as const)}
                      error={errors.education?.[index]?.location?.message}
                      placeholder="e.g. City, Country"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Input
                      {...register(`education.${index}.year` as const)}
                      error={errors.education?.[index]?.year?.message}
                      placeholder="e.g. 2020"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Achievements</Label>
                  <Controller
                    name={`education.${index}.achievements`}
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <TagInput
                        tags={value || []}
                        onTagsChange={(newAchievements) => {
                          onChange(newAchievements);
                          // Trigger form validation after update
                          form.trigger(`education.${index}.achievements`);
                        }}
                        placeholder="Add an achievement (e.g., Graduated with honors)"
                      />
                    )}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Experience */}
        <Card className="my-4">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Work Experience</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendExperience({
                    title: "",
                    company: "",
                    location: "",
                    duration: "",
                    achievements: [],
                  })
                }
              >
                <Plus className="h-4 w-4 mr-2" /> Add Experience
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {experienceFields.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No work experience added yet. Click the button above to add one.
              </div>
            ) : (
              experienceFields.map((field, index) => (
                <div key={field.id} className="space-y-4 p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">Experience #{index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive/90"
                      onClick={() => {
                        removeExperience(index);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>
                        Job Title <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        {...register(`experience.${index}.title` as const, {
                          required: true,
                        })}
                        error={errors.experience?.[index]?.title?.message}
                        placeholder="e.g. Senior Software Engineer"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Company <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        {...register(`experience.${index}.company` as const, {
                          required: true,
                        })}
                        error={errors.experience?.[index]?.company?.message}
                        placeholder="e.g. Tech Corp Inc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        {...register(`experience.${index}.location` as const)}
                        error={errors.experience?.[index]?.location?.message}
                        placeholder="e.g. San Francisco, CA"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Duration <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        {...register(`experience.${index}.duration` as const, {
                          required: true,
                        })}
                        error={errors.experience?.[index]?.duration?.message}
                        placeholder="e.g. Jan 2020 - Present"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Key Achievements</Label>
                    <Controller
                      name={`experience.${index}.achievements`}
                      control={control}
                      render={({ field }) => (
                        <TagInput
                          tags={field.value || []}
                          onTagsChange={(newAchievements) => {
                            field.onChange(newAchievements);
                            form.trigger(`experience.${index}.achievements`);
                          }}
                          placeholder="Add an achievement (e.g., Led a team of 5 developers)"
                        />
                      )}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Skills */}
        <Card className="my-4">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Skills</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendSkill({ category: "", values: "" })}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Skill Category
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {skillFields.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No skills added yet. Click the button above to add a skill
                category.
              </div>
            ) : (
              skillFields.map((field, index) => (
                <div key={field.id} className="space-y-2 p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">Skill Category #{index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive/90"
                      onClick={() => {
                        removeSkill(index);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category Name</Label>
                      <Input
                        {...register(`skillsArray.${index}.category` as const)}
                        error={errors.skillsArray?.[index]?.category?.message}
                        placeholder="e.g. Frontend, Backend, Tools"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Skills (comma-separated)</Label>
                      <Input
                        {...register(`skillsArray.${index}.values` as const)}
                        error={errors.skillsArray?.[index]?.values?.message}
                        placeholder="e.g. React, TypeScript, Node.js"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Projects */}
        <Card className="my-4">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Projects</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendProject({
                    name: "",
                    description: "",
                    technologies: [],
                    achievements: [],
                    duration: "",
                    url: "",
                  })
                }
              >
                <Plus className="h-4 w-4 mr-2" /> Add Project
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {projectFields.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No projects added yet. Click the button above to add one.
              </div>
            ) : (
              projectFields.map((field, index) => (
                <div key={field.id} className="space-y-4 p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">Project #{index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive/90"
                      onClick={() => {
                        removeProject(index);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label>
                        Project Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        {...register(`projects.${index}.name` as const, {
                          required: true,
                        })}
                        error={errors.projects?.[index]?.name?.message}
                        placeholder="e.g. E-commerce Platform"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration</Label>
                      <Input
                        {...register(`projects.${index}.duration` as const)}
                        placeholder="e.g. 2020 - Present"
                        error={errors.projects?.[index]?.duration?.message}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        {...register(`projects.${index}.description` as const)}
                        placeholder="Brief description of the project"
                        error={errors.projects?.[index]?.description?.message}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Technologies</Label>
                      <Input
                        {...register(`projects.${index}.technologies` as const)}
                        placeholder="e.g. React, Node.js, MongoDB"
                        error={errors.projects?.[index]?.technologies?.message}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Project URL</Label>
                      <Input
                        {...register(`projects.${index}.url` as const)}
                        placeholder="https://example.com"
                        type="url"
                        error={errors.projects?.[index]?.url?.message}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Key Achievements</Label>
                      <Controller
                        name={`projects.${index}.achievements`}
                        control={control}
                        render={({ field: { value, onChange } }) => (
                          <TagInput
                            tags={value || []}
                            onTagsChange={(newAchievements) => {
                              onChange(newAchievements);
                              // Trigger form validation after update
                              form.trigger(`projects.${index}.achievements`);
                            }}
                            placeholder="Add an achievement (e.g., Led a team of 5 developers)"
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </ScrollArea>

      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary hover:bg-primary/90"
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );

  // Set default values when profile loads
  useEffect(() => {
    if (!profile) return;

    // Create a new object with the form data structure
    const formData: IFormData = {
      ...profile,
      // Convert links object to array format
      linksArray: profile.personalInfo?.links
        ? Object.entries(profile.personalInfo.links).map(([key, value]) => ({
            key,
            value: value || "",
          }))
        : [],
      // Convert skills object to array format
      skillsArray: profile.skills
        ? Object.entries(profile.skills).map(([category, values]) => ({
            category,
            values: Array.isArray(values) ? values.join(", ") : "",
          }))
        : [],
      // Ensure arrays are properly initialized
      education: Array.isArray(profile.education) ? profile.education : [],
      experience: Array.isArray(profile.experience) ? profile.experience : [],
      projects: Array.isArray(profile.projects) ? profile.projects : [],
    };

    form.reset(formData);
  }, [profile, form.reset]);

  return isDesktop ? (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="min-w-[80dvw] min-h-[80dvh]">
        {FormContent}
      </DialogContent>
    </Dialog>
  ) : (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>{FormContent}</DrawerContent>
    </Drawer>
  );
};

export default EditProfile;
