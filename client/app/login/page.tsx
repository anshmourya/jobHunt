import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
      <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "w-full shadow-none bg-transparent",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton: "hover:bg-muted/50",
              dividerLine: "bg-border",
              dividerText: "text-muted-foreground",
              formFieldInput:
                "border-input bg-background hover:border-primary/50", 
              formButtonPrimary:
                "bg-primary hover:bg-primary/90 text-primary-foreground",
              footerActionText: "text-muted-foreground",
              footerActionLink: "text-primary hover:text-primary/80",
            },
          }}
          routing="path"
          path="/login"
          signUpUrl="/signup"
        />
      </div>
    </div>
  );
}
