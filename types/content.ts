export interface Post {
  id: string
  title: string
  content: string
  author: string
  category: string
  created_at: string
  image_url?: string
}

export interface Blog {
  id: string
  title: string
  content: string
  author: string
  tags: string[]
  created_at: string
  image_url?: string
  reading_time_minutes: number
}

export interface JobVacancy {
  id: string
  title: string
  description: string
  location: string
  salary_range: string
  employment_type: string
  created_at: string // Use created_at for consistency with Supabase
  responsibilities: string[]
  requirements: string[]
}
