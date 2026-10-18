import Icon from "./Icon.jsx";
import { StatusBadge } from "./Badges.jsx";
import { formatDate } from "../utils/format.js";

// highlightId: a log to highlight (opened from a notification)
// canReviewOfficers: the President, VPs and Secretary, who review officers' own hours
export default function HoursTable({ rows, isOfficer, canReviewOfficers = false, userId, onDecide, onDelete, highlightId }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {isOfficer && <th>Member</th>}
            <th>Activity</th>
            <th>Date</th>
            <th className="right">Hours</th>
            <th>Status</th>
            <th><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((log) => {
            // Never your own; another officer's only for the President, VPs and Secretary
            const othersPending = isOfficer && log.status === "Pending" && log.userId !== userId;
            const canDecide = othersPending && (!log.byOfficer || canReviewOfficers);
            const canDelete = log.userId === userId && log.status === "Pending";
            return (
              <tr key={log.id} data-focus={`hour-${log.id}`} className={log.id === highlightId ? "is-focused" : undefined}>
                {isOfficer && <td className="strong">{log.memberName}</td>}
                <td>{log.activity}</td>
                <td className="muted nowrap">{formatDate(log.date)}</td>
                <td className="right num">{log.hours}</td>
                <td>
                  <StatusBadge status={log.status} />
                  {log.status === "Rejected" && log.rejectionReason && <span className="reject-reason">{log.rejectionReason}</span>}
                </td>
                <td className="right">
                  {canDecide && (
                    <div className="row-actions">
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => onDecide(log, "Rejected")}>
                        Reject
                      </button>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => onDecide(log, "Approved")}>
                        Approve
                      </button>
                    </div>
                  )}
                  {othersPending && !canDecide && <span className="muted small nowrap">For the President, VPs or Secretary</span>}
                  {canDelete && (
                    <button type="button" className="icon-btn sm danger" aria-label={`Delete log: ${log.activity}`} onClick={() => onDelete(log)}>
                      <Icon name="trash" size={16} />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
