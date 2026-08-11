export async function sendWorkshopNotification(params: {
  eventType: string;
  jobId: number;
  jobTitle?: string;
  vehicleReg?: string;
  technicianName?: string;
  statusLabel?: string;
  reason?: string;
}) {
  try {
    const response = await fetch("/api/notifications/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Notification error:", data.error);
      return { success: false, error: data.error };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("Failed to send notification:", error);
    return { success: false, error: error.message };
  }
}
