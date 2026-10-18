import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import Modal from "./Modal.jsx";
import EmptyState from "./EmptyState.jsx";
import ConfirmDialog from "./ConfirmDialog.jsx";
import { UserAvatar } from "./Avatars.jsx";
import { groupsApi, messagesApi } from "../api/services.js";
import { errorMessage } from "../api/client.js";
import { ATTACH_TYPES, attachmentProblem, fileSize, formatDate, relativeDate } from "../utils/format.js";

const time = (iso) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const day = (iso) => iso.slice(0, 10);

// The conversation's picture: the person's avatar, a group mark, or the OrgConnect mark for the admin's side
function ConversationAvatar({ conversation, className = "" }) {
  if (conversation.isAdminSide) {
    return <span className={`avatar msg-admin-avatar ${className}`} aria-hidden="true"><Icon name="megaphone" size={16} /></span>;
  }
  if (conversation.kind === "group") {
    return <span className={`avatar msg-group-avatar ${className}`} aria-hidden="true"><Icon name="users" size={16} /></span>;
  }
  return <UserAvatar user={conversation.who} className={className} />;
}

// A photo (shown in the bubble; opens full size) or a file (downloads)
function Attachment({ file }) {
  if (file.type === "image") {
    return (
      <a href={file.url} target="_blank" rel="noreferrer" className="msg-photo" title={file.name}>
        <img src={file.url} alt={file.name} loading="lazy" />
      </a>
    );
  }
  return (
    <a href={file.url} className="msg-file" download={file.name}>
      <span className="msg-file-icon" aria-hidden="true"><Icon name="file" size={18} /></span>
      <span className="msg-file-text">
        <strong>{file.name}</strong>
        <span>{fileSize(file.size)} · Download</span>
      </span>
    </a>
  );
}

// Pick people from the org: for a new group (with its name) or to add to a group.
// loadPeople(search) -> [{ id, name, avatar, position, course, yearLevel }]; skipIds: already in it
function PeoplePicker({ title, loadPeople, skipIds = [], withName = false, submitLabel, onSubmit, onClose }) {
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [people, setPeople] = useState(null);
  const [picked, setPicked] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      loadPeople(search.trim())
        .then((list) => active && setPeople(list.filter((p) => !skipIds.includes(p.id))))
        .catch((err) => active && setError(errorMessage(err)));
    }, search ? 250 : 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const toggle = (p) => setPicked((list) => (list.some((x) => x.id === p.id) ? list.filter((x) => x.id !== p.id) : [...list, p]));

  const submit = async (e) => {
    e.preventDefault();
    if (withName && !name.trim()) return setError("Give the group a name.");
    if (!picked.length) return setError("Pick at least one person.");
    setBusy(true);
    setError("");
    try {
      await onSubmit(name.trim(), picked.map((p) => p.id));
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      onSubmit={submit}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {submitLabel}{picked.length ? ` (${picked.length})` : ""}
          </button>
        </>
      }
    >
      <div className="stack">
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {withName && (
          <div className="field">
            <label htmlFor="group-name">Group name</label>
            <input id="group-name" className="input" maxLength={60} placeholder="e.g. Hackathon committee" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        {picked.length > 0 && (
          <div className="picked-chips">
            {picked.map((p) => (
              <button type="button" key={p.id} className="picked-chip" onClick={() => toggle(p)} aria-label={`Remove ${p.name}`}>
                <UserAvatar user={p} className="xs" /> {p.name.split(" ")[0]} <Icon name="close" size={12} />
              </button>
            ))}
          </div>
        )}
        <div className="search">
          <Icon name="search" size={17} className="search-icon" />
          <label htmlFor="group-people-search" className="sr-only">Search people</label>
          <input id="group-people-search" type="search" className="input" placeholder="Search people in this org" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {!people ? (
          <div className="skeleton-list" aria-hidden="true"><span /><span /></div>
        ) : people.length === 0 ? (
          <p className="muted small">{search ? "No one by that name." : "Everyone is already here."}</p>
        ) : (
          <ul className="suggest-list new-msg-list">
            {people.map((p) => {
              const on = picked.some((x) => x.id === p.id);
              return (
                <li key={p.id}>
                  <button type="button" className={`suggest-item pick-item ${on ? "is-picked" : ""}`} aria-pressed={on} onClick={() => toggle(p)}>
                    <UserAvatar user={p} className="suggest-avatar" />
                    <span className="suggest-text">
                      <strong>{p.name}</strong>
                      <span>{[p.position !== "Member" ? p.position : null, p.course, p.yearLevel].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="pick-check" aria-hidden="true">{on && <Icon name="check" size={14} />}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}

// A group's members, its name, adding people and leaving
function GroupInfo({ conversation, loadPeople, onChanged, onLeft, onOpenPerson, onClose }) {
  const [members, setMembers] = useState(null);
  const [name, setName] = useState(conversation.title);
  const [adding, setAdding] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");
  const canWrite = !conversation.cantWrite;

  const loadMembers = useCallback(() => {
    groupsApi.members(conversation.id).then(setMembers).catch((err) => setError(errorMessage(err)));
  }, [conversation.id]);
  useEffect(loadMembers, [loadMembers]);

  const rename = async (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === conversation.title) return;
    try {
      await groupsApi.rename(conversation.id, name.trim());
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (adding) {
    return (
      <PeoplePicker
        title={`Add people to ${conversation.title}`}
        loadPeople={loadPeople}
        skipIds={(members || []).map((m) => m.id)}
        submitLabel="Add"
        onClose={() => setAdding(false)}
        onSubmit={async (_, ids) => {
          await groupsApi.add(conversation.id, ids);
          setAdding(false);
          loadMembers();
          onChanged();
        }}
      />
    );
  }

  return (
    <>
      <Modal title={conversation.title} subtitle={conversation.subtitle} onClose={onClose} size="sm">
        <div className="stack">
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          {canWrite && (
            <form className="group-rename" onSubmit={rename}>
              <label htmlFor="group-rename" className="sr-only">Group name</label>
              <input id="group-rename" className="input" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
              <button type="submit" className="btn btn-outline btn-sm" disabled={!name.trim() || name.trim() === conversation.title}>Rename</button>
            </form>
          )}
          <div className="group-members-head">
            <h3>Members</h3>
            {canWrite && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setAdding(true)}>
                <Icon name="plus" size={14} /> Add people
              </button>
            )}
          </div>
          {!members ? (
            <div className="skeleton-list" aria-hidden="true"><span /><span /></div>
          ) : (
            <ul className="group-members">
              {members.map((m) => (
                <li key={m.id}>
                  <button type="button" className="suggest-item" onClick={() => onOpenPerson?.(m.id)}>
                    <UserAvatar user={m} className="suggest-avatar" />
                    <span className="suggest-text">
                      <strong>{m.name}</strong>
                      <span>{[m.position !== "Member" ? m.position : null, m.creator ? "Started the group" : null].filter(Boolean).join(" · ") || "Member"}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="btn btn-outline btn-danger-outline group-leave" onClick={() => setLeaving(true)}>
            <Icon name="logout" size={15} /> Leave group
          </button>
        </div>
      </Modal>
      {leaving && (
        <ConfirmDialog
          title="Leave this group?"
          message={`You'll stop getting messages from ${conversation.title}. Someone in it can add you back.`}
          confirmLabel="Leave"
          onCancel={() => setLeaving(false)}
          onConfirm={async () => {
            await groupsApi.leave(conversation.id);
            onLeft();
          }}
        />
      )}
    </>
  );
}

// One conversation: its messages (grouped by day) and the box to write. Checks for new messages
// every few seconds while it's open. Also used on its own (the registration page's talk with the admin).
// onSent / onRead: tell the list to refresh its preview and unread count
// loadPeople: who can be added to a group (groups only); onLeft: you left this group
export function ConversationView({ id, onBack, onSent, onRead, onOpenPerson, loadPeople, onLeft, compact = false }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null); // a photo or file to send with the message
  const [sending, setSending] = useState(false);
  const [info, setInfo] = useState(false); // the group's members pop-up
  const endRef = useRef(null);
  const fileRef = useRef(null);
  const lastCount = useRef(0);
  // Where your unread messages started when you opened it (a notification lands you right there)
  const [newFrom, setNewFrom] = useState(undefined);
  // Who else is typing, and how far the others have read ({ id, name, lastReadId })
  const [typing, setTyping] = useState([]);
  const [seen, setSeen] = useState([]);
  const lastTypingPing = useRef(0);

  const load = useCallback(async () => {
    try {
      const next = await messagesApi.show(id);
      setData(next);
      setSeen(next.seen || []);
      setNewFrom((before) => (before === undefined ? next.firstUnreadId || null : before));
      setError("");
      onRead?.();
    } catch (err) {
      setError(errorMessage(err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    setData(null);
    setNewFrom(undefined);
    setTyping([]);
    setSeen([]);
    setFile(null);
    lastCount.current = 0;
    load();
  }, [load]);

  // Every few seconds while it's open: who's typing, who has seen what, and new messages (loaded only
  // when there are some)
  const newestShown = data?.messages.at(-1)?.id || 0;
  useEffect(() => {
    if (!data) return undefined;
    let active = true;
    const check = async () => {
      try {
        const status = await messagesApi.status(id);
        if (!active) return;
        setTyping(status.typing);
        setSeen(status.seen);
        if (status.latestId > newestShown) load();
      } catch {
        // Try again on the next tick
      }
    };
    const timer = setInterval(check, 2500);
    return () => {
      active = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, newestShown, !data]);

  // Tell the others you're typing (at most every 3 seconds; it fades on their side after 5)
  const onType = (value) => {
    setText(value);
    if (value.trim() && Date.now() - lastTypingPing.current > 3000) {
      lastTypingPing.current = Date.now();
      messagesApi.typing(id).catch(() => {});
    }
  };

  // Opening: go to the first unread message (or the newest). Later: follow new messages as they arrive.
  useEffect(() => {
    const count = data?.messages.length || 0;
    if (count !== lastCount.current) {
      const firstNew = !lastCount.current && newFrom && document.querySelector(`[data-msg="${newFrom}"]`);
      if (firstNew) firstNew.scrollIntoView({ block: "center" });
      else endRef.current?.scrollIntoView({ block: "end", behavior: lastCount.current ? "smooth" : "auto" });
    }
    lastCount.current = count;
  }, [data, newFrom]);

  const pickFile = (e) => {
    const chosen = e.target.files?.[0];
    e.target.value = "";
    if (!chosen) return;
    const problem = attachmentProblem(chosen);
    setError(problem);
    if (!problem) setFile(chosen);
  };

  const send = async (e) => {
    e?.preventDefault();
    const body = text.trim();
    if ((!body && !file) || sending) return;
    setSending(true);
    try {
      const message = await messagesApi.send(id, body, file);
      setData((d) => ({ ...d, messages: [...d.messages, message] }));
      setText("");
      setFile(null);
      setError("");
      lastTypingPing.current = 0;
      onSent?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  if (error && !data) return <div className="msg-thread"><div className="alert alert-error" role="alert">{error}</div></div>;
  if (!data) return <div className="msg-thread"><div className="skeleton-list padded" aria-hidden="true"><span /><span /><span /></div></div>;
  const { conversation: c, messages } = data;
  // "Seen" goes under your latest message: "Seen" in a chat with one person, "Seen by ..." in a group
  const lastMine = messages.findLast((m) => m.mine && !m.notice);
  const readers = lastMine ? seen.filter((s) => s.lastReadId >= lastMine.id).map((s) => s.name) : [];
  const seenText = !readers.length ? "" : c.kind === "direct" ? "Seen" : `Seen by ${readers.length > 3 ? `${readers.slice(0, 3).join(", ")} and ${readers.length - 3} more` : readers.join(", ")}`;
  const isGroup = c.kind === "group";

  return (
    <section className={`msg-thread ${compact ? "is-compact" : ""}`} aria-label={`Conversation with ${c.title}`}>
      {!compact && (
        <header className="msg-thread-head">
          {onBack && (
            <button type="button" className="icon-btn sm msg-back" aria-label="Back to conversations" onClick={onBack}>
              <Icon name="arrowLeft" size={18} />
            </button>
          )}
          <ConversationAvatar conversation={c} className="sm" />
          <div className="msg-thread-title">
            {c.kind === "direct" && onOpenPerson ? (
              <button type="button" className="card-title-btn" onClick={() => onOpenPerson(c.otherUserId)}>{c.title}</button>
            ) : isGroup ? (
              <button type="button" className="card-title-btn" onClick={() => setInfo(true)}>{c.title}</button>
            ) : (
              <strong>{c.title}</strong>
            )}
            <span className="muted small">{c.subtitle}</span>
          </div>
          {isGroup && (
            <button type="button" className="btn btn-outline btn-sm msg-group-btn" onClick={() => setInfo(true)} data-tour="group-info" aria-label="Members">
              <Icon name="users" size={15} /> <span className="msg-group-btn-label">Members</span>
            </button>
          )}
        </header>
      )}

      <div className="msg-scroll">
        {messages.length === 0 ? (
          <p className="msg-empty muted small">No messages yet. Say hi!</p>
        ) : (
          <ol className="msg-list">
            {messages.map((m, i) => {
              const newDay = i === 0 || day(m.createdAt) !== day(messages[i - 1].createdAt);
              const dayLine = newDay && <div className="msg-day"><span>{formatDate(day(m.createdAt))}</span></div>;
              // "Maria added Juan": a line in the middle
              if (m.notice) {
                return (
                  <li key={m.id} data-msg={m.id} className="msg msg-notice">
                    {dayLine}
                    <p>{m.body}</p>
                  </li>
                );
              }
              const prev = messages[i - 1];
              const sameAuthor = i > 0 && !newDay && !prev.notice && prev.userId === m.userId;
              return (
                <li key={m.id} data-msg={m.id} className={`msg ${m.mine ? "is-mine" : ""} ${sameAuthor && m.id !== newFrom ? "is-follow" : ""} ${newFrom && m.id >= newFrom && !m.mine ? "is-new" : ""}`}>
                  {dayLine}
                  {m.id === newFrom && <div className="msg-new-divider"><span>New messages</span></div>}
                  <div className="msg-row">
                    {!m.mine && (
                      <span className="msg-who-avatar">
                        {!sameAuthor && (m.isAdmin ? <span className="avatar xs msg-admin-avatar"><Icon name="megaphone" size={12} /></span> : <UserAvatar user={{ name: m.userName, ...m.userAvatar }} className="xs" />)}
                      </span>
                    )}
                    <div className={`msg-bubble ${m.attachment?.type === "image" ? "has-photo" : ""}`}>
                      {!m.mine && !sameAuthor && c.kind !== "direct" && <span className="msg-name">{m.userName}</span>}
                      {m.attachment && <Attachment file={m.attachment} />}
                      {m.body && <p>{m.body}</p>}
                      <time dateTime={m.createdAt}>{time(m.createdAt)}</time>
                    </div>
                  </div>
                  {m === lastMine && seenText && <p className="msg-seen"><Icon name="check" size={12} /> {seenText}</p>}
                </li>
              );
            })}
          </ol>
        )}
        {typing.length > 0 && (
          <p className="msg-typing" aria-live="polite">
            <span className="typing-dots" aria-hidden="true"><i /><i /><i /></span>
            {typing.length > 1 ? `${typing.slice(0, 2).join(" and ")}${typing.length > 2 ? " and others" : ""} are typing…` : c.kind === "direct" ? "typing…" : `${typing[0]} is typing…`}
          </p>
        )}
        <span ref={endRef} />
      </div>

      {error && <p className="field-error msg-error">{error}</p>}
      {c.cantWrite ? (
        <p className="msg-locked muted small"><Icon name="lock" size={14} /> {c.cantWrite}</p>
      ) : (
        <form className="msg-compose" onSubmit={send}>
          {file && (
            <div className="msg-attach-chip">
              <Icon name={file.type.startsWith("image/") ? "image" : "file"} size={15} />
              <span className="msg-attach-name">{file.name}</span>
              <span className="muted small">{fileSize(file.size)}</span>
              <button type="button" className="icon-btn xs" aria-label="Remove the attachment" onClick={() => setFile(null)}>
                <Icon name="close" size={13} />
              </button>
            </div>
          )}
          <div className="msg-compose-row">
            <input ref={fileRef} type="file" accept={ATTACH_TYPES} className="sr-only" tabIndex={-1} onChange={pickFile} aria-hidden="true" />
            <button type="button" className="icon-btn msg-attach-btn" aria-label="Attach a photo or file" title="Attach a photo or file (up to 10 MB)" onClick={() => fileRef.current?.click()} data-tour="messages-attach">
              <Icon name="clip" size={18} />
            </button>
            <label htmlFor={`msg-${id}`} className="sr-only">Write a message</label>
            <textarea
              id={`msg-${id}`}
              className="input"
              rows="1"
              maxLength={2000}
              placeholder={file ? "Add a message (optional)" : "Write a message"}
              value={text}
              onChange={(e) => onType(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends, Shift+Enter adds a line
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button type="submit" className="btn btn-primary" disabled={(!text.trim() && !file) || sending} aria-label="Send">
              <Icon name="arrowRight" size={18} />
            </button>
          </div>
        </form>
      )}

      {info && isGroup && (
        <GroupInfo
          conversation={c}
          loadPeople={loadPeople}
          onOpenPerson={onOpenPerson}
          onClose={() => setInfo(false)}
          onChanged={() => {
            load();
            onSent?.();
          }}
          onLeft={() => {
            setInfo(false);
            onLeft?.();
          }}
        />
      )}
    </section>
  );
}

// Start a conversation. loadOptions(search) -> [{ key, label, sub, who, group?, isAdmin?, open: () => Promise<conversation> }]
// (searched as you type; "group" puts a small heading above the first option of each group).
// onNewGroup: shows "New group" at the top
function NewConversation({ loadOptions, onClose, onOpened, onNewGroup }) {
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      loadOptions(search.trim())
        .then((list) => active && setOptions(list))
        .catch((err) => active && setError(errorMessage(err)));
    }, search ? 250 : 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  const shown = options || [];

  const pick = async (o) => {
    setBusy(o.key);
    try {
      onOpened(await o.open());
    } catch (err) {
      setError(errorMessage(err));
      setBusy(null);
    }
  };

  return (
    <Modal title="New message" onClose={onClose} size="sm">
      <div className="stack">
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {onNewGroup && (
          <button type="button" className="suggest-item new-group-btn" onClick={onNewGroup} data-tour="messages-new-group">
            <span className="avatar suggest-avatar msg-group-avatar"><Icon name="users" size={18} /></span>
            <span className="suggest-text">
              <strong>New group</strong>
              <span>A chat for a committee or study group</span>
            </span>
          </button>
        )}
        <div className="search">
          <Icon name="search" size={17} className="search-icon" />
          <label htmlFor="new-msg-search" className="sr-only">Search</label>
          <input id="new-msg-search" type="search" className="input" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {!options ? (
          <div className="skeleton-list" aria-hidden="true"><span /><span /></div>
        ) : shown.length === 0 ? (
          <p className="muted small">{search ? "No one by that name." : "No one to message yet."}</p>
        ) : (
          <ul className="suggest-list new-msg-list">
            {shown.map((o, i) => (
              <li key={o.key}>
                {o.group && o.group !== shown[i - 1]?.group && <span className="new-msg-group">{o.group}</span>}
                <button type="button" className="suggest-item" disabled={busy === o.key} onClick={() => pick(o)}>
                  {o.isAdmin ? <span className="avatar suggest-avatar msg-admin-avatar"><Icon name="megaphone" size={18} /></span> : <UserAvatar user={o.who} className="suggest-avatar" />}
                  <span className="suggest-text">
                    <strong>{o.label}</strong>
                    <span>{o.sub}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

// The whole messages screen: your conversations on the left, the open one on the right
// (one at a time on a phone).
//   openId: a conversation to open (from a notification or a "Message" button); onOpenedId() clears it
//   newOptions(search): async, the people/orgs you can start a conversation with
//   loadPeople(search): async, people in the org for group chats (no groups when it's missing)
//   onUnread(): the unread count may have changed (menu badge)
export default function Messages({ openId, onOpenedId, newOptions, loadPeople, onUnread, onOpenPerson, emptyText }) {
  const [list, setList] = useState(null);
  const [activeId, setActiveId] = useState(openId || null);
  const [search, setSearch] = useState("");
  const [starting, setStarting] = useState(null); // "New message"
  const [grouping, setGrouping] = useState(false); // "New group"

  const loadList = useCallback(() => {
    messagesApi.list().then(setList).catch(() => setList([]));
    onUnread?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadList();
    const timer = setInterval(loadList, 20000);
    return () => clearInterval(timer);
  }, [loadList]);

  useEffect(() => {
    if (!openId) return;
    setActiveId(openId);
    onOpenedId?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  const startNew = () => setStarting(true);
  const opened = (c) => {
    setStarting(null);
    setGrouping(false);
    setActiveId(c.id);
    loadList();
  };
  const shown = (list || []).filter((c) => `${c.title} ${c.subtitle}`.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className={`msg-layout ${activeId ? "has-active" : ""}`} data-tour="messages">
      <aside className="msg-sidebar">
        <div className="msg-sidebar-head">
          <div className="search">
            <Icon name="search" size={17} className="search-icon" />
            <label htmlFor="msg-search" className="sr-only">Search conversations</label>
            <input id="msg-search" type="search" className="input" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {newOptions && (
            <button type="button" className="btn btn-primary btn-sm" onClick={startNew} data-tour="messages-new">
              <Icon name="plus" size={15} /> New
            </button>
          )}
        </div>
        {!list ? (
          <div className="skeleton-list padded" aria-hidden="true"><span /><span /><span /></div>
        ) : shown.length === 0 ? (
          <EmptyState compact icon="mail" title={search ? "No matches" : "No messages yet"} text={search ? "Try another name." : emptyText} />
        ) : (
          <ul className="msg-convos">
            {shown.map((c) => (
              <li key={c.id}>
                <button type="button" className={`msg-convo ${c.id === activeId ? "is-active" : ""} ${c.unread ? "is-unread" : ""}`} onClick={() => setActiveId(c.id)}>
                  <ConversationAvatar conversation={c} className="sm" />
                  <span className="msg-convo-text">
                    <span className="msg-convo-top">
                      <strong>{c.title}</strong>
                      {c.lastMessage && <time>{relativeDate(c.lastMessage.at)}</time>}
                    </span>
                    <span className="msg-convo-sub">{c.subtitle}</span>
                    {c.lastMessage && (
                      <span className="msg-convo-preview">
                        {c.lastMessage.mine ? "You: " : c.lastMessage.by ? `${c.lastMessage.by}: ` : ""}
                        {c.lastMessage.body}
                      </span>
                    )}
                  </span>
                  {c.unread > 0 && <span className="nav-count msg-unread">{c.unread}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {activeId ? (
        <ConversationView
          key={activeId}
          id={activeId}
          onBack={() => setActiveId(null)}
          onSent={loadList}
          onRead={loadList}
          onOpenPerson={onOpenPerson}
          loadPeople={loadPeople}
          onLeft={() => {
            setActiveId(null);
            loadList();
          }}
        />
      ) : (
        <div className="msg-thread msg-placeholder">
          <EmptyState icon="mail" title="Your messages" text="Pick a conversation, or start a new one." />
        </div>
      )}

      {starting && !grouping && (
        <NewConversation loadOptions={newOptions} onClose={() => setStarting(null)} onOpened={opened} onNewGroup={loadPeople ? () => setGrouping(true) : null} />
      )}
      {grouping && (
        <PeoplePicker
          title="New group"
          withName
          loadPeople={loadPeople}
          submitLabel="Create group"
          onClose={() => {
            setGrouping(false);
            setStarting(null);
          }}
          onSubmit={async (name, ids) => opened(await groupsApi.create(name, ids))}
        />
      )}
    </div>
  );
}
