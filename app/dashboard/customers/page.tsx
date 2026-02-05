import { DashHeader } from "@/components/dashboard/dash-header";
import { Button } from "@/components/ui/button";
import { InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { InputGroup } from "@/components/ui/input-group";
import { DownloadIcon, SearchIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import React from "react";

export default function CustomersPage() {
  return <React.Fragment>
    <DashHeader title="Clientes">
      <Button size="sm"><HugeiconsIcon icon={DownloadIcon} strokeWidth={2} />Crear informe</Button>
    </DashHeader>
    <div className='space-y-6 p-6'>
      <div className='flex items-center justify-between gap-2'>
        <InputGroup className='w-96'>
          <InputGroupAddon>
            <HugeiconsIcon icon={SearchIcon} strokeWidth={2} />
          </InputGroupAddon>
          <InputGroupInput placeholder="Buscar clientes..." />
        </InputGroup>
      </div>

    </div>
  </React.Fragment>;
}