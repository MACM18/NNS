"use client";
import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase";
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
    const supabase = getSupabaseClient();
    // Fetch all profiles (active users)
    const { data: profiles } = await supabase.from("profiles").select("*");
    setActiveUsers(profiles || []);
    // Fetch all auth users
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    // Pending = users in auth but not in profiles
    const pending = (authUsers?.users || []).filter(
      (u) =>
        u.email_confirmed_at && !profiles?.some((p: any) => p.email === u.email)
    );
    setPendingUsers(pending);
    setLoading(false);
  };

  const handleApprove = async (user: any) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email,
      role: "user",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "User Approved",
        description: "User can now access the app.",
      });
      fetchUsers();
    }
  };

  const handleDelete = async (user: any) => {
    const supabase = getSupabaseClient();
    // Remove from profiles
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", user.id);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "User Deleted", description: "User profile removed." });
      fetchUsers();
    }
  };

  const handleRoleChange = async (user: any, newRole: string) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", user.id);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Role Updated",
        description: `Role changed to ${newRole}`,
      });
      fetchUsers();
    }
  };

  return (
    <Tabs defaultValue='active' className='w-full'>
      <TabsList className='mb-4 flex justify-between'>
        <div>
          <TabsTrigger value='active'>Active Users</TabsTrigger>
          <TabsTrigger value='pending'>Pending Approvals</TabsTrigger>
        </div>
        <Button size='sm' onClick={() => setShowCreateModal(true)}>
          <UserPlus className='mr-2 h-4 w-4' /> Create User
        </Button>
      </TabsList>
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
                      <th className='px-4 py-2 text-left font-semibold'>
                        Name
                      </th>
                      <th className='px-4 py-2 text-left font-semibold'>
                        Email
                      </th>
                      <th className='px-4 py-2 text-center font-semibold'>
                        Details
                      </th>
                      <th className='px-4 py-2 text-center font-semibold'>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeUsers.map((user) => (
                      <tr
                        key={user.id}
                        className='border-b hover:bg-accent transition-colors group'
                      >
                        <td className='px-4 py-2'>{user.full_name}</td>
                        <td className='px-4 py-2'>{user.email}</td>
                        <td className='px-4 py-2 text-center'>
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
                        <td className='px-4 py-2 text-center'>
                          <div className='flex items-center justify-center gap-2'>
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
                              className='border rounded px-2 py-1 text-sm bg-background'
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
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
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
                    ))}
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
