/**
 * textGuard.ts
 *
 * Two-layer content moderation for Input / Textarea fields:
 *
 *  Layer 1 — Instant local blocklist (no network)
 *    A curated set of common English + Hindi abusive / profane words.
 *    Catches the obvious cases immediately (zero latency).
<<<<<<< HEAD
 *    Normalises leetspeak (4→a, 3→e, 0→o, 1→i, @→a, $→s, 5→s)
 *    and strips all non-alphanumeric characters so spacing/punctuation
 *    tricks (e.g. "f.u.c.k", "f u c k", "sh!t") are caught.
 *    Short abbreviations (bc, mc, lc) use whole-word matching only
 *    so they don't fire inside legitimate words like "because".
=======
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
 *
 *  Layer 2 — Groq LLM (llama-3.1-8b-instant, free tier)
 *    Called after the user stops typing for 800 ms. Returns a short verdict
 *    so the model can't be tricked into explaining or reproducing the content.
 *
<<<<<<< HEAD
 * Setup:
 *   Add GROQ_API_KEY=<your_key> to your SERVER environment (Vercel env vars)
 *   Do NOT use VITE_GROQ_API_KEY — that would expose the key in the client bundle
=======
 * Usage:
 *   const { error, checking } = useTextGuard(value, "Reason");
 *   // Show `error` as inline red text. Block form submit when error !== null.
 *
 * Setup:
 *   Add VITE_GROQ_API_KEY=<your_key> to .env
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
 *   Get a free key at https://console.groq.com (no credit card required)
 */

import { useState, useEffect, useRef } from "react";
<<<<<<< HEAD
import { useServerFn } from "@tanstack/react-start";
import { validateMeaningfulText } from "@/lib/validateText";
import { moderateText } from "@/lib/moderation.functions";

// ── Normalisation ─────────────────────────────────────────────────────────────
// Strip ALL non-letter characters and apply common substitutions so tricks
// like "f.u.c.k", "f u c k", "sh!t", "a$$", "4ss", "@ss" are caught.
const LEET: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s",
  "6": "g", "7": "t", "8": "b", "9": "g",
  "@": "a", "$": "s", "!": "i", "+": "t", "(": "c",
};

function normalise(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((c) => LEET[c] ?? c)
    .join("")
    .replace(/[^a-z]/g, ""); // strip everything non-alpha after substitution
}

// ── Layer 1: local word blocklist ─────────────────────────────────────────────
// Two buckets:
//   BLOCKED_SUBSTRINGS  — checked as substrings in the fully normalised text
//   BLOCKED_WHOLE_WORDS — checked as whole words only (for short abbrevs that
//                         would false-positive inside real words)

const BLOCKED_SUBSTRINGS = [
  // English profanity
  "fuck", "shit", "bitch", "asshole", "bastard", "cunt", "dick", "cock",
  "pussy", "whore", "slut", "faggot", "nigger", "retard", "motherfuck",
  "bullshit", "jackass", "dumbass", "idiot", "moron", "loser",
  "screwu", "gotohell", "sonofabitch", "shutthefuck",
  // Hindi / Hinglish (romanised)
  "madarchod", "bhosdike", "bhosdi", "chutiya", "chutiye", "gaandu", "gandu",
  "harami", "haraami", "randi", "bhenke", "terimaa", "terima",
  "teribehen", "teribehan", "kamina", "kamine", "kutte", "kuttiya",
  "suar", "suwar", "ullu", "bakwaas", "gadha", "gadhe", "gaddha",
  "hijra", "hijda", "lavde", "lavda", "lund", "lunde", "lauda", "laude",
  "bhadmeinjao", "jaobhosdike", "maakiaankh", "maaki",
  "baapka", "terebaap", "teriaaand", "gaand", "gaandmasti",
  "saala", "saali", "sala", "sali",
  // Common abbreviation spellings typed in full
  "bsdk", "mcd",
];

// Short tokens checked only as whole words (split on whitespace + punctuation)
// so "bc" doesn't block "because", "mc" doesn't block "McGregor"
const BLOCKED_WHOLE_WORDS = new Set(["bc", "mc", "lc", "bkl", "bhk"]);

/** Splits the raw text into lowercase tokens for whole-word checks */
function rawTokens(text: string): string[] {
  return text.toLowerCase().split(/[\s\-_.,;:!?()/\\]+/).filter(Boolean);
}

/** Returns the matched blocked word if found, else null */
export function localBlocklistCheck(text: string): string | null {
  const norm = normalise(text);

  // Substring check (normalised — catches leetspeak and spacing tricks)
  for (const sub of BLOCKED_SUBSTRINGS) {
    if (norm.includes(sub)) return sub;
  }

  // Whole-word check (on raw tokens — avoids false positives for short abbrevs)
  const tokens = rawTokens(text);
  for (const tok of tokens) {
    if (BLOCKED_WHOLE_WORDS.has(tok)) return tok;
  }

  return null;
}

/** One-shot moderation check — returns true if the text is abusive. */
export async function groqModerationCheck(text: string): Promise<boolean> {
  try {
    const { verdict } = await moderateText({ data: { text } });
    return verdict === "ABUSIVE";
  } catch {
    return false;
  }
}

// ── Layer 2: server-side Groq check ──────────────────────────────────────────
// groqCheck is now a thin wrapper — actual fetch happens in moderation.functions.ts
// on the server, which fixes both CORS and API key exposure.
type GroqVerdict = "CLEAN" | "ABUSIVE" | "UNCLEAR";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function groqCheck(text: string, serverFn: any): Promise<GroqVerdict> {
  try {
    const { verdict } = await serverFn({ data: { text } });
    return verdict;
  } catch {
    return "CLEAN"; // fail open on any error
=======

// ── Layer 1: local word blocklist ─────────────────────────────────────────────
// Words are stored as substrings; we check if any appears in the normalised text.
const BLOCKED_SUBSTRINGS = [
  // Common English profanity / slurs (abbreviated to avoid storing them verbatim)
  "fuck","shit","bitch","asshole","bastard","cunt","dick","cock","pussy",
  "whore","slut","faggot","nigger","retard","motherfuck","bullshit",
  "jackass","dumbass","idiot","moron","stupid","loser","screw you",
  "go to hell","son of a bitch","shut up","shut the",
  // Hindi / Hinglish abusive words (romanised common spellings)
  "madarchod","bhosdike","bhosdi","chutiya","chutiye","gaandu","gandu",
  "harami","haraami","randi","bhen ke","bhenke","teri maa","teri ma",
  "teri behen","teri behan","sala","saala","saali","sali","kamina",
  "kamine","kutte","kuttiya","suar","suwar","ullu","bakwaas","gadha",
  "gadhe","gaddha","hijra","hijda","lavde","lavda","lund","lunde",
  "lauda","laude","bhad mein jao","jao bhosdike","maa ki aankh",
  "maa ki","baap ka","tere baap","teri gaand","gaand","gaandmasti",
  "bsdk","mcd","bc","mc","lc","bkl","bhk",
];

/** Returns the matched blocked word if found, else null */
function localBlocklistCheck(text: string): string | null {
  const normalised = text.toLowerCase().replace(/[\s\-_]+/g, "");
  for (const sub of BLOCKED_SUBSTRINGS) {
    const normSub = sub.toLowerCase().replace(/[\s\-_]+/g, "");
    if (normalised.includes(normSub)) return sub;
  }
  return null;
}

// ── Layer 2: Groq LLM check ───────────────────────────────────────────────────
const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
const MODEL    = "llama-3.1-8b-instant";

type GroqVerdict = "CLEAN" | "ABUSIVE" | "UNCLEAR";

async function groqCheck(text: string): Promise<GroqVerdict> {
  const key = import.meta.env.VITE_GROQ_API_KEY;
  if (!key) return "CLEAN"; // no key configured — skip silently

  const prompt = `You are a strict content moderator for a school/college leave management system.
Classify the following text as exactly one of: CLEAN, ABUSIVE, or UNCLEAR.

Rules:
- ABUSIVE: contains profanity, slurs, hate speech, sexual language, threats, or insults in ANY language (including English, Hindi, Hinglish, or transliterated scripts).
- CLEAN: professional, neutral, or polite text appropriate for a workplace form.
- UNCLEAR: genuinely ambiguous — could be either.

Respond with ONLY the single word verdict. No explanation.

Text: """${text.slice(0, 400)}"""`;

  try {
    const res = await fetch(GROQ_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 5,
        temperature: 0,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) return "CLEAN"; // fail open — don't block on API errors
    const data = await res.json();
    const raw = (data?.choices?.[0]?.message?.content ?? "").trim().toUpperCase();
    if (raw.startsWith("ABUSIVE")) return "ABUSIVE";
    if (raw.startsWith("UNCLEAR")) return "UNCLEAR";
    return "CLEAN";
  } catch {
    return "CLEAN"; // network error → fail open
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
  }
}

// ── React hook ────────────────────────────────────────────────────────────────
export interface TextGuardResult {
  /** Non-null = show as inline error and block submit */
  error: string | null;
  /** True while the LLM call is in flight */
  checking: boolean;
<<<<<<< HEAD
  /**
   * Call this before submitting a form.
   * Runs layers 1a + 1b synchronously and awaits any in-flight LLM check.
   * Returns null if clean, or an error string to show and block submit with.
   */
  validateNow: () => Promise<string | null>;
}

const DEBOUNCE_MS = 600;
=======
}

const DEBOUNCE_MS = 800;
const MIN_LENGTH  = 4; // don't bother checking very short inputs
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8

/**
 * useTextGuard(value, fieldName)
 *
<<<<<<< HEAD
 * Three-layer guard:
 *   Layer 1a: local abusive word blocklist (instant, normalised substring match)
 *   Layer 1b: gibberish / nonsense check (instant, once ≥ 6 chars)
 *   Layer 2:  Groq LLM moderation (debounced 600ms, only after layers 1a/1b pass)
 *
 * Key behaviours:
 *  - LLM is re-triggered whenever the text changes from the last checked value,
 *    including after the user edits previously flagged text.
 *  - A previous LLM error is only retained if the current text still matches
 *    what the LLM checked. Editing the text clears the stale verdict and
 *    schedules a fresh LLM check.
 *  - Short abbreviation blocklist uses whole-word matching only.
=======
 * Watches `value` and returns { error, checking }.
 * Layer 1 (blocklist) fires synchronously on every change.
 * Layer 2 (Groq) fires 800 ms after the user stops typing.
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
 */
export function useTextGuard(value: string, fieldName = "Text"): TextGuardResult {
  const [error,    setError]    = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
<<<<<<< HEAD
  const timerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCheckedRef  = useRef<string>("");   // text that was last sent to LLM
  const llmErrorRef     = useRef<string | null>(null); // verdict for lastCheckedRef
  const mountedRef      = useRef(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callModerate    = useServerFn(moderateText as any) as any;
  // Holds the in-flight LLM promise so validateNow() can await it on submit
  const pendingLLMRef   = useRef<Promise<GroqVerdict> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const trimmed = value.trim();

    // ── Empty ─────────────────────────────────────────────────────────────
    if (trimmed.length === 0) {
      setChecking(false);
      setError(null);
      llmErrorRef.current  = null;
      lastCheckedRef.current = "";
      return;
    }

    // ── Layer 1a: abusive blocklist — check on every keystroke ───────────────
    const blocked = localBlocklistCheck(trimmed);
    if (blocked) {
      setChecking(false);
      llmErrorRef.current = null;
      lastCheckedRef.current = "";
      setError(`${fieldName} contains inappropriate language. Please use professional wording.`);
      return;
    }

    // ── Layer 1b: gibberish check — start at 3 chars ──────────────────────
    if (trimmed.length >= 3) {
      const meaningful = validateMeaningfulText(trimmed, fieldName);
      if (!meaningful.valid) {
        setChecking(false);
        llmErrorRef.current = null;
        lastCheckedRef.current = "";
        setError(meaningful.error ?? `${fieldName} appears to contain random characters. Please write meaningful text.`);
        return;
      }
    }

    // ── Retain LLM verdict only if it was for the exact same text ─────────
    // If the user edited the text, clear the old verdict so a stale error
    // is never shown for content that has since changed.
    if (trimmed !== lastCheckedRef.current) {
      llmErrorRef.current = null;
    }
    setError(llmErrorRef.current);

    // ── Layer 2: Groq LLM (debounced) ────────────────────────────────────
    // Skip if the text hasn't changed since the last LLM call
    if (trimmed === lastCheckedRef.current) return;

    timerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      lastCheckedRef.current = trimmed;
      setChecking(true);

      // Store the promise so validateNow() can await it if submit fires mid-check
      const llmPromise = groqCheck(trimmed, callModerate);
      pendingLLMRef.current = llmPromise;

      llmPromise.then((verdict) => {
        if (!mountedRef.current) return;
        pendingLLMRef.current = null;
        setChecking(false);

        if (verdict === "ABUSIVE") {
          llmErrorRef.current = `${fieldName} contains inappropriate language. Please use professional wording.`;
        } else if (verdict === "UNCLEAR") {
          llmErrorRef.current = `${fieldName} may contain inappropriate content. Please review your wording.`;
        } else {
          llmErrorRef.current = null;
        }

        // Only apply if the text hasn't changed while we were waiting
        if (value.trim() === lastCheckedRef.current && mountedRef.current) {
          setError(llmErrorRef.current);
        }
      });
=======
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCheckedRef = useRef<string>("");

  useEffect(() => {
    const trimmed = value.trim();

    // Clear error on empty
    if (trimmed.length < MIN_LENGTH) {
      setError(null);
      setChecking(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Layer 1 — instant local check
    const blocked = localBlocklistCheck(trimmed);
    if (blocked) {
      setError(`${fieldName} contains inappropriate language. Please use professional wording.`);
      setChecking(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // If layer 1 passes, clear any previous error and start debounce for layer 2
    setError(null);

    if (timerRef.current) clearTimeout(timerRef.current);

    // Skip LLM if text hasn't changed since last check
    if (trimmed === lastCheckedRef.current) return;

    timerRef.current = setTimeout(async () => {
      lastCheckedRef.current = trimmed;
      setChecking(true);
      const verdict = await groqCheck(trimmed);
      setChecking(false);

      if (verdict === "ABUSIVE") {
        setError(`${fieldName} contains inappropriate language. Please use professional wording.`);
      } else if (verdict === "UNCLEAR") {
        setError(`${fieldName} may contain inappropriate content. Please review your wording.`);
      } else {
        setError(null);
      }
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
<<<<<<< HEAD
  }, [value, fieldName, callModerate]);

  /**
   * validateNow — call this before submitting.
   * 1. Instantly re-runs blocklist + gibberish on current value.
   * 2. If the LLM is still in-flight, awaits it.
   * 3. If text hasn't been LLM-checked yet, fires a fresh check now.
   * Returns null if clean, or an error string to block submit with.
   */
  async function validateNow(): Promise<string | null> {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // Layer 1a: blocklist
    const blocked = localBlocklistCheck(trimmed);
    if (blocked) {
      const msg = `${fieldName} contains inappropriate language. Please use professional wording.`;
      setError(msg);
      return msg;
    }

    // Layer 1b: gibberish (from 3 chars)
    if (trimmed.length >= 3) {
      const meaningful = validateMeaningfulText(trimmed, fieldName);
      if (!meaningful.valid) {
        const msg = meaningful.error ?? `${fieldName} appears to contain random characters.`;
        setError(msg);
        return msg;
      }
    }

    // Layer 2: await in-flight LLM check, or fire a fresh one if needed
    let verdict: GroqVerdict;
    if (pendingLLMRef.current) {
      // LLM is already running — await its result
      verdict = await pendingLLMRef.current;
    } else if (trimmed !== lastCheckedRef.current) {
      // Text hasn't been checked yet (e.g. user submitted before debounce fired)
      if (timerRef.current) clearTimeout(timerRef.current);
      setChecking(true);
      lastCheckedRef.current = trimmed;
      const p = groqCheck(trimmed, callModerate);
      pendingLLMRef.current = p;
      verdict = await p;
      pendingLLMRef.current = null;
      setChecking(false);
    } else {
      // Already checked and result is in llmErrorRef
      if (llmErrorRef.current) {
        setError(llmErrorRef.current);
        return llmErrorRef.current;
      }
      return null;
    }

    if (verdict === "ABUSIVE") {
      llmErrorRef.current = `${fieldName} contains inappropriate language. Please use professional wording.`;
    } else if (verdict === "UNCLEAR") {
      llmErrorRef.current = `${fieldName} may contain inappropriate content. Please review your wording.`;
    } else {
      llmErrorRef.current = null;
    }

    if (mountedRef.current) setError(llmErrorRef.current);
    return llmErrorRef.current;
  }

  return { error, checking, validateNow };
=======
  }, [value, fieldName]);

  return { error, checking };
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
}
