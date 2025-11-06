"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, UserPlus, UserMinus } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { useNotification } from "@/contexts/notification-context";

interface Profile {
  id: string;
  full_name: string;
  role: string;
  email?: string;
}

interface AssigneeManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lineId: string | null;
  onSuccess: () => void;
}

export function AssigneeManagementModal({
  open,
  onOpenChange,
  lineId,
  onSuccess,
}: AssigneeManagementModalProps) {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [currentAssignees, setCurrentAssignees] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const supabase = getSupabaseClient();
  const { addNotification } = useNotification();

  useEffect(() => {
    if (open && lineId) {
      fetchUsers();
      fetchCurrentAssignees();
    }
  }, [open, lineId]);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, role, email")
        .order("full_name");

      if (error) throw error;

      setAllUsers((profiles as unknown as Profile[]) || []);
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: "Failed to fetch users",
        type: "error",
        category: "system",
      });
    }
  };

  const fetchCurrentAssignees = async () => {
    if (!lineId) return;

    try {
      const { data: assignees, error } = await supabase
        .from("line_assignees")
        .select(
          `
          profiles!inner(
            id,
            full_name,
            role,
            email
          )
        `
        )
        .eq("line_id", lineId);

      if (error) throw error;

      const assigneeProfiles = assignees?.map((a: any) => a.profiles) || [];
      setCurrentAssignees(assigneeProfiles);
      setSelectedUsers(new Set(assigneeProfiles.map((p: Profile) => p.id)));
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: "Failed to fetch current assignees",
        type: "error",
        category: "system",
      });
    }
  };

  const handleUserToggle = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSave = async () => {
    if (!lineId) return;

    setLoading(true);
    try {
      // Get current assignee IDs
      const currentIds = new Set(currentAssignees.map((a) => a.id));
      const selectedIds = selectedUsers;

      // Find users to add and remove
      const toAdd = Array.from(selectedIds).filter((id) => !currentIds.has(id));
      const toRemove = Array.from(currentIds).filter(
        (id) => !selectedIds.has(id)
      );

      // Remove assignees
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from("line_assignees")
          .delete()
          .eq("line_id", lineId)
          .in("user_id", toRemove);

        if (removeError) throw removeError;
      }

      // Add new assignees
      if (toAdd.length > 0) {
        const { error: addError } = await supabase
          .from("line_assignees")
          .insert(
            toAdd.map((userId) => ({
              line_id: lineId,
              user_id: userId,
              assigned_at: new Date().toISOString(),
            }))
          );

        if (addError) throw addError;
      }

      addNotification({
        title: "Success",
        message: "Assignees updated successfully",
        type: "success",
        category: "system",
      });

      onSuccess();
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: error.message,
        type: "error",
        category: "system",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = allUsers.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[80vh] overflow-hidden flex flex-col'>
        <DialogHeader>
          <DialogTitle>Manage Line Assignees</DialogTitle>
          <DialogDescription>
            Select team members to assign to this line installation.
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-hidden flex flex-col space-y-4'>
          {/* Search */}
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Search users by name, email, or role...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='pl-10'
            />
          </div>

          {/* Current Assignees Summary */}
          {currentAssignees.length > 0 && (
            <div className='p-3 bg-muted/50 rounded-lg'>
              <Label className='text-sm font-medium'>Currently Assigned:</Label>
              <div className='flex flex-wrap gap-2 mt-2'>
                {currentAssignees.map((assignee) => (
                  <Badge
                    key={assignee.id}
                    variant='secondary'
                    className='flex items-center gap-1'
                  >
                    <Avatar className='h-4 w-4'>
                      <AvatarFallback className='text-xs'>
                        {assignee.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {assignee.full_name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* User List */}
          <div className='flex-1 overflow-y-auto space-y-2'>
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className='flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer'
                onClick={() => handleUserToggle(user.id)}
              >
                <Checkbox
                  checked={selectedUsers.has(user.id)}
                  onChange={() => handleUserToggle(user.id)}
                />
                <Avatar className='h-8 w-8'>
                  <AvatarFallback>
                    {user.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className='flex-1 min-w-0'>
                  <p className='font-medium truncate'>{user.full_name}</p>
                  <div className='flex items-center gap-2'>
                    <p className='text-sm text-muted-foreground truncate'>
                      {user.email}
                    </p>
                    <Badge variant='outline' className='text-xs'>
                      {user.role}
                    </Badge>
                  </div>
                </div>
                {selectedUsers.has(user.id) ? (
                  <UserMinus className='h-4 w-4 text-red-500' />
                ) : (
                  <UserPlus className='h-4 w-4 text-green-500' />
                )}
              </div>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className='text-center py-8 text-muted-foreground'>
              No users found matching your search.
            </div>
          )}
        </div>

        <DialogFooter>
          <div className='flex justify-between items-center w-full'>
            <p className='text-sm text-muted-foreground'>
              {selectedUsers.size} user{selectedUsers.size !== 1 ? "s" : ""}{" "}
              selected
            </p>
            <div className='flex gap-2'>
              <Button variant='outline' onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
