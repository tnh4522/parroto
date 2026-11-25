import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError = false, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-xl border-2 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-400",
        hasError
          ? "border-red-500 focus-visible:ring-red-500"
          : "border-slate-200 dark:border-slate-700",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";
