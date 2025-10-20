import React from "react";
import { notFound } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Phone,
  CheckCircle,
  Package,
  Calendar,
  MapPin,
  User,
  Info,
  Clock,
  Tag,
  ClipboardList,
  DollarSignIcon,
  Warehouse,
  Ruler,
  FileText,
} from "lucide-react";
import { format } from "date-fns";

interface SearchDetailsPageProps {
  params: {
    type: "line" | "task" | "invoice" | "inventory";
    id: string;
  };
}

export default async function SearchDetailsPage({
  params,
}: SearchDetailsPageProps) {
  const { type, id } = params;
  const supabase = getSupabaseClient();

  let data: any = null;
  let title = "";
  let subtitle = "";
  let details: {
    label: string;
    value: React.ReactNode;
    icon?: React.ReactNode;
  }[] = [];
  let badgeColor = "";

  try {
    switch (type) {
      case "line": {
        const { data: line, error } = await supabase
          .from("line_details")
          .select("*")
          .eq("id", id)
          .single();
        if (error || !line) notFound();
        data = line;
        const telephone = line.telephone_no
          ? String(line.telephone_no)
          : "Unknown";
        const customerName = line.customer_name
          ? String(line.customer_name)
          : line.name
          ? String(line.name)
          : "Unknown customer";
        const address = line.address ? String(line.address) : "N/A";
        const dp = line.dp ? String(line.dp) : "N/A";
        const lengthValue = line.length != null ? Number(line.length) : null;
        const installedDate = line.date ? new Date(String(line.date)) : null;
        const createdAt = line.created_at
          ? new Date(String(line.created_at))
          : null;

        title = `Line: ${telephone}`;
        subtitle = customerName;
        badgeColor = "bg-blue-100 text-blue-800";
        details = [
          {
            label: "Customer Name",
            value: customerName,
            icon: <User className='h-4 w-4' />,
          },
          {
            label: "Telephone No",
            value: telephone,
            icon: <Phone className='h-4 w-4' />,
          },
          {
            label: "Address",
            value: address,
            icon: <MapPin className='h-4 w-4' />,
          },
          {
            label: "DP",
            value: dp,
            icon: <Tag className='h-4 w-4' />,
          },
          {
            label: "Length (m)",
            value:
              lengthValue != null && Number.isFinite(lengthValue)
                ? lengthValue
                : "N/A",
            icon: <Ruler className='h-4 w-4' />,
          },
          {
            label: "Status",
            value: (
              <Badge
                variant='secondary'
                className={
                  line.completed
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }
              >
                {line.completed ? "Completed" : "Pending"}
              </Badge>
            ),
            icon: <Info className='h-4 w-4' />,
          },
          {
            label: "Date Installed",
            value: installedDate ? format(installedDate, "PPP") : "N/A",
            icon: <Calendar className='h-4 w-4' />,
          },
          {
            label: "Created At",
            value: createdAt ? format(createdAt, "PPP p") : "N/A",
            icon: <Clock className='h-4 w-4' />,
          },
        ];
        break;
      }
      case "task": {
        const { data: task, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("id", id)
          .single();
        if (error || !task) notFound();
        data = task;
        const customerName = task.customer_name
          ? String(task.customer_name)
          : "Unknown customer";
        const telephone = task.telephone_no ? String(task.telephone_no) : "N/A";
        const contactNo = task.contact_no ? String(task.contact_no) : "N/A";
        const address = task.address ? String(task.address) : "N/A";
        const dp = task.dp ? String(task.dp) : "N/A";
        const status = task.status ? String(task.status) : "pending";
        const connectionType = task.connection_type_new
          ? String(task.connection_type_new)
          : "N/A";
        const connectionServices =
          Array.isArray(task.connection_services) &&
          task.connection_services.length > 0
            ? task.connection_services.join(", ")
            : "None";
        const taskDateValue = task.task_date
          ? new Date(String(task.task_date))
          : null;
        const createdAt = task.created_at
          ? new Date(String(task.created_at))
          : null;
        const notes = task.notes ? String(task.notes) : "No notes";

        title = `Task: ${customerName}`;
        subtitle =
          [task.telephone_no ? telephone : null, task.address ? address : null]
            .filter(Boolean)
            .join(" • ") || "No contact information";
        badgeColor = "bg-green-100 text-green-800";
        details = [
          {
            label: "Customer Name",
            value: customerName,
            icon: <User className='h-4 w-4' />,
          },
          {
            label: "Telephone No",
            value: telephone,
            icon: <Phone className='h-4 w-4' />,
          },
          {
            label: "Contact No",
            value: contactNo,
            icon: <Phone className='h-4 w-4' />,
          },
          {
            label: "Address",
            value: address,
            icon: <MapPin className='h-4 w-4' />,
          },
          { label: "DP", value: dp, icon: <Tag className='h-4 w-4' /> },
          {
            label: "Connection Type",
            value: connectionType,
            icon: <CheckCircle className='h-4 w-4' />,
          },
          {
            label: "Connection Services",
            value: connectionServices,
            icon: <ClipboardList className='h-4 w-4' />,
          },
          {
            label: "Status",
            value: <Badge variant='secondary'>{status}</Badge>,
            icon: <Info className='h-4 w-4' />,
          },
          {
            label: "Task Date",
            value: taskDateValue ? format(taskDateValue, "PPP") : "N/A",
            icon: <Calendar className='h-4 w-4' />,
          },
          {
            label: "Created At",
            value: createdAt ? format(createdAt, "PPP p") : "N/A",
            icon: <Clock className='h-4 w-4' />,
          },
          {
            label: "Notes",
            value: notes,
            icon: <ClipboardList className='h-4 w-4' />,
          },
        ];
        break;
      }
      case "invoice": {
        const { data: invoice, error } = await supabase
          .from("generated_invoices")
          .select("*")
          .eq("id", id)
          .single();
        if (error || !invoice) notFound();
        data = invoice;
        const invoiceNumber = invoice.invoice_number
          ? String(invoice.invoice_number)
          : id;
        const customerName = invoice.customer_name
          ? String(invoice.customer_name)
          : "Unknown customer";
        const telephone = invoice.telephone_no
          ? String(invoice.telephone_no)
          : "N/A";
        const totalAmount =
          invoice.total_amount != null ? Number(invoice.total_amount) : null;
        const invoiceType = invoice.invoice_type
          ? String(invoice.invoice_type)
          : "N/A";
        const createdAt = invoice.created_at
          ? new Date(String(invoice.created_at))
          : null;

        title = `Invoice: ${invoiceNumber}`;
        subtitle = customerName;
        badgeColor = "bg-yellow-100 text-yellow-800";
        details = [
          {
            label: "Customer Name",
            value: customerName,
            icon: <User className='h-4 w-4' />,
          },
          {
            label: "Telephone No",
            value: telephone,
            icon: <Phone className='h-4 w-4' />,
          },
          {
            label: "Total Amount",
            value:
              totalAmount != null && Number.isFinite(totalAmount)
                ? `LKR ${totalAmount.toLocaleString()}`
                : "N/A",
            icon: <DollarSignIcon className='h-4 w-4' />,
          },
          {
            label: "Type",
            value: <Badge variant='secondary'>{invoiceType}</Badge>,
            icon: <Tag className='h-4 w-4' />,
          },
          {
            label: "Generated Date",
            value: createdAt ? format(createdAt, "PPP") : "N/A",
            icon: <Calendar className='h-4 w-4' />,
          },
        ];
        break;
      }
      case "inventory": {
        const { data: item, error } = await supabase
          .from("inventory_items")
          .select("*")
          .eq("id", id)
          .single();
        if (error || !item) notFound();
        data = item;
        const itemName = item.name ? String(item.name) : `Inventory ${id}`;
        const category = item.category
          ? String(item.category)
          : "Uncategorized";
        const description = item.description
          ? String(item.description)
          : "No description";
        const currentStock =
          item.current_stock != null ? Number(item.current_stock) : null;
        const reorderLevel =
          item.reorder_level != null ? Number(item.reorder_level) : null;
        const unit = item.unit ? String(item.unit) : "";
        const updatedAt = item.updated_at
          ? new Date(String(item.updated_at))
          : null;

        title = `Inventory: ${itemName}`;
        subtitle = category;
        badgeColor = "bg-purple-100 text-purple-800";
        details = [
          {
            label: "Description",
            value: description,
            icon: <Info className='h-4 w-4' />,
          },
          {
            label: "Category",
            value: category,
            icon: <Tag className='h-4 w-4' />,
          },
          {
            label: "Current Stock",
            value:
              currentStock != null && Number.isFinite(currentStock)
                ? `${currentStock}${unit ? ` ${unit}` : ""}`
                : "N/A",
            icon: <Warehouse className='h-4 w-4' />,
          },
          {
            label: "Reorder Level",
            value:
              reorderLevel != null && Number.isFinite(reorderLevel)
                ? `${reorderLevel}${unit ? ` ${unit}` : ""}`
                : "N/A",
            icon: <Warehouse className='h-4 w-4' />,
          },
          {
            label: "Last Updated",
            value: updatedAt ? format(updatedAt, "PPP p") : "N/A",
            icon: <Clock className='h-4 w-4' />,
          },
        ];
        break;
      }
      default:
        notFound();
    }
  } catch (error) {
    console.error("Error fetching search details:", error);
    notFound();
  }

  if (!data) {
    notFound();
  }

  return (
    <div className='container mx-auto p-6 space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-3'>
            {type === "line" && <Phone className='h-6 w-6' />}
            {type === "task" && <CheckCircle className='h-6 w-6' />}
            {type === "invoice" && <FileText className='h-6 w-6' />}
            {type === "inventory" && <Package className='h-6 w-6' />}
            {title}
            <Badge variant='secondary' className={`text-sm ${badgeColor}`}>
              {type}
            </Badge>
          </CardTitle>
          <p className='text-muted-foreground'>{subtitle}</p>
        </CardHeader>
        <CardContent className='grid gap-4'>
          {details.map((detail, index) => (
            <React.Fragment key={detail.label}>
              <div className='flex items-center gap-3'>
                {detail.icon}
                <div className='grid gap-1'>
                  <p className='text-sm font-medium leading-none'>
                    {detail.label}
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    {detail.value}
                  </p>
                </div>
              </div>
              {index < details.length - 1 && <Separator />}
            </React.Fragment>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
