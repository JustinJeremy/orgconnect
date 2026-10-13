import { slug } from "../utils/format.js";

// Status with a small colored dot: Pending, Approved, Confirmed, Completed, Rejected, Active, Inactive
export function StatusBadge({ status }) {
  return <span className={`status status-${slug(status)}`}>{status}</span>;
}
