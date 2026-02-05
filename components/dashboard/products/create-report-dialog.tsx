'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckListIcon, DownloadIcon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import { useSelectedBranch } from "@/src/hooks/use-selected-branch";
import { exportProductsToExcel } from "@/app/actions";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { InputGroupAddon, InputGroupButton } from "@/components/ui/input-group";

export function CreateReportDialog() {
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { selectedBranch } = useSelectedBranch();

  const handleGenerateReport = async () => {
    if (!selectedBranch) {
      toast.error('Por favor selecciona una sucursal');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await exportProductsToExcel(selectedBranch.id);

      if (result.success && result.base64) {
        // Convertir base64 a blob
        const byteCharacters = atob(result.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        // Descargar el archivo
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename || 'reporte-productos.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success(
          `Reporte generado correctamente. ${result.productCount || 0} productos exportados.`
        );
        setOpen(false);
      } else {
        toast.error(result.error || 'Error al generar el reporte');
      }
    } catch (error) {
      console.error('Error generando reporte:', error);
      toast.error('Error inesperado al generar el reporte');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant='outline'>
          Generar reporte
        </Button>
      } />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear reporte</DialogTitle>
          <DialogDescription>
            Genera un reporte en Excel con todos los productos de la sucursal actual.
            El formato es compatible con la plantilla de importación.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup className="no-scrollbar -mx-4 max-h-[50vh] overflow-y-auto px-4">
          <Field>
            <FieldLabel>Sucursal</FieldLabel>
            <div className="px-3 py-2 rounded-md border bg-muted/50">
              {selectedBranch ? (
                <span className="text-sm font-medium">{selectedBranch.name}</span>
              ) : (
                <span className="text-sm text-muted-foreground">No hay sucursal seleccionada</span>
              )}
            </div>
            <FieldDescription>
              El reporte incluirá todos los productos activos de esta sucursal.
            </FieldDescription>
          </Field>
          <Field>
            <Button
              type="button"
              onClick={handleGenerateReport}
              disabled={isGenerating || !selectedBranch}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Spinner className="size-4" />
                  Generando reporte...
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={DownloadIcon} className="size-4" strokeWidth={2} />
                  Generar y descargar reporte
                </>
              )}
            </Button>
          </Field>
        </FieldGroup>
      </DialogContent>
    </Dialog>
  );
}