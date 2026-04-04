type AuthDividerProps = {
  label: string;
};

export function AuthDivider({ label }: AuthDividerProps) {
  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <span className="w-full border-t border-[#2f3336]" />
      </div>
      <p className="relative flex justify-center text-[11px] font-medium uppercase tracking-wider text-[#71767b]">
        <span className="bg-[#16181c] px-2">{label}</span>
      </p>
    </div>
  );
}
