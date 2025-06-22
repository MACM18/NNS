-- Create job_vacancies table
CREATE TABLE IF NOT EXISTS job_vacancies (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  responsibilities TEXT,
  department VARCHAR(100),
  location VARCHAR(100),
  employment_type VARCHAR(50) DEFAULT 'full-time' CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'internship')),
  salary_range VARCHAR(100),
  experience_level VARCHAR(50),
  skills TEXT[],
  benefits TEXT[],
  application_email VARCHAR(255),
  application_url TEXT,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_job_vacancies_status ON job_vacancies(status);
CREATE INDEX IF NOT EXISTS idx_job_vacancies_end_date ON job_vacancies(end_date);
CREATE INDEX IF NOT EXISTS idx_job_vacancies_department ON job_vacancies(department);
