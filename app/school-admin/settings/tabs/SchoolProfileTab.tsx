"use client";

import React, { useEffect, useState } from "react";
import { Card, Input, Button, LoadingSkeleton } from "@/app/components/shared";

interface Partner {
  partner_name: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  registration_number: string;
  affiliated_board: string;
  website: string;
  partner_type: string;
  partner_code: string;
}

const initialFormState: Partner = {
  partner_name: "",
  contact_person: "",
  contact_email: "",
  contact_phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  registration_number: "",
  affiliated_board: "",
  website: "",
  partner_type: "",
  partner_code: "",
};

export default function SchoolProfileTab() {
  const [form, setForm] = useState<Partner>(initialFormState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Partner, string>>>({});
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (banner) {
      const timer = setTimeout(() => setBanner(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [banner]);

  async function fetchProfile() {
    try {
      setLoading(true);
      const res = await fetch("/api/partner/profile");
      if (!res.ok) throw new Error("Failed to fetch profile");
      const json = await res.json();
      const profile = json.data;
      const cleaned: Record<string, string> = {};
      for (const key of Object.keys(profile)) {
        cleaned[key] = profile[key] ?? "";
      }
      setForm(cleaned as unknown as Partner);
    } catch {
      setBanner({ type: "error", message: "Failed to load profile. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof Partner]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof Partner, string>> = {};
    if (!form.partner_name.trim()) {
      newErrors.partner_name = "Partner name is required";
    }
    if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) {
      newErrors.contact_email = "Enter a valid email address";
    }
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) {
      newErrors.pincode = "Enter a valid 6-digit pincode";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSaving(true);
      setBanner(null);
      const res = await fetch("/api/partner/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to update profile");
      }
      setBanner({ type: "success", message: "Profile updated successfully." });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update profile. Please try again.";
      setBanner({ type: "error", message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <LoadingSkeleton lines={10} />
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {banner && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
            banner.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {banner.message}
        </div>
      )}

      <Card>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">School Profile</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage your institution&apos;s basic information
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input
            label="Partner Name *"
            id="partner_name"
            name="partner_name"
            value={form.partner_name}
            onChange={handleChange}
            placeholder="Enter partner name"
            error={errors.partner_name}
          />
          <Input
            label="Partner Code"
            id="partner_code"
            name="partner_code"
            value={form.partner_code}
            onChange={handleChange}
            placeholder="Auto-generated"
            disabled
          />
          <Input
            label="Partner Type"
            id="partner_type"
            name="partner_type"
            value={form.partner_type}
            onChange={handleChange}
            disabled
          />
          <Input
            label="Contact Person"
            id="contact_person"
            name="contact_person"
            value={form.contact_person}
            onChange={handleChange}
            placeholder="Enter contact person name"
          />
          <Input
            label="Contact Email"
            id="contact_email"
            name="contact_email"
            type="email"
            value={form.contact_email}
            onChange={handleChange}
            placeholder="Enter contact email"
            error={errors.contact_email}
          />
          <Input
            label="Contact Phone"
            id="contact_phone"
            name="contact_phone"
            type="tel"
            value={form.contact_phone}
            onChange={handleChange}
            placeholder="Enter contact phone"
          />
          <Input
            label="Address"
            id="address"
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="Enter address"
            className="md:col-span-2"
          />
          <Input
            label="City"
            id="city"
            name="city"
            value={form.city}
            onChange={handleChange}
            placeholder="Enter city"
          />
          <Input
            label="State"
            id="state"
            name="state"
            value={form.state}
            onChange={handleChange}
            placeholder="Enter state"
          />
          <Input
            label="Pincode"
            id="pincode"
            name="pincode"
            value={form.pincode}
            onChange={handleChange}
            placeholder="Enter pincode"
            error={errors.pincode}
          />
          <Input
            label="Registration Number"
            id="registration_number"
            name="registration_number"
            value={form.registration_number}
            onChange={handleChange}
            placeholder="Enter registration number"
          />
          <Input
            label="Affiliated Board"
            id="affiliated_board"
            name="affiliated_board"
            value={form.affiliated_board}
            onChange={handleChange}
            placeholder="e.g. CBSE, ICSE, State Board"
          />
          <Input
            label="Website"
            id="website"
            name="website"
            type="url"
            value={form.website}
            onChange={handleChange}
            placeholder="https://www.example.com"
          />
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit" variant="primary" loading={saving}>
            Save Changes
          </Button>
        </div>
      </Card>
    </form>
  );
}
