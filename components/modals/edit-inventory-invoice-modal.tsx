import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditInventoryInvoiceModalProps {
  open: boolean;
  invoice: any;
  invoiceItems: any[];
  onClose: () => void;
  onSuccess: () => void;
  supabase: any;
  addNotification: (n: any) => void;
}

export const EditInventoryInvoiceModal: React.FC<
  EditInventoryInvoiceModalProps
> = ({
  open,
  invoice,
  invoiceItems = [],
  onClose,
  onSuccess,
  supabase,
  addNotification,
}) => {
  const [items, setItems] = React.useState<any[]>(invoiceItems);
  const [page, setPage] = React.useState(1);
  const itemsPerPage = 4;
  React.useEffect(() => {
    setItems(invoiceItems);
    setPage(1);
  }, [invoiceItems]);
  if (!open || !invoice) return null;

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const paginatedItems = items.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const handleItemChange = (idx: number, field: string, value: any) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Edit Inventory Invoice</DialogTitle>
        </DialogHeader>
        <form
          className='space-y-4'
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const updatedInvoice = {
              warehouse: formData.get("warehouse") as string,
              date: formData.get("date") as string,
              issued_by: formData.get("issued_by") as string,
              drawn_by: formData.get("drawn_by") as string,
              status: formData.get("status") as string,
            };
            const { error: invoiceError } = await supabase
              .from("inventory_invoices")
              .update(updatedInvoice)
              .eq("id", invoice.id);
            let itemError = null;
            for (const item of items) {
              const { error } = await supabase
                .from("inventory_invoice_items")
                .update({
                  description: item.description,
                  unit: item.unit,
                  quantity_requested: Number(item.quantity_requested),
                  quantity_issued: Number(item.quantity_issued),
                })
                .eq("id", item.id);
              if (error) itemError = error;
            }
            if (invoiceError || itemError) {
              addNotification({
                title: "Error",
                message: `Failed to update invoice: ${
                  invoiceError?.message || itemError?.message
                }`,
                type: "error",
                category: "system",
              });
            } else {
              addNotification({
                title: "Invoice Updated",
                message: `Invoice updated successfully`,
                type: "success",
                category: "system",
              });
              onSuccess();
              onClose();
            }
          }}
        >
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <Label htmlFor='invoice_number'>Invoice Number</Label>
              <Input
                name='invoice_number'
                id='invoice_number'
                value={invoice.invoice_number}
                disabled
                className='bg-muted cursor-not-allowed'
              />
            </div>
            <div>
              <Label htmlFor='warehouse'>Warehouse</Label>
              <Input
                name='warehouse'
                id='warehouse'
                defaultValue={invoice.warehouse}
                required
              />
            </div>
            <div>
              <Label htmlFor='date'>Date</Label>
              <Input
                name='date'
                id='date'
                type='date'
                defaultValue={invoice.date?.slice(0, 10)}
                required
              />
            </div>
            <div>
              <Label htmlFor='issued_by'>Issued By</Label>
              <Input
                name='issued_by'
                id='issued_by'
                defaultValue={invoice.issued_by}
                required
              />
            </div>
            <div>
              <Label htmlFor='drawn_by'>Drawn By</Label>
              <Input
                name='drawn_by'
                id='drawn_by'
                defaultValue={invoice.drawn_by}
              />
            </div>
            <div>
              <Label htmlFor='status'>Status</Label>
              <Select name='status' defaultValue={invoice.status} required>
                <SelectTrigger id='status'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='pending'>Pending</SelectItem>
                  <SelectItem value='completed'>Completed</SelectItem>
                  <SelectItem value='cancelled'>Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className='mt-6'>
            <h4 className='font-semibold mb-2'>Invoice Items</h4>
            <div className='space-y-4'>
              {paginatedItems.map((item, idx) => {
                const globalIdx = (page - 1) * itemsPerPage + idx;
                return (
                  <div
                    key={item.id}
                    className='grid grid-cols-1 md:grid-cols-4 gap-2 items-end border rounded p-2 bg-muted/30'
                  >
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange(
                            globalIdx,
                            "description",
                            e.target.value
                          )
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label>Qty Requested</Label>
                      <Input
                        type='number'
                        min='0'
                        value={item.quantity_requested}
                        onChange={(e) =>
                          handleItemChange(
                            globalIdx,
                            "quantity_requested",
                            e.target.value
                          )
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label>Qty Issued</Label>
                      <Input
                        type='number'
                        min='0'
                        value={item.quantity_issued}
                        onChange={(e) =>
                          handleItemChange(
                            globalIdx,
                            "quantity_issued",
                            e.target.value
                          )
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label>Unit</Label>
                      <Input
                        value={item.unit}
                        onChange={(e) =>
                          handleItemChange(globalIdx, "unit", e.target.value)
                        }
                        required
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className='flex justify-center items-center gap-2 mt-4'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className='text-sm'>
                  Page {page} of {totalPages}
                </span>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
          <DialogFooter className='mt-4'>
            <Button variant='outline' type='button' onClick={onClose}>
              Cancel
            </Button>
            <Button type='submit'>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
