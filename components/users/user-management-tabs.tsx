"use client";
import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Pencil, Trash2, UserPlus, Eye } from "lucide-react";
import { CreateUserModal } from "@/components/modals/create-user-modal";
import { EditUserModal } from "@/components/modals/edit-user-modal";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export function UserManagementTabs() {
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteUser, setDeleteUser] = useState<any | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      const result = await response.json();

      const profiles = result.data?.profiles || [];
      const users = result.data?.users || [];

      // Map users with profile data
      const activeWithProvider = users.map((user: any) => {
        const profile = profiles.find((p: any) => p.userId === user.id);
        // Check for OAuth accounts (provider info would come from accounts)
        const isGoogleUser = user.accounts?.some(
          (acc: any) => acc.provider === "google"
        );
        return {
          id: user.id,
          email: user.email,
          full_name: profile?.fullName || user.email || "",
          role: profile?.role || "user",
          created_at: profile?.createdAt || user.createdAt,
          updated_at: profile?.updatedAt || null,
          provider: isGoogleUser ? "google" : "email",
          identities: user.accounts || [],
        };
      });

      setActiveUsers(activeWithProvider);
      // For now, pending users are not easily supported without Supabase admin API
      // Could implement a "pending" status in profiles if needed
      setPendingUsers([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (user: any) => {
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: user.user_metadata?.full_name || user.email,
          email: user.email,
          role: "user",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to approve user");
      }

      toast({
        title: "User Approved",
        description: "User can now access the app.",
      });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (user: any) => {
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete user");
      }

      toast({ title: "User Deleted", description: "User profile removed." });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = async (user: any, newRole: string) => {
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: user.full_name,
          email: user.email,
          role: newRole,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update role");
      }

      toast({
        title: "Role Updated",
        description: `Role changed to ${newRole}`,
      });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Tabs defaultValue='active' className='w-full'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4'>
        <TabsList className='w-full sm:w-auto'>
          <TabsTrigger value='active' className='flex-1 sm:flex-initial'>
            Active Users
          </TabsTrigger>
          <TabsTrigger value='pending' className='flex-1 sm:flex-initial'>
            Pending Approvals
          </TabsTrigger>
        </TabsList>
        <Button
          size='sm'
          onClick={() => setShowCreateModal(true)}
          className='w-full sm:w-auto'
        >
          <UserPlus className='mr-2 h-4 w-4' /> Create User
        </Button>
      </div>
      <TabsContent value='active'>
        <Card>
          <CardHeader>
            <CardTitle>Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading...</div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='min-w-full border rounded-md text-sm'>
                  <thead>
                    <tr className='bg-muted text-muted-foreground'>
                      <th className='px-2 sm:px-4 py-2 text-left font-semibold'>
                        Name
                      </th>
                      <th className='px-2 sm:px-4 py-2 text-left font-semibold hidden sm:table-cell'>
                        Email
                      </th>
                      <th className='px-2 sm:px-4 py-2 text-center font-semibold hidden md:table-cell'>
                        Provider
                      </th>
                      <th className='px-2 sm:px-4 py-2 text-center font-semibold'>
                        Details
                      </th>
                      <th className='px-2 sm:px-4 py-2 text-center font-semibold'>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeUsers.map((user) => {
                      const isGoogleUser =
                        user.provider === "google" ||
                        user.identities?.some(
                          (id: any) => id.provider === "google"
                        );
                      return (
                        <tr
                          key={user.id}
                          className='border-b hover:bg-accent transition-colors group'
                        >
                          <td className='px-2 sm:px-4 py-2'>
                            <div className='flex flex-col'>
                              <span>{user.full_name}</span>
                              <span className='text-xs text-muted-foreground sm:hidden'>
                                {user.email}
                              </span>
                            </div>
                          </td>
                          <td className='px-2 sm:px-4 py-2 hidden sm:table-cell'>
                            {user.email}
                          </td>
                          <td className='px-2 sm:px-4 py-2 text-center hidden md:table-cell'>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                                isGoogleUser
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                              }`}
                            >
                              {isGoogleUser ? "🔵 Google" : "📧 Email"}
                            </span>
                          </td>
                          <td className='px-2 sm:px-4 py-2 text-center'>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  size='icon'
                                  variant='ghost'
                                  aria-label='View details'
                                >
                                  <Eye className='h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors' />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className='w-64'>
                                <div className='space-y-2'>
                                  <div className='font-semibold text-base'>
                                    {user.full_name}
                                  </div>
                                  <div className='text-xs text-muted-foreground'>
                                    {user.email}
                                  </div>
                                  <div className='flex items-center gap-2 mt-2'>
                                    <span className='font-medium'>
                                      Provider:
                                    </span>
                                    <span className='capitalize'>
                                      {isGoogleUser
                                        ? "Google OAuth"
                                        : "Email/Password"}
                                    </span>
                                  </div>
                                  <div className='flex items-center gap-2 mt-2'>
                                    <span className='font-medium'>Role:</span>
                                    <span className='capitalize'>
                                      {user.role}
                                    </span>
                                  </div>
                                  <div className='text-xs text-muted-foreground mt-2'>
                                    <div>
                                      Created:{" "}
                                      {user.created_at
                                        ? new Date(
                                            user.created_at
                                          ).toLocaleString()
                                        : "-"}
                                    </div>
                                    <div>
                                      Updated:{" "}
                                      {user.updated_at
                                        ? new Date(
                                            user.updated_at
                                          ).toLocaleString()
                                        : "-"}
                                    </div>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className='px-2 sm:px-4 py-2 text-center'>
                            <div className='flex flex-col sm:flex-row items-center justify-center gap-2'>
                              <Button
                                size='icon'
                                variant='outline'
                                onClick={() => setEditUser(user)}
                                aria-label='Edit user'
                              >
                                <Pencil className='h-4 w-4' />
                              </Button>
                              <select
                                value={user.role}
                                onChange={(e) =>
                                  handleRoleChange(user, e.target.value)
                                }
                                className='border rounded px-2 py-1 text-xs sm:text-sm bg-background w-full sm:w-auto'
                              >
                                <option value='user'>User</option>
                                <option value='employee'>Employee</option>
                                <option value='moderator'>Moderator</option>
                                <option value='admin'>Admin</option>
                              </select>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size='icon'
                                    variant='destructive'
                                    aria-label='Delete user'
                                  >
                                    <Trash2 className='h-4 w-4' />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete User
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete{" "}
                                      <span className='font-semibold'>
                                        {user.full_name}
                                      </span>
                                      ? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(user)}
                                      className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value='pending'>
        <Card>
          <CardHeader>
            <CardTitle>Pending Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading...</div>
            ) : (
              <ul className='space-y-2'>
                {pendingUsers.map((user) => (
                  <li
                    key={user.id}
                    className='flex justify-between items-center border-b py-2'
                  >
                    <span>{user.email}</span>
                    <Button size='sm' onClick={() => handleApprove(user)}>
                      Approve
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      <CreateUserModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={fetchUsers}
      />
      <EditUserModal
        open={!!editUser}
        onOpenChange={() => setEditUser(null)}
        user={editUser}
        onSuccess={fetchUsers}
      />
    </Tabs>
  );
}
