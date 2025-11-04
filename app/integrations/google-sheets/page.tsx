"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileSpreadsheet, Plus, Trash2, ExternalLink, Calendar, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface SheetConnection {
  id: string;
  month: string;
  year: number;
  sheetUrl: string;
  sheetName: string;
  lastSynced: string;
  status: "active" | "error" | "syncing";
  recordCount?: number;
}

// Mock data - will be replaced with actual API calls
const mockConnections: SheetConnection[] = [
  {
    id: "1",
    month: "October",
    year: 2024,
    sheetUrl: "https://docs.google.com/spreadsheets/d/abc123/edit",
    sheetName: "October NNS Data",
    lastSynced: "2024-10-28T10:30:00Z",
    status: "active",
    recordCount: 142,
  },
  {
    id: "2",
    month: "September",
    year: 2024,
    sheetUrl: "https://docs.google.com/spreadsheets/d/def456/edit",
    sheetName: "September NNS Lines",
    lastSynced: "2024-09-30T15:45:00Z",
    status: "active",
    recordCount: 128,
  },
];

export default function GoogleSheetsPage() {
  const { role, loading } = useAuth();
  const router = useRouter();
  const [connections, setConnections] = useState<SheetConnection[]>(mockConnections);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form state
  const [formData, setFormData] = useState({
    month: "",
    year: new Date().getFullYear().toString(),
    sheetUrl: "",
    sheetName: "",
  });

  useEffect(() => {
    // Only admin and moderator can access integrations
    if (!loading && role && !["admin", "moderator"].includes(role.toLowerCase())) {
      router.push("/dashboard");
    }
  }, [role, loading, router]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const handleAddConnection = () => {
    // TODO: Implement actual API call
    const newConnection: SheetConnection = {
      id: Date.now().toString(),
      month: formData.month,
      year: parseInt(formData.year),
      sheetUrl: formData.sheetUrl,
      sheetName: formData.sheetName,
      lastSynced: new Date().toISOString(),
      status: "active",
      recordCount: 0,
    };

    setConnections([newConnection, ...connections]);
    setIsAddDialogOpen(false);
    setFormData({
      month: "",
      year: new Date().getFullYear().toString(),
      sheetUrl: "",
      sheetName: "",
    });
  };

  const handleDeleteConnection = (id: string) => {
    // TODO: Implement actual API call
    setConnections(connections.filter(conn => conn.id !== id));
  };

  const handleSyncConnection = (id: string) => {
    // TODO: Implement actual API call
    setConnections(connections.map(conn => 
      conn.id === id ? { ...conn, status: "syncing" as const } : conn
    ));

    // Simulate sync
    setTimeout(() => {
      setConnections(connections.map(conn => 
        conn.id === id ? { 
          ...conn, 
          status: "active" as const, 
          lastSynced: new Date().toISOString() 
        } : conn
      ));
    }, 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: SheetConnection["status"]) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      case "syncing":
        return <Badge variant="secondary">Syncing...</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Pagination
  const totalPages = Math.ceil(connections.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentConnections = connections.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!role || !["admin", "moderator"].includes(role.toLowerCase())) {
    return null;
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/integrations" className="hover:text-foreground">
            Integrations
          </Link>
          <span>/</span>
          <span>Google Sheets</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-green-600" />
              Google Sheets Integration
            </h1>
            <p className="text-muted-foreground mt-2">
              Connect Google Sheets to sync line installation data for each month
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Connection
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Connect Google Sheet</DialogTitle>
                <DialogDescription>
                  Link a Google Sheet to a specific month for data synchronization
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="month">Month</Label>
                    <Select
                      value={formData.month}
                      onValueChange={(value) => setFormData({ ...formData, month: value })}
                    >
                      <SelectTrigger id="month">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month} value={month}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Select
                      value={formData.year}
                      onValueChange={(value) => setFormData({ ...formData, year: value })}
                    >
                      <SelectTrigger id="year">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sheetUrl">Google Sheet URL</Label>
                  <Input
                    id="sheetUrl"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={formData.sheetUrl}
                    onChange={(e) => setFormData({ ...formData, sheetUrl: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sheetName">Sheet Name (Tab)</Label>
                  <Input
                    id="sheetName"
                    placeholder="e.g., October NNS Data"
                    value={formData.sheetName}
                    onChange={(e) => setFormData({ ...formData, sheetName: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    The name of the specific tab/sheet within the Google Sheets document
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddConnection}
                  disabled={!formData.month || !formData.year || !formData.sheetUrl || !formData.sheetName}
                >
                  Connect Sheet
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
          {connections.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No connections yet</h3>
              <p className="text-muted-foreground mb-4">
                Get started by connecting your first Google Sheet
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Connection
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentConnections.map((connection) => (
                    <TableRow key={connection.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {connection.month} {connection.year}
                        </div>
                      </TableCell>
                      <TableCell>
                        <a
                          href={connection.sheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 hover:underline text-blue-600"
                        >
                          {connection.sheetName}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
                      <TableCell>{getStatusBadge(connection.status)}</TableCell>
                      <TableCell>{connection.recordCount || 0}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(connection.lastSynced)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSyncConnection(connection.id)}
                            disabled={connection.status === "syncing"}
                            className="gap-2"
                          >
                            <RefreshCw className={`h-4 w-4 ${connection.status === "syncing" ? "animate-spin" : ""}`} />
                            Sync
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteConnection(connection.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(endIndex, connections.length)} of {connections.length} connections
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
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
