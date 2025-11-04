// types.ts

export interface Vehicle {
  id: number;
  registration_number: string | null;
  make: string | null;
  model: string | null;
  manufactured_year: string | null;
  fuel_type: string | null;
  transmission_type: string | null;
  vin_number: string | null;
  fleet_number: string | null;

}

export interface JobAssignment {
  id: number;
  created_at: string | null;
  description: string;
  status: string | null;
  vehicle_id: number | null;
  driver_id: number | null;
  location: string | null;
  service: string | null;
}

export interface Driver {
  id: number;
  first_name: string;
  surname: string;
  cell_number: string | null;
}
