import {
  forwardRef,
  useState,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
} from "react";
import { Search, X, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const baseFieldClasses =
  "flex w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-card";

/* ==========================================================================
   Input
   ========================================================================== */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="relative flex w-full items-center">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 flex items-center text-muted-foreground">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            baseFieldClasses,
            "h-10",
            leftIcon && "pl-9",
            rightIcon && "pr-9",
            error && "border-destructive focus:border-destructive focus:ring-destructive/20",
            className,
          )}
          {...props}
        />
        {rightIcon && (
          <span className="pointer-events-none absolute right-3 flex items-center text-muted-foreground">
            {rightIcon}
          </span>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

/* ==========================================================================
   SearchInput
   ========================================================================== */

export interface SearchInputProps extends Omit<InputProps, "leftIcon" | "rightIcon"> {
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onClear, onChange, ...props }, ref) => {
    const hasValue = Boolean(value);

    return (
      <div className="relative flex w-full items-center">
        <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
        <input
          ref={ref}
          type="search"
          value={value}
          onChange={onChange}
          className={cn(baseFieldClasses, "h-10 pl-9 pr-9", className)}
          {...props}
        />
        {hasValue && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2.5 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    );
  },
);
SearchInput.displayName = "SearchInput";

/* ==========================================================================
   Textarea
   ========================================================================== */

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          baseFieldClasses,
          "min-h-24 py-2.5",
          error && "border-destructive focus:border-destructive focus:ring-destructive/20",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

/* ==========================================================================
   Select
   ========================================================================== */

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, error, ...props }, ref) => {
    return (
      <div className="relative flex w-full items-center">
        <select
          ref={ref}
          className={cn(
            baseFieldClasses,
            "h-10 appearance-none pr-9 bg-card",
            error && "border-destructive focus:border-destructive focus:ring-destructive/20",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 size-4 text-muted-foreground" />
      </div>
    );
  },
);
Select.displayName = "Select";

/* ==========================================================================
   Label
   ========================================================================== */

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn("block text-xs font-semibold text-foreground/90 uppercase tracking-[0.06em]", className)}
        {...props}
      >
        {children}
        {required && <span className="ml-1 text-destructive font-bold">*</span>}
      </label>
    );
  },
);
Label.displayName = "Label";

/* ==========================================================================
   Checkbox
   ========================================================================== */

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
  description?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, checked, id, onChange, ...props }, ref) => {
    return (
      <label className="flex items-start gap-2.5 cursor-pointer select-none">
        <div className="relative flex items-center pt-0.5">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            checked={checked}
            onChange={onChange}
            className="peer sr-only"
            {...props}
          />
          <div className="size-4 rounded border border-input bg-card transition-colors peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">
            <Check className="size-3 text-accent-foreground stroke-[3] opacity-0 peer-checked:opacity-100 transition-opacity" />
          </div>
        </div>
        {(label || description) && (
          <div className="text-sm">
            {label && <p className="font-medium text-foreground leading-snug">{label}</p>}
            {description && (
              <p className="text-xs text-muted-foreground leading-normal mt-0.5">{description}</p>
            )}
          </div>
        )}
      </label>
    );
  },
);
Checkbox.displayName = "Checkbox";

/* ==========================================================================
   Switch (Toggle)
   ========================================================================== */

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  className,
  id,
}: SwitchProps) {
  return (
    <label
      className={cn(
        "inline-flex items-center gap-3 cursor-pointer select-none",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          checked ? "bg-accent" : "bg-muted-foreground/30",
        )}
      >
        <span
          className={cn(
            "pointer-events-none block size-3.5 rounded-full bg-white shadow-xs transition-transform",
            checked ? "translate-x-4.5" : "translate-x-0.5",
          )}
        />
      </button>
      {(label || description) && (
        <div className="text-sm">
          {label && <p className="font-medium text-foreground leading-snug">{label}</p>}
          {description && (
            <p className="text-xs text-muted-foreground leading-normal">{description}</p>
          )}
        </div>
      )}
    </label>
  );
}

/* ==========================================================================
   FormField (Wrapper)
   ========================================================================== */

export interface FormFieldProps {
  label?: ReactNode;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({
  label,
  required,
  error,
  helperText,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <Label required={required}>{label}</Label>}
      {children}
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
      {!error && helperText && (
        <p className="text-xs text-muted-foreground leading-relaxed">{helperText}</p>
      )}
    </div>
  );
}
