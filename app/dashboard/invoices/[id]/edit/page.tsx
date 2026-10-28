import { InvoiceCreationWorkspace } from "@/components/invoice/invoice-creation-workspace";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoiceCreationWorkspace invoiceId={id} />;
}
