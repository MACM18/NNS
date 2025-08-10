-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  billing_address TEXT,
  payment_method TEXT,
  role TEXT DEFAULT 'user'
);

-- Create line_details table
CREATE TABLE line_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telephone_no TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  address TEXT NOT NULL,
  status TEXT NOT NULL,
  installation_date DATE NOT NULL,
  service_type TEXT NOT NULL,
  monthly_fee NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telephone_no TEXT REFERENCES line_details(telephone_no) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory table
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_name TEXT NOT NULL,
  quantity INT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  supplier TEXT,
  last_restock DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create generated_invoices table
CREATE TABLE generated_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL,
  job_month DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory_invoices table
CREATE TABLE inventory_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT NOT NULL UNIQUE,
  supplier_name TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory_invoice_items table
CREATE TABLE inventory_invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES inventory_invoices(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES inventory(id) ON DELETE CASCADE NOT NULL,
  quantity INT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create waste_management table
CREATE TABLE waste_management (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_name TEXT NOT NULL,
  quantity INT NOT NULL,
  disposal_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create drum_usage table
CREATE TABLE drum_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drum_id TEXT NOT NULL,
  line_no TEXT REFERENCES line_details(telephone_no) ON DELETE CASCADE NOT NULL,
  used_date DATE NOT NULL,
  quantity_used NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) for tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_management ENABLE ROW LEVEL SECURITY;
ALTER TABLE drum_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles table
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for line_details table
CREATE POLICY "Enable read access for all users" ON line_details FOR SELECT USING (TRUE);
CREATE POLICY "Enable insert for authenticated users only" ON line_details FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON line_details FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON line_details FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for tasks table
CREATE POLICY "Enable read access for all users" ON tasks FOR SELECT USING (TRUE);
CREATE POLICY "Enable insert for authenticated users only" ON tasks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON tasks FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON tasks FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for inventory table
CREATE POLICY "Enable read access for all users" ON inventory FOR SELECT USING (TRUE);
CREATE POLICY "Enable insert for authenticated users only" ON inventory FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON inventory FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON inventory FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for generated_invoices table
CREATE POLICY "Enable read access for all users" ON generated_invoices FOR SELECT USING (TRUE);
CREATE POLICY "Enable insert for authenticated users only" ON generated_invoices FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON generated_invoices FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON generated_invoices FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for inventory_invoices table
CREATE POLICY "Enable read access for all users" ON inventory_invoices FOR SELECT USING (TRUE);
CREATE POLICY "Enable insert for authenticated users only" ON inventory_invoices FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON inventory_invoices FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON inventory_invoices FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for inventory_invoice_items table
CREATE POLICY "Enable read access for all users" ON inventory_invoice_items FOR SELECT USING (TRUE);
CREATE POLICY "Enable insert for authenticated users only" ON inventory_invoice_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON inventory_invoice_items FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON inventory_invoice_items FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for waste_management table
CREATE POLICY "Enable read access for all users" ON waste_management FOR SELECT USING (TRUE);
CREATE POLICY "Enable insert for authenticated users only" ON waste_management FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON waste_management FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON waste_management FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for drum_usage table
CREATE POLICY "Enable read access for all users" ON drum_usage FOR SELECT USING (TRUE);
CREATE POLICY "Enable insert for authenticated users only" ON drum_usage FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON drum_usage FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON drum_usage FOR DELETE USING (auth.role() = 'authenticated');

-- Create a trigger to insert a new profile when a new user signs up
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
