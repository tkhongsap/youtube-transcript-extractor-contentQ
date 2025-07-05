import React from "react"
import { Button, ButtonProps } from "../ui/button"

/**
 * TouchFriendlyButton wraps the existing shadcn/ui Button with a larger touch target
 * for better usability on mobile devices.
 */
const TouchFriendlyButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={`touch-target ${className}`}
        {...props}
      />
    )
  }
)
TouchFriendlyButton.displayName = "TouchFriendlyButton"

export default TouchFriendlyButton
