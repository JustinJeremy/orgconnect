import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import Modal from "./Modal.jsx";
import EmptyState from "./EmptyState.jsx";
import { UserAvatar } from "./Avatars.jsx";
import { messagesApi } from "../api/services.js";
import { errorMessage } from "../api/client.js";
import { formatDate, relativeDate } from "../utils/format.js";

const time = (iso) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const day = (iso) => iso.slice(0, 10);

// The conversation's picture: the friend's avatar, or the OrgConnect mark for the admin's side
function ConversationAvatar({ conversation, className = "" }) {
  if (conversation.isAdminSide) {
    return <span className={`avatar msg-admin-avatar ${className}`} aria-hidden="true"><Icon name="megaphone" size={16} /></span>;
  }
  return <UserAvatar user={conversation.who} className={className} />;
}

// One conversation: its messages (grouped by day) and the box to write. Checks for new messages
// every few seconds while it's open. Also used on its own (the registration page's talk with the admin).
// onSent / onRead: tell the list to refresh its preview and unread count
export function ConversationView({ id, onBack, onSent, onRead, onOpenPerson, compact = false }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const lastCount = useRef(0);
  // Where your unread messages started when you opened it (a notification lands you right there)
  const [newFrom, setNewFrom] = useState(undefined);

  const load = useCallback(async () => {
    try {
      const next = await messagesApi.show(id);
      setData(next);
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
    lastCount.current = 0;
    load();
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, [load]);

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

  const send = async (e) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const message = await messagesApi.send(id, body);
      setData((d) => ({ ...d, messages: [...d.messages, message] }));
      setText("");
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
            ) : (
              <strong>{c.title}</strong>
            )}
            <span className="muted small">{c.subtitle}</span>
          </div>
        </header>
      )}

      <div className="msg-scroll">
        {messages.length === 0 ? (
          <p className="msg-empty muted small">No messages yet. Say hi!</p>
        ) : (
          <ol className="msg-list">
            {messages.map((m, i) => {
              const newDay = i === 0 || day(m.createdAt) !== day(messages[i - 1].createdAt);
              const sameAuthor = i > 0 && !newDay && messages[i - 1].userId === m.userId;
              return (
                <li key={m.id} data-msg={m.id} className={`msg ${m.mine ? "is-mine" : ""} ${sameAuthor && m.id !== newFrom ? "is-follow" : ""} ${newFrom && m.id >= newFrom && !m.mine ? "is-new" : ""}`}>
                  {newDay && <div className="msg-day"><span>{formatDate(day(m.createdAt))}</span></div>}
                  {m.id === newFrom && <div className="msg-new-divider"><span>New messages</span></div>}
                  <div className="msg-row">
                    {!m.mine && (
                      <span className="msg-who-avatar">
                        {!sameAuthor && (m.isAdmin ? <span className="avatar xs msg-admin-avatar"><Icon name="megaphone" size={12} /></span> : <UserAvatar user={{ name: m.userName, ...m.userAvatar }} className="xs" />)}
                      </span>
                    )}
                    <div className="msg-bubble">
                      {!m.mine && !sameAuthor && c.kind !== "direct" && <span className="msg-name">{m.userName}</span>}
                      <p>{m.body}</p>
                      <time dateTime={m.createdAt}>{time(m.createdAt)}</time>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <span ref={endRef} />
      </div>

      {error && <p className="field-error msg-error">{error}</p>}
      {c.cantWrite ? (
        <p className="msg-locked muted small"><Icon name="lock" size={14} /> {c.cantWrite}</p>
      ) : (
        <form className="msg-compose" onSubmit={send}>
          <label htmlFor={`msg-${id}`} className="sr-only">Write a message</label>
          <textarea
            id={`msg-${id}`}
            className="input"
            rows="1"
            maxLength={2000}
            placeholder="Write a message"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter adds a line
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button type="submit" className="btn btn-primary" disabled={!text.trim() || sending} aria-label="Send">
            <Icon name="arrowRight" size={18} />
          </button>
        </form>
      )}
    </section>
  );
}

// Start a conversation. loadOptions(search) -> [{ key, label, sub, who, group?, isAdmin?, open: () => Promise<conversation> }]
// (searched as you type; "group" puts a small heading above the first option of each group)
function NewConversation({ loadOptions, onClose, onOpened }) {
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
//   onUnread(): the unread count may have changed (menu badge)
export default function Messages({ openId, onOpenedId, newOptions, onUnread, onOpenPerson, emptyText }) {
  const [list, setList] = useState(null);
  const [activeId, setActiveId] = useState(openId || null);
  const [search, setSearch] = useState("");
  const [starting, setStarting] = useState(null); // options for "New message"

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
                    {c.lastMessage && <span className="msg-convo-preview">{c.lastMessage.mine && "You: "}{c.lastMessage.body}</span>}
                  </span>
                  {c.unread > 0 && <span className="nav-count msg-unread">{c.unread}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {activeId ? (
        <ConversationView key={activeId} id={activeId} onBack={() => setActiveId(null)} onSent={loadList} onRead={loadList} onOpenPerson={onOpenPerson} />
      ) : (
        <div className="msg-thread msg-placeholder">
          <EmptyState icon="mail" title="Your messages" text="Pick a conversation, or start a new one." />
        </div>
      )}

      {starting && (
        <NewConversation
          loadOptions={newOptions}
          onClose={() => setStarting(null)}
          onOpened={(c) => {
            setStarting(null);
            setActiveId(c.id);
            loadList();
          }}
        />
      )}
    </div>
  );
}
