async function sendEmail(env, to, subject, text) {
    if (!env.RESEND_API_KEY || !env.MAIL_FROM) {
        const error = new Error("Email delivery is not configured.");
        error.status = 503;
        throw error;
    }

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: env.MAIL_FROM, to, subject, text }),
    });
    if (!response.ok) {
        const error = new Error("Email provider rejected the message.");
        error.status = response.status === 429 ? 503 : 502;
        throw error;
    }
}

export function sendTemporaryPassword(env, email, name, password) {
    return sendEmail(
        env,
        email,
        "Mật khẩu EduInsight",
        `Xin chào ${name},\n\nMật khẩu tạm thời của bạn là: ${password}\n` +
            "Hãy đổi mật khẩu ngay sau lần đăng nhập. Nếu bạn không yêu cầu tài khoản này, vui lòng liên hệ quản trị viên.",
    );
}

export function sendPasswordResetCode(env, email, name, code) {
    return sendEmail(
        env,
        email,
        "Mã xác nhận đặt lại mật khẩu EduInsight",
        `Xin chào ${name},\n\nMã xác nhận của bạn là: ${code}\n` +
            "Mã có hiệu lực trong 10 phút và chỉ sử dụng được một lần. Nếu bạn không yêu cầu, hãy bỏ qua email này.",
    );
}
