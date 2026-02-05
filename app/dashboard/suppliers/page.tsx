import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { HugeiconsIcon } from "@hugeicons/react";
import { SearchIcon } from "@hugeicons/core-free-icons";

export default function Page() {
  return (
    <div className='space-y-6 p-6 container mx-auto'>
      <div className='flex items-center justify-between gap-2'>
        <InputGroup className='w-96'>
          <InputGroupAddon>
            <HugeiconsIcon icon={SearchIcon} strokeWidth={2} />
          </InputGroupAddon>
          <InputGroupInput placeholder="Buscar proveedor..."/>
        </InputGroup>
      </div>
    </div>
  )
}