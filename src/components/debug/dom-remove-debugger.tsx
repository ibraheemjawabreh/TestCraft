'use client'

import { useEffect } from 'react'

export function DomRemoveDebugger() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    const originalRemoveChild = Node.prototype.removeChild

    Node.prototype.removeChild = function <T extends Node>(
      this: Node,
      child: T
    ): T {
      if (child.parentNode !== this) {
        console.group('❌ Invalid removeChild detected')
        console.error('Parent React tried to remove from:', this)
        console.error('Child React tried to remove:', child)
        console.error('Child actual parent:', child.parentNode)
        console.trace('removeChild call stack')
        console.groupEnd()

        debugger
      }

      return originalRemoveChild.call(this, child) as T
    }

    return () => {
      Node.prototype.removeChild = originalRemoveChild
    }
  }, [])

  return null
}
