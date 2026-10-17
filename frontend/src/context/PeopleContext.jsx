import { createContext, useCallback, useContext, useMemo, useState } from "react";
import PersonDialog from "../components/PersonDialog.jsx";

// Open anyone's profile from anywhere (roster, tutors, leaderboard, friends):
//   const { openPerson } = usePeople(); openPerson(user.id)
// friendsVersion goes up whenever a friendship changes, so friend lists reload.
// messagePerson(userId): open (or start) your conversation with a friend
const PeopleContext = createContext({ openPerson: () => {}, friendsVersion: 0, friendsChanged: () => {}, messagePerson: null });

export function PeopleProvider({ flash, onMessage, children }) {
  const [personId, setPersonId] = useState(null);
  const [friendsVersion, setFriendsVersion] = useState(0);
  const friendsChanged = useCallback(() => setFriendsVersion((n) => n + 1), []);
  const openPerson = useCallback((id) => setPersonId(id), []);
  const messagePerson = useMemo(
    () => (onMessage ? (id) => { setPersonId(null); onMessage(id); } : null),
    [onMessage]
  );
  const value = useMemo(() => ({ openPerson, friendsVersion, friendsChanged, messagePerson }), [openPerson, friendsVersion, friendsChanged, messagePerson]);

  return (
    <PeopleContext.Provider value={value}>
      {children}
      {personId && <PersonDialog key={personId} id={personId} flash={flash} onChanged={friendsChanged} onMessage={messagePerson} onClose={() => setPersonId(null)} />}
    </PeopleContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const usePeople = () => useContext(PeopleContext);
