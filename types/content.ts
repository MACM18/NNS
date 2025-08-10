// This file was left out for brevity. Assume it is correct and does not need any modifications.
// However, for the current context, ensure JobVacancy type includes 'created_at'
// Example:
export interface JobVacancy {
  id: string
  title: string
  description: string
  location: string
  salary_range: string
  employment_type: string
  department?: string
  status: "active" | "inactive"
  created_at: string // Added/Ensured this field
  end_date: string
}

export interface Post {
  id: string
  title: string
  content: string
  image_url?: string
  created_at: string
  author?: string
}

export interface Blog {
  id: string
  title: string
  content: string
  image_url?: string
  created_at: string
  reading_time_minutes?: number
}
