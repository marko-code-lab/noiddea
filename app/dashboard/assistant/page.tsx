import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupButton, InputGroupAddon, InputGroupTextarea, InputGroupText } from "@/components/ui/input-group";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { Separator } from "@/components/ui/separator";
import { ArrowUp01Icon } from "@hugeicons/core-free-icons";

export default function AssistantPage() {
  return <div className="p-6 flex items-center justify-center h-dvh">
    <InputGroup className="max-w-2xl">
      <InputGroupTextarea placeholder="Pregunta, obten información rapida o crea un reporte..." />
      <InputGroupAddon align="block-end">
        <InputGroupButton
          variant="outline"
          className="rounded-full"
          size="icon-xs"
        >
          <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
        </InputGroupButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <InputGroupButton variant="ghost">Auto</InputGroupButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            className="[--radius:0.95rem]"
          >
            <DropdownMenuItem>Auto</DropdownMenuItem>
            <DropdownMenuItem>Agent</DropdownMenuItem>
            <DropdownMenuItem>Manual</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <InputGroupText className="ml-auto">52% used</InputGroupText>
        <Separator orientation="vertical" className="!h-4" />
        <InputGroupButton
          variant="default"
          className="rounded-full"
          size="icon-xs"
          disabled
        >
          <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} />
          <span className="sr-only">Send</span>
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  </div>;
}