/**
 * Worker and Work Assignment Type Definitions
 *
 * This file contains all TypeScript interfaces and types related to
 * workers and work assignments in the NNS system.
 */

/**
 * Worker status enumeration
 */
export type WorkerStatus = "active" | "inactive";

/**
 * Worker role enumeration
 */
export type WorkerRole = "technician" | "installer" | "supervisor" | "helper";

/**
 * Full worker record as stored in the database
 */
export interface Worker {
  id: string;
  full_name: string;
  employee_no: string | null;
  phone_number: string | null;
  email: string | null;
  role: WorkerRole;
  status: WorkerStatus;
  notes: string | null;
  profile_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Worker option for selection dropdowns
 */
export interface WorkerOption {
  id: string;
  full_name: string | null;
  role: string | null;
}

/**
 * Worker assignment information linking a worker to a line installation
 */
export interface WorkAssignment {
  id: string;
  worker_id: string;
  worker_name: string;
  worker_role: string | null;
  assigned_date: string; // ISO date string (YYYY-MM-DD)
}

/**
 * Line installation with assigned workers
 */
export interface LineWithAssignments {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  telephone_no: string | null;
  customer_name: string | null;
  address: string | null;
  dp: string | null;
  assignments: WorkAssignment[];
}

/**
 * Day view containing all lines for a specific date
 */
export interface DayWorkView {
  date: string; // ISO date string (YYYY-MM-DD)
  lines: LineWithAssignments[];
}

/**
 * Monthly work assignments calendar response
 */
export interface WorkAssignmentsCalendar {
  month: number; // 1-12
  year: number;
  days: DayWorkView[];
  workers: WorkerOption[];
}

/**
 * Request body for creating a worker
 */
export interface CreateWorkerRequest {
  full_name: string;
  employee_no?: string;
  phone_number?: string;
  email?: string;
  role?: WorkerRole;
  status?: WorkerStatus;
  notes?: string;
  profile_id?: string;
}

/**
 * Request body for updating a worker
 */
export interface UpdateWorkerRequest extends Partial<CreateWorkerRequest> {
  id: string;
}

/**
 * Request body for creating a work assignment
 */
export interface CreateAssignmentRequest {
  lineId: string;
  workerId: string;
  date: string; // ISO date string (YYYY-MM-DD)
}

/**
 * Request body for deleting a work assignment
 */
export interface DeleteAssignmentRequest {
  assignmentId: string;
}

/**
 * Worker form data for UI components
 */
export interface WorkerFormData {
  full_name: string;
  employee_no: string;
  phone_number: string;
  email: string;
  role: string;
  status: string;
  notes: string;
}
