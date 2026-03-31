// WiserWits School ERP Portal - Validation Functions (Phase 1)

export function validateEmail(email: string): string | null {
  if (!email || email.trim() === "") {
    return "Email is required";
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Please enter a valid email address";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password || password.trim() === "") {
    return "Password is required";
  }
  if (password.length < 6) {
    return "Password must be at least 6 characters";
  }
  return null;
}

export function validateRequired(value: string, fieldName: string): string | null {
  if (!value || value.trim() === "") {
    return `${fieldName} is required`;
  }
  return null;
}

export function validatePhone(phone: string): string | null {
  if (!phone || phone.trim() === "") {
    return "Phone number is required";
  }
  const phoneRegex = /^[+]?[\d\s()-]{7,15}$/;
  if (!phoneRegex.test(phone)) {
    return "Please enter a valid phone number";
  }
  return null;
}

export function validatePartnerSetup(data: {
  partner_name: string;
  partner_type: string;
  contact_email: string;
  contact_phone: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  const nameError = validateRequired(data.partner_name, "Partner name");
  if (nameError) {
    errors.partner_name = nameError;
  }

  const typeError = validateRequired(data.partner_type, "Partner type");
  if (typeError) {
    errors.partner_type = typeError;
  }

  const emailError = validateEmail(data.contact_email);
  if (emailError) {
    errors.contact_email = emailError;
  }

  const phoneError = validatePhone(data.contact_phone);
  if (phoneError) {
    errors.contact_phone = phoneError;
  }

  return errors;
}
