"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  User,
  UserCheck,
  FileEdit,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Play,
  Package,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface StatusHistoryEntry {
  id: number;
  job_id: number;
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  changed_by_name: string | null;
  changed_by_role: string | null;
  change_reason: string | null;
  notes: string | null;
  metadata: {
    old_status?: string;
    new_status?: string;
    edited_after_approval?: boolean;
    requires_reapproval?: boolean;
    parts_added?: boolean;
    cost_changed?: boolean;
  };
  created_at: string;
}

interface JobStatusHistoryProps {
  jobId: number;
  compact?: boolean;
}

export default function JobStatusHistory({
  jobId,
  compact = false,
}: JobStatusHistoryProps) {
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchHistory();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`job-history-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "job_status_history",
          filter: `job_id=eq.${jobId}`,
        },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("job_status_history")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Resolve changed_by names from users or technicians_maysene
      const entries = await Promise.all(
        data.map(async (entry: any) => {
          let changedByName = entry.changed_by_name || entry.changed_by_role;

          if (entry.changed_by && !entry.changed_by_name) {
            // Try users table first
            const { data: user } = await supabase
              .from("users")
              .select("email, role")
              .eq("id", entry.changed_by)
              .single();

            if (user) {
              changedByName = user.email || user.role;
            } else {
              // Try technicians_maysene
              const { data: tech } = await supabase
                .from("technicians_maysene")
                .select("name")
                .eq("id", entry.changed_by)
                .single();
              if (tech) {
                changedByName = tech.name;
              }
            }
          }

          return { ...entry, changed_by_name: changedByName };
        })
      );
      setHistory(entries as StatusHistoryEntry[]);
    } else {
      console.error("Error fetching job history:", error);
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case "awaiting_assignment":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "mechanic_assigned":
      case "subcontractor_assigned":
        return <UserCheck className="h-4 w-4 text-blue-600" />;
      case "mechanic_accepted":
        return <CheckCircle className="h-4 w-4 text-indigo-600" />;
      case "job_in_progress":
        return <Play className="h-4 w-4 text-orange-600" />;
      case "parts_outstanding":
        return <Package className="h-4 w-4 text-amber-600" />;
      case "parts_received":
        return <Package className="h-4 w-4 text-teal-600" />;
      case "returned_to_office":
        return <RefreshCw className="h-4 w-4 text-gray-600" />;
      case "job_completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "quality_check_done":
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case "job_cancelled":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case "awaiting_assignment":
        return "bg-yellow-100 text-yellow-800";
      case "mechanic_assigned":
        return "bg-blue-100 text-blue-800";
      case "subcontractor_assigned":
        return "bg-purple-100 text-purple-800";
      case "mechanic_accepted":
        return "bg-indigo-100 text-indigo-800";
      case "job_in_progress":
        return "bg-orange-100 text-orange-800";
      case "parts_outstanding":
        return "bg-amber-100 text-amber-800";
      case "parts_received":
        return "bg-teal-100 text-teal-800";
      case "returned_to_office":
        return "bg-gray-100 text-gray-800";
      case "job_completed":
        return "bg-green-100 text-green-800";
      case "quality_check_done":
        return "bg-emerald-100 text-emerald-800";
      case "job_cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatStatus = (status: string | null) => {
    if (!status) return "Unknown";
    return status
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  if (loading) {
    return (
      <Card className={compact ? "" : "w-full"}>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className={compact ? "" : "w-full"}>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <TrendingUp className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500 text-sm">No status changes yet</p>
        </CardContent>
      </Card>
    );
  }

  const HistoryContent = () => (
    <div className="space-y-4">
      {history.map((entry, index) => (
        <div key={entry.id}>
          <div className="flex gap-4">
            {/* Timeline indicator */}
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-white border-2 border-gray-300 p-1.5">
                {getStatusIcon(entry.to_status)}
              </div>
              {index < history.length - 1 && (
                <div className="w-0.5 h-full bg-gray-200 my-1 min-h-[40px]" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {entry.from_status && (
                    <>
                      <Badge
                        variant="outline"
                        className={getStatusColor(entry.from_status)}
                      >
                        {formatStatus(entry.from_status)}
                      </Badge>
                      <span className="text-gray-400">→</span>
                    </>
                  )}
                  <Badge className={getStatusColor(entry.to_status)}>
                    {formatStatus(entry.to_status)}
                  </Badge>

                  {/* Special indicators */}
                  {entry.metadata?.edited_after_approval && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      <FileEdit className="h-3 w-3 mr-1" />
                      Edited
                    </Badge>
                  )}
                  {entry.metadata?.requires_reapproval && (
                    <Badge variant="outline" className="bg-orange-50 text-orange-700">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Needs Re-approval
                    </Badge>
                  )}
                </div>

                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {formatDistanceToNow(new Date(entry.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              {entry.change_reason && (
                <p className="text-sm text-gray-700 mb-2">
                  {entry.change_reason}
                </p>
              )}

              {entry.notes && (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-2 mb-2">
                  <p className="text-xs text-gray-600">{entry.notes}</p>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <User className="h-3 w-3" />
                <span>
                  {entry.changed_by_name || "System"}
                  {entry.changed_by_role && ` (${entry.changed_by_role})`}
                </span>
                <span className="text-gray-400">•</span>
                <span>
                  {new Date(entry.created_at).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>

              {/* Additional metadata */}
              {(entry.metadata?.parts_added || entry.metadata?.cost_changed) && (
                <div className="mt-2 flex gap-2">
                  {entry.metadata.parts_added && (
                    <Badge variant="outline" className="text-xs">
                      Parts Added
                    </Badge>
                  )}
                  {entry.metadata.cost_changed && (
                    <Badge variant="outline" className="text-xs">
                      Cost Updated
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (compact) {
    return (
      <ScrollArea className="h-[400px] pr-4">
        <HistoryContent />
      </ScrollArea>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Status History
        </CardTitle>
        <CardDescription>
          Complete timeline of all changes made to this job card
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <HistoryContent />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
