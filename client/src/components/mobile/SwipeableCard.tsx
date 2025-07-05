import React from "react"
import useSwipeGesture from "@/hooks/useSwipeGesture"

interface SwipeableCardProps {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  children: React.ReactNode
}

/**
 * Basic swipeable wrapper that triggers callbacks on swipe left/right.
 */
const SwipeableCard: React.FC<SwipeableCardProps> = ({
  onSwipeLeft,
  onSwipeRight,
  children,
}) => {
  const handlers = useSwipeGesture({ onSwipeLeft, onSwipeRight })

  return (
    <div
      onTouchStart={handlers.onTouchStart}
      onTouchMove={handlers.onTouchMove}
      onTouchEnd={handlers.onTouchEnd}
      className="select-none"
    >
      {children}
    </div>
  )
}

export default SwipeableCard
