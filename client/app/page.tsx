import { Button } from "@/components/ui/button";
import AnimatedFeatureCard from "@/components/ui/animated-feature-card";
import { Zap, Brain, CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/layout/header";

export default function LandingPage() {
  return (
    <>
      <Header />
      {/* Hero Section */}
      <section className="relative min-h-[80vh] w-full overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background py-20 md:py-32 flex items-center">
        <div className="absolute inset-0 opacity-50">
          {/* You can add a subtle background pattern or image here */}
          {/* <Image src="/placeholder.svg?width=1920&height=1080" alt="Abstract background" layout="fill" objectFit="cover" priority /> */}
        </div>
        <div className="container relative z-10 mx-auto px-4 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="block">Stop Applying,</span>
            <span className="block text-primary">Start Getting Hired.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            JobHunt uses AI to create ATS-friendly resumes, discover hidden job
            gems, and track your applications, skyrocketing your chances of
            landing your dream job.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              asChild
              className="text-lg shadow-lg transition-transform hover:scale-105"
            >
              <Link href="/signup">Get Started For Free</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="text-lg shadow-sm transition-transform hover:scale-105"
            >
              <Link href="#features">
                Learn More <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Your All-In-One Job Application Toolkit
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Everything you need to navigate the job market with confidence.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            <AnimatedFeatureCard
              icon="FileText"
              title="AI-Powered Resume Builder"
              description="Craft perfectly tailored, ATS-beating resumes for each job description. Maximize your visibility and get noticed by recruiters."
              animationDelay={0.1}
            />
            <AnimatedFeatureCard
              icon="Search"
              title="Global Job Position Discovery"
              description="Our smart algorithms scour the internet, including niche job boards and company sites, to find relevant global opportunities based on your profile."
              animationDelay={0.2}
            />
            <AnimatedFeatureCard
              icon="BarChart3"
              title="Job Application Tracker"
              description="Stay organized and monitor your progress. Track every application, interview, and offer in one intuitive dashboard."
              animationDelay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-16 md:py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Why JobHunt Works Wonders
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                We&apos;re not just another job tool. We&apos;re your strategic
                partner in career advancement.
              </p>
              <ul className="mt-8 space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle className="mt-1 h-6 w-6 flex-shrink-0 text-primary" />
                  <div>
                    <h3 className="text-xl font-semibold">
                      Boost Shortlisting by 60%
                    </h3>
                    <p className="text-muted-foreground">
                      Our users experience a significant increase in interview
                      calls thanks to optimized, targeted applications.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="mt-1 h-6 w-6 flex-shrink-0 text-primary" />
                  <div>
                    <h3 className="text-xl font-semibold">
                      Clean, ATS-Friendly Resumes
                    </h3>
                    <p className="text-muted-foreground">
                      Say goodbye to resume black holes. Our generator ensures
                      your resume is parsed correctly by applicant tracking
                      systems.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="mt-1 h-6 w-6 flex-shrink-0 text-primary" />
                  <div>
                    <h3 className="text-xl font-semibold">
                      Save Time & Effort
                    </h3>
                    <p className="text-muted-foreground">
                      Automate tedious tasks and focus on what matters:
                      preparing for interviews and landing your dream role.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="relative flex items-center justify-center">
              <Image
                src="/placeholder.svg?width=500&height=400"
                alt="Successful candidate celebrating"
                width={500}
                height={400}
                className="rounded-lg shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Future Features Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Exciting Features Coming Soon!
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            We&apos;re constantly innovating to make your job search even
            smarter.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-center">
                <Zap className="h-12 w-12 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">
                Auto-Apply Functionality
              </h3>
              <p className="text-muted-foreground">
                Let JobHunt intelligently apply to relevant jobs for you, saving
                you hours of manual work.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-center">
                <Brain className="h-12 w-12 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Mock AI Interviews</h3>
              <p className="text-muted-foreground">
                Practice your interview skills with our AI-powered mock
                interviewer and get instant feedback.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to Revolutionize Your Job Search?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg opacity-90">
            Join thousands of job seekers who are getting hired faster and
            smarter with JobHunt.
          </p>
          <div className="mt-8">
            <Button
              size="lg"
              variant="secondary"
              asChild
              className="text-lg shadow-lg transition-transform hover:scale-105"
            >
              <Link href="/signup">Sign Up and Get Started Today!</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
