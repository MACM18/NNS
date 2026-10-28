import { redirect } from "next/navigation";

export default function TasksPageRedirect() {
  redirect("/dashboard/lines");
}
