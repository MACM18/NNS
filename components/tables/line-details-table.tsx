"use client";

import { useState, useEffect } from "react";
import { Search, ChevronDown, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useNotification } from "@/contexts/notification-context";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";

interface LineDetail {
  id: string;
  name: string;
  address: string;
  telephone_no: string;
  dp: string;
  ont: string;
  date: string;
  created_at: string;
  // Add other fields as needed
}

interface LineDetailsTableProps {
  refreshTrigger: number;
  dateFilter: "today" | "week" | "month";
}

export function LineDetailsTable({
  refreshTrigger,
  dateFilter,
}: LineDetailsTableProps) {
  const [data, setData] = useState<LineDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { addNotification } = useNotification();

  useEffect(() => {
    fetchData();
  }, [refreshTrigger, dateFilter, sortField, sortDirection]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        dateFilter,
        sortField,
        sortDirection,
      });

      const response = await fetch(`/api/lines?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch line details");
      }

      const { data: lineDetails } = await response.json();
      setData(
        (lineDetails ?? []).map((item: any) => item as unknown as LineDetail)
      );
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: "Failed to fetch line details",
        type: "error",
        category: "system",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(
    (item) =>
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.telephone_no?.includes(searchTerm) ||
      item.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const ExpandedRowContent = ({ item }: { item: LineDetail }) => (
    <div className='p-4 bg-muted/50 rounded-lg space-y-4'>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div>
          <h4 className='font-medium mb-2'>Technical Details</h4>
          <div className='space-y-1 text-sm'>
            <p>
              <span className='font-medium'>ONT:</span> {item.ont || "N/A"}
            </p>
            <p>
              <span className='font-medium'>DP:</span> {item.dp || "N/A"}
            </p>
          </div>
        </div>
        <div>
          <h4 className='font-medium mb-2'>Contact Information</h4>
          <div className='space-y-1 text-sm'>
            <p>
              <span className='font-medium'>Phone:</span> {item.telephone_no}
            </p>
            <p>
              <span className='font-medium'>Address:</span> {item.address}
            </p>
          </div>
        </div>
        <div>
          <h4 className='font-medium mb-2'>Installation Date</h4>
          <div className='space-y-1 text-sm'>
            <p>{new Date(item.date).toLocaleDateString()}</p>
            <Badge variant='secondary'>
              {new Date(item.created_at).toLocaleDateString()}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <TableSkeleton columns={6} rows={8} />;
  }

  return (
    <div className='space-y-4'>
      {/* Search and Filter Controls */}
      <div className='flex flex-col gap-4 sm:flex-row'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search by name, phone, or address...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='pl-10'
          />
        </div>
        <Select value={sortField} onValueChange={setSortField}>
          <SelectTrigger className='w-full sm:w-[180px]'>
            <SelectValue placeholder='Sort by' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='created_at'>Date Created</SelectItem>
            <SelectItem value='name'>Customer Name</SelectItem>
            <SelectItem value='telephone_no'>Phone Number</SelectItem>
            <SelectItem value='date'>Installation Date</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant='outline'
          className='w-full sm:w-auto'
          onClick={() =>
            setSortDirection(sortDirection === "asc" ? "desc" : "asc")
          }
        >
          {sortDirection === "asc" ? "↑" : "↓"}
        </Button>
      </div>

      {/* Results Count */}
      <div className='text-sm text-muted-foreground'>
        Showing {filteredData.length} of {data.length} line details
      </div>

      {/* Table */}
      <div className='overflow-hidden rounded-lg border'>
        <div className='w-full overflow-x-auto'>
          <Table className='min-w-[720px]'>
            <TableHeader>
              <TableRow>
                <TableHead
                  className='cursor-pointer hover:bg-muted/50'
                  onClick={() => handleSort("name")}
                >
                  Customer Name
                  {sortField === "name" && (
                    <ChevronDown
                      className={`inline ml-1 h-4 w-4 ${
                        sortDirection === "asc" ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </TableHead>
                <TableHead
                  className='cursor-pointer hover:bg-muted/50'
                  onClick={() => handleSort("telephone_no")}
                >
                  Phone Number
                  {sortField === "telephone_no" && (
                    <ChevronDown
                      className={`inline ml-1 h-4 w-4 ${
                        sortDirection === "asc" ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </TableHead>
                <TableHead>Address</TableHead>
                <TableHead
                  className='cursor-pointer hover:bg-muted/50'
                  onClick={() => handleSort("date")}
                >
                  Installation Date
                  {sortField === "date" && (
                    <ChevronDown
                      className={`inline ml-1 h-4 w-4 ${
                        sortDirection === "asc" ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className='font-medium'>{item.name}</TableCell>
                  <TableCell>{item.telephone_no}</TableCell>
                  <TableCell className='max-w-xs truncate'>
                    {item.address}
                  </TableCell>
                  <TableCell>
                    {new Date(item.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant='ghost' size='sm'>
                          <Eye className='h-4 w-4' />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className='w-[min(22rem,100vw-4rem)] sm:w-96'>
                        <ExpandedRowContent item={item} />
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {filteredData.length === 0 && (
        <div className='text-center py-8'>
          <p className='text-muted-foreground'>
            No line details found matching your search.
          </p>
        </div>
      )}
    </div>
  );
}
