import { WorkshopNotification } from "@/components/email-template";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

// Base URL for email links - set NEXT_PUBLIC_APP_URL in .env.local
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface NotificationRequest {
  eventType: string;
  jobId: number;
  jobTitle?: string;
  vehicleReg?: string;
  technicianName?: string;
  technicianEmail?: string;
  statusLabel?: string;
  reason?: string;
}

async function getRecipients(eventType: string, jobId: number) {
  const supabase = await createClient();
  const recipients: { email: string; name: string }[] = [];

  // Get job details
  const { data: job } = await supabase
    .from("workshop_job")
    .select("*")
    .eq("id", jobId)
    .single();

  if (!job) return recipients;

  switch (eventType) {
    case "job_assigned":
    case "parts_received": {
      // Notify assigned mechanic
      if (job.assigned_mechanic_id) {
        const { data: tech } = await supabase
          .from("technicians_maysene")
          .select("name, email")
          .eq("id", job.assigned_mechanic_id)
          .single();
        if (tech?.email) {
          recipients.push({ email: tech.email, name: tech.name });
        }
      }
      break;
    }

    case "parts_outstanding": {
      // Notify specific office users: Reneiloe, Amukelani, Supervisor
      const { data: officeUsers } = await supabase
        .from("users")
        .select("email")
        .in("role", ["office", "fleet manager"]);
      if (officeUsers) {
        officeUsers.forEach((u) => {
          if (u.email) recipients.push({ email: u.email, name: "Office Team" });
        });
      }
      break;
    }

    case "returned_to_office": {
      // Notify office users
      const { data: officeUsers } = await supabase
        .from("users")
        .select("email")
        .in("role", ["office", "fleet manager"]);
      if (officeUsers) {
        officeUsers.forEach((u) => {
          if (u.email) recipients.push({ email: u.email, name: "Office Team" });
        });
      }
      break;
    }

    case "job_completed": {
      // Notify senior mechanic
      const { data: seniorTechs } = await supabase
        .from("technicians_maysene")
        .select("name, email")
        .eq("type", "senior");
      if (seniorTechs) {
        seniorTechs.forEach((t) => {
          if (t.email) recipients.push({ email: t.email, name: t.name });
        });
      }
      // Also notify via users table
      const { data: seniorUsers } = await supabase
        .from("users")
        .select("email")
        .eq("role", "senior-mechanic");
      if (seniorUsers) {
        seniorUsers.forEach((u) => {
          if (u.email) recipients.push({ email: u.email, name: "Senior Mechanic" });
        });
      }
      break;
    }

    case "quality_check_completed": {
      // Notify office
      const { data: officeUsers } = await supabase
        .from("users")
        .select("email")
        .in("role", ["office", "fleet manager"]);
      if (officeUsers) {
        officeUsers.forEach((u) => {
          if (u.email) recipients.push({ email: u.email, name: "Office Team" });
        });
      }
      break;
    }

    case "job_cancelled": {
      // Notify office and senior mechanic
      const { data: cancelOfficeUsers } = await supabase
        .from("users")
        .select("email")
        .in("role", ["office", "fleet manager", "fleet_manager"]);
      if (cancelOfficeUsers) {
        cancelOfficeUsers.forEach((u) => {
          if (u.email) recipients.push({ email: u.email, name: "Office Team" });
        });
      }
      const { data: cancelSeniorTechs } = await supabase
        .from("technicians_maysene")
        .select("name, email")
        .eq("type", "senior");
      if (cancelSeniorTechs) {
        cancelSeniorTechs.forEach((t) => {
          if (t.email) recipients.push({ email: t.email, name: t.name });
        });
      }
      break;
    }
  }

  return recipients;
}

export async function POST(request: Request) {
  try {
    const body: NotificationRequest = await request.json();
    const {
      eventType,
      jobId,
      jobTitle,
      vehicleReg,
      technicianName,
      statusLabel,
      reason,
    } = body;

    const recipients = await getRecipients(eventType, jobId);

    if (recipients.length === 0) {
      return Response.json(
        { message: "No recipients found for this notification" },
        { status: 200 }
      );
    }

    const timestamp = new Date().toLocaleString("en-ZA", {
      timeZone: "Africa/Johannesburg",
      dateStyle: "medium",
      timeStyle: "short",
    });

    const emailPromises = recipients.map((recipient) =>
      resend.emails.send({
        from: "Maysene Workshop <notifications@resend.dev>",
        to: [recipient.email],
        subject: `[Workshop] ${statusLabel || eventType.replace(/_/g, " ").toUpperCase()} - Job #${jobId}`,
        react: WorkshopNotification({
          eventType,
          jobTitle: jobTitle || `Job #${jobId}`,
          jobId: String(jobId),
          vehicleReg,
          technicianName,
          statusLabel,
          reason,
          timestamp,
          recipientName: recipient.name,
          jobUrl: `${APP_URL}/workshop/jobWorkShop/${jobId}`,
        }),
      })
    );

    const results = await Promise.allSettled(emailPromises);

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return Response.json({
      message: `Notifications sent: ${successful} successful, ${failed} failed`,
      recipients: recipients.length,
    });
  } catch (error: any) {
    console.error("Email notification error:", error);
    return Response.json(
      { error: error.message || "Failed to send notifications" },
      { status: 500 }
    );
  }
}
