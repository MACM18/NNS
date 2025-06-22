"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { createTelephoneLine } from "@/lib/actions/telephone-line.actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { NotificationService } from "@/lib/notification-service"

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  phone_number: z.string().min(10, {
    message: "Phone number must be at least 10 characters.",
  }),
})

interface AddTelephoneLineModalProps {
  open: boolean
  setOpen: (open: boolean) => void
}

const AddTelephoneLineModal = ({ open, setOpen }: AddTelephoneLineModalProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone_number: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      const newLine = await createTelephoneLine(values)

      if (newLine) {
        toast.success("Telephone line created successfully!")
        // Create notification for line added
        await NotificationService.createLineAddedNotification(values.phone_number, values.name)
        router.refresh()
        setOpen(false)
      } else {
        toast.error("Failed to create telephone line.")
      }
    } catch (error: any) {
      toast.error(error?.message || "Something went wrong.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Add Telephone Line</AlertDialogTitle>
          <AlertDialogDescription>Add a new telephone line to the system.</AlertDialogDescription>
        </AlertDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="123-456-7890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction disabled={isLoading}>{isLoading ? "Loading..." : "Add"}</AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default AddTelephoneLineModal
