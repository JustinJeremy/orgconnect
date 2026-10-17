import { createContext, useCallback, useContext, useMemo, useState } from "react";
import PersonDialog from "../components/PersonDialog.jsx";

// Open anyone's profile from anywhere (roster, tutors, leaderboard, friends):
//   const { openPerson } = usePeople(); openPerson(user.id)
// friendsVersion goes up whenever a friendship changes, so friend lists reload.
const PeopleContext = createContext({ openPerson: () => {}, friendsVersion: 0, friendsChanged: () => {} });

export function PeopleProvider({ flash, children }) {
  const [personId, setPersonId] = useState(null);
  const [friendsVersion, setFriendsVersion] = useState(0);
  const friendsChanged = useCallback(() => setFriendsVersion((n) => n + 1), []);
  const openPerson = useCallback((id) => setPersonId(id), []);
  const value = useMemo(() => ({ openPerson, friendsVersion, friendsChanged }), [openPerson, friendsVersion, friendsChanged]);

  return (
    <PeopleContext.Provider value={value}>
      {children}
      {personId && <PersonDialog key={personId} id={personId} flash={flash} onChanged={friendsChanged} onClose={() => setPersonId(null)} />}
    </PeopleContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const usePeople = () => useContext(PeopleContext);
