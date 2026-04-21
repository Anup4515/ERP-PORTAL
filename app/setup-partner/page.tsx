"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { Card, Button, Input, Select } from "@/app/components/shared";

const MAX_LOGO_BYTES = 500 * 1024; // 500 KB

const partnerTypeOptions = [
  { value: "", label: "Select type..." },
  { value: "school", label: "School" },
  { value: "coaching", label: "Coaching Institute" },
  { value: "college", label: "College" },
  { value: "university", label: "University" },
  { value: "other", label: "Other" },
];

interface FormData {
  partner_name: string;
  partner_type: string;
  registration_number: string;
  affiliated_board: string;
  website: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

const initialForm: FormData = {
  partner_name: "",
  partner_type: "",
  registration_number: "",
  affiliated_board: "",
  website: "",
  contact_person: "",
  contact_email: "",
  contact_phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
};

export default function SetupPartnerPage() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState("");
  const [logo, setLogo] = useState<string>("");
  const [logoError, setLogoError] = useState<string>("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLogoError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/^image\/(png|jpe?g|webp|svg\+xml)$/.test(file.type)) {
      setLogoError("Please upload a PNG, JPEG, WEBP, or SVG image.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("Logo must be 500 KB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLogo(reader.result);
      }
    };
    reader.onerror = () => setLogoError("Could not read the file. Please try again.");
    reader.readAsDataURL(file);
  }

  function handleRemoveLogo() {
    setLogo("");
    setLogoError("");
    if (logoInputRef.current) logoInputRef.current.value = "";
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name as keyof FormData]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name as keyof FormData];
        return next;
      });
    }
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!logo) {
      setLogoError("Institution logo is required");
    }
    if (!form.partner_name.trim()) {
      newErrors.partner_name = "Institution name is required";
    }
    if (!form.partner_type) {
      newErrors.partner_type = "Partner type is required";
    }
    if (form.website && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(form.website.trim())) {
      newErrors.website = "Enter a valid URL starting with http:// or https://";
    }
    if (!form.contact_email.trim()) {
      newErrors.contact_email = "Contact email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) {
      newErrors.contact_email = "Enter a valid email address";
    }
    const phone = form.contact_phone.replace(/\D/g, "");
    if (!form.contact_phone.trim()) {
      newErrors.contact_phone = "Contact phone is required";
    } else if (phone.length !== 10) {
      newErrors.contact_phone = "Phone number must be exactly 10 digits";
    }
    if (form.pincode && !/^\d{6}$/.test(form.pincode.trim())) {
      newErrors.pincode = "Pincode must be exactly 6 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && !!logo;
  }

  function scrollToFirstError(firstErrorKey: string) {
    // Try to find by id (inputs use `id={name}`, logo section uses `field-logo`)
    const selector =
      firstErrorKey === "logo"
        ? "#field-logo"
        : `#${CSS.escape(firstErrorKey)}`;
    const el = document.querySelector<HTMLElement>(selector);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Focus the input if it's focusable
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLSelectElement ||
        el instanceof HTMLTextAreaElement
      ) {
        el.focus({ preventScroll: true });
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      // Order: logo → partner_name → partner_type → contact_email → contact_phone → pincode → website
      const order: (keyof FormData | "logo")[] = [
        "logo",
        "partner_name",
        "partner_type",
        "contact_email",
        "contact_phone",
        "pincode",
        "website",
      ];
      // Re-read errors via closure-safe check using a microtask: state may not be flushed yet,
      // so compute errors synchronously with the same rules used in validate().
      const hasLogoError = !logo;
      const firstKey = order.find((k) => {
        if (k === "logo") return hasLogoError;
        const val = form[k as keyof FormData];
        switch (k) {
          case "partner_name":
            return !val.trim();
          case "partner_type":
            return !val;
          case "contact_email":
            return !val.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
          case "contact_phone": {
            const phone = val.replace(/\D/g, "");
            return !val.trim() || phone.length !== 10;
          }
          case "pincode":
            return !!val && !/^\d{6}$/.test(val.trim());
          case "website":
            return !!val && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(val.trim());
          default:
            return false;
        }
      });
      if (firstKey) scrollToFirstError(firstKey);
      return;
    }

    setLoading(true);
    setApiError("");

    try {
      const res = await fetch("/api/partner/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, logo: logo || null }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }

      setSuccess(true);

      // Sign out so JWT refreshes with school_id on next login
      setTimeout(() => {
        signOut({ callbackUrl: "/login" });
      }, 2000);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        {/* Success checkmark */}
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Profile Created Successfully!
        </h2>
        <p className="text-gray-500">
          Redirecting you to login so your session is refreshed...
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Header + sign-out */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Set Up Your Institution
          </h1>
          <p className="mt-1 text-gray-500">
            Complete your profile to get started
          </p>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-gray-500 hover:text-primary-600 transition-colors cursor-pointer"
        >
          Sign out
        </button>
      </div>

      {apiError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ── Section 1: Institution Details ── */}
        <Card padding="lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-50">
              <svg
                className="w-5 h-5 text-primary-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Institution Details
              </h2>
              <p className="text-sm text-gray-500">
                Basic information about your institution
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6 space-y-5">
            {/* Institution Logo */}
            <div id="field-logo" className="flex flex-col gap-1.5 scroll-mt-24">
              <label className="text-sm font-medium text-gray-700">
                Institution Logo *
              </label>
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-20 h-20 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden shrink-0">
                  {logo ? (
                    <Image
                      src={logo}
                      alt="Logo preview"
                      width={80}
                      height={80}
                      unoptimized
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <svg
                      className="w-8 h-8 text-gray-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoChange}
                    className="block text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 file:cursor-pointer cursor-pointer"
                  />
                  {logo && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="self-start text-xs text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                  <p className="text-xs text-gray-400">
                    PNG, JPEG, WEBP, or SVG. Max 500 KB.
                  </p>
                </div>
              </div>
              {logoError && (
                <p className="text-xs text-red-600 mt-1">{logoError}</p>
              )}
            </div>

            <Input
              label="Partner Name *"
              id="partner_name"
              name="partner_name"
              placeholder="e.g. Delhi Public School"
              value={form.partner_name}
              onChange={handleChange}
              error={errors.partner_name}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Select
                label="Partner Type *"
                id="partner_type"
                name="partner_type"
                value={form.partner_type}
                onChange={handleChange}
                options={partnerTypeOptions}
                error={errors.partner_type}
              />
              <Input
                label="Registration Number"
                id="registration_number"
                name="registration_number"
                placeholder="e.g. REG-2024-00123"
                value={form.registration_number}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="Affiliated Board"
                id="affiliated_board"
                name="affiliated_board"
                placeholder="e.g. CBSE, ICSE, State Board"
                value={form.affiliated_board}
                onChange={handleChange}
              />
              <Input
                label="Website"
                id="website"
                name="website"
                type="url"
                placeholder="https://www.example.com"
                value={form.website}
                onChange={handleChange}
                error={errors.website}
              />
            </div>
          </div>
        </Card>

        {/* ── Section 2: Contact Information ── */}
        <Card padding="lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent-50">
              <svg
                className="w-5 h-5 text-accent-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Contact Information
              </h2>
              <p className="text-sm text-gray-500">
                Primary contact details for your institution
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6 space-y-5">
            <Input
              label="Contact Person"
              id="contact_person"
              name="contact_person"
              placeholder="Full name of the primary contact"
              value={form.contact_person}
              onChange={handleChange}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="Contact Email *"
                id="contact_email"
                name="contact_email"
                type="email"
                placeholder="admin@org.edu"
                value={form.contact_email}
                onChange={handleChange}
                error={errors.contact_email}
              />
              <Input
                label="Contact Phone *"
                id="contact_phone"
                name="contact_phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="9876543210"
                value={form.contact_phone}
                onChange={handleChange}
                error={errors.contact_phone}
              />
            </div>
          </div>
        </Card>

        {/* ── Section 3: Address ── */}
        <Card padding="lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-50">
              <svg
                className="w-5 h-5 text-primary-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Address</h2>
              <p className="text-sm text-gray-500">
                Physical location of your institution
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6 space-y-5">
            {/* Textarea for address — Input component doesn't support textarea, so inline */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="address"
                className="text-sm font-medium text-gray-700"
              >
                Address
              </label>
              <textarea
                id="address"
                name="address"
                rows={3}
                placeholder="Street address, landmark, etc."
                value={form.address}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary-500 focus:border-primary-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <Input
                label="City"
                id="city"
                name="city"
                placeholder="e.g. New Delhi"
                value={form.city}
                onChange={handleChange}
              />
              <Input
                label="State"
                id="state"
                name="state"
                placeholder="e.g. Delhi"
                value={form.state}
                onChange={handleChange}
              />
              <Input
                label="Pincode"
                id="pincode"
                name="pincode"
                inputMode="numeric"
                maxLength={6}
                placeholder="e.g. 110001"
                value={form.pincode}
                onChange={handleChange}
                error={errors.pincode}
              />
            </div>
          </div>
        </Card>

        {/* Submit */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          className="w-full"
        >
          Create Profile
        </Button>
      </form>
    </>
  );
}
