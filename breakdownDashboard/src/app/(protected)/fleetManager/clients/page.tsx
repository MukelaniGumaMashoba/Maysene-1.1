"use client";

import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { useGlobalContext } from "@/context/global-context/context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ClientForm } from "../../../../components/forms/client-form";
import { DialogTitle } from "@radix-ui/react-dialog";
import { initialClientState } from "@/context/clients-context/context";
import { downloadCSVFromTable } from "@/lib/csv-parser";
import { createClient } from "@/lib/supabase/client";

export default function ClientsPage() {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchClients = async () => {
      const { data, error } = await supabase.from("clients").select("*");
      if (error) {
        console.error("Error fetching clients:", error);
      } else {
        setClients(data as any);
      }
    };
    fetchClients();
  }, []);

  // Calculate stats from actual data
  const totalClients = clients.length;
  const activeClients = clients.filter((client: any) => client.status === 'active').length;
  const inactiveClients = clients.filter((client: any) => client.status === 'inactive').length;
  const suspendedClients = clients.filter((client: any) => client.status === 'suspended').length;

  const screenStats = [
    { title: "Total Clients", value: totalClients, icon: "🏢" },
    { title: "Active", value: activeClients, icon: "✅" },
    { title: "Inactive", value: inactiveClients, icon: "⏸️" },
    { title: "Suspended", value: suspendedClients, icon: "🚫" },
  ];

  // Define columns without edit functionality
  const columns = () => [
    {
      accessorKey: "name",
      header: "Company Name",
      cell: ({ row }: any) => row.original.name || "-",
    },
    {
      accessorKey: "contact_person",
      header: "Contact Person",
      cell: ({ row }: any) => row.original.contact_person || row.original.contactPerson || "-",
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }: any) => row.original.email || "-",
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }: any) => row.original.phone || "-",
    },
    {
      accessorKey: "city",
      header: "City",
      cell: ({ row }: any) => row.original.city || "-",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const status = row.original.status;
        const statusColors: { [key: string]: string } = {
          active: "bg-green-100 text-green-800",
          inactive: "bg-gray-100 text-gray-800",
          suspended: "bg-red-100 text-red-800",
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || "bg-gray-100 text-gray-800"}`}>
            {status || "Unknown"}
          </span>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6 w-full">
      {/* Title Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-gray-500">Manage your clients</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center px-4 py-2 bg-primary text-white rounded-lg shadow hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </button>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {screenStats.map((stat, i) => (
          <div
            key={i}
            className="p-6 rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow flex items-center space-x-4"
          >
            <div className="text-2xl">{stat.icon}</div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow">
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">All Clients</h3>
            <p className="text-sm text-gray-500">View and manage all your clients</p>
          </div>
          <DataTable
            columns={columns()}
            data={clients || []}
            filterColumn={[]}
            filterPlaceholder={""}
            csv_headers={[]}
            csv_rows={[]}
            href={null}
            downloadCSV={[]}
          />
        </div>
      </div>

      {/* Client Form Modal */}
      <Dialog open={open} onOpenChange={setOpen} modal={true}>
        <DialogContent className="max-h-[90vh] overflow-y-auto min-w-2/4">
          <ClientForm onCancel={() => setOpen(false)} id={undefined} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
