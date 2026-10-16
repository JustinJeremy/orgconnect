import { Fragment, useState } from "react";
import Icon from "../components/Icon.jsx";
import Panel from "../components/Panel.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Pagination from "../components/Pagination.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import TemporaryPasswordDialog from "../components/TemporaryPasswordDialog.jsx";
import { UserAvatar } from "../components/Avatars.jsx";
import usePagedList from "../hooks/usePagedList.js";
import { useOrg } from "../context/OrgContext.jsx";
import { adminApi } from "../api/services.js";
import { errorMessage } from "../api/client.js";

// Platform admin: every account, searchable. Forgotten passwords are reset here (only here):
// a temporary password the admin passes on; the person changes it on their Profile.
export default function AdminAccounts({ flash }) {
  const { organizations } = useOrg();
  const [search, setSearch] = useState("");
  const [orgId, setOrgId] = useState(""); // "" = every account; an org: its people, officers first
  const org = organizations.find((o) => String(o.id) === orgId);
  const [resetting, setResetting] = useState(null); // account to confirm
  const [temporary, setTemporary] = useState(null); // { name, email, password }
  const list = usePagedList(adminApi.users, { search, org: orgId }, 12);
  // With an org chosen: which group each person is in there, for the section headings
  const groupOf = (u) => {
    const m = u.orgs.find((o) => o.shortName === org?.shortName);
    if (!m) return null;
    if (m.status === "Pending") return "Applicants";
    return m.position === "Member" ? "Members" : "Officers";
  };

  const reset = async () => {
    const account = resetting;
    setResetting(null);
    try {
      const { temporaryPassword } = await adminApi.resetPassword(account.id);
      setTemporary({ name: account.name, email: account.email, password: temporaryPassword });
    } catch (error) {
      flash(errorMessage(error), "error");
    }
  };

  return (
    <>
      <div className="toolbar" data-tour="admin-accounts-search">
        <div className="search">
          <Icon name="search" size={17} className="search-icon" />
          <label htmlFor="account-search" className="sr-only">Search accounts</label>
          <input id="account-search" type="search" className="input" placeholder="Search by name, email or student ID" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <label htmlFor="account-org" className="sr-only">Organization</label>
        <select id="account-org" className="input select account-org-select" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
          <option value="">All accounts</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </div>

      <Panel title="Accounts" subtitle="Reset a forgotten password: they get a temporary one and are signed out everywhere" className="flush" tour="admin-accounts">
        {!list.loaded ? (
          <div className="skeleton-list padded" aria-hidden="true"><span /><span /><span /></div>
        ) : list.total === 0 ? (
          <EmptyState icon="users" title="No accounts found" text="Try another name or email." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Name</th><th>Student ID</th><th>Organizations</th><th><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {list.items.map((u, i) => {
                  const group = org ? groupOf(u) : null;
                  const heading = group && group !== (i > 0 ? groupOf(list.items[i - 1]) : null);
                  return (
                  <Fragment key={u.id}>
                  {heading && (
                    <tr className="account-group">
                      <td colSpan={4}>{group}</td>
                    </tr>
                  )}
                  <tr>
                    <td>
                      <div className="person">
                        <UserAvatar user={u} className="sm" />
                        <div>
                          <div className="strong">{u.name}</div>
                          <div className="muted small">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="muted">{u.studentId}</td>
                    <td>
                      {u.orgs.length === 0 ? (
                        <span className="muted small">None</span>
                      ) : (
                        <div className="account-orgs">
                          {u.orgs.map((o) => (
                            <span key={o.shortName} className={`account-org is-${o.status.toLowerCase()}`}>
                              {o.shortName} · {o.status === "Active" ? o.position : o.status}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="row-end">
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setResetting(u)}>
                        <Icon name="key" size={15} /> Reset password
                      </button>
                    </td>
                  </tr>
                  </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Pagination page={list.page} totalPages={list.totalPages} onChange={list.setPage} />

      {resetting && (
        <ConfirmDialog
          title="Reset password?"
          message={`${resetting.name} will get a new temporary password and be signed out on all devices.`}
          confirmLabel="Reset password"
          onCancel={() => setResetting(null)}
          onConfirm={reset}
        />
      )}
      {temporary && <TemporaryPasswordDialog {...temporary} isNew={false} onClose={() => setTemporary(null)} />}
    </>
  );
}
