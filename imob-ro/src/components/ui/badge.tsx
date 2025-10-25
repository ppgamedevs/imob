import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-[var(--r-sm)] border px-2.5 py-1 text-[var(--fs-xs)] font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors duration-[var(--duration-fast)]",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[rgb(var(--primary))] text-[rgb(var(--primary-contrast))] hover:opacity-90",
        neutral: "border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] text-[rgb(var(--text))]",
        success: "border-transparent bg-[rgb(var(--success))] text-white hover:opacity-90",
        warn: "border-transparent bg-[rgb(var(--warn))] text-white hover:opacity-90",
        danger: "border-transparent bg-[rgb(var(--danger))] text-white hover:opacity-90",
        sponsored: "border-transparent bg-[rgb(var(--ad-tint))] text-white hover:opacity-90",
        outline:
          "border-[rgb(var(--border))] bg-transparent text-[rgb(var(--text))] hover:bg-[rgb(var(--surface-2))]",
        // Backward compatibility aliases
        secondary: "border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] text-[rgb(var(--text))]",
        destructive: "border-transparent bg-[rgb(var(--danger))] text-white hover:opacity-90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
