import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";
import { AUTH_FIELD_CLASS } from "./authFieldStyles";

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  required?: boolean;
  minLength?: number;
  maxLength?: number;
};

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  required = true,
  minLength,
  maxLength,
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  const reactId = useId();
  const inputId = `auth-pw-${reactId}`;

  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor={inputId} className="font-medium text-[#e7e9ea]">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          className={`${AUTH_FIELD_CLASS} pr-11`}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
        />
        <button
          type="button"
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#71767b] transition hover:bg-[#1a1d22] hover:text-[#e7e9ea] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d9bf0]"
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          onClick={() => setShow((s) => !s)}
        >
          {show ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={2} /> : <Eye className="h-[18px] w-[18px]" strokeWidth={2} />}
        </button>
      </div>
    </div>
  );
}
