import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import "./addUser.css";
import { db } from "../../lib/firebase";
import { useState } from "react";
import { useUserStore } from "../../lib/userStore";
import { toast } from "react-toastify";

const AddUser = ({ setAddMode }) => {
  const [user, setUser] = useState(null);
  const { currentUser } = useUserStore();

  const handleSearch = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const username = formData.get("username");

    if (username === currentUser.username) {
      setUser(null);
      return;
    }

    try {
      const userRef = collection(db, "users");
      const q = query(userRef, where("username", "==", username));
      const querySnapShot = await getDocs(q);

      if (!querySnapShot.empty) {
        setUser(querySnapShot.docs[0].data());
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleAdd = async () => {
    if (!user) return;

    const chatRef = collection(db, "chats");
    const userChatsRef = collection(db, "userchats");

    const currentUserId = currentUser.id;
    const receiverId = user.id;

    try {
      const existingChatsQuery = query(
        chatRef,
        where("users", "array-contains", currentUserId)
      );

      const existingChatsSnapshot = await getDocs(existingChatsQuery);
      let chatExists = false;

      existingChatsSnapshot.forEach((doc) => {
        const chatData = doc.data();
        if (chatData.users.includes(receiverId)) {
          chatExists = true;
        }
      });

      if (chatExists) {
        toast.warn("Chat already exists.");
        return;
      }
      const newChatRef = doc(chatRef);

      await setDoc(newChatRef, {
        createdAt: serverTimestamp(),
        users: [currentUser.id, user.id],
        messages: [],
      });

      await updateDoc(doc(userChatsRef, user.id), {
        chats: arrayUnion({
          chatId: newChatRef.id,
          lastMessage: "",
          receiverId: currentUser.id,
          updatedAt: Date.now(),
        }),
      });

      await updateDoc(doc(userChatsRef, currentUser.id), {
        chats: arrayUnion({
          chatId: newChatRef.id,
          lastMessage: "",
          receiverId: user.id,
          updateAt: Date.now(),
        }),
      });
    } catch (err) {
      console.log(err);
    }
  };

  const handleAddAndClose = async () =>{
    handleAdd();
    setAddMode(false);
  };

  return (
    <div className="addUser">
      <form onSubmit={handleSearch}>
        <input type="text" placeholder="Username" name="username" />
        <button>Search</button>
      </form>
      {user && (
        <div className="user">
          <div className="detail">
            <img src={user.avatar || "./avatar.png"} alt="" />
            <span>{user.username}</span>
          </div>
          <button onClick={handleAddAndClose}>Add User</button>
        </div>
      )}
    </div>
  );
};

export default AddUser;
