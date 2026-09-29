/**
 * GuardedField.tsx
 *
 * Drop-in wrappers around <Input> and <Textarea> that automatically run
 * the two-layer content moderation check (local blocklist + Groq LLM).
 *
 * Usage — GuardedInput:
<<<<<<< HEAD
 *   const guardRef = useRef<GuardHandle>(null);
 *   ...
 *   <GuardedInput
 *     ref={guardRef}
 *     fieldName="Reason"
 *     value={reason}
 *     onChange={(v) => setReason(v)}
 *     placeholder="Enter reason…"
 *   />
 *   ...
 *   // In submit handler:
 *   const err = await guardRef.current?.validateNow();
 *   if (err) return; // already shown inline
 *
 * Usage — GuardedTextarea:
 *   <GuardedTextarea ref={guardRef} fieldName="Note" value={note} onChange={...} rows={3} />
 *
 * GuardHandle is exported so parents can type the ref correctly.
 */

import { useId, forwardRef, useEffect, useImperativeHandle } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
=======
 *   <GuardedInput
 *     fieldName="Reason"
 *     value={reason}
 *     onChange={(v) => setReason(v)}
 *     onGuardError={(err) => setHasError(!!err)}   // optional
 *     placeholder="Enter reason…"
 *   />
 *
 * Usage — GuardedTextarea:
 *   <GuardedTextarea
 *     fieldName="Note"
 *     value={note}
 *     onChange={(v) => setNote(v)}
 *     rows={3}
 *   />
 *
 * Both components forward all standard HTML props (except onChange which
 * is adapted to return the string value directly for convenience).
 *
 * The `onGuardError` callback fires whenever the error state changes — use
 * it to disable a submit button in the parent:
 *   const [blocked, setBlocked] = useState(false);
 *   ...
 *   <Button disabled={blocked}>Submit</Button>
 */

import { useId, forwardRef } from "react";
import { Loader2 } from "lucide-react";
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTextGuard } from "@/lib/textGuard";
import { cn } from "@/lib/utils";

<<<<<<< HEAD
// ── Public handle exposed via ref ─────────────────────────────────────────────
export interface GuardHandle {
  /**
   * Run all three layers synchronously + await LLM.
   * Call this in your form's submit handler before proceeding.
   * Returns null if clean, or an error string (already shown inline).
   */
  validateNow: () => Promise<string | null>;
}

// ── Shared props ──────────────────────────────────────────────────────────────
=======
// ── shared props ──────────────────────────────────────────────────────────────
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
interface GuardProps {
  fieldName?: string;
  value: string;
  onChange: (value: string) => void;
  onGuardError?: (error: string | null) => void;
  className?: string;
}

<<<<<<< HEAD
// ── Error + spinner row ───────────────────────────────────────────────────────
=======
// ── error + spinner row displayed below the field ─────────────────────────────
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
function GuardFeedback({ error, checking }: { error: string | null; checking: boolean }) {
  if (!error && !checking) return null;
  return (
    <p className={cn("flex items-center gap-1 text-xs mt-1", error ? "text-destructive" : "text-muted-foreground")}>
      {checking && !error && <Loader2 className="h-3 w-3 animate-spin" />}
      {checking && !error && "Checking…"}
<<<<<<< HEAD
      {error && <span className="inline-flex items-center gap-1"><AlertTriangle className="size-3.5 shrink-0"/>{error}</span>}
=======
      {error && <span>⚠ {error}</span>}
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
    </p>
  );
}

// ── GuardedInput ──────────────────────────────────────────────────────────────
type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">;

<<<<<<< HEAD
export const GuardedInput = forwardRef<GuardHandle, GuardProps & InputProps>(
  ({ fieldName = "Field", value, onChange, onGuardError, className, ...rest }, ref) => {
    const { error, checking, validateNow } = useTextGuard(value, fieldName);

    useEffect(() => { onGuardError?.(error); }, [error, onGuardError]);

    // Expose validateNow to parent via ref
    useImperativeHandle(ref, () => ({ validateNow }), [validateNow]);
=======
export const GuardedInput = forwardRef<HTMLInputElement, GuardProps & InputProps>(
  ({ fieldName = "Field", value, onChange, onGuardError, className, ...rest }, ref) => {
    const { error, checking } = useTextGuard(value, fieldName);

    // Fire parent callback when guard state changes
    const prevErrorRef = { current: error };
    if (prevErrorRef.current !== error) onGuardError?.(error);
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8

    return (
      <div className="w-full">
        <Input
<<<<<<< HEAD
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
=======
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
          className={cn(error ? "border-destructive focus-visible:ring-destructive" : "", className)}
          {...rest}
        />
        <GuardFeedback error={error} checking={checking} />
      </div>
    );
  },
);
GuardedInput.displayName = "GuardedInput";

// ── GuardedTextarea ───────────────────────────────────────────────────────────
type TextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value">;

<<<<<<< HEAD
export const GuardedTextarea = forwardRef<GuardHandle, GuardProps & TextareaProps>(
  ({ fieldName = "Field", value, onChange, onGuardError, className, ...rest }, ref) => {
    const { error, checking, validateNow } = useTextGuard(value, fieldName);

    useEffect(() => { onGuardError?.(error); }, [error, onGuardError]);

    useImperativeHandle(ref, () => ({ validateNow }), [validateNow]);
=======
export const GuardedTextarea = forwardRef<HTMLTextAreaElement, GuardProps & TextareaProps>(
  ({ fieldName = "Field", value, onChange, onGuardError, className, ...rest }, ref) => {
    const { error, checking } = useTextGuard(value, fieldName);

    const prevErrorRef = { current: error };
    if (prevErrorRef.current !== error) onGuardError?.(error);
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8

    return (
      <div className="w-full">
        <Textarea
<<<<<<< HEAD
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
=======
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
          className={cn(error ? "border-destructive focus-visible:ring-destructive" : "", className)}
          {...rest}
        />
        <GuardFeedback error={error} checking={checking} />
      </div>
    );
  },
);
GuardedTextarea.displayName = "GuardedTextarea";
