
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center">
      <img
        src="/csc-logo.png"
        alt="Chandrabhan Sharma College"
        className={compact ? "h-10 w-auto" : "h-16 w-auto"}
      />
    </div>
  );
}