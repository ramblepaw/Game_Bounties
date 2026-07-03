import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

const VARIANT_CLASSES: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-violet-600 text-white shadow-sm hover:bg-violet-700",
  secondary:
    "bg-violet-100 text-violet-800 hover:bg-violet-200 dark:bg-violet-900 dark:text-violet-100 dark:hover:bg-violet-800",
  ghost: "bg-transparent text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-950",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
};

const SIZE_CLASSES: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    />
  );
}
