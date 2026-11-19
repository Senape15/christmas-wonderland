import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "christmas" | "ghost";
  size?: "default" | "sm" | "lg";
}

const variants: Record<string, string> = {
  default:
    "bg-christmas-red text-white hover:bg-christmas-red-dark shadow-[var(--shadow-glow-red)]",
  outline: "border border-gold/40 text-gold-light hover:bg-gold/10 hover:border-gold/60",
  christmas:
    "bg-gradient-to-br from-christmas-red to-christmas-red-dark text-white shadow-[var(--shadow-glow-red)] rounded-full hover:scale-105 active:scale-95",
  ghost: "text-cream-200 hover:bg-pine-700/40 hover:text-cream-50",
};

const sizes: Record<string, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3 text-sm",
  lg: "h-12 px-8 text-lg",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-pine-900 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button };
