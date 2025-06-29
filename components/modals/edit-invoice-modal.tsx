import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditInvoiceModalProps {
  open: boolean;
  invoice: any;
  onClose: () => void;
  onSuccess: () => void;
  supabase: any;
  addNotification: (n: any) => void;
}

export const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({
  open,
  invoice,
  onClose,
  onSuccess,
  supabase,
  addNotification,
}) => {
  if (!open || !invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Invoice</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const updatedInvoice = {
              invoice_number: formData.get("invoice_number") as string,
              warehouse: formData.get("warehouse") as string,
              date: formData.get("date") as string,
              issued_by: formData.get("issued_by") as string,
              drawn_by: formData.get("drawn_by") as string,
              total_items: Number(formData.get("total_items")),
              status: formData.get("status") as string,
            };
            const { error } = await supabase
              .from("inventory_invoices")
              .update(updatedInvoice)
              .eq("id", invoice.id);
            if (error) {
              addNotification({
                title: "Error",
                message: `Failed to update invoice: ${error.message}`,
                type: "error",
                category: "system",
              });
            } else {
              addNotification({
                title: "Invoice Updated",
                message: `Invoice ${updatedInvoice.invoice_number} updated successfully`,
                type: "success",
                category: "system",
              });
              onSuccess();
              onClose();
            }
          }}
        >
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="invoice_number">Invoice Number</Label>
              <Input
                name="invoice_number"
                id="invoice_number"
                defaultValue={invoice.invoice_number}
                required
              />
            </div>
            <div>
              <Label htmlFor="warehouse">Warehouse</Label>
              <Input
                name="warehouse"
                id="warehouse"
                defaultValue={invoice.warehouse}
                required
              />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                name="date"
                id="date"
                type="date"
                defaultValue={invoice.date?.slice(0, 10)}
                required
              />
            </div>
            <div>
              <Label htmlFor="issued_by">Issued By</Label>
              <Input
                name="issued_by"
                id="issued_by"
                defaultValue={invoice.issued_by}
                required
              />
            </div>
            <div>
              <Label htmlFor="drawn_by">Drawn By</Label>
              <Input
                name="drawn_by"
                id="drawn_by"
                defaultValue={invoice.drawn_by}
              />
            </div>
            <div>
              <Label htmlFor="total_items">Total Items</Label>
              <Input
                name="total_items"
                id="total_items"
                type="number"
                min="0"
                defaultValue={invoice.total_items}
                required
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={invoice.status} required>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
