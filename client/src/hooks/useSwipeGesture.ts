import { useState } from "react"

type SwipeHandlers = {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  threshold?: number
}

/**
 * Simple swipe gesture hook for mobile interactions.
 */
export default function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
}: SwipeHandlers) {
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return
    const distance = touchStart - touchEnd
    if (distance > threshold && onSwipeLeft) onSwipeLeft()
    if (distance < -threshold && onSwipeRight) onSwipeRight()
  }

  return { onTouchStart, onTouchMove, onTouchEnd }
}
