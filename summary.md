# WiserWits School ERP Portal — Feature Plan & Workflow Guide

> **Purpose:** This document outlines the planned features and page-by-page workflows for the WiserWits School ERP Portal. It is intended for non-technical stakeholders, team members, and clients to understand what the portal will do, how each page will work, and what actions will be available for School Admins and Teachers. Please review and share your feedback on what additional features or changes you would like.

---

## Overview

The WiserWits School ERP Portal will be a web-based application designed for **school staff** to manage day-to-day school operations digitally. There will be two types of users:

1. **School Admin** (Principal / Office Staff) — Full control over all school data
2. **Teacher** — Access limited to their assigned classes and subjects

The portal will cover: Student Management, Attendance Tracking, Academic Calendar, Exam Management, Marks Entry, Holistic Development Tracking, and Report Card Generation.

---

## Login & Authentication

### Login Page
- Users will log in with their **email and password**
- The system will automatically detect whether the user is a School Admin or Teacher and redirect to the appropriate dashboard
- Passwords will be securely encrypted

### Forgot Password
- User will enter their registered email
- A 6-digit OTP (One-Time Password) will be sent to the email
- User will verify the OTP and set a new password
- 3-step process: Enter Email → Enter OTP → Set New Password

### Security
- All pages will be protected — users must be logged in to access any page
- School Admins will not be able to access Teacher pages and vice versa
- After logging out, users will be redirected to the login page

---

## School Admin Dashboard

### What the Admin Will See on the Dashboard

| Section | What It Will Show |
|---------|-------------------|
| **Total Students** | Number of students enrolled in the school |
| **Total Teachers** | Number of teachers in the school |
| **Today's Attendance %** | Percentage of students marked present today |
| **Upcoming Exams** | Count of exams that are scheduled but haven't happened yet |
| **Student Enrollment Trend** | A bar chart showing enrollment numbers over recent months |
| **Upcoming Exams List** | Names of upcoming exams with their class, dates, and status (Upcoming/In Progress) |

---

## School Admin — Planned Pages & Workflows

### 1. Settings

The Settings page will have **6 tabs** that allow the admin to configure the school:

#### Tab 1: School Profile
- **What it will do:** View and edit school information
- **Fields:** School Name, Contact Person, Contact Email, Contact Phone, Address, City, State, Pincode, Website
- **Workflow:** Admin will edit any field → click "Save Changes" → information will be updated

#### Tab 2: Academic Sessions
- **What it will do:** Manage academic years (e.g., 2025-2026, 2026-2027)
- **Planned Features:**
  - View all sessions in a table with Name, Start Date, End Date, and Current status
  - Create a new session by entering name and date range
  - Set any session as "Current" — this will determine which session's data is shown across the portal
  - Delete old sessions (will not be able to delete the current session)
- **Workflow:** Admin will create session (e.g., "2026-2027", April 1 to March 31) → set it as current → all data entry will happen under this session

#### Tab 3: Classes & Sections
- **What it will do:** Define classes and their sections
- **Planned Features:**
  - View all classes (e.g., 8th, 10th, 11th, 12th) with their sections listed
  - Add a new class with name and optional code
  - Add sections under each class (e.g., Section A, Section B)
  - Expand/collapse each class to see its sections
- **Workflow:** Admin will add "11th" → add Section "A" and Section "B" under it

#### Tab 4: Subjects
- **What it will do:** Define subjects for each class-section combination
- **Planned Features:**
  - Select Session, Class, and Section from dropdowns
  - View all subjects for that combination
  - Add a new subject with Name, Code, and optionally assign a teacher
- **Workflow:** Admin will select "11th - A" → add Mathematics, Physics, Chemistry, English, Computer Science

#### Tab 5: Grading
- **What it will do:** Define how grades are calculated from marks
- **Planned Features:**
  - Create a grading scheme (e.g., "Default Percentage Grading" of type Percentage)
  - Define grade ranges within the scheme (e.g., A+ = 90-100%, A = 80-89%, B+ = 70-79%, etc.)
  - Multiple schemes can exist for different sessions
- **Workflow:** Admin will create scheme → add 8 grade ranges from A+ to F → when marks are entered, grades will be auto-calculated

#### Tab 6: Holistic Parameters
- **What it will do:** Define the 6 holistic development categories and their sub-parameters
- **Planned Categories:**
  1. Physical Activity (Stamina, Participation in Sports, Teamwork, Fitness, Interest)
  2. Academic Performance (Competition, Consistency, Test Preparedness, Class Engagement, Subject Understanding, Homework)
  3. Mental Parameters (Grasping Ability, Retention Power, Conceptual Clarity, Attention Span, Learning Speed)
  4. Behavioural Parameters (Peer Interaction, Discipline, Respect for Authority, Motivation, Feedback Response)
  5. Creativity & Innovation (Initiative in Projects, Curiosity, Problem Solving, Extra Curricular, Idea Generation)
  6. Subject-Wise Rating (Maths, Science, English, Social Studies, Computer Science)
- **Planned Features:** View all parameters with their sub-parameters, add new parameters, add sub-parameters

---

### 2. Teachers

#### Teacher List Page
- **What it will show:** Table of all teachers with Name, Email, Phone, Qualification
- **Planned Features:**
  - Search teachers by name
  - "Add Teacher" button to create a new teacher account
  - Click "View" on any teacher to see their detail page

#### Add Teacher
- **Fields:** Name, Email, Password, Phone, Qualification, Specialization, Experience
- **What will happen:** Will create a user account for the teacher who can then log in to the Teacher Dashboard

#### Teacher Detail Page
- **What it will show:** Teacher's profile information + their class/subject assignments
- **Planned Features:**
  - Edit teacher's name, phone, qualification, specialization
  - **Add Assignment** — assign the teacher to a class, section, subject, and role:
    - **Class Teacher** — responsible for the entire class
    - **Second Incharge** — backup class teacher
  - All dropdowns (Class, Section, Subject, Role) will be pre-populated from the school's data
  - View existing assignments in a table

---

### 3. Students

#### Student List Page
- **What it will show:** Table of all students with Roll No, Name, Class, Section, Gender, Status
- **Planned Features:**
  - Filter by Class and Section using dropdowns
  - Search by student name
  - "Add Student" button
  - "Import" button for bulk CSV upload
  - "Export CSV" button to download student list

#### Add Student
- **Two-column form:**
  - Left: Personal Information (First Name, Last Name, Email, Phone, Gender, Date of Birth)
  - Right: Parent/Guardian Information (Father's Name, Mother's Name, Guardian Name/Phone/Email)
  - Bottom: Enrollment Details (Class, Section, Session Year, Roll Number)
- **What will happen:** Student will be created and enrolled in the selected class for the session

#### Student Detail Page
- **Planned Tabs:**
  - **Profile** — View/edit student's personal and parent information
  - **Enrollment** — View enrollment history across sessions (which class/section each year)

#### Bulk Import
- Upload a CSV file with student data
- Preview first 5 rows before importing
- System will create students and enroll them automatically

---

### 4. Attendance

#### Daily Attendance Entry
- **Planned Workflow:**
  1. Select Date, Class, and Section
  2. See list of all students in that class
  3. Click "Mark All Present" — sets everyone to P (Present)
  4. Manually toggle individual students to A (Absent), L (Late), or H (Half-day)
  5. Click "Save Attendance"
- **Color coding:** Green = Present, Red = Absent, Yellow = Late, Blue = Half-day
- **Holiday check:** If the selected date is marked as a holiday in the calendar, attendance will not be markable

#### Monthly Attendance Grid
- **What it will show:** A calendar-style grid where:
  - Rows = Students
  - Columns = Days of the month (1, 2, 3... 31)
  - Each cell will show a colored circle (Green=P, Red=A, Yellow=L, Gray=Holiday)
  - Sticky first column so student names are always visible when scrolling
- **Useful for:** Quick visual overview of the entire month's attendance for a class

#### Attendance Summary
- **What it will show:** Per-student attendance statistics
- **Columns:** Student Name, Total Days, Present, Absent, Late, Half-Day, Percentage
- **Color coding:** Green (>90%), Yellow (75-90%), Red (<75%) for attendance percentage

---

### 5. Calendar

- **What it will show:** A monthly calendar view for the academic session
- **Planned Features:**
  - **Generate Calendar** — Will create all 365 days for the session. Sundays will be automatically marked as holidays
  - **Mark All Saturdays** — One-click to mark all Saturdays as holidays
  - **Click any day** — Will open a popup to toggle between Working Day and Holiday, with an optional reason (e.g., "Diwali", "Republic Day")
  - **Monthly summary** at bottom: Total Days, Holidays, Working Days
  - Navigate between months using Prev/Next buttons
  - Select different academic sessions from dropdown
- **Connection to Attendance:** Days marked as holidays will appear as gray non-editable cells in the attendance grid. Teachers will not be able to mark attendance on holidays.

---

### 6. Exams

#### Exam List Page
- **What it will show:** Table of all exams with Name, Code, Class/Section, Dates, Status
- **Status badges:** Upcoming (blue), In Progress (yellow), Completed (green), Cancelled (red)
- **Planned Features:** "Create Exam" button, click any exam to see details

#### Create Exam
- **Fields:** Name, Code, Class, Section, Session Year, Start Date, End Date
- **What will happen:** Exam will be created with "Upcoming" status

#### Exam Detail Page
- **What it will show:** Exam information + subject-wise schedule
- **Exam Schedule Table:** Subject, Date, Time, Duration, Room Number
- **Planned Features:**
  - Edit exam details (name, dates, status)
  - Add subjects to the exam schedule
  - Each subject will get a date, time, duration, and room assignment
  - **Important:** Only subjects added to the schedule will appear in the marks entry grid

---

### 7. Marks Entry

- **Planned Workflow:**
  1. Select Exam, Subject, Class, Section
  2. Grid will show all students with marks input fields
  3. Set max marks at the top (default 100, can be changed to 200, etc.)
  4. Enter marks for each student
  5. Mark absent students using the AB checkbox
  6. Percentage and Grade will auto-calculate as marks are entered
  7. Click "Save Marks"
- **Planned Features:**
  - Tab key will move to next student's marks field for fast keyboard entry
  - Marks below passing threshold will be highlighted in red
  - Grades will be auto-calculated from the grading scheme (A+, A, B+, etc.)
  - Can re-enter marks — saving again will update instead of duplicating

#### Marks Overview
- Will show all subjects for an exam in one view (students x subjects matrix)
- Export to CSV option

#### Marks Statistics
- Class-level stats: Average, Highest, Lowest marks, Pass Percentage
- Top performers list

---

### 8. Holistic Development

#### Parameter List Page
- Will show all 6 holistic development categories as cards
- Each card will show the parameter name and number of sub-parameters
- Click a card to open the rating entry grid

#### Rating Entry Grid
- **Planned Workflow:**
  1. Select Month, Class, Section
  2. Grid will show: Rows = Students, Columns = Sub-parameters (e.g., Stamina, Discipline, etc.)
  3. Each cell will be a number input (1 to 10)
  4. "Set Default (5)" button — will fill all cells with 5 as starting point
  5. Teacher will adjust individual ratings up or down
  6. Click "Save Ratings"
- **Color coding:** Red (1-3), Yellow (4-6), Green (7-10) for visual feedback
- **Monthly tracking:** Ratings will be entered per month, allowing trend analysis over time

---

### 9. Reports

Three types of reports are planned:

#### Monthly Report
- **Select:** Student + Month
- **Will Show:** Attendance summary for the month + Holistic development scores
- "Download PDF" button

#### Exam Report
- **Select:** Student + Exam
- **Will Show:** Subject-wise marks, total, percentage, grade
- Failing subjects will be highlighted in red

#### Annual Report
- **Select:** Student + Session
- **Will Show:** All exams consolidated, yearly attendance summary, holistic trends
- Comprehensive year-end view

---

## Teacher Dashboard

### What the Teacher Will See on Login

| Section | What It Will Show |
|---------|-------------------|
| **My Classes** | Number of classes assigned to this teacher |
| **My Students** | Total students across assigned classes |
| **Pending Marks** | Number of marks entries pending |
| **Class Cards** | Each assigned class with name, section, role, and attendance status for today |
| **Quick Actions** | Buttons to navigate to Students, Marks, Holistic pages |
| **Teacher Notes** | Personal notepad area |

---

## Teacher — Planned Pages & Workflows

> **Key difference from Admin:** Teachers will ONLY see and work with their assigned classes and subjects. They will not be able to access other classes, create exams, manage calendar, or add students.

### 1. My Classes
- **What it will show:** Detailed view of all assigned classes
- **For each class:** Class name, Section, Role (Class Teacher/Subject Teacher), Subjects being taught, Student count
- **Quick action buttons:** View Students, Attendance, Marks

### 2. Students
- **What it will show:** Students in the teacher's assigned classes only
- **Planned Features:** Dropdown to select class-section, search by name, view student details
- **Read-only** — teachers will not be able to add/edit/delete students

### 3. Attendance (Monthly Grid View)
- **What it will show:** Full month attendance grid for the assigned class
- **Planned Layout:**
  - Rows = Students (Roll No + Name)
  - Columns = Days of the month (1, 2, 3... 31)
  - Last 2 columns = Total Present (P) and Total Absent (A)
- **Planned Features:**
  - **Checkbox above each date** — check to mark ALL students as Present for that day
  - **Click any cell** to cycle through: Present (P) → Absent (A) → Late (L) → Clear
  - **Holiday columns** will be shown in gray and will not be editable
  - **Future dates** will be grayed out
  - **Save All Attendance** button will save all changes at once
- **Color coding:** Green = P, Red = A, Yellow = L, Gray = Holiday

### 4. Calendar (Read-Only)
- **What it will show:** Same calendar as admin but **view-only**
- Teacher will be able to see which days are holidays and working days
- Will not be modifiable — teacher must contact admin to add/change holidays

### 5. Marks Entry
- **Step 1:** Teacher will see list of exams for their assigned class
- **Step 2:** Click an exam to open the marks grid
- **Planned Marks Grid Layout (Excel-like format):**
  ```
                    │   Mathematics    │     Physics      │    Chemistry     │
                    │ Marks│ Ab/NA│ %  │ Marks│ Ab/NA│ %  │ Marks│ Ab/NA│ %  │
    Maximum Marks>> │ [200]│  -   │ -  │ [200]│  -   │ -  │ [200]│  -   │ -  │
  ──────────────────┼──────┼──────┼────┼──────┼──────┼────┼──────┼──────┼────┤
  1  Aarav    │  1  │  150 │  -   │75% │  160 │  -   │80% │  170 │  -   │85% │
  2  Vivaan   │  2  │      │  AB  │ 0% │   45 │  -   │23% │      │  AB  │ 0% │
  3  Aditya   │  3  │  180 │  -   │90% │   90 │  -   │45% │  140 │  -   │70% │
  ```
- **Planned Features:**
  - All subjects for the exam will be shown side-by-side
  - Editable max marks per subject (default 100)
  - Click "-" to mark absent (will show "AB"), click "AB" to un-mark
  - Percentage will auto-calculate as marks are entered
  - Below 33% will be highlighted in red
  - "Save All Marks" will save everything in one click

### 6. Holistic Development
- Same as admin but scoped to assigned classes only
- Teacher will rate students on the 6 development parameters monthly

### 7. Reports
- Same 3 report types (Monthly, Exam, Annual) but only for students in assigned classes
- Will be able to download individual student PDFs

### 8. My Profile
- **What it will show:** Teacher's personal information, qualifications, assigned classes and subjects
- **Planned Features:** Update name and phone number, view all assignments with roles

---

## How Everything Will Connect

```
Admin sets up school
        │
        ├── Creates Sessions (e.g., 2026-2027)
        ├── Creates Classes & Sections (11th-A, 12th-B, etc.)
        ├── Adds Subjects per class (Math, Science, English...)
        ├── Sets up Grading Scheme (A+ = 90-100%, etc.)
        ├── Defines Holistic Parameters (6 categories, 31 sub-parameters)
        ├── Generates Calendar (365 days, Sundays = holidays)
        │
        ├── Adds Teachers & Assigns them to Classes/Subjects
        ├── Adds Students & Enrolls them in Classes
        │
        ├── Creates Exams & adds Subject Schedule
        │
        └── All data flows to Teacher Dashboard
                │
                ├── Teacher sees assigned classes & students
                ├── Teacher marks daily attendance (grid view)
                ├── Teacher enters marks per exam (Excel-like grid)
                ├── Teacher rates holistic development monthly
                │
                └── Reports generated from all collected data
                        │
                        ├── Monthly Report = Attendance + Holistic Scores
                        ├── Exam Report = Subject-wise Marks + Grades
                        └── Annual Report = All Exams + Yearly Attendance + Trends
```

---

## Planned Feature Roadmap

