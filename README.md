# staff7 — Product Documentation

> Consultant resource management platform for staffing agencies and consulting firms

---

## What is staff7?

staff7 is a SaaS application built for **staffing agencies and consulting firms** to manage their consultant teams. It centralises in one place:

- **Consultant management** (profiles, skills, availability)
- **Project tracking** and assignments
- **Time-off requests** and approval workflows
- **Financial visibility** (daily rates, margins, revenue)
- **Timeline** and weekly availability views

staff7 is multi-tenant: each company has its own isolated workspace with its own data.

---

## The three roles

| Role | Who | Access |
|------|-----|--------|
| `admin` | CEO, Director | Everything — including daily rates and margins |
| `manager` | Project manager, HR | Everything except confidential financial data |
| `consultant` | Employed or freelance consultant | Their own data only |

---

## Flow by role

---

### 👤 Admin

The admin has a complete view of the company. They configure and operate staff7.

#### On login

1. Signs in with email/password
2. Lands on the **Dashboard** — an overview with:
   - KPIs: active consultants, active projects, pending time-off requests, occupancy rate
   - Consultant list with current status
   - Recent activity (assignments, milestones, alerts)
   - Current month calendar

#### Managing consultants `/consultants`

- **Create** a consultant: name, initials, role, tech stack, daily rate, avatar colour
- **Edit** an existing consultant's information
- **Filter** by status: all / on assignment / available / on leave / partial
- **View** real-time occupancy rate and remaining leave days
- **Delete** a consultant (with confirmation)

#### Managing clients `/clients`

- **Create** a client: name, sector, primary contact, email, phone, website
- **View** the client profile: KPIs (active projects, total revenue), linked project history
- **Filter** by sector: IT Services, Energy, Finance, Industry, Retail, Public, Other
- **Edit** or **delete** a client

#### Managing projects `/projects`

- **Create** a project: name, client (from the list), contract reference, description, dates, status
- **Distinguish** between external projects (real client) and internal projects (own company)
- **Fill in** financial data: sold daily rate, sold days, total budget
- **Assign** consultants from the project drawer:
  - Select a consultant (current occupancy shown)
  - Mission dates (pre-filled from the project)
  - Allocation % (slider 10–100%, 100% by default)
- **Remove** a consultant from a project
- **Archive** or **delete** a project

#### Managing time-off `/leaves`

- **View** all pending, approved, and refused requests
- **Approve** or **refuse** a request with impact warning displayed
- **View** leave balances per consultant
- *(coming soon)* Create a request on behalf of a consultant

#### Availability `/availability`

- Weekly grid view of availability for every consultant
- Week-by-week navigation
- Colour-coded cells: free / on assignment / partial / on leave / weekend

#### Timeline `/timeline`

- Monthly Gantt view — who is on what and when
- Month-by-month navigation
- Legend: assignment / leave / partial / weekend

#### Financials `/financials` *(admin only)*

- Confidential margin view per project
- Sold daily rate vs actual daily rate (consultant cost)
- Margin per day, total gross margin, margin %
- Colour indicators: green (≥20%), orange (10–20%), red (<10%)

---

### 👥 Manager

The manager runs projects and the team day-to-day. They cannot see confidential financial data (daily rates, margins).

#### On login

Same Dashboard as the admin, without daily rate data.

#### What they can do

- **Consultants**: view profiles, create/edit (daily rate hidden)
- **Projects**: create, edit, assign consultants, archive
- **Clients**: create, edit, view profiles
- **Time-off**: approve or refuse requests
- **Availability**: view the weekly grid
- **Timeline**: view the monthly Gantt

#### What they cannot do

- Access `/financials`
- See consultant daily rates in their profiles
- See project financial data (sold rate, margins)

---

### 🧑‍💻 Consultant

The consultant has limited access to their own data only. They cannot see other consultants' information or any financial data.

#### On login

Simplified dashboard focused on them:
- Their current availability
- Their active projects
- Their time-off requests and remaining balance
- Alerts that concern them

#### What they can do

- **View** their own profile (daily rate hidden)
- **Submit** a time-off request *(coming soon)*
- **View** their project assignments
- **View** the timeline (to see how the team is organised)

#### What they cannot do

- View other consultants' profiles
- Create or edit projects
- View financial data
- Access `/financials`
- Approve time-off requests

---

## Time-off workflow

```
Consultant submits a request
          ↓
Appears in /leaves with status "Pending"
+ red badge in the sidebar (count of pending requests)
          ↓
Manager or Admin reviews, sees potential impact
(e.g. "DataLake project affected — 1 dev missing week 11")
          ↓
    Approve ✓           Refuse ✗
          ↓                   ↓
Status → "Approved"    Status → "Refused"
(coming soon: email notification)
```

---

## Consultant ↔ project assignment workflow

```
Admin or Manager opens a project
          ↓
Clicks "+ Assign" in the Team section of the drawer
          ↓
Selects a consultant
(current occupancy displayed in the select)
          ↓
Sets dates (pre-filled from the project)
Adjusts allocation % (100% by default)
          ↓
Consultant occupancy updates automatically
"Team" column in the table shows stacked avatars
```

---

## Full project creation workflow

```
1. Create the client in /clients (if new)
   → Name, sector, contact details

2. Create the project in /projects
   → Select the client from the list
   → Fill in dates, status, financial data

3. Assign consultants from the project drawer
   → Select consultant, set dates, set allocation %

4. Track progress
   → Status: Draft → Active → On hold → Completed → Archived
   → View the timeline in /timeline
   → Monitor margins in /financials (admin only)
```

---

## Data visible by role

| Data | Admin | Manager | Consultant |
|------|-------|---------|------------|
| Consultant list | ✅ All | ✅ All | ❌ |
| Full consultant profile | ✅ | ✅ (no daily rate) | ✅ (own only) |
| Consultant daily rates | ✅ | ❌ | ❌ |
| Project list | ✅ All | ✅ All | ✅ Own projects |
| Project financial data | ✅ | ❌ | ❌ |
| /financials page | ✅ | ❌ | ❌ |
| Team time-off | ✅ | ✅ | ❌ (own only) |
| Team availability | ✅ | ✅ | ✅ |
| Timeline | ✅ | ✅ | ✅ |
| Clients | ✅ | ✅ | ❌ |

---

## Onboarding a new company

> ⚠️ Currently a manual process — CLI script coming soon

### 1. Create the company in Supabase

```sql
insert into companies (id, name, slug) values
  (gen_random_uuid(), 'Company Name', 'company-slug');
```

### 2. Create the admin account in Supabase Auth

Via Supabase dashboard → Authentication → Users → Invite user

### 3. Assign the admin role

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data ||
  '{"company_id": "<company-uuid>", "user_role": "admin"}'::jsonb
where email = 'admin@company.com';
```

### 4. The admin can then

- Create consultants from `/consultants`
- Create clients from `/clients`
- Create projects from `/projects`
- Invite managers/consultants via Supabase Auth
  (and assign their role + company_id via SQL)

---

## Glossary

| Term | Definition |
|------|------------|
| **Tenant** | A company using staff7 (e.g. NexDigital) |
| **Consultant** | A team member, billable or not |
| **Client** | An external company the firm sells services to |
| **Internal project** | A non-billable project (R&D, training, pre-sales) |
| **Assignment** | A consultant allocated to a project with an allocation % |
| **Daily rate** | The sold price per day for a consultant (TJM in French) |
| **Allocation** | The share of a consultant's time on a project (10–100%) |
| **Occupancy rate** | Total occupation = sum of all active allocations |
| **Paid leave** | Standard annual leave (CP — Congés Payés) |
| **RTT** | French work-time reduction days (Réduction du Temps de Travail) |