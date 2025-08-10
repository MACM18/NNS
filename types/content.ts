export interface Post {
  id: number
  title: string
  content: string
  excerpt?: string
  author: string
  category?: string
  tags?: string[]
  featured_image_url?: string
  status: "active" | "disabled"
  created_at: string
  updated_at: string
}

export interface Blog {
  id: number
  title: string
  content: string
  excerpt?: string
  author: string
  category?: string
  tags?: string[]
  featured_image_url?: string
  slug?: string
  meta_description?: string
  reading_time?: number
  status: "active" | "disabled"
  published_at?: string
  created_at: string
  updated_at: string
}

export interface JobVacancy {
  id: number
  title: string
  description: string
  requirements?: string
  responsibilities?: string
  department?: string
  location?: string
  employment_type: "full-time" | "part-time" | "contract" | "internship"
  salary_range?: string
  experience_level?: string
  skills?: string[]
  benefits?: string[]
  application_email?: string
  application_url?: string
  end_date: string
  status: "active" | "disabled"
  created_at: string
  updated_at: string
}

export type ContentStatus = "active" | "disabled"
export type EmploymentType = "full-time" | "part-time" | "contract" | "internship"
