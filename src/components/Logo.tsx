<<<<<<< HEAD
export function Logo({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <>
        <img
          src="/csc-logo.png"
          alt="CSC"
          className="h-8 w-auto object-contain dark:hidden"
          draggable={false}
        />
        <img
          src="/csc-logo-white.png"
          alt="CSC"
          className="h-8 w-auto object-contain hidden dark:block"
          draggable={false}
        />
      </>
    );
  }

  return (
    <>
      <img
        src="/csc-logo.png"
        alt="Chandrabhan Sharma College — Arts, Commerce & Science"
        className="h-24 w-auto object-contain object-left dark:hidden"
        draggable={false}
      />
      <img
        src="/csc-logo-white.png"
        alt="Chandrabhan Sharma College — Arts, Commerce & Science"
        className="h-24 w-auto object-contain object-left hidden dark:block"
        draggable={false}
      />
    </>
  );
}
=======

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
>>>>>>> 091004894f1363ab25ba14a2804976e3ea6f57b8
