import { useRef, useCallback } from "react"

interface SwipeConfig {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  minSwipeDistance?: number
  maxSwipeTime?: number
}

interface TouchState {
  startX: number
  startY: number
  startTime: number
  ignoreSwipe: boolean
}

// Check if element or any parent has horizontal scroll
function isInsideHorizontalScroll(element: HTMLElement | null): boolean {
  while (element) {
    // Check for data attribute that marks horizontal scroll areas
    if (element.hasAttribute('data-swipe-ignore')) {
      return true
    }
    // Check if element has horizontal overflow
    const style = window.getComputedStyle(element)
    const overflowX = style.overflowX
    if ((overflowX === 'auto' || overflowX === 'scroll') && element.scrollWidth > element.clientWidth) {
      return true
    }
    element = element.parentElement
  }
  return false
}

export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  minSwipeDistance = 50,
  maxSwipeTime = 300,
}: SwipeConfig) {
  const touchState = useRef<TouchState | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    const target = e.target as HTMLElement

    // Check if touch started inside a horizontal scroll area
    const ignoreSwipe = isInsideHorizontalScroll(target)

    touchState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      ignoreSwipe,
    }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchState.current) return

    const { startX, startY, startTime, ignoreSwipe } = touchState.current

    // Reset state
    touchState.current = null

    // Don't trigger if swipe started in a horizontal scroll area
    if (ignoreSwipe) return

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - startX
    const deltaY = touch.clientY - startY
    const deltaTime = Date.now() - startTime

    // Check if swipe was fast enough
    if (deltaTime > maxSwipeTime) return

    // Check if horizontal swipe (not vertical scroll)
    if (Math.abs(deltaY) > Math.abs(deltaX)) return

    // Check minimum distance
    if (Math.abs(deltaX) < minSwipeDistance) return

    // Trigger callbacks
    if (deltaX > 0) {
      onSwipeRight?.()
    } else {
      onSwipeLeft?.()
    }
  }, [onSwipeLeft, onSwipeRight, minSwipeDistance, maxSwipeTime])

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  }
}
