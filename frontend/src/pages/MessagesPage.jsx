import Messages from "../components/Messages.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useOrg } from "../context/OrgContext.jsx";
import { usePeople } from "../context/PeopleContext.jsx";
import { messagesApi } from "../api/services.js";

// Messages in the org app: anyone in this org (to message someone in another org, open that org),
// and (officers) the OrgConnect admin.
// focus: { id } a conversation to open (from a notification or a "Message" button)
export default function MessagesPage({ focus, onFocusDone, onUnread }) {
  const { user } = useAuth();
  const { current: org } = useOrg();
  const { openPerson } = usePeople();

  // Who you can start a conversation with: friends you haven't talked to yet first, then your other
  // friends, then everyone else in the org (the server orders them)
  const newOptions = async (search) => {
    const people = await messagesApi.contacts(search);
    const options = people.map((p) => ({
      key: `u${p.id}`,
      label: p.name,
      sub: [p.position !== "Member" ? p.position : null, p.course, p.yearLevel].filter(Boolean).join(" · "),
      who: p,
      group: p.friend && !p.conversationId ? "Suggested: friends you haven't messaged" : p.friend ? "Friends" : `Everyone in ${org.shortName}`,
      open: () => messagesApi.direct(p.id),
    }));
    if (user.role === "officer" && (!search || "orgconnect admin".includes(search.toLowerCase()))) {
      options.unshift({
        key: "admin",
        label: "OrgConnect admin",
        sub: `${org.shortName} officers and the admin`,
        group: "OrgConnect",
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
        loadPeople={messagesApi.contacts}
        onUnread={onUnread}
        onOpenPerson={openPerson}
        emptyText={user.role === "officer" ? `Message anyone in ${org.shortName}, or the OrgConnect admin.` : `Message anyone in ${org.shortName}, from here or from their profile.`}
      />
    </div>
  );
}
