import {
  cloneElement,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

interface FieldChildProps {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactElement<FieldChildProps>;
}

export function Field({ label, error, hint, className, children }: FieldProps) {
  const reactId = useId();
  const errorId = error ? `${reactId}-error` : undefined;
  const hintId = !error && hint ? `${reactId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  const generatedChildId = `${reactId}-field`;
  const childId = isValidElement(children) ? (children.props.id ?? generatedChildId) : undefined;

  const child = isValidElement(children)
    ? cloneElement(children, {
        id: childId,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })
    : children;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={childId} className="font-body text-[13px] font-medium text-ink">
        {label}
      </label>
      {child}
      {error ? (
        <p id={errorId} className="font-body text-[13px] text-bad">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="font-body text-[13px] text-grey">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
}

export function Checkbox({ label, id, className, ...rest }: CheckboxProps) {
  const reactId = useId();
  const inputId = id ?? reactId;
  return (
    <label htmlFor={inputId} className={cn("inline-flex items-center gap-2 font-body text-[14px] text-ink", className)}>
      <input id={inputId} type="checkbox" className="border border-ink" {...rest} />
      {label}
    </label>
  );
}

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label: string;
  options: SelectOption[];
}

export function Select({ label, options, id, className, ...rest }: SelectProps) {
  const reactId = useId();
  const selectId = id ?? reactId;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="font-body text-[13px] font-medium text-ink">
        {label}
      </label>
      <select id={selectId} className={cn("border border-line rounded-tile bg-white text-ink font-body", className)} {...rest}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
