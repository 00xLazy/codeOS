import { useRef, useState, useCallback, useEffect } from 'react'

export function useResizablePanel(
  initial: number,
  min: number,
  max: number
) {
  const [width, setWidth] = useState(initial)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    startX.current = e.clientX
    startWidth.current = width
    e.preventDefault()
  }, [width])

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return
      const delta = e.clientX - startX.current
      setWidth(Math.max(min, Math.min(max, startWidth.current + delta)))
    }
    function onUp() {
      dragging.current = false
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [min, max])

  return { width, handleMouseDown }
}
