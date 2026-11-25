import nodemailer from "nodemailer";
import { config, mailConfigured } from "../config.js";

let transporter;

function getTransporter() {
  if (!mailConfigured) {
    const error = new Error("SMTP mail service is not configured.");
    error.status = 503;
    throw error;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.mailHost,
      port: config.mailPort,
      secure: config.mailPort === 465,
      auth: {
        user: config.mailUser,
        pass: config.mailPassword,
      },
    });
  }
  return transporter;
}

async function sendMail(to, subject, text) {
  await getTransporter().sendMail({
    from: config.mailFrom,
    to,
    subject,
    text,
  });
}

export function sendTemporaryPassword(email, name, password) {
  return sendMail(
    email,
    "Mật khẩu EduInsight",
    `Xin chào ${name},\n\nMật khẩu tạm thời của bạn là: ${password}\n` +
      "Hãy đổi mật khẩu ngay sau lần đăng nhập bằng mật khẩu đầu tiên. " +
      "Nếu bạn chưa yêu cầu tài khoản này, vui lòng bỏ qua email và liên hệ quản trị viên.",
  );
}

export function sendPasswordResetCode(email, name, code) {
  return sendMail(
    email,
    "Mã xác nhận đặt lại mật khẩu EduInsight",
    `Xin chào ${name},\n\nMã xác nhận của bạn là: ${code}\n` +
      "Mã có hiệu lực trong 10 phút và chỉ sử dụng được một lần. " +
      "Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.",
  );
}
