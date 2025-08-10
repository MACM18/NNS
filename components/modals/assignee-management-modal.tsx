"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import { Loader2, Plus, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface UserProfile {
  id: string
  full_name: string | null
  email: string
  role: string
}

interface AssigneeManagementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AssigneeManagementModal({ open, onOpenChange, onSuccess }: AssigneeManagementModalProps) {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newUserName, setNewUserName] = useState("")
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserPassword, setNewUserPassword] = useState("")
  const [isAddingUser, setIsAddingUser] = useState(false)

  useEffect(() => {
    if (open) {
      fetchUsers()
    }
  }, [open])

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    const { data: profiles, error: profilesError } = await supabase.from("profiles").select("*")
    const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers()

    if (profilesError || authUsersError) {
      console.error("Error fetching users:", profilesError || authUsersError)
      setError("Failed to load user data.")
      toast({
        title: "Error",
        description: "Failed to load user data.",
        variant: "destructive",
      })
    } else {
      const combinedUsers: UserProfile[] =
        authUsers?.users.map((authUser) => {
          const profile = profiles?.find((p) => p.id === authUser.id)
          return {
            id: authUser.id,
            full_name: profile?.full_name || authUser.email,
            email: authUser.email || "N/A",
            role: profile?.role || "user", // Default role if not found in profile
          }
        }) || []
      setUsers(combinedUsers)
    }
    setLoading(false)
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAddingUser(true)
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: newUserEmail,
        password: newUserPassword,
        email_confirm: true,
        user_metadata: { full_name: newUserName },
      })

      if (error) throw error

      // Optionally update profile role if needed, though handle_new_user trigger handles basic profile creation
      toast({
        title: "User Added",
        description: `User ${newUserEmail} created successfully.`,
      })
      setNewUserName("")
      setNewUserEmail("")
      setNewUserPassword("")
      fetchUsers() // Refresh the list
      onSuccess()
    } catch (error: any) {
      console.error("Error adding user:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to add user.",
        variant: "destructive",
      })
    } finally {
      setIsAddingUser(false)
    }
  }

  const handleDeleteUser = async (id: string) => {
    try {
      const { error } = await supabase.auth.admin.deleteUser(id)
      if (error) throw error
      toast({
        title: "User Deleted",
        description: "User removed successfully.",
      })
      fetchUsers() // Refresh the list
      onSuccess()
    } catch (error: any) {
      console.error("Error deleting user:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete user.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Assignees</DialogTitle>
          <DialogDescription>Add or remove users who can be assigned tasks.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <h3 className="text-lg font-medium">Add New User</h3>
          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="newUserName">Full Name</Label>
              <Input id="newUserName" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newUserEmail">Email</Label>
              <Input
                id="newUserEmail"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newUserPassword">Password</Label>
              <Input
                id="newUserPassword"
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={isAddingUser} className="md:col-span-3">
              {isAddingUser ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding User...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" /> Add User
                </>
              )}
            </Button>
          </form>

          <h3 className="text-lg font-medium mt-6">Existing Users</h3>
          {loading ? (
            <div className="flex justify-center items-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground">No users found.</p>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-2 border rounded-md">
                  <div>
                    <p className="font-medium">{user.full_name || user.email}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">Role: {user.role}</p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the user and all associated data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
