type TerminboerseLogoProps = {
  compact?: boolean;
};

export function TerminboerseLogo({ compact = false }: TerminboerseLogoProps) {
  return (
    <div className="flex items-center gap-2.5 font-heading">
      <svg
        width={compact ? 32 : 36}
        height={compact ? 32 : 36}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="40" height="40" rx="10" fill="#0F172A" />
        <path
          d="M12 14H28M12 14V28C12 29.1046 12.8954 30 14 30H26C27.1046 30 28 29.1046 28 28V14M12 14C12 12.8954 12.8954 12 14 12H26C27.1046 12 28 12.8954 28 14"
          stroke="#38BDF8"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="20" cy="10" r="2" fill="#38BDF8" />
        <path
          d="M17 22L19 24L23 20"
          stroke="#38BDF8"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-xl font-extrabold tracking-tight text-slate-900">
        Termin
        <span className="text-sky-600">börse</span>
        <span className="ml-0.5 text-xs text-slate-500">.at</span>
      </span>
    </div>
  );
}
