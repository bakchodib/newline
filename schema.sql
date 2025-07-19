-- This file contains the SQL schema for the JLS Finance PWA using Supabase.
-- You can run this file in your Supabase SQL Editor to set up the necessary tables.

-- 1. Users Table
-- Stores user profiles and links them to Supabase Auth.
create table users (
  id uuid default gen_random_uuid() primary key,
  auth_uid uuid references auth.users(id) on delete cascade not null,
  name text not null,
  login_id text not null unique,
  role text check (role in ('admin', 'agent', 'customer')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Customers Table
-- Stores all customer information, including KYC and guarantor details as JSON.
create table customers (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    phone text not null,
    address text,
    photo text, -- URL to the uploaded photo
    kyc jsonb, -- e.g., {"idType": "Aadhar", "idNumber": "1234..."}
    guarantor jsonb, -- e.g., {"name": "...", "phone": "...", "address": "..."}
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Loan Applications Table
-- Stores initial loan applications before they are approved.
create table loan_applications (
    id uuid default gen_random_uuid() primary key,
    customer_id uuid references customers(id) on delete cascade not null,
    amount numeric not null,
    status text check (status in ('pending', 'approved', 'rejected')) not null default 'pending',
    application_date date not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Loans Table
-- Stores active and closed loan details. Top-up history and closure details are stored as JSON.
create table loans (
    id uuid default gen_random_uuid() primary key,
    customer_id uuid references customers(id) on delete cascade not null,
    amount numeric not null,
    interest_rate numeric not null,
    tenure integer not null,
    disbursal_date date not null,
    processing_fee numeric,
    status text check (status in ('active', 'closed')) not null default 'active',
    topup_history jsonb[],
    closure_details jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. EMIs Table
-- Stores the EMI schedule for every loan.
create table emis (
    id uuid default gen_random_uuid() primary key,
    loan_id uuid references loans(id) on delete cascade not null,
    installment integer not null,
    due_date date not null,
    amount numeric not null,
    status text check (status in ('paid', 'unpaid')) not null default 'unpaid',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) for all tables
alter table public.users enable row level security;
alter table public.customers enable row level security;
alter table public.loan_applications enable row level security;
alter table public.loans enable row level security;
alter table public.emis enable row level security;

-- Create Policies for RLS
-- This policy allows any authenticated user to perform any action.
-- For production, you would create more granular policies based on user roles.
create policy "Allow all access to authenticated users"
on public.users for all
to authenticated
using (true);

create policy "Allow all access to authenticated users"
on public.customers for all
to authenticated
using (true);

create policy "Allow all access to authenticated users"
on public.loan_applications for all
to authenticated
using (true);

create policy "Allow all access to authenticated users"
on public.loans for all
to authenticated
using (true);

create policy "Allow all access to authenticated users"
on public.emis for all
to authenticated
using (true);
