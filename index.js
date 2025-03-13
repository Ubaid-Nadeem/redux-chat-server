import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";
import User from "./schema/user.js";
import Message from "./schema/message.js";
import "dotenv/config";

// Set up environment variables
const PORT = process.env.PORT || 4000;
const MONOGO_DB_KEY = process.env.MONGODB_URI;
const userIds = {};

const app = express();
app.use(cors("*"));
app.use(express.json());
app.use("/auth", authRoutes);

// Initialize socket.io and set up event listeners
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://react-chatapp-psi.vercel.app",
    methods: ["GET", "POST"],
  },
});

// Connect to MongoDB database
await mongoose
  .connect(MONOGO_DB_KEY)
  .then(() => {
    console.log("db connected");
  })
  .catch((e) => {
    console.log(e);
  });

io.on("connection", (socket) => {
  
  socket.on("join", ({ uid }) => {
    userIds[uid] = socket.id;
    io.to(socket.id).emit("connected", uid);
    console.log(userIds);
  });

  socket.on("send_message", ({ sender, reciver, message }) => {
   console.log( sender, reciver, message)
    io.to(userIds[reciver]).emit("new_message", {
      sender,
      reciver,
      message,
    });
  });
});

app.get("/", (req, res) => {
  res.send("hello vercel");
  console.log("Hello vercel");
});

app.post("/fetchuser", async (req, res) => {
  const { token } = req.body;

  let user = await User.findOne({ _id: token });
  if (user) {
    let data = {
      user: {
        name: user.username,
        email: user.email,
      },
      fetchUser: true,
      isLogin: true,
      uid: user._id,
      friends: [],
      socketConnected: false,
    };

    if (user.friends.length) {
      let friends = user.friends.map(async (friend) => {
        let prevMessage = await Message.findOne({
          $or: [
            {
              reciver: friend.id,
              sender: String(user._id),
            },
            {
              reciver: String(user._id),
              sender: friend.id,
            },
          ],
        }).sort({ timestamp: -1 });

        return {
          email: friend.email,
          name: friend.name,
          lastMessage: prevMessage,
          uid: friend.id,
          messages: [],
          fetchchat: false,
        };
      });
      const friendsData = await Promise.all(friends);
      data.friends = friendsData;
      res.send({ error: false, data, msg: "Login Successful" });
    } else {
      res.send({ error: false, data, msg: "Login Successful" });
    }
  } else {
    res.send({ error: true, data: null, msg: "User not found" });
  }
});

app.post("/sendmessage", async (req, res) => {
  try {
    let msg = new Message({
      reciver: "67c19df356d318c936407a78",
      sender: "67c64e7499d91112222bcd1e",
      message: "API Checking 3",
      messageType: "text",
    });

    await msg.save();

    res.send({ error: false, data: msg, msg: "Message sent successfully" });
  } catch (e) {
    res.send({ error: true, data: null, msg: "Failed to send message" });
  }
});

app.post("/getmessages", async (req, res) => {
  const { sender, reciver } = req.body;

  try {
    const messages = await Message.find({
      $or: [
        { sender, reciver },
        { sender: reciver, reciver: sender },
      ],
    });

    res.send({
      error: false,
      data: messages,
      msg: "Messages fetched successfully",
    });
  } catch (e) {
    res.send({ error: true, data: null, msg: "Failed to fetch messages" });
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
