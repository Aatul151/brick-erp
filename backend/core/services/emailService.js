import sgMail from "@sendgrid/mail";

const isConfigured = process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL;

if (isConfigured) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const sendEmail = async (to, subject, html) => {
    if (!isConfigured) {
        console.log("SendGrid not configured. Email would be sent to:", to);
        console.log("Subject:", subject);
        console.log("Content:", html);
        return {
            success: true,
            message: "Email service not configured",
        };
    }

    try {
        const msg = {
            to,
            from: {
                email: process.env.SENDGRID_FROM_EMAIL,
                name: process.env.SENDGRID_FROM_NAME || "SaaS Platform",
            },
            subject,
            html,
        };

        await sgMail.send(msg);
        return {
            success: true,
            message: "Email sent successfully",
        };
    } catch (error) {
        console.error("Email sending failed:", error.message);
        return {
            success: false,
            message: error.message,
        };
    }
};

export const sendPasswordResetEmail = async (to, resetToken, userName) => {
    const resetUrl = `${process.env.API_URL}/reset-password?token=${resetToken}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .button { display: inline-block; padding: 12px 30px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #4F46E5;">${resetUrl}</p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} SaaS Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    return await sendEmail(to, "Password Reset Request", html);
};

export const sendWelcomeEmail = async (to, userName, tempPassword) => {
    const loginUrl = `${process.env.API_URL}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .credentials { background: white; padding: 15px; border-left: 4px solid #4F46E5; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 30px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to SaaS Platform</h1>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>Your account has been created successfully. Here are your login credentials:</p>
          <div class="credentials">
            <p><strong>Email:</strong> ${to}</p>
            <p><strong>Temporary Password:</strong> ${tempPassword}</p>
          </div>
          <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
          <p style="text-align: center;">
            <a href="${loginUrl}" class="button">Login Now</a>
          </p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} SaaS Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    return await sendEmail(to, "Welcome to SaaS Platform", html);
};

export const sendTenantSuspensionEmail = async (to, tenantName, adminName) => {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #DC2626; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Account Suspended</h1>
        </div>
        <div class="content">
          <p>Hello ${adminName},</p>
          <p>Your organization account <strong>${tenantName}</strong> has been suspended.</p>
          <p>You and your team members will not be able to access the platform until the account is reactivated.</p>
          <p>If you believe this is an error or need assistance, please contact our support team.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} SaaS Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    return await sendEmail(to, "Account Suspended", html);
};

export const sendUserInvitationEmail = async (to, inviterName, tenantName, tempPassword) => {
    const loginUrl = `${process.env.API_URL}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .credentials { background: white; padding: 15px; border-left: 4px solid #4F46E5; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 30px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>You've Been Invited</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>${inviterName} has invited you to join <strong>${tenantName}</strong> on SaaS Platform.</p>
          <p>Your account has been created with the following credentials:</p>
          <div class="credentials">
            <p><strong>Email:</strong> ${to}</p>
            <p><strong>Temporary Password:</strong> ${tempPassword}</p>
          </div>
          <p><strong>Important:</strong> Please change your password after your first login.</p>
          <p style="text-align: center;">
            <a href="${loginUrl}" class="button">Accept Invitation</a>
          </p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} SaaS Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    return await sendEmail(to, `Invitation to join ${tenantName}`, html);
};

export const sendAccountReactivationEmail = async (to, userName, tenantName) => {
    const loginUrl = `${process.env.API_URL}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .button { display: inline-block; padding: 12px 30px; background: #10B981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Account Reactivated</h1>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>Good news! Your account for <strong>${tenantName}</strong> has been reactivated.</p>
          <p>You can now log in and access all platform features.</p>
          <p style="text-align: center;">
            <a href="${loginUrl}" class="button">Login Now</a>
          </p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} SaaS Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    return await sendEmail(to, "Account Reactivated", html);
};
