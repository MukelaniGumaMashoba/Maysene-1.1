import * as React from "react";

interface WorkshopNotificationProps {
  eventType: string;
  jobTitle: string;
  jobId: string;
  vehicleReg?: string;
  technicianName?: string;
  statusLabel?: string;
  reason?: string;
  timestamp: string;
  recipientName: string;
  jobUrl?: string;
}

export function WorkshopNotification({
  eventType,
  jobTitle,
  jobId,
  vehicleReg,
  technicianName,
  statusLabel,
  reason,
  timestamp,
  recipientName,
  jobUrl,
}: WorkshopNotificationProps) {
  const getEventColor = () => {
    switch (eventType) {
      case "job_assigned":
        return "#3b82f6";
      case "parts_outstanding":
        return "#f59e0b";
      case "parts_received":
        return "#10b981";
      case "returned_to_office":
        return "#ef4444";
      case "job_completed":
        return "#6366f1";
      case "quality_check_completed":
        return "#8b5cf6";
      case "job_cancelled":
        return "#dc2626";
      default:
        return "#6b7280";
    }
  };

  const getEventLabel = () => {
    switch (eventType) {
      case "job_assigned":
        return "Job Assigned";
      case "parts_outstanding":
        return "Parts Outstanding";
      case "parts_received":
        return "Parts Received";
      case "returned_to_office":
        return "Returned to Office";
      case "job_completed":
        return "Job Completed";
      case "quality_check_completed":
        return "Quality Check Completed";
      default:
        return eventType;
    }
  };

  const getEventMessage = () => {
    switch (eventType) {
      case "job_assigned":
        return `You have been assigned to a new job. Please review and accept the assignment.`;
      case "parts_outstanding":
        return `Parts are required for this job. Please check the parts list and order as needed.`;
      case "parts_received":
        return `Parts have been received for this job. You can now proceed with the work.`;
      case "returned_to_office":
        return `This job has been returned to the office for review.${reason ? ` Reason: ${reason}` : ""}`;
      case "job_completed":
        return `The job has been completed and is ready for quality inspection.`;
      case "quality_check_completed":
        return `Quality inspection has been completed for this job.`;
      default:
        return "";
    }
  };

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          margin: 0,
          padding: 0,
          backgroundColor: "#f8fafc",
        }}
      >
        <div
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            padding: "40px 20px",
          }}
        >
          {/* Header */}
          <div
            style={{
              backgroundColor: "#1e293b",
              borderRadius: "12px 12px 0 0",
              padding: "32px",
              textAlign: "center",
            }}
          >
            <h1
              style={{
                color: "#ffffff",
                fontSize: "24px",
                fontWeight: "600",
                margin: "0 0 8px 0",
              }}
            >
              Maysene Workshop
            </h1>
            <p
              style={{
                color: "#94a3b8",
                fontSize: "14px",
                margin: 0,
              }}
            >
              Workshop Management System
            </p>
          </div>

          {/* Event Badge */}
          <div
            style={{
              backgroundColor: getEventColor(),
              padding: "16px 32px",
              textAlign: "center",
            }}
          >
            <span
              style={{
                color: "#ffffff",
                fontSize: "18px",
                fontWeight: "600",
                letterSpacing: "0.5px",
              }}
            >
              {getEventLabel()}
            </span>
          </div>

          {/* Content */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "0 0 12px 12px",
              padding: "32px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}
          >
            <p
              style={{
                fontSize: "16px",
                color: "#334155",
                lineHeight: "1.6",
                margin: "0 0 24px 0",
              }}
            >
              Hello {recipientName},
            </p>

            <p
              style={{
                fontSize: "16px",
                color: "#334155",
                lineHeight: "1.6",
                margin: "0 0 24px 0",
              }}
            >
              {getEventMessage()}
            </p>

            {/* Job Details Card */}
            <div
              style={{
                backgroundColor: "#f8fafc",
                borderRadius: "8px",
                padding: "24px",
                marginBottom: "24px",
                border: "1px solid #e2e8f0",
              }}
            >
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  margin: "0 0 16px 0",
                }}
              >
                Job Details
              </h3>

              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <tbody>
                  <tr>
                    <td
                      style={{
                        padding: "8px 0",
                        color: "#64748b",
                        fontSize: "14px",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      Job ID
                    </td>
                    <td
                      style={{
                        padding: "8px 0",
                        color: "#1e293b",
                        fontSize: "14px",
                        fontWeight: "500",
                        borderBottom: "1px solid #e2e8f0",
                        textAlign: "right",
                      }}
                    >
                      {jobId}
                    </td>
                  </tr>
                  {vehicleReg && (
                    <tr>
                      <td
                        style={{
                          padding: "8px 0",
                          color: "#64748b",
                          fontSize: "14px",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        Vehicle
                      </td>
                      <td
                        style={{
                          padding: "8px 0",
                          color: "#1e293b",
                          fontSize: "14px",
                          fontWeight: "500",
                          borderBottom: "1px solid #e2e8f0",
                          textAlign: "right",
                        }}
                      >
                        {vehicleReg}
                      </td>
                    </tr>
                  )}
                  {technicianName && (
                    <tr>
                      <td
                        style={{
                          padding: "8px 0",
                          color: "#64748b",
                          fontSize: "14px",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        Technician
                      </td>
                      <td
                        style={{
                          padding: "8px 0",
                          color: "#1e293b",
                          fontSize: "14px",
                          fontWeight: "500",
                          borderBottom: "1px solid #e2e8f0",
                          textAlign: "right",
                        }}
                      >
                        {technicianName}
                      </td>
                    </tr>
                  )}
                  {statusLabel && (
                    <tr>
                      <td
                        style={{
                          padding: "8px 0",
                          color: "#64748b",
                          fontSize: "14px",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        Status
                      </td>
                      <td
                        style={{
                          padding: "8px 0",
                          color: getEventColor(),
                          fontSize: "14px",
                          fontWeight: "600",
                          borderBottom: "1px solid #e2e8f0",
                          textAlign: "right",
                        }}
                      >
                        {statusLabel}
                      </td>
                    </tr>
                  )}
                  {reason && (
                    <tr>
                      <td
                        style={{
                          padding: "8px 0",
                          color: "#64748b",
                          fontSize: "14px",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        Reason
                      </td>
                      <td
                        style={{
                          padding: "8px 0",
                          color: "#1e293b",
                          fontSize: "14px",
                          fontWeight: "500",
                          borderBottom: "1px solid #e2e8f0",
                          textAlign: "right",
                        }}
                      >
                        {reason}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td
                      style={{
                        padding: "8px 0",
                        color: "#64748b",
                        fontSize: "14px",
                      }}
                    >
                      Date & Time
                    </td>
                    <td
                      style={{
                        padding: "8px 0",
                        color: "#1e293b",
                        fontSize: "14px",
                        fontWeight: "500",
                        textAlign: "right",
                      }}
                    >
                      {timestamp}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Action Button */}
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <a
                href={jobUrl || `http://localhost:3000/workshop/jobWorkShop/${jobId}`}
                style={{
                  display: "inline-block",
                  backgroundColor: getEventColor(),
                  color: "#ffffff",
                  padding: "12px 32px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontSize: "16px",
                  fontWeight: "600",
                }}
              >
                View Job Details
              </a>
            </div>

            {/* Footer Note */}
            <p
              style={{
                fontSize: "12px",
                color: "#94a3b8",
                textAlign: "center",
                margin: 0,
                lineHeight: "1.5",
              }}
            >
              This is an automated notification from Maysene Workshop Management
              System. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
