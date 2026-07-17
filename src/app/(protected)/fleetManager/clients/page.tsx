"use client";

import React, { useEffect, useState } from "react";
import { Plus, Pencil, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import ClientForm from "../../../../components/forms/client-form";
import { createClient } from "@/lib/supabase/client";

export default function ClientsPage() {
  const [open, setOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const supabase = createClient();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching clients:", error);
    } else {
      setClients(data || []);
    }
  };

  const filteredClients = clients.filter((c: any) =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalClients = clients.length;
  const activeClients = clients.filter((c: any) => c.status === "Active").length;
  const inactiveClients = clients.filter((c: any) => c.status === "inactive").length;
  const suspendedClients = clients.filter((c: any) => c.status === "Suspended").length;

  const screenStats = [
    { title: "Total Clients", value: totalClients, icon: "🏢" },
    { title: "Active", value: activeClients, icon: "✅" },
    { title: "Inactive", value: inactiveClients, icon: "⏸️" },
    { title: "Suspended", value: suspendedClients, icon: "🚫" },
  ];

  const handleEdit = (client: any) => {
    setEditingClient(client);
    setOpen(true);
  };

  const handleRowClick = (client: any) => {
    setEditingClient(client);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingClient(null);
    fetchClients();
  };

  const getStatusBadge = (status: string) => {
    const statusColors: { [key: string]: string } = {
      Active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      Suspended: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          statusColors[status] || "bg-gray-100 text-gray-800"
        }`}
      >
        {status || "Unknown"}
      </span>
    );
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Title Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-gray-500">Manage your clients and their details</p>
        </div>
        <button
          onClick={() => {
            setEditingClient(null);
            setOpen(true);
          }}
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

      {/* Header with Search */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">All Clients</h3>
          <p className="text-sm text-gray-500">View and manage all your clients</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
          />
        </div>
      </div>

      {/* Striped Table */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-sm text-left table-auto">
          <thead className="text-xs uppercase bg-gray-100 text-gray-700">
            <tr>
              <th className="px-4 py-3 font-semibold w-[20%]">Name</th>
              <th className="px-4 py-3 font-semibold w-[12%]">Status</th>
              <th className="px-4 py-3 font-semibold w-[30%]">Address</th>
              <th className="px-4 py-3 font-semibold w-[15%]">Contact</th>
              <th className="px-4 py-3 font-semibold w-[13%]">Phone</th>
              <th className="px-4 py-3 font-semibold text-center w-[10%]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((client: any, index: number) => (
              <tr
                key={client.id}
                className={`border-b cursor-pointer transition-colors hover:bg-blue-50 ${
                  index % 2 === 0 ? "bg-white" : "bg-gray-50"
                }`}
                onClick={() => handleRowClick(client)}
              >
                <td className="px-4 py-3 font-medium text-gray-900 truncate max-w-0" title={client.name}>
                  {client.name || "-"}
                </td>
                <td className="px-4 py-3">{getStatusBadge(client.status)}</td>
                <td className="px-4 py-3 text-gray-600 truncate max-w-0" title={client.address}>
                  {client.address || "-"}
                </td>
                <td className="px-4 py-3 text-gray-600 truncate max-w-0">{client.contact_person || "-"}</td>
                <td className="px-4 py-3 text-gray-600 truncate max-w-0">{client.contact_phone || client.phone || "-"}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(client);
                    }}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Edit Client"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredClients.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  No clients found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Client Form Modal - Radix UI Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!w-[80vw] !max-w-[80vw] !h-[80vh] !max-h-[80vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingClient ? "Edit Client" : "Add Client"}
            </DialogTitle>
            <DialogDescription>
              {editingClient
                ? `Editing ${editingClient.name || "client"}`
                : "Enter the details for the new client"}
            </DialogDescription>
          </DialogHeader>
          <ClientForm
            onCancel={handleClose}
            id={editingClient?.id}
            clientData={editingClient}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
