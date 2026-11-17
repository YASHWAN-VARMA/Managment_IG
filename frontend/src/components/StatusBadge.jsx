export default function StatusBadge({ value }) {
  const text = value || "Unknown";
  const normalized = String(text).toLowerCase();
  const type = ["active", "ongoing", "available", "completed"].includes(normalized) ? "status-positive"
    : ["maintenance", "pending", "inactive", "cancelled", "expired"].includes(normalized) ? "status-muted" : "";
  return <span className={`status-badge ${type}`}><i />{text}</span>;
}
