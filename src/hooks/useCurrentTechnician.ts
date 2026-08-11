"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Technician {
  id: number;
  name: string;
  email: string;
  phone: string;
  availability: string;
  type: string;
  specialties: string[];
  skill_levels: any;
  rating: number;
  join_date: string;
  certifications: string[];
  vehicle_type: string;
  equipment_level: string;
  isActive: boolean;
}

export function useCurrentTechnician() {
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTechnician = async () => {
      try {
        const supabase = createClient();

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        // Match to technicians_maysene by email
        const { data: tech, error: techError } = await supabase
          .from("technicians_maysene")
          .select("*")
          .eq("email", user.email || "")
          .eq("isActive", true)
          .single();

        if (techError || !tech) {
          // Not a technician — that's fine, just return null
          setTechnician(null);
          setLoading(false);
          return;
        }

        setTechnician(tech);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTechnician();
  }, []);

  return { technician, loading, error };
}
