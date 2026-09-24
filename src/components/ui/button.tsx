import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft hover:shadow-card",
        // Sits on the hero gradient, which is dark in BOTH themes, so it needs a
        // foreground token that stays white instead of flipping with the theme.
        premium:
          "gradient-hero text-hero-foreground border border-transparent shadow-glow hover:shadow-elegant hover:brightness-110",
        gold: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-soft",
        success: "bg-success text-success-foreground hover:bg-success/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // Not transparent: outline buttons appear on hero and header surfaces, so
        // they carry a real card background to stay legible in both themes.
        outline:
          "border border-input bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground",
        glass:
          "border border-border/60 bg-card/70 text-card-foreground backdrop-blur-md hover:bg-card/90",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 rounded-lg px-6",
        xl: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants }
