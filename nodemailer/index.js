import nodemailer from "nodemailer";
import "dotenv/config"


const transporter = nodemailer.createTransport({
  service: "gmail",
  // 
  //  , // upgrade later with STARTTLS
  auth: {
    user: "ubaidmuhammad916@gmail.com",
    pass: process.env.EMAIL_PASSWORD,
  },
});

export default async function mailVerification(code, email) {

  await transporter.sendMail({
    from: "ubaidmuhammad916@gmail.com",  // replace with your email
    to: email,
    subject: "Verification Email",
    html: `<div>
  <h2>Verification Code</h2>
  <p>
    Your verification code is <b>${code}</b>
  </p>
  </div>`,
  });
}
