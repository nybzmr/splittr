import React from "react";
import "../styles/user_switching.css";

function UserSwitching(props) {
  return (
    <section className="user-switching-container">
      <select name="users" value={props.group.activeUser} onChange={(event) => props.onClick(event.target.value)}>
        {props.group.users.map((user) => (
          <option key={user.username} value={user.username}>{user.username}</option>
        ))}
      </select>
    </section>
  );
}

export default UserSwitching;
