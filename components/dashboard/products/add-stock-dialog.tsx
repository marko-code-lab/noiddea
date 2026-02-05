import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function AddStockDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ingresar stock</DialogTitle>
        </DialogHeader>
        <div className="px-4 -mx-4">
          <FieldGroup>
            <Field>
              <FieldLabel>Producto</FieldLabel>
              <Input value="Producto" readOnly />
            </Field>
            <Field>
              <FieldLabel>Cantidad</FieldLabel>
              <Input placeholder="1" min='1' type="number" />
            </Field>
          </FieldGroup>
        </div>
        <DialogFooter>
          <DialogClose render={
            <Button variant="outline">
              Cancelar
            </Button>
          }>
          </DialogClose>
          <Button>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}