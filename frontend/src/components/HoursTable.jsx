import Icon from "./Icon.jsx";
import { StatusBadge } from "./Badges.jsx";
import { formatDate } from "../utils/format.js";

export default function HoursTable({ rows, isOfficer, userId, onDecide, onDelete }) {
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
            const canDecide = isOfficer && log.status === "Pending";
            const canDelete = !isOfficer && log.userId === userId && log.status === "Pending";
            return (
              <tr key={log.id}>
                {isOfficer && <td className="strong">{log.memberName}</td>}
                <td>{log.activity}</td>
                <td className="muted nowrap">{formatDate(log.date)}</td>
                <td className="right num">{log.hours}</td>
                <td>
                  <StatusBadge status={log.status} />
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
