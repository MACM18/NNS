import { supabaseServer } from "@/lib/supabase-server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileSpreadsheet, ExternalLink, Calendar } from "lucide-react";
import Link from "next/link";
import ConnectionActions from "./components/ConnectionActions";

interface SheetConnectionRow {
  id: string;
  month: number | string;
  year: number;
  sheet_url: string;
  sheet_name: string | null;
  sheet_tab: string | null;
  last_synced: string | null;
  status: string | null;
  record_count: number | null;
  created_at: string;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

async function fetchConnections(page = 1, pageSize = 10) {
  const supabase = supabaseServer;

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("google_sheet_connections")
    .select(
      `id, month, year, sheet_url, sheet_name, sheet_tab, last_synced, status, record_count, created_at`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching sheet connections:", error.message);
    return { rows: [] as SheetConnectionRow[], total: 0 };
  }

  return { rows: (data as SheetConnectionRow[]) || [], total: count ?? 0 };
}

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return "-";
  try {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return dateString;
  }
}

function getStatusBadge(status: string | null) {
  switch ((status || "").toLowerCase()) {
    case "active":
      return (
        <Badge variant='default' className='bg-green-500'>
          Active
        </Badge>
      );
    case "error":
      return <Badge variant='destructive'>Error</Badge>;
    case "syncing":
      return <Badge variant='secondary'>Syncing...</Badge>;
    default:
      return <Badge variant='outline'>{status ?? "Unknown"}</Badge>;
  }
}

export default async function GoogleSheetsPage({ searchParams }: any) {
  const currentPage = parseInt((searchParams?.page as string) || "1", 10) || 1;
  const pageSize = 10;

  const { rows, total } = await fetchConnections(currentPage, pageSize);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, total || rows.length);

  return (
    <div className='container mx-auto p-6'>
      {/* Header */}
      <div className='mb-6'>
        <div className='flex items-center gap-2 text-sm text-muted-foreground mb-2'>
          <Link
            href='/dashboard/integrations'
            className='hover:text-foreground'
          >
            Integrations
          </Link>
          <span>/</span>
          <span>Google Sheets</span>
        </div>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight flex items-center gap-3'>
              <FileSpreadsheet className='h-8 w-8 text-green-600' />
              Google Sheets Integration
            </h1>
            <p className='text-muted-foreground mt-2'>
              Connect Google Sheets to sync line installation data for each
              month
            </p>
          </div>

          <div>
            {/* Link to future client-side add connection UI (not implemented here) */}
            <Button asChild>
              <Link
                href='/dashboard/integrations/google-sheets/add'
                className='gap-2'
              >
                <span className='inline-flex items-center gap-2'>
                  Add Connection
                </span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Connections List */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Sheets</CardTitle>
          <CardDescription>
            Manage your Google Sheets connections and sync data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className='text-center py-12'>
              <FileSpreadsheet className='h-12 w-12 mx-auto text-muted-foreground mb-4' />
              <h3 className='text-lg font-semibold mb-2'>No connections yet</h3>
              <p className='text-muted-foreground mb-4'>
                Get started by connecting your first Google Sheet
              </p>
              <Button asChild>
                <Link
                  href='/dashboard/integrations/google-sheets/add'
                  className='gap-2'
                >
                  Add Connection
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Sheet Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Last Synced</TableHead>
                    <TableHead className='text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((connection) => {
                    const monthLabel =
                      typeof connection.month === "number"
                        ? MONTHS[connection.month - 1]
                        : String(connection.month);
                    return (
                      <TableRow key={connection.id}>
                        <TableCell className='font-medium'>
                          <div className='flex items-center gap-2'>
                            <Calendar className='h-4 w-4 text-muted-foreground' />
                            {monthLabel} {connection.year}
                          </div>
                        </TableCell>
                        <TableCell>
                          <a
                            href={connection.sheet_url}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='flex items-center gap-2 hover:underline text-blue-600'
                          >
                            {connection.sheet_name ?? connection.sheet_url}
                            <ExternalLink className='h-3 w-3' />
                          </a>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(connection.status)}
                        </TableCell>
                        <TableCell>{connection.record_count ?? 0}</TableCell>
                        <TableCell className='text-muted-foreground text-sm'>
                          {formatDate(connection.last_synced)}
                        </TableCell>
                        <TableCell className='text-right'>
                          <ConnectionActions connectionId={connection.id} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination (server-side via query param `?page=`) */}
              {totalPages > 1 && (
                <div className='flex items-center justify-between mt-4'>
                  <div className='text-sm text-muted-foreground'>
                    Showing {startIndex} to {endIndex} of {total} connections
                  </div>
                  <div className='flex gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={currentPage === 1}
                      asChild
                    >
                      <Link
                        href={`/dashboard/integrations/google-sheets?page=${
                          currentPage - 1
                        }`}
                      >
                        Previous
                      </Link>
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={currentPage === totalPages}
                      asChild
                    >
                      <Link
                        href={`/dashboard/integrations/google-sheets?page=${
                          currentPage + 1
                        }`}
                      >
                        Next
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
