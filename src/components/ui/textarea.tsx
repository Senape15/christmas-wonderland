import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border border-cream-300/30 bg-pine-900/40 px-3 py-2 text-sm text-cream-50 placeholder:text-cream-300/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:border-gold/50 disabled:cursor-not-allowed disabled:opacity-50 backdrop-blur-sm transition-colors",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export { Textarea };
