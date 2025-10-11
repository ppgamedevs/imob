/**
 * Copilot: Create <IconInput> component:
 * - Props: icon (ReactNode), placeholder, value, onChange
 * - Styles: rounded-xl, pl-10, border
 * - Position the icon absolute left inside input
 */
import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface IconInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const IconInput = React.forwardRef<HTMLInputElement, IconInputProps>(
  ({ className, icon, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
        <Input ref={ref} className={cn(icon && "pl-10", "rounded-xl", className)} {...props} />
      </div>
    );
  },
);

IconInput.displayName = "IconInput";
