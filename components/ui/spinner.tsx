import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon } from "@hugeicons/core-free-icons"

interface SpinnerProps extends React.ComponentProps<"svg"> {
  size?: number | string;
  strokeWidth?: number;
}

function Spinner({ className, size = 4, ...props }: SpinnerProps) {
  return (
    <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
