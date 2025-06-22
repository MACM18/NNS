"use server"

import { getSupabaseClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

/**
 * The shape expected by <AddTelephoneLineModal />.
 * Extend this as your UI grows – just keep the same keys.
 */
export interface TelephoneLinePayload {
  name: string
  phone_number: string
}

export async function createTelephoneLine({ name, phone_number }: TelephoneLinePayload) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("line_details")
    .insert({
      // 📝  Adjust the column names to match your schema.
      customer_name: name,
      telephone_no: phone_number,
      status: "active",
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  /* Revalidate pages that list / depend on line_details so users
     immediately see the new record without a manual refresh.       */
  revalidatePath("/lines")
  revalidatePath("/")

  return data
}
