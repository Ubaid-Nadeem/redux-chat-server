import { Schema } from "mongoose";
import mongoose from "mongoose";

const signupSchema = new Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  active: { type: Boolean, required: true, default: true },
  createdAt: { type: Date, default: Date.now },
  verified: { type: Boolean, required: true, default: false },
  friends: [
    { email: { type: String }, name: { type: String }, id: { type: String } },
  ],
  profilePic: { type: String, default: "" },
});

const User = mongoose.model("Users", signupSchema);

export default User;
