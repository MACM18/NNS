"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  ChevronDown,
  Eye,
  Users,
  MapPin,
  Zap,
  Trash2,
  Edit2,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSupabaseClient } from "@/lib/supabase";
import { useNotification } from "@/contexts/notification-context";
import { useAuth } from "@/contexts/auth-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { EditTelephoneLineModal } from "@/components/modals/edit-telephone-line-modal";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";

interface LineDetail {
  id: string;
  name: string;
  address: string;
  telephone_no: string;
  dp: string;
  date: string;
  status?: string;
  task_id?: string;
  // Use actual database column names
  power_dp: number;
  power_inbox: number;
  cable_start: number;
  cable_middle: number;
  cable_end: number;
  total_cable: number;
  wastage: number;
  internal_wire: number;
  casing: number;
  conduit: number;
  cat5: number;
  c_tie: number;
  c_clip: number;
  tag_tie: number;
  flexible: number;
  pole: number;
  pole_67: number;
  top_bolt: number;
  f1: number;
  g1: number;
  // Material quantities - add defaults for missing columns
  c_hook?: number;
  l_hook?: number;
  retainers?: number;
  nut_bolt?: number;
  u_clip?: number;
  concrete_nail?: number;
  roll_plug?: number;
  screw_nail?: number;
  socket?: number;
  bend?: number;
  rj11?: number;
  rj12?: number;
  rj45?: number;
  fiber_rosette?: number;
  s_rosette?: number;
  fac?: number;
  // Assignees
  assignees?: Array<{
    id: string;
    full_name: string;
    role: string;
  }>;
  created_at: string;
  completed: boolean;
  drum_number?: string;
  ont_serial?: string;
  voice_test_no?: string;
  stb_serial?: string;
}

interface LineDetailsTableProps {
  selectedMonth: number;
  selectedYear: number;
  refreshTrigger: number;
  onAssigneeManage: (lineId: string) => void;
  onRefresh: () => void;
}

type TelephoneLineModalPayload = {
  id: string;
  line_number: string;
  customer_name: string;
  customer_address: string;
  installation_date: string;
  status: "active" | "inactive" | "suspended";
  monthly_fee: number;
  notes?: string;
  drum_id?: string;
  cable_used?: number;
};

export function LineDetailsTable({
  selectedMonth,
  selectedYear,
  refreshTrigger,
  onAssigneeManage,
  onRefresh,
}: LineDetailsTableProps) {
  const [data, setData] = useState<LineDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "completed" | "pending"
  >("all");
  const [sortField, setSortField] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completingLineId, setCompletingLineId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<LineDetail | null>(null);
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);

  const supabase = getSupabaseClient();
  const { addNotification } = useNotification();
  const { role } = useAuth();

  const toTelephoneLinePayload = useCallback(
    (line: LineDetail | null): TelephoneLineModalPayload | null => {
      if (!line) return null;
      return {
        id: line.id,
        line_number: line.telephone_no ?? "",
        customer_name: line.name ?? "",
        customer_address: line.address ?? "",
        installation_date: line.date ?? new Date().toISOString().split("T")[0],
        status: "active",
        monthly_fee: 0,
        drum_id: line.drum_number ?? undefined,
        cable_used: line.total_cable ?? 0,
      };
    },
    []
  );

  const modalLine = useMemo(
    () => toTelephoneLinePayload(selectedLine),
    [selectedLine, toTelephoneLinePayload]
  );

  useEffect(() => {
    fetchData();
  }, [
    selectedMonth,
    selectedYear,
    refreshTrigger,
    statusFilter,
    sortField,
    sortDirection,
  ]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get start and end dates for the selected month
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0);

      // Fetch line details with assignees (left join line_assignees and profiles)
      const { data: lines, error } = await supabase
        .from("line_details")
        .select(
          `*,
          line_assignees(user_id, profiles(id, full_name, role))
        `
        )
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0]);

      if (error) throw error;

      // Map assignees for each line
      const processedLines = (lines ?? []).map((line: any) => {
        // Extract assignees from joined data
        const assignees = (line.line_assignees || [])
          .map((a: any) => a.profiles)
          .filter(Boolean);
        let normalizedStatus = line.status;
        if (line.completed === true || line.status === "completed") {
          normalizedStatus = "completed";
        } else if (line.status === "in_progress") {
          normalizedStatus = "in_progress";
        } else if (!line.status || line.status === "pending") {
          normalizedStatus = "pending";
        }
        return {
          ...line,
          status: normalizedStatus,
          assignees,
          // default 0s for any nullable material columns
          total_cable: line.total_cable || 0,
          top_bolt: line.top_bolt || 0,
          internal_wire: line.internal_wire || 0,
          casing: line.casing || 0,
          c_tie: line.c_tie || 0,
          c_clip: line.c_clip || 0,
          conduit: line.conduit || 0,
          tag_tie: line.tag_tie || 0,
          flexible: line.flexible || 0,
          cat5: line.cat5 || 0,
          pole_67: line.pole_67 || 0,
          pole: line.pole || 0,
          c_hook: line.c_hook ?? 0,
          l_hook: line.l_hook || 0,
          retainers: line.retainers || 0,
          nut_bolt: line.nut_bolt || 0,
          u_clip: line.u_clip || 0,
          concrete_nail: line.concrete_nail || 0,
          roll_plug: line.roll_plug || 0,
          screw_nail: line.screw_nail || 0,
          socket: line.socket || 0,
          bend: line.bend || 0,
          rj11: line.rj11 || 0,
          rj12: line.rj12 || 0,
          rj45: line.rj45 || 0,
          fiber_rosette: line.fiber_rosette || 0,
          s_rosette: line.s_rosette || 0,
          fac: line.fac || 0,
          drum_number: line.drum_number || "",
          ont_serial: line.ont_serial || "",
          voice_test_no: line.voice_test_no || "",
          stb_serial: line.stb_serial || "",
        };
      }) as LineDetail[];

      setData(processedLines);
    } catch (error: any) {
      console.error("Fetch error:", error);
      addNotification({
        title: "Error",
        message: `Failed to fetch line details: ${error.message}`,
        type: "error",
        category: "system",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data
    .filter(
      (item) =>
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.telephone_no?.includes(searchTerm) ||
        item.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.dp?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((item) =>
      statusFilter === "all" ? true : item.status === statusFilter
    );

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusBadge = (line: LineDetail) =>
    line.status === "completed" ? (
      <Badge className='bg-green-100 text-green-800 border-green-200'>
        Completed
      </Badge>
    ) : (
      <Badge className='bg-orange-100 text-orange-800 border-orange-200'>
        Pending
      </Badge>
    );

  const isPowerHigh = (value: number) => value >= 30;

  const MaterialUsageCard = ({ line }: { line: LineDetail }) => (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='text-sm'>Material Usage</CardTitle>
      </CardHeader>
      <CardContent className='space-y-2'>
        <div className='grid grid-cols-4 gap-2 text-xs'>
          {[
            { label: "C Hook", value: line.c_hook },
            { label: "L Hook", value: line.l_hook },
            { label: "Retainers", value: line.retainers },
            { label: "Nut & Bolt", value: line.nut_bolt },
            { label: "U Clip", value: line.u_clip },
            { label: "Concrete Nail", value: line.concrete_nail },
            { label: "Roll Plug", value: line.roll_plug },
            { label: "Screw Nail", value: line.screw_nail },
            { label: "Socket", value: line.socket },
            { label: "Bend", value: line.bend },
            { label: "RJ11", value: line.rj11 },
            { label: "RJ12", value: line.rj12 },
            { label: "RJ45", value: line.rj45 },
            { label: "Fiber Rosette", value: line.fiber_rosette },
            { label: "S Rosette", value: line.s_rosette },
            { label: "FAC", value: line.fac },
            { label: "Drop Wire Cable", value: line.total_cable },
            { label: "Top Bolt", value: line.top_bolt },
            { label: "Internal Wire", value: line.internal_wire },
            { label: "Casing", value: line.casing },
            { label: "C Tie", value: line.c_tie },
            { label: "C Clip", value: line.c_clip },
            { label: "Conduit", value: line.conduit },
            { label: "Tag Tie", value: line.tag_tie },
            { label: "Flexible", value: line.flexible },
            { label: "Cat5", value: line.cat5 },
            { label: "Pole 67", value: line.pole_67 },
            { label: "Pole", value: line.pole },
          ]
            .filter((item) => (item.value ?? 0) > 0)
            .map((item) => (
              <div key={item.label} className='flex justify-between'>
                <span className='text-muted-foreground'>{item.label}:</span>
                <span className='font-medium'>{item.value}</span>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );

  const ExpandedRowContent = ({ line }: { line: LineDetail }) => (
    <div className='p-6 bg-muted/30 rounded-lg space-y-6'>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {/* Technical Details */}
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <Zap className='h-4 w-4' />
              Technical Details
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-2'>
            <div className='flex justify-between'>
              <span className='text-sm text-muted-foreground'>DP:</span>
              <Badge variant='outline'>{line.dp}</Badge>
            </div>
            <div className='flex justify-between'>
              <span className='text-sm text-muted-foreground'>Power (DP):</span>
              <span
                className={`font-medium ${
                  isPowerHigh(line.power_dp) ? "text-red-600" : "text-green-600"
                }`}
              >
                {line.power_dp?.toFixed(2) || "N/A"}
                {isPowerHigh(line.power_dp) && " ⚠️"}
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-sm text-muted-foreground'>
                Power (Inbox):
              </span>
              <span
                className={`font-medium ${
                  isPowerHigh(line.power_inbox)
                    ? "text-red-600"
                    : "text-green-600"
                }`}
              >
                {line.power_inbox?.toFixed(2) || "N/A"}
                {isPowerHigh(line.power_inbox) && " ⚠️"}
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-sm text-muted-foreground'>Status:</span>
              {getStatusBadge(line)}
            </div>
            <div className='flex justify-between'>
              <span className='text-sm text-muted-foreground'>ONT Serial:</span>
              <span className='font-medium'>{line.ont_serial || "N/A"}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-sm text-muted-foreground'>
                Voice Test No:
              </span>
              <span className='font-medium'>{line.voice_test_no || "N/A"}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-sm text-muted-foreground'>STB Serial:</span>
              <span className='font-medium'>{line.stb_serial || "N/A"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Cable Measurements */}
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <MapPin className='h-4 w-4' />
              Cable Measurements
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-2'>
            <div className='grid grid-cols-3 gap-2 text-xs'>
              <div>
                <span className='text-muted-foreground'>Start:</span>
                <p className='font-medium'>{line.cable_start?.toFixed(2)}m</p>
              </div>
              <div>
                <span className='text-muted-foreground'>Middle:</span>
                <p className='font-medium'>{line.cable_middle?.toFixed(2)}m</p>
              </div>
              <div>
                <span className='text-muted-foreground'>End:</span>
                <p className='font-medium'>{line.cable_end?.toFixed(2)}m</p>
              </div>
            </div>
            <div className='border-t pt-2 space-y-1'>
              <div className='flex justify-between'>
                <span className='text-sm text-muted-foreground'>F1:</span>
                <span className='font-medium text-blue-600'>
                  {line.f1?.toFixed(2)}m
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-sm text-muted-foreground'>G1:</span>
                <span className='font-medium text-blue-600'>
                  {line.g1?.toFixed(2)}m
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-sm text-muted-foreground'>Total:</span>
                <span className='font-medium text-green-600'>
                  {line.total_cable?.toFixed(2)}m
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-sm text-muted-foreground'>Wastage:</span>
                <span className='font-medium text-orange-600'>
                  {line.wastage?.toFixed(2) || "0.00"}m
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-sm text-muted-foreground'>Drum No:</span>
                <span className='font-medium'>{line.drum_number || "N/A"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignees */}
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <Users className='h-4 w-4' />
              Assigned Team
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-2'>
            {line.assignees && line.assignees.length > 0 ? (
              <div className='space-y-2'>
                {line.assignees.map((assignee) => (
                  <div key={assignee.id} className='flex items-center gap-2'>
                    <Avatar className='h-6 w-6'>
                      <AvatarFallback className='text-xs'>
                        {assignee.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium truncate'>
                        {assignee.full_name}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        {assignee.role}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className='text-sm text-muted-foreground'>No assignees</p>
            )}
            <Button
              size='sm'
              variant='outline'
              onClick={() => onAssigneeManage(line.id)}
              className='w-full mt-2'
            >
              <Users className='h-3 w-3 mr-1' />
              Manage Team
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Material Usage - Collapsible */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant='outline' className='w-full'>
            <ChevronDown className='h-4 w-4 mr-2' />
            View Material Usage Details
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className='mt-4'>
          <MaterialUsageCard line={line} />
        </CollapsibleContent>
      </Collapsible>

      <div className='text-xs text-muted-foreground'>
        Installation Date: {new Date(line.date).toLocaleDateString()} | Added:{" "}
        {new Date(line.created_at).toLocaleDateString()}
      </div>
    </div>
  );

  const handleCompleteLine = async (lineId: string) => {
    setCompletingLineId(lineId);
    setCompleteDialogOpen(true);
  };

  const confirmCompleteLine = async () => {
    if (!completingLineId) return;
    setCompleteLoading(true);
    try {
      const { error } = await supabase
        .from("line_details")
        .update({
          completed_date: new Date().toISOString(),
          status: "completed",
        })
        .eq("id", completingLineId);
      if (error) throw error;
      addNotification({
        title: "Success",
        message: "Line marked as completed.",
        type: "success",
        category: "system",
      });
      setCompleteDialogOpen(false);
      setCompletingLineId(null);
      onRefresh();
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: error.message,
        type: "error",
        category: "system",
      });
    } finally {
      setCompleteLoading(false);
    }
  };

  // Delete logic
  const handleDeleteLine = async (line: LineDetail) => {
    setSelectedLine(line);
    setDeleteDialogOpen(true);
  };
  const confirmDeleteLine = async () => {
    if (!selectedLine) return;
    setDeleteLoading(true);
    try {
      // Remove dependent drum usage records that reference this line first
      const { error: drumError } = await supabase
        .from("drum_usage")
        .delete()
        .eq("line_details_id", selectedLine.id);
      if (drumError) throw drumError;

      // Remove any line assignees that reference this line
      const { error: assigneeError } = await supabase
        .from("line_assignees")
        .delete()
        .eq("line_id", selectedLine.id);
      if (assigneeError) throw assigneeError;

      // Null out any tasks that reference this line to avoid FK violations
      const { error: taskUpdateError } = await supabase
        .from("tasks")
        .update({ line_details_id: null })
        .eq("line_details_id", selectedLine.id);
      if (taskUpdateError) throw taskUpdateError;

      const { error } = await supabase
        .from("line_details")
        .delete()
        .eq("id", selectedLine.id);
      if (error) throw error;
      addNotification({
        title: "Deleted",
        message: "Line deleted successfully.",
        type: "success",
        category: "system",
      });
      setDeleteDialogOpen(false);
      setSelectedLine(null);
      onRefresh();
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: error.message,
        type: "error",
        category: "system",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Edit logic
  const handleEditLine = (line: LineDetail) => {
    setSelectedLine(line);
    setEditModalOpen(true);
  };

  if (loading) {
    return <TableSkeleton columns={10} rows={8} />;
  }

  return (
    <div className='space-y-4'>
      {/* Search and Filter Controls */}
      <div className='flex flex-col gap-4 sm:flex-row'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search by name, phone, address, or DP...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='pl-10'
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            setStatusFilter(v as "all" | "completed" | "pending")
          }
        >
          <SelectTrigger className='w-full sm:w-[150px]'>
            <SelectValue placeholder='Status' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Status</SelectItem>
            <SelectItem value='pending'>Pending</SelectItem>
            <SelectItem value='completed'>Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortField} onValueChange={setSortField}>
          <SelectTrigger className='w-full sm:w-[180px]'>
            <SelectValue placeholder='Sort by' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='date'>Installation Date</SelectItem>
            <SelectItem value='name'>Customer Name</SelectItem>
            <SelectItem value='telephone_no'>Phone Number</SelectItem>
            <SelectItem value='dp'>DP</SelectItem>
            <SelectItem value='total_cable'>Cable Distance</SelectItem>
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
        Showing {filteredData.length} of {data.length} lines
      </div>

      {/* Table */}
      <div className='border rounded-lg'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className='cursor-pointer hover:bg-muted/50'
                onClick={() => handleSort("telephone_no")}
              >
                Line No.
                {sortField === "telephone_no" && (
                  <ChevronDown
                    className={`inline ml-1 h-4 w-4 ${
                      sortDirection === "asc" ? "rotate-180" : ""
                    }`}
                  />
                )}
              </TableHead>
              <TableHead
                className='cursor-pointer hover:bg-muted/50'
                onClick={() => handleSort("name")}
              >
                Customer
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
                onClick={() => handleSort("dp")}
              >
                DP
                {sortField === "dp" && (
                  <ChevronDown
                    className={`inline ml-1 h-4 w-4 ${
                      sortDirection === "asc" ? "rotate-180" : ""
                    }`}
                  />
                )}
              </TableHead>
              <TableHead
                className='cursor-pointer hover:bg-muted/50'
                onClick={() => handleSort("total_cable")}
              >
                Distance
                {sortField === "total_cable" && (
                  <ChevronDown
                    className={`inline ml-1 h-4 w-4 ${
                      sortDirection === "asc" ? "rotate-180" : ""
                    }`}
                  />
                )}
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Asignees</TableHead>
              <TableHead
                className='cursor-pointer hover:bg-muted/50'
                onClick={() => handleSort("date")}
              >
                Date
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
            {filteredData.map((line) => (
              <React.Fragment key={line.id}>
                <TableRow>
                  <TableCell className='font-medium'>
                    {line.telephone_no}
                  </TableCell>
                  <TableCell>{line.name}</TableCell>
                  <TableCell>
                    <Badge variant='outline' className='font-mono text-xs'>
                      {line.dp}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className='font-medium'>
                      {line.total_cable?.toFixed(2) || "0.00"}m
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className='relative'>
                      <Select
                        value={
                          line.status === "in_progress"
                            ? "in_progress"
                            : line.status || "pending"
                        }
                        aria-label='Change status'
                        disabled={statusLoadingId === line.id}
                        onValueChange={async (newStatus) => {
                          setStatusLoadingId(line.id);
                          setData((prev) =>
                            prev.map((l) =>
                              l.id === line.id ? { ...l, status: newStatus } : l
                            )
                          );
                          const { error } = await supabase
                            .from("line_details")
                            .update({ status: newStatus })
                            .eq("id", line.id);
                          if (error) {
                            addNotification({
                              title: "Error",
                              message: error.message,
                              type: "error",
                              category: "system",
                            });
                            setData((prev) =>
                              prev.map((l) =>
                                l.id === line.id
                                  ? { ...l, status: line.status }
                                  : l
                              )
                            );
                          } else {
                            addNotification({
                              title: "Success",
                              message: `Status updated to ${newStatus}.`,
                              type: "success",
                              category: "system",
                            });
                            onRefresh();
                          }
                          setStatusLoadingId(null);
                        }}
                      >
                        <SelectTrigger className='w-[130px]'>
                          <SelectValue />
                          {statusLoadingId === line.id && (
                            <span className='absolute right-2 top-1/2 -translate-y-1/2'>
                              <span className='animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full inline-block' />
                            </span>
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='pending'>Pending</SelectItem>
                          <SelectItem value='in_progress'>
                            In Progress
                          </SelectItem>
                          <SelectItem value='completed'>Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className='flex -space-x-1'>
                      {line.assignees?.slice(0, 3).map((assignee) => (
                        <Avatar
                          key={assignee.id}
                          className='h-6 w-6 border-2 border-background'
                        >
                          <AvatarFallback className='text-xs'>
                            {assignee.full_name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {line.assignees && line.assignees.length > 3 && (
                        <div className='h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center'>
                          <span className='text-xs'>
                            +{line.assignees.length - 3}
                          </span>
                        </div>
                      )}
                      {(!line.assignees || line.assignees.length === 0) && (
                        <span className='text-xs text-muted-foreground'>
                          None
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(line.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className='flex gap-2'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => toggleRowExpansion(line.id)}
                      >
                        <Eye className='h-4 w-4' />
                      </Button>
                      {/* Edit button for admin/moderator only */}
                      {role && ["admin", "moderator"].includes(role) && (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleEditLine(line)}
                        >
                          <Edit2 className='h-4 w-4 mr-1' /> Edit
                        </Button>
                      )}
                      {/* Delete button for admin only */}
                      {role === "admin" && (
                        <Button
                          variant='destructive'
                          size='sm'
                          onClick={() => handleDeleteLine(line)}
                        >
                          <Trash2 className='h-4 w-4 mr-1' /> Delete
                        </Button>
                      )}
                      {/* Complete button for moderator/admin only, and only if not already completed */}
                      {role &&
                        ["admin", "moderator"].includes(role) &&
                        line.status !== "completed" && (
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => handleCompleteLine(line.id)}
                          >
                            Complete
                          </Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
                {expandedRows.has(line.id) && (
                  <TableRow>
                    <TableCell colSpan={8} className='p-0'>
                      <ExpandedRowContent line={line} />
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredData.length === 0 && (
        <div className='text-center py-8'>
          <p className='text-muted-foreground'>
            No line details found matching your criteria.
          </p>
        </div>
      )}
      {/* Complete Confirmation Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Line as Completed?</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to mark this line as completed? This action
            cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setCompleteDialogOpen(false)}
              disabled={completeLoading}
            >
              Cancel
            </Button>
            <Button
              type='button'
              onClick={confirmCompleteLine}
              disabled={completeLoading}
              className='gap-2'
            >
              {completeLoading ? (
                <>
                  <div className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                  Completing...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <EditTelephoneLineModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={() => {
          onRefresh();
          setEditModalOpen(false);
        }}
        line={modalLine}
      />
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Line?</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete this line? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              type='button'
              variant='destructive'
              onClick={confirmDeleteLine}
              disabled={deleteLoading}
              className='gap-2'
            >
              {deleteLoading ? (
                <>
                  <div className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
