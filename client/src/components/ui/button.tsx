import * as React from "react"
import { Slot } from "radix-ui"

function Button({
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean
  variant?: string
  size?: string
}) {
  const Comp = asChild ? Slot.Root : "button"
  return <Comp {...props} />
}

export { Button }
