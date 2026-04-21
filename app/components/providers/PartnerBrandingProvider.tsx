"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { getPartnerTypeLabel } from "@/app/lib/partner-type";

export interface PartnerBranding {
  partner_name: string;
  logo: string | null;
  partner_type: string | null;
}

interface PartnerBrandingContextValue {
  branding: PartnerBranding | null;
  loading: boolean;
  /** "school", "coaching centre", "college", "university", "institute" */
  label: string;
  /** "school's", "coaching centre's", ... */
  labelPossessive: string;
  refresh: () => Promise<void>;
}

const defaultLabels = getPartnerTypeLabel(null);

const PartnerBrandingContext = createContext<PartnerBrandingContextValue>({
  branding: null,
  loading: true,
  label: defaultLabels.noun,
  labelPossessive: defaultLabels.possessive,
  refresh: async () => {},
});

export function usePartnerBranding() {
  return useContext(PartnerBrandingContext);
}

export default function PartnerBrandingProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [branding, setBranding] = useState<PartnerBranding | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/partner/branding", { cache: "no-store" });
      if (!res.ok) {
        setBranding(null);
        return;
      }
      const json = await res.json();
      setBranding(json.data ?? null);
    } catch {
      setBranding(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      refresh();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, refresh]);

  useEffect(() => {
    function handle() {
      refresh();
    }
    window.addEventListener("wiserwits:branding-updated", handle);
    return () => window.removeEventListener("wiserwits:branding-updated", handle);
  }, [refresh]);

  const value = useMemo<PartnerBrandingContextValue>(() => {
    const variants = getPartnerTypeLabel(branding?.partner_type ?? null);
    return {
      branding,
      loading,
      label: variants.noun,
      labelPossessive: variants.possessive,
      refresh,
    };
  }, [branding, loading, refresh]);

  return (
    <PartnerBrandingContext.Provider value={value}>
      {children}
    </PartnerBrandingContext.Provider>
  );
}
