import { useState, useEffect } from "react"

/**
 * Hook to detect if the current viewport is mobile-sized
 * @param breakpoint - The width breakpoint in pixels (default: 640 for 'sm')
 */
export function useMobile(breakpoint: number = 640): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint)

    // Check on mount
    checkMobile()

    // Listen for resize
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [breakpoint])

  return isMobile
}

/**
 * Hook to detect touch device capability
 */
export function useTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    setIsTouch(
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0
    )
  }, [])

  return isTouch
}

/**
 * Hook that returns responsive chart dimensions
 */
export function useResponsiveChart() {
  const isMobile = useMobile()

  return {
    height: isMobile ? 200 : 280,
    mobileHeight: 200,
    desktopHeight: 280,
    showYAxis: !isMobile,
    tickCount: isMobile ? 4 : 8,
    fontSize: isMobile ? 10 : 12,
  }
}
