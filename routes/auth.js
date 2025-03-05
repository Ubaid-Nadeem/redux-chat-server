import express from "express";
import Joi from "joi";
import User from "../schema/user.js ";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mailVerification from "../nodemailer/index.js";
import "dotenv/config";
import Message from "../schema/message.js";

const route = express.Router();
const saltRounds = process.env.SALT_ROUNDS;

const signupValidation = Joi.object({
  username: Joi.string().max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

const loginValidation = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const genrateToekn = async (data, res, resend) => {
  let code = Math.floor(100000 + Math.random() * 40000);
  let { email } = data;

  let user = {
    ...data,
    code: code,
  };

  let token = jwt.sign({ ...user }, process.env.AUTH_SECRET, {
    expiresIn: "60s",
  });

  mailVerification(code, email);

  if (!resend) {
    user = {
      ...user,
      token,
    };

    let newUser = new User(user);
    await newUser.save();
  }

  res.send({
    error: false,
    data: { token, code, email },
    msg: "Verification email sent!",
  });
};

route.post("/signup", async (req, res) => {
  const { error, value } = signupValidation.validate(req.body);

  if (error) return res.send({ error: true, data: null, msg: error.message });

  let findUser = await User.findOne({ email: req.body.email }).exec();

  if (findUser)
    return res.send({ error: true, data: null, msg: "Email already exists!" });

  const hashedPassword = await bcrypt.hash(value.password, 10);

  let user = {
    ...value,
    password: hashedPassword,
  };

  genrateToekn(user, res, false);
});

route.post("/login", async (req, res) => {
  const { error, value } = loginValidation.validate(req.body);
  if (error) {
    res.send(error);
  }

  let findUser = await User.findOne({ email: value.email })
    .populate("friends")
    .exec();

  if (findUser) {
    try {
      const match = await bcrypt.compare(value.password, findUser.password);
      if (match) {
        let data = {
          user: {
            name: findUser.username,
            email: findUser.email,
          },
          fetchUser: true,
          messages: [],
          isLogin: true,
          uid: findUser._id,
          friends: [],
        };

        if (findUser.friends.length) {
          let friends = findUser.friends.map(async (friend) => {
            let prevMessage = await Message.findOne({
              $or: [
                {
                  reciver: friend.id,
                  sender: String(findUser._id),
                },
                {
                  reciver: String(findUser._id),
                  sender: friend.id,
                },
              ],
            }).sort({ timestamp: -1 });

            return {
              email: friend.email,
              name: friend.name,
              lastMessage: prevMessage,
              uid: friend.id,
            };
          });
          const friendsData = await Promise.all(friends);
          data.friends = friendsData;
          res.send({ error: false, data, msg: "Login Successful" });
        } else {
          res.send({ error: false, data, msg: "Login Successful" });
        }
      } else {
        res.send({ error: true, data: null, msg: "Invalid password" });
      }
      
    } catch (err) {
      res.send({ error: true, data: null, msg: "Invalid password" });
    }
  } else {
    res.send({ error: true, data: null, msg: "User not found" });
  }
});

route.post("/resendcode", (req, res) => {
  genrateToekn(req.body, res, true);
});
route.post("/verifyuser", async (req, res) => {
  const { token } = req.body;

  try {
    let decoded = jwt.verify(token, process.env.AUTH_SECRET);
    if (decoded.code == req.body.userCode) {
      let user = await User.findOneAndUpdate(
        { email: decoded.email },
        { $set: { verified: true } },
        { new: true }
      ).exec();

      if (!user)
        return res.send({ error: true, data: null, msg: "User not found!" });

      delete user.password;

      return res.send({
        error: false,
        data: user,
        msg: "User verified successfully!",
      });
    } else {
    }
    res.send({ error: true, data: req.body, msg: "Code Epired" });
  } catch (err) {
    return res.send({ error: true, data: null, msg: "Code Expired" });
  }
  {
  }
});

export default route;
