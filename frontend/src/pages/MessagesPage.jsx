import Messages from "../components/Messages.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useOrg } from "../context/OrgContext.jsx";
import { usePeople } from "../context/PeopleContext.jsx";
import { messagesApi, peopleApi } from "../api/services.js";

// Messages in the org app: your friends, and (officers) the OrgConnect admin.
// focus: { id } a conversation to open (from a notification or a "Message" button)
export default function MessagesPage({ focus, onFocusDone, onUnread }) {
  const { user } = useAuth();
  const { current: org } = useOrg();
  const { openPerson } = usePeople();

  // Who you can start a conversation with
  const newOptions = async () => {
    const { friends } = await peopleApi.friends();
    const options = friends.map((f) => ({
      key: `u${f.id}`,
      label: f.name,
      sub: f.inThisOrg ? [f.position !== "Member" ? f.position : null, f.course].filter(Boolean).join(" · ") || "Friend" : `In ${f.orgs.join(", ")}`,
      who: f,
      open: () => messagesApi.direct(f.id),
    }));
    if (user.role === "officer") {
      options.unshift({
        key: "admin",
        label: "OrgConnect admin",
        sub: `${org.shortName} officers and the admin`,
        isAdmin: true,
        open: () => messagesApi.org(org.id),
      });
    }
    return options;
  };

  return (
    <div className="page">
      <Messages
        openId={focus?.id || null}
        onOpenedId={onFocusDone}
        newOptions={newOptions}
        onUnread={onUnread}
        onOpenPerson={openPerson}
        emptyText={user.role === "officer" ? "Message a friend, or your org's officers can message the OrgConnect admin." : "Message a friend from here or from their profile."}
      />
    </div>
  );
}
