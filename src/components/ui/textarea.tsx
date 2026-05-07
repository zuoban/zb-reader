import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/40 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-xl border border-[color:var(--glass-border)] bg-[color-mix(in_oklab,var(--glass-strong)_68%,transparent)] px-3 py-2 text-base shadow-[0_1px_0_var(--glass-highlight)_inset,0_10px_24px_-22px_color-mix(in_oklab,var(--foreground)_34%,transparent)] backdrop-blur-xl transition-[border-color,box-shadow,background-color] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
