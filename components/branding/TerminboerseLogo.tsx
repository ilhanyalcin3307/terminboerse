type TerminboerseLogoProps = {
  compact?: boolean;
};

export function TerminboerseLogo({ compact = false }: TerminboerseLogoProps) {
  return (
    <div className="flex items-center gap-2.5 font-heading">
      <svg
        width={compact ? 32 : 36}
        height={compact ? 32 : 36}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="64" height="64" rx="14" fill="#0F172A" />
        <path
          d="M32 11c-5.5 0-10 4.5-10 10 0 3.4 1.7 6.4 4.3 8.2-4.8 2.1-8.3 6.9-8.3 12.8v8h28v-8c0-5.9-3.5-10.7-8.3-12.8C40.3 27.4 42 24.4 42 21c0-5.5-4.5-10-10-10Z"
          fill="#F8FAFC"
        />
        <path
          d="M32 17v8M28 21h8"
          stroke="#10B981"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M23 45h18"
          stroke="#38BDF8"
          strokeWidth="3"
          strokeLinecap="round"
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
