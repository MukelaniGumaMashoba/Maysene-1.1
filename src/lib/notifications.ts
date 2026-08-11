export async function sendWorkshopNotification(_params: {
  eventType: string;
  jobId: number;
  jobTitle?: string;
  vehicleReg?: string;
  technicianName?: string;
  statusLabel?: string;
  reason?: string;
}) {
  // Notifications disabled — requires RESEND_API_KEY
  return { success: true };
}
