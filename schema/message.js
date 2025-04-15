import { Schema } from "mongoose";
import mongoose from "mongoose";

const messageSchema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: "Users" },
  reciver: { type: Schema.Types.ObjectId, ref: "Users" },
  message: { type: String },
  timestamp: { type: Date, default: Date.now },
  messageType: { type: String, enum: ["text", "image", "video", "audio"] },
  unique: { type: String },
});

const Message = mongoose.model("Messages", messageSchema);

export default Message;
