import { useEffect, type ReactNode } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { Loader2, FileUp } from "lucide-react";
import { useAuth, type AppRole } from "@/lib/auth";

export function Guarded({ roles, children }: { roles?: AppRole[]; children: ReactNode }) {
  const { session, role, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/", replace: true });
  }, [loading, session, navigate]);

  if (loading || !session || (session && !profile && !loading)) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <p className="text-sm text-muted-foreground">
          Your account has no profile yet. Please sign out and register again.
        </p>
      </div>
    );
  }

  // ── Step 1: Admin must approve the account ─────────────────────────────────
  if (!profile.approved && role !== "admin" && role !== "hr") {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="max-w-sm space-y-3 text-center">
          <h1 className="text-xl font-extrabold tracking-tight">Waiting for approval</h1>
          <p className="text-sm text-muted-foreground">
            Your registration has been received. The college administrator needs to approve your
            account before you can use the leave management system.
          </p>
          <p className="text-xs text-muted-foreground">
            Signed in as {profile.full_name} · {profile.user_id}
          </p>
        </div>
      </div>
    );
  }

  // ── Step 2: Teacher onboarding doc gate (teachers only) ───────────────────
  // HOD and HR skip this entirely — only teachers need to upload documents
  if (role === "teacher" && profile.approved) {
    // HR rejected — show reason
    if (profile.hr_approved === false) {
      return (
        <div className="grid min-h-screen place-items-center px-6">
          <div className="max-w-sm space-y-4 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
              <FileUp className="size-6 text-destructive" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">Documents rejected</h1>
            <p className="text-sm text-muted-foreground">
              HR has reviewed your documents and requested changes.
            </p>
            {profile.hr_rejection_reason && (
              <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {profile.hr_rejection_reason}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Please re-upload the correct documents to proceed.
            </p>
            <Link
              to="/onboarding"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <FileUp className="size-4" /> Re-upload Documents
            </Link>
          </div>
        </div>
      );
    }

    // HR not yet approved (null = pending) — show upload prompt or waiting screen
    if (profile.hr_approved === null) {
      return (
        <div className="grid min-h-screen place-items-center px-6">
          <div className="max-w-sm space-y-4 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
              <FileUp className="size-6 text-primary" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">Upload your documents</h1>
            <p className="text-sm text-muted-foreground">
              Your account has been approved by the admin. Please upload your onboarding
              documents for HR verification to unlock all features.
            </p>
            <ul className="text-left text-sm text-muted-foreground space-y-1 pl-4 list-disc">
              <li>Degree certificate <span className="text-destructive font-medium">*required</span></li>
              <li>Marksheet <span className="text-destructive font-medium">*required</span></li>
              <li>Previous salary slip <span className="text-muted-foreground text-xs">(optional)</span></li>
              <li>Experience letter <span className="text-muted-foreground text-xs">(optional)</span></li>
            </ul>
            <Link
              to="/onboarding"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <FileUp className="size-4" /> Upload Documents
            </Link>
            <p className="text-xs text-muted-foreground">
              Signed in as {profile.full_name} · {profile.user_id}
            </p>
          </div>
        </div>
      );
    }
    // hr_approved === true → fall through to normal render
  }

  if (roles && role && !roles.includes(role)) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <p className="text-sm text-muted-foreground">You do not have access to this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
