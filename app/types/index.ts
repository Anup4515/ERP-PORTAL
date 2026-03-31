// WiserWits School ERP Portal - Type Definitions

export interface User {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  role_id: number;
  profile_photo_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface Partner {
  id: number;
  user_id: number;
  partner_type: "school" | "coaching" | "college" | "university" | "other";
  partner_name: string;
  partner_code: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  registration_number: string;
  affiliated_board: string;
  website: string;
  logo: string | null;
  additional_info: string | null;
  created_at: string;
  updated_at: string;
}

export interface Teacher {
  id: number;
  user_id: number;
  partner_id: number;
  teacher_type: string;
  subject_specialization: string;
  qualification: string;
  experience: string;
  number_of_hours: number;
  bio: string | null;
  profile_image: string | null;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: number;
  created_by: number;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  gender: string;
  date_of_birth: string;
  email: string;
  phone: string;
  alternate_phone: string | null;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  father_name: string;
  mother_name: string;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  profile_image: string | null;
  status: string;
  height: number | null;
  weight: number | null;
  blood_group: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AcademicSession {
  id: number;
  partner_id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassSection {
  id: number;
  session_id: number;
  class_id: number;
  section_id: number;
  class_teacher_id: number | null;
  second_incharge_id: number | null;
  max_students: number;
  created_at: string;
  updated_at: string;
}

export interface ClassInfo {
  id: number;
  partner_id: number;
  name: string;
  code: string;
  description: string | null;
  grade_level: number;
  display_order: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Section {
  id: number;
  class_id: number;
  name: string;
  room_no: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface StudentEnrollment {
  id: number;
  student_id: number;
  class_section_id: number;
  roll_number: string;
  student_type: string;
  enrollment_date: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: number;
  class_section_id: number;
  name: string;
  code: string;
  teacher_id: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_students: number;
  total_teachers: number;
  attendance_percentage: number;
  upcoming_exams: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// NextAuth module augmentation

declare module "next-auth" {
  interface User {
    user_id: number;
    school_id: number | null;
    role: string;
  }
  interface Session {
    user: {
      user_id: number;
      school_id: number | null;
      role: string;
      name: string;
      email: string;
    };
  }
}

// JWT type augmentation handled via `as any` casts in auth.ts callbacks
