export interface TaskRecord {
  id: string;
  task_date: string;
  telephone_no: string;
  dp: string;
  contact_no: string | null;
  customer_name: string;
  address: string;
  status: string;
  connection_type_new: string;
  connection_services: string[];
  notes: string | null;
  created_at: string;
  created_by?: string | null;
  rejection_reason?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  completed_at?: string | null;
  completed_by?: string | null;
  line_details_id?: string | null;
}
