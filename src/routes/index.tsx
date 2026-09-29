import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
<<<<<<< HEAD
import { signInWithIdentifier, registerStaff, resolvePreviewUserId, verifyCollegeId, submitForgotPasswordRequest } from "@/lib/login.functions";
import { Check, Eye, EyeOff, Loader2, Moon, Sun, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
=======
import { signInWithIdentifier, registerStaff, resolvePreviewUserId } from "@/lib/login.functions";
import { Eye, EyeOff, Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GuardedInput } from "@/components/GuardedField";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

<<<<<<< HEAD
export const Route = createFileRoute("/")(({
=======
export const Route = createFileRoute("/")({
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
  head: () => ({
    meta: [
      { title: "Sign In — CSC Leave Management System" },
      { name: "description", content: "Sign in to the Chandrabhan Sharma College leave management system." },
      { property: "og:title", content: "Sign In — CSC Leave Management System" },
      { property: "og:description", content: "Leave management for teachers, HODs and the principal of CSC." },
    ],
  }),
  component: SignInPage,
<<<<<<< HEAD
}));

const SALUTATIONS = [
  "Mr.", "Mrs.", "Ms.", "Miss", "Master", "Shri", "Smt.", "Kumari", "Sushri",
  "M/S", "Dr.", "Prof.", "Er.", "Adv.", "CA", "Ar.", "CS", "Hon'ble", "Justice",
  "Excellency", "Gen.", "Lt. Gen.", "Maj. Gen.", "Brig.", "Col.", "Lt. Col.",
  "Maj.", "Capt.", "Lt.", "Adm.", "Cdr.", "ACM", "Air Mshl", "Wg. Cdr.", "Sqn. Ldr.",
];

const GENDERS: { value: string; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

=======
});

const SALUTATIONS = [
  "Mr.",
  "Mrs.",
  "Ms.",
  "Miss",
  "Master",
  "Shri",
  "Smt.",
  "Kumari",
  "Sushri",
  "M/S",
  "Dr.",
  "Prof.",
  "Er.",
  "Adv.",
  "CA",
  "Ar.",
  "CS",
  "Hon'ble",
  "Justice",
  "Excellency",
  "Gen.",
  "Lt. Gen.",
  "Maj. Gen.",
  "Brig.",
  "Col.",
  "Lt. Col.",
  "Maj.",
  "Capt.",
  "Lt.",
  "Adm.",
  "Cdr.",
  "ACM",
  "Air Mshl",
  "Wg. Cdr.",
  "Sqn. Ldr.",
];
const GENDERS: { value: string; label: string }[] = [
  { value: "male",   label: "Male" },
  { value: "female", label: "Female" },
  { value: "other",  label: "Other" },
];

// ── DOB helpers ───────────────────────────────────────────────────────────────
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));

<<<<<<< HEAD
function parseDob(val: string): { day: string; month: string; year: string } {
  if (!val) return { day: "", month: "", year: "" };
  const parts = val.split("-");
  return { day: parts[0] ?? "", month: parts[1] ?? "", year: parts[2] ?? "" };
}

=======
/** Parses stored "DD-MM" or "DD-MM-YYYY" back into parts */
function parseDob(val: string): { day: string; month: string; year: string } {
  if (!val) return { day: "", month: "", year: "" };
  const parts = val.split("-");
  return {
    day:   parts[0] ?? "",
    month: parts[1] ?? "",
    year:  parts[2] ?? "",
  };
}

/** Builds "DD-MM" or "DD-MM-YYYY" from parts */
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
function buildDob(day: string, month: string, year: string): string {
  if (!day || !month) return "";
  return year ? `${day}-${month}-${year}` : `${day}-${month}`;
}

<<<<<<< HEAD
function DobPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parsed = parseDob(value);
  const [day, setDay] = useState(parsed.day);
  const [month, setMonth] = useState(parsed.month);
  const [year, setYear] = useState(parsed.year);
=======
/** Day/Month picker with optional year for DOB entry */
function DobPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parsed = parseDob(value);
  const [day,   setDay]   = useState(parsed.day);
  const [month, setMonth] = useState(parsed.month);
  const [year,  setYear]  = useState(parsed.year);
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8

  function update(d: string, m: string, y: string) {
    setDay(d); setMonth(m); setYear(y);
    onChange(buildDob(d, m, y));
  }

  return (
    <div className="space-y-2">
      <Label>Date of Birth <span className="text-muted-foreground text-xs">(optional — year is optional)</span></Label>
<<<<<<< HEAD
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[80px_1fr_100px]">
        <Select value={day} onValueChange={(v) => update(v, month, year)}>
          <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
          <SelectContent>{DAYS.map((d) => <SelectItem key={d} value={d}>{parseInt(d)}</SelectItem>)}</SelectContent>
        </Select>
=======
      <div className="grid grid-cols-[80px_1fr_100px] gap-2">
        {/* Day */}
        <Select value={day} onValueChange={(v) => update(v, month, year)}>
          <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
          <SelectContent>
            {DAYS.map((d) => <SelectItem key={d} value={d}>{parseInt(d)}</SelectItem>)}
          </SelectContent>
        </Select>
        {/* Month */}
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
        <Select value={month} onValueChange={(v) => update(day, v, year)}>
          <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={m} value={String(i + 1).padStart(2, "0")}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
<<<<<<< HEAD
=======
        {/* Year — optional free text */}
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
        <Input
          placeholder="Year (opt.)"
          value={year}
          maxLength={4}
          inputMode="numeric"
<<<<<<< HEAD
          onChange={(e) => update(day, month, e.target.value.replace(/\D/g, ""))}
=======
          onChange={(e) => {
            const y = e.target.value.replace(/\D/g, "");
            update(day, month, y);
          }}
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
        />
      </div>
      {day && month && (
        <p className="text-xs text-muted-foreground">
          Saved as: <span className="font-mono font-medium text-foreground">{buildDob(day, month, year) || "—"}</span>
          {!year && " (no year)"}
        </p>
      )}
    </div>
  );
}

<<<<<<< HEAD
=======
// 12-char minimum + all complexity rules
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
const PW_RULES = [
  { re: /.{12,}/, label: "At least 12 characters" },
  { re: /[A-Z]/, label: "At least 1 uppercase letter" },
  { re: /[a-z]/, label: "At least 1 lowercase letter" },
  { re: /[0-9]/, label: "At least 1 number" },
  { re: /[^A-Za-z0-9]/, label: "At least 1 special character" },
];

function PasswordStrength({ password }: { password: string }) {
  const results = PW_RULES.map((r) => ({ ...r, ok: r.re.test(password) }));
  const passed = results.filter((r) => r.ok).length;
  const color = passed <= 2 ? "bg-destructive" : passed <= 4 ? "bg-warning" : "bg-success";
  if (!password) return null;
  return (
    <div className="space-y-2 pt-1">
      <div className="flex gap-1 h-1">
        {PW_RULES.map((_, i) => (
          <div key={i} className={`flex-1 rounded-full transition-colors ${i < passed ? color : "bg-muted"}`} />
        ))}
      </div>
      <ul className="space-y-0.5">
        {results.map((r) => (
          <li key={r.label} className={`flex items-center gap-1.5 text-xs ${r.ok ? "text-success" : "text-muted-foreground"}`}>
<<<<<<< HEAD
            <span>{r.ok ? <Check className="size-3"/> : <span>·</span>}</span> {r.label}
=======
            <span>{r.ok ? "✓" : "·"}</span> {r.label}
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
          </li>
        ))}
      </ul>
    </div>
  );
}

<<<<<<< HEAD
function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

=======
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
function SignInPage() {
  const navigate = useNavigate();
  const { session, role, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "register">("signin");
<<<<<<< HEAD
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      setNavigating(true);
      // 800ms buffer — gives router time to complete redirect before login form could render
      const t = setTimeout(() => {
        navigate({ to: role === "admin" ? "/admin" : "/dashboard", replace: true })
          .finally(() => setNavigating(false));
      }, 800);
      return () => clearTimeout(t);
    }
  }, [loading, session, role, navigate]);

  // Show splash while: auth resolving OR session found (navigating to dashboard)
  if (loading || navigating) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <img src="/csc-logo.png" alt="CSC Logo" className="h-16 w-auto" />
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,480px)_1fr] bg-background transition-colors duration-200">
      {/* Left panel */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-10 overflow-y-auto relative">
        {/* Theme toggle — top right of the left panel */}
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="max-w-sm w-full mx-auto">
          <Logo />
          <h1 className="mt-10 text-2xl font-extrabold tracking-tight text-foreground">
            Leave Management System
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to continue" : "Register your staff account"}
          </p>

          <div className="mt-8">
            {mode === "signin" ? <SignInForm /> : <RegisterForm onBackToSignIn={() => setMode("signin")} />}
          </div>

          <button
            className="mt-6 text-sm font-medium text-primary hover:underline"
            onClick={() => setMode(mode === "signin" ? "register" : "signin")}
          >
            {mode === "signin" ? "New staff member? Register an account" : "Already registered? Sign in"}
          </button>
        </div>
      </div>

      {/* Right decorative panel */}
      <div className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/20 to-background transition-colors duration-200" />
        <div className="absolute inset-0 grid place-items-center p-16">
          <div className="max-w-md space-y-6">
            <p className="text-4xl font-extrabold leading-tight tracking-tight text-foreground">
              Leave, covered.<br />Every step of the way.
            </p>
            <p className="text-base text-muted-foreground leading-relaxed">
              Casual, maternity, bereavement and half-day leave — tracked, approved and proxy-covered in one place.
            </p>
            <ul className="space-y-3">
              {[
                "2 casual leaves/month, 12/year — always paid",
                "10 paid medical leaves per year",
                "HOD assigns proxy lectures automatically",
                "Sundays & holidays never counted",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold">✓</span>
                  <span className="text-foreground/80">{item}</span>
                </li>
              ))}
=======

  useEffect(() => {
    if (!loading && session) {
      navigate({ to: role === "admin" ? "/admin" : "/dashboard", replace: true });
    }
  }, [loading, session, role, navigate]);

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,480px)_1fr]">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 overflow-y-auto">
        <Logo />
        <h1 className="mt-10 text-2xl font-extrabold tracking-tight">Leave Management System</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin" ? "Sign in to continue" : "Register your staff account"}
        </p>
        <div className="mt-8">{mode === "signin" ? <SignInForm /> : <RegisterForm onBackToSignIn={() => setMode("signin")} />}</div>
        <button
          className="mt-6 text-sm font-medium text-primary hover:underline"
          onClick={() => setMode(mode === "signin" ? "register" : "signin")}
        >
          {mode === "signin" ? "New staff member? Register an account" : "Already registered? Sign in"}
        </button>
      </div>

      <div className="relative hidden overflow-hidden bg-accent/40 lg:block">
        <div className="absolute inset-0 grid place-items-center p-16">
          <div className="max-w-md">
            <p className="text-3xl font-extrabold leading-tight tracking-tight text-accent-foreground">
              Casual, maternity, bereavement and half-day leave — tracked, approved and proxy-covered.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-foreground/70">
              <li>· 2 casual leaves a month, 12 a year — paid.</li>
              <li>· 10 paid medical leaves per year; beyond that principal decides.</li>
              <li>· HOD assigns proxy lectures, principal gives final approval.</li>
              <li>· Sundays and national holidays are never counted.</li>
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
<<<<<<< HEAD
  const [authError, setAuthError] = useState<string | null>(null);
=======
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
  const signIn = useServerFn(signInWithIdentifier);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
<<<<<<< HEAD
    setAuthError(null);
    setBusy(true);
    try {
      const result = await signIn({ data: { identifier: email.trim(), password } });
      if ("error" in result && result.error) {
        setAuthError(result.error);
        return;
      }
      const { error } = await supabase.auth.setSession(result);
      if (error) throw error;
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Invalid user ID or password");
=======
    setBusy(true);
    try {
      const result = await signIn({ data: { identifier: email.trim(), password } });
      if ("error" in result && result.error) { toast.error(result.error); return; }
      const { error } = await supabase.auth.setSession(result);
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid user ID or password");
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="userid">User ID</Label>
        <div className="relative">
          <Input
            id="userid"
            type="text"
            required
<<<<<<< HEAD
            autoComplete="username"
            placeholder="firstname@CSC.COM"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setAuthError(null); }}
            className={authError ? "pr-10 border-destructive focus-visible:ring-destructive" : "pr-10"}
=======
            placeholder="firstname@CSC.COM or email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pr-10"
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
          />
          <UserRound className="pointer-events-none absolute right-3 top-2.5 size-4 text-muted-foreground" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={show ? "text" : "password"}
            required
<<<<<<< HEAD
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setAuthError(null); }}
            className={authError ? "pr-10 border-destructive focus-visible:ring-destructive" : "pr-10"}
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-2.5 text-muted-foreground"
            aria-label="Toggle password visibility"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {authError && (
          <p className="text-xs text-destructive flex items-center gap-1.5 mt-1">
            <span className="inline-flex size-3.5 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold items-center justify-center shrink-0">!</span>
            {authError}
          </p>
        )}
=======
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-10"
          />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-2.5 text-muted-foreground" aria-label="Toggle password visibility">
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin" />} Sign In
      </Button>
<<<<<<< HEAD
      <ForgotPasswordDialog />
=======
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
    </form>
  );
}

<<<<<<< HEAD
function ForgotPasswordDialog() {
  const [open, setOpen] = useState(false);
  const [collegeId, setCollegeId] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<{ exists: boolean; maskedName?: string } | null>(null);

  const verify = useServerFn(verifyCollegeId);
  const submit = useServerFn(submitForgotPasswordRequest);

  useEffect(() => {
    const id = collegeId.trim();
    if (!id) { setVerified(null); return; }
    setVerifying(true);
    setVerified(null);
    const t = setTimeout(async () => {
      try {
        const result = await verify({ data: { collegeId: id } });
        setVerified(result);
      } catch (err) {
        toast.error("Verification failed: " + (err instanceof Error ? err.message : String(err)));
        setVerified(null);
      } finally {
        setVerifying(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [collegeId, verify]);

  function handleClose() {
    setOpen(false); setSent(false); setCollegeId(""); setVerified(null);
  }

  async function sendRequest() {
    if (!verified?.exists) return;
    setBusy(true);
    try {
      const result = await submit({ data: { collegeId: collegeId.trim() } });
      if ("error" in result) { toast.error(result.error); return; }
      setSent(true);
    } catch (err) {
      toast.error("Submit failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors"
        onClick={() => setOpen(true)}
      >
        Forgot password?
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4">
            {sent ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                    <Check className="size-5"/>
                  </div>
                  <div>
                    <p className="font-semibold">Request sent</p>
                    <p className="text-xs text-muted-foreground">Admin will set a temporary password for you</p>
                  </div>
                </div>
                <Button className="w-full" onClick={handleClose}>Done</Button>
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-base">Forgot Password?</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter your College ID and we'll verify it before sending a reset request to the admin.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">College ID</label>
                  <div className="flex rounded-lg border border-border overflow-hidden focus-within:ring-2 focus-within:ring-primary/30 bg-background">
                    <input
                      type="text"
                      placeholder="firstname"
                      className="flex-1 min-w-0 px-3 py-2 text-sm outline-none bg-transparent uppercase placeholder:normal-case placeholder:text-muted-foreground"
                      value={collegeId}
                      onChange={(e) => setCollegeId(e.target.value.replace(/@.*/g, "").toUpperCase())}
                    />
                    <span className="flex items-center pr-2.5 text-sm text-muted-foreground select-none whitespace-nowrap">
                      @CSC.COM
                      {verifying && <Loader2 className="size-3.5 animate-spin ml-2" />}
                      {!verifying && verified?.exists && <Check className="size-4 text-green-500 ml-2"/>}
                      {!verifying && verified && !verified.exists && <X className="size-4 text-destructive ml-2"/>}
                    </span>
                  </div>
                  {!verifying && verified?.exists && verified.maskedName && (
                    <p className="text-xs text-green-600 dark:text-green-400">Account found: {verified.maskedName}</p>
                  )}
                  {!verifying && verified && !verified.exists && (
                    <p className="text-xs text-destructive">No account found with this College ID</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
                  <Button type="button" className="flex-1" disabled={busy || !verified?.exists} onClick={sendRequest}>
                    {busy && <Loader2 className="size-4 animate-spin mr-1" />} Send Request
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function validateIndianPhone(v: string): string {
  if (!v) return "";
  if (!/^\d+$/.test(v)) return "Only digits allowed — no spaces or special characters";
  if (v.length !== 10) return "Must be exactly 10 digits";
  if (!/^[6-9]/.test(v)) return "Must start with 6, 7, 8, or 9";
  return "";
}

const REGISTER_ROLES = [
  { value: "teacher", label: "Teacher",  desc: "Apply for leaves, view schedule, payroll" },
  { value: "hod",    label: "HOD",       desc: "Head of Department — approve department leaves" },
  { value: "hr",     label: "HR Admin",  desc: "Manage teacher onboarding and documents" },
] as const;

function RegisterForm({ onBackToSignIn }: { onBackToSignIn: () => void }) {
  const register = useServerFn(registerStaff);
  const resolveId = useServerFn(resolvePreviewUserId);
=======
const REGISTER_ROLES = [
  { value: "teacher", label: "Teacher",   desc: "Apply for leaves, view schedule, payroll" },
  { value: "hod",     label: "HOD",       desc: "Head of Department — approve department leaves" },
  { value: "hr",      label: "HR Admin",  desc: "Manage teacher onboarding and documents" },
] as const;

function RegisterForm({ onBackToSignIn }: { onBackToSignIn: () => void }) {
  const { refresh } = useAuth();
  const register = useServerFn(registerStaff);
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8

  const [registerRole, setRegisterRole] = useState<"teacher" | "hod" | "hr">("teacher");
  const [salutation, setSalutation] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [designation, setDesignation] = useState("Assistant Professor");
  const [departmentId, setDepartmentId] = useState("");
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
<<<<<<< HEAD
  const [previewUserId, setPreviewUserId] = useState("");
  const [idChecking, setIdChecking] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneErr, setPhoneErr] = useState("");

  const needsDept = registerRole === "teacher" || registerRole === "hod";
  const pwValid = PW_RULES.every((r) => r.re.test(password));
  const fullName = [salutation, firstName.trim(), lastName.trim()].filter(Boolean).join(" ");

=======

  const isHR = registerRole === "hr";
  const needsDept = registerRole === "teacher" || registerRole === "hod";

  // Live uniqueness check: preview the actual ID that will be assigned (server-side, bypasses RLS)
  const [previewUserId, setPreviewUserId] = useState("");
  const [idChecking, setIdChecking] = useState(false);
  const resolveId = useServerFn(resolvePreviewUserId);
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
  useEffect(() => {
    const clean = firstName.trim();
    if (!clean) { setPreviewUserId(""); return; }
    setIdChecking(true);
    const t = setTimeout(async () => {
      try {
        const result = await resolveId({ data: { firstName: clean } });
        setPreviewUserId(result.userId);
      } catch {
        setPreviewUserId(`${clean.replace(/\s+/g, "").toLowerCase()}@CSC.COM`);
      } finally {
        setIdChecking(false);
      }
    }, 400);
    return () => clearTimeout(t);
<<<<<<< HEAD
  }, [firstName, resolveId]);
=======
  }, [firstName]);
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8

  const { data: departments = [] } = useQuery({
    queryKey: ["departments-public"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

<<<<<<< HEAD
=======
  // Derived full name
  const fullName = [salutation, firstName.trim(), lastName.trim()].filter(Boolean).join(" ");

  // Password validation — 12-char minimum
  const pwValid = PW_RULES.every((r) => r.re.test(password));

>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!salutation) return toast.error("Please select a salutation");
    if (!firstName.trim()) return toast.error("Please enter your first name");
    if (!gender) return toast.error("Please select a gender");
    if (needsDept && !departmentId) return toast.error("Please select a department");
<<<<<<< HEAD
    if (!phone.trim()) return toast.error("Please enter your mobile number");
    if (!/^[6-9]\d{9}$/.test(phone.trim())) return toast.error("Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9");
    if (!pwValid) return toast.error("Password does not meet the requirements");

    const email = `${firstName.trim().toLowerCase()}.csc@csc.edu`;
    setBusy(true);
    try {
      const result = await register({
        data: { email, password, fullName, designation, departmentId: needsDept ? departmentId : null, role: registerRole, gender, dob: dob || null, phone: phone.trim() },
=======
    if (!pwValid) return toast.error("Password does not meet the requirements");

    const email = `${firstName.trim().toLowerCase()}.csc@csc.edu`;

    setBusy(true);
    try {
      const result = await register({
        data: {
          email,
          password,
          fullName,
          designation,
          departmentId: needsDept ? departmentId : null,
          role: registerRole,
          gender,
          dob: dob || null,
        },
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
      });
      if ("error" in result && result.error) return toast.error(result.error);
      setPending(true);
      toast.success("Registration submitted for admin approval");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  if (pending) {
    const roleLabel = REGISTER_ROLES.find((r) => r.value === registerRole)?.label ?? "Staff";
    return (
      <div className="rounded-lg border border-border p-4 space-y-4">
        <div>
          <p className="text-sm font-semibold">Registration submitted — awaiting admin approval</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your <strong>{roleLabel}</strong> account request has been received. The college administrator will review and approve it before you can sign in.
          </p>
          {previewUserId && (
            <p className="mt-2 text-xs text-muted-foreground">
              Your college ID will be: <span className="font-mono font-medium text-foreground">{previewUserId}</span>
            </p>
          )}
        </div>
<<<<<<< HEAD
        <Button variant="outline" className="w-full" onClick={onBackToSignIn}>← Back to Sign In</Button>
=======
        <Button variant="outline" className="w-full" onClick={onBackToSignIn}>
          ← Back to Sign In
        </Button>
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
<<<<<<< HEAD
      {/* Role selection */}
      <div className="space-y-2">
        <Label>Registering as</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
=======

      {/* Role selection */}
      <div className="space-y-2">
        <Label>Registering as</Label>
        <div className="grid grid-cols-3 gap-2">
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
          {REGISTER_ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRegisterRole(r.value)}
              className={`rounded-lg border px-3 py-2.5 text-left transition-all ${
                registerRole === r.value
<<<<<<< HEAD
                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
=======
                  ? "border-primary bg-primary/8 text-primary ring-1 ring-primary"
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
                  : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <p className="text-xs font-semibold">{r.label}</p>
              <p className="text-[10px] leading-tight mt-0.5 opacity-70">{r.desc}</p>
            </button>
          ))}
        </div>
      </div>

<<<<<<< HEAD
      {/* Name */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[130px_1fr_1fr]">
        <Select value={salutation} onValueChange={setSalutation}>
          <SelectTrigger><SelectValue placeholder="Salutation" /></SelectTrigger>
          <SelectContent>
            {SALUTATIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <GuardedInput required fieldName="First name" placeholder="First name" value={firstName} onChange={setFirstName} />
        <GuardedInput fieldName="Last name" placeholder="Last name" value={lastName} onChange={setLastName} />
=======
      {/* Salutation + First name + Last name */}
      <div className="grid grid-cols-[130px_1fr_1fr] gap-2">
        <Select value={salutation} onValueChange={setSalutation}>
          <SelectTrigger>
            <SelectValue placeholder="Salutation" />
          </SelectTrigger>
          <SelectContent>
            {SALUTATIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <GuardedInput
          required
          fieldName="First name"
          placeholder="First name"
          value={firstName}
          onChange={setFirstName}
        />
        <GuardedInput
          fieldName="Last name"
          placeholder="Last name"
          value={lastName}
          onChange={setLastName}
        />
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
      </div>
      {fullName && (
        <p className="text-xs text-muted-foreground">Full name: <span className="font-medium text-foreground">{fullName}</span></p>
      )}

      {/* Gender */}
      <div className="space-y-2">
        <Label>Gender</Label>
        <Select value={gender} onValueChange={setGender}>
<<<<<<< HEAD
          <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
          <SelectContent>
            {GENDERS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
=======
          <SelectTrigger>
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            {GENDERS.map((g) => (
              <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
            ))}
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
          </SelectContent>
        </Select>
      </div>

<<<<<<< HEAD
      <DobPicker value={dob} onChange={setDob} />

      {/* Mobile number — required for password reset via HOD */}
      <div className="space-y-2">
        <Label htmlFor="reg-phone">Mobile number <span className="text-destructive">*</span></Label>
        <Input
          id="reg-phone"
          type="tel"
          inputMode="numeric"
          placeholder="e.g. 9876543210"
          maxLength={10}
          value={phone}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 10);
            setPhone(v);
            setPhoneErr(validateIndianPhone(v));
          }}
          className={phoneErr ? "border-destructive focus-visible:ring-destructive/20" : ""}
          required
        />
        {phoneErr
          ? <p className="text-xs text-destructive">{phoneErr}</p>
          : <p className="text-xs text-muted-foreground">10-digit Indian mobile number (starts with 6–9). Used by your HOD for password reset. Not shared publicly.</p>
        }
      </div>
=======
      {/* Date of Birth (optional) */}
      <DobPicker value={dob} onChange={setDob} />

      {/* Auto-generated User ID */}
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
      <div className="space-y-2">
        <Label htmlFor="userid-preview">User ID (auto-generated)</Label>
        <div className="flex items-center gap-2">
          <Input
            id="userid-preview"
            value={idChecking ? "Checking…" : previewUserId}
            readOnly
            className="bg-muted text-muted-foreground cursor-not-allowed font-mono text-sm"
            placeholder="Enter first name above…"
          />
          {idChecking && <Loader2 className="size-4 animate-spin text-muted-foreground shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground">
          This is the exact ID you will use to sign in. A number is appended automatically if the name is already taken (e.g. <span className="font-mono">firstname2@CSC.COM</span>).
        </p>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="reg-pass">Password</Label>
        <div className="relative">
          <Input
            id="reg-pass"
            type={showPw ? "text" : "password"}
            required
<<<<<<< HEAD
            autoComplete="new-password"
=======
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
            placeholder="Create a strong password (min 12 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-10"
          />
          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-2.5 text-muted-foreground" aria-label="Toggle password visibility">
            {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <PasswordStrength password={password} />
      </div>

<<<<<<< HEAD
      {/* Department + Designation */}
=======
      {/* Department + Designation — department hidden for HR */}
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
      <div className={`grid gap-4 ${needsDept ? "sm:grid-cols-2" : "grid-cols-1"}`}>
        {needsDept && (
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
<<<<<<< HEAD
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
=======
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="desig">Designation</Label>
          <Select value={designation} onValueChange={setDesignation}>
<<<<<<< HEAD
            <SelectTrigger id="desig"><SelectValue placeholder="Select designation" /></SelectTrigger>
            <SelectContent>
              {[
                "Assistant Professor","Associate Professor","Professor","Senior Professor",
                "Head of Department","Principal","Vice Principal","Lecturer","Senior Lecturer",
                "Lab Assistant","Teaching Assistant","HR Manager","HR Executive","HR Officer",
              ].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
=======
            <SelectTrigger id="desig">
              <SelectValue placeholder="Select designation" />
            </SelectTrigger>
            <SelectContent>
              {[
                "Assistant Professor",
                "Associate Professor",
                "Professor",
                "Senior Professor",
                "Head of Department",
                "Principal",
                "Vice Principal",
                "Lecturer",
                "Senior Lecturer",
                "Lab Assistant",
                "Teaching Assistant",
                "HR Manager",
                "HR Executive",
                "HR Officer",
              ].map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={busy || !pwValid}>
        {busy && <Loader2 className="size-4 animate-spin" />} Create Account
      </Button>

      <p className="text-xs text-muted-foreground">
        All accounts require admin approval before you can sign in.
        {registerRole === "teacher" && " After approval, upload your documents for HR verification to unlock all features."}
        {registerRole === "hr" && " HR accounts skip the document upload step."}
      </p>
    </form>
  );
}
