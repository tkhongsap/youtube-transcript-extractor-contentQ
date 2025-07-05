import { useEffect, useState } from "react"

/**
 * Detects on-screen keyboard height on mobile devices to adjust layout.
 */
export default function useVirtualKeyboard() {
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    const handleResize = () => {
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.clientHeight
      const heightDiff = documentHeight - windowHeight
      setKeyboardHeight(heightDiff > 150 ? heightDiff : 0)
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return keyboardHeight
}
