import nodemailer from 'nodemailer';

// ========================================
// EMAIL TRANSPORTER CONFIGURATION
// ========================================
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || 'glambyzebaish@gmail.com',
    pass: process.env.EMAIL_PASS || 'aoka cnup lwqq fiwx  ',
  },
});

// ========================================
// BASE EMAIL FUNCTION
// ========================================
export async function sendEmail({ to, subject, html, text }) {
  try {
    const info = await transporter.sendMail({
      from: `"Glam by Zebaish" <${process.env.EMAIL_USER || 'glambyzebaish@gmail.com'}>`,
      to,
      subject,
      html: html || text,
      text: text || html?.replace(/<[^>]*>/g, ''),
    });
    console.log('Email sent to:', to);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error: error.message };
  }
}

// ========================================
// 0. CONTACT FORM - SUBMISSION NOTIFICATION
// ========================================
export async function sendContactFormEmail({ name, email, subject, message }) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f5f0f8; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 30px; border: 1px solid #e8e0f0; }
    .header { border-bottom: 2px solid #d4af37; padding-bottom: 15px; margin-bottom: 20px; }
    .header h2 { color: #2d1b4e; margin: 0; font-weight: 400; }
    .label { color: #888; font-size: 13px; font-weight: 600; }
    .value { color: #2d1b4e; font-size: 14px; margin-bottom: 8px; }
    .divider { border-top: 1px solid #eee; margin: 15px 0; }
    .message-box { background: #F8F4FA; border-left: 3px solid #d4af37; padding: 15px; border-radius: 4px; color: #2d1b4e; font-size: 14px; white-space: pre-wrap; }
    .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; color: #999; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>New Contact Form Submission</h2>
    </div>

    <p style="color: #555;">Someone submitted the contact form on the Glam by Zebaish website.</p>

    <div class="divider"></div>

    <p><span class="label">Name:</span><br><span class="value">${name}</span></p>
    <p><span class="label">Email:</span><br><span class="value">${email}</span></p>
    <p><span class="label">Subject:</span><br><span class="value">${subject || 'Not provided'}</span></p>

    <div class="divider"></div>

    <p class="label">Message:</p>
    <div class="message-box">${message}</div>

    <div class="footer">
      Glam by Zebaish - Contact Form
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: process.env.ADMIN_EMAIL || 'glambyzebaish@gmail.com',
    subject: `New Contact Form Message${subject ? ` - ${subject}` : ''}`,
    html,
  });
}
// ========================================
// 1. ADMIN - NEW ARTIST REGISTRATION NOTIFICATION
// ========================================
export async function sendAdminArtistNotification(artistData) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f5f0f8; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 30px; border: 1px solid #e8e0f0; }
    .header { border-bottom: 2px solid #d4af37; padding-bottom: 15px; margin-bottom: 20px; }
    .header h2 { color: #2d1b4e; margin: 0; font-weight: 400; }
    .label { color: #888; font-size: 13px; font-weight: 600; }
    .value { color: #2d1b4e; font-size: 14px; margin-bottom: 8px; }
    .divider { border-top: 1px solid #eee; margin: 15px 0; }
    .status { background: #fff3cd; padding: 10px 15px; border-radius: 4px; color: #856404; margin: 15px 0; }
    .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; color: #999; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>New Makeup Artist Registration</h2>
    </div>
    
    <p style="color: #555;">A new artist has registered on Glam by Zebaish platform.</p>
    
    <div class="divider"></div>
    
    <p><span class="label">Name:</span><br><span class="value">${artistData.name}</span></p>
    <p><span class="label">Email:</span><br><span class="value">${artistData.email}</span></p>
    <p><span class="label">Phone:</span><br><span class="value">${artistData.phone || 'Not provided'}</span></p>
    <p><span class="label">Specialties:</span><br><span class="value">${artistData.specialties || 'Not specified'}</span></p>
    <p><span class="label">Location:</span><br><span class="value">${artistData.location || 'Not specified'}</span></p>
    <p><span class="label">Bio:</span><br><span class="value">${artistData.bio || 'Not provided'}</span></p>
    <p><span class="label">ID Proof:</span><br><span class="value">${artistData.idProofUrl ? 'Uploaded' : 'Not uploaded'}</span></p>
    
    <div class="status">
      <strong>Status:</strong> PENDING REVIEW
    </div>
    
    <p style="color: #555;">Please review the artist's credentials and approve or reject their application.</p>
    
    <div class="footer">
      Glam by Zebaish - Admin Notification
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: process.env.ADMIN_EMAIL || 'glambyzebaish@gmail.com',
    subject: `New Artist Registration - ${artistData.name}`,
    html,
  });
}

// ========================================
// 2. ARTIST - REGISTRATION CONFIRMATION
// ========================================
export async function sendArtistRegistrationConfirmation(email, artistData) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f5f0f8; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 30px; border: 1px solid #e8e0f0; }
    .header { border-bottom: 2px solid #d4af37; padding-bottom: 15px; margin-bottom: 20px; }
    .header h2 { color: #2d1b4e; margin: 0; font-weight: 400; }
    .label { color: #888; font-size: 13px; font-weight: 600; }
    .value { color: #2d1b4e; font-size: 14px; margin-bottom: 8px; }
    .divider { border-top: 1px solid #eee; margin: 15px 0; }
    .info-box { background: #f8f4fc; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; color: #999; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Welcome to Glam by Zebaish</h2>
    </div>
    
    <p style="color: #555;">Dear ${artistData.name},</p>
    <p style="color: #555;">Thank you for registering as a makeup artist with Glam by Zebaish! We're thrilled to have you join our team.</p>
    
    <div class="divider"></div>
    
    <div class="info-box">
      <p style="margin-top: 0; font-weight: 600; color: #2d1b4e;">Your Registration Summary:</p>
      <p><span class="label">Name:</span><br><span class="value">${artistData.name}</span></p>
      <p><span class="label">Email:</span><br><span class="value">${artistData.email}</span></p>
      <p><span class="label">Specialties:</span><br><span class="value">${artistData.specialties || 'Not specified'}</span></p>
      <p><span class="label">Location:</span><br><span class="value">${artistData.location || 'Not specified'}</span></p>
    </div>
    
    <div class="divider"></div>
    
    <h3 style="color: #2d1b4e; font-weight: 400;">What's Next?</h3>
    <p style="color: #555;">Your application is currently under review. Our team will verify your credentials and notify you once approved.</p>
    
    <p style="color: #555;">Questions? Contact us at <a href="mailto:info@glambyzeba.com" style="color: #d4af37;">info@glambyzeba.com</a></p>
    
    <div class="footer">
      Glam by Zebaish - Where Beauty Meets Excellence
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to Glam by Zebaish - Artist Registration Received',
    html,
  });
}

// ========================================
// 3. ARTIST - APPLICATION APPROVED
// ========================================
export async function sendArtistApprovalEmail(email, artistData) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f5f0f8; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 30px; border: 1px solid #e8e0f0; }
    .header { border-bottom: 2px solid #28a745; padding-bottom: 15px; margin-bottom: 20px; }
    .header h2 { color: #28a745; margin: 0; font-weight: 400; }
    .divider { border-top: 1px solid #eee; margin: 15px 0; }
    .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; color: #999; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Congratulations!</h2>
    </div>
    
    <p style="color: #555;">Dear ${artistData.name},</p>
    <p style="color: #555;">We are excited to inform you that your application as a makeup artist has been <strong style="color: #28a745;">APPROVED</strong>! Welcome to the Glam by Zebaish family.</p>
    
    <div class="divider"></div>
    
    <p style="color: #555;">We look forward to seeing your amazing work!</p>
    
    <div class="footer">
      Glam by Zebaish - Where Beauty Meets Excellence
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: email,
    subject: 'Artist Application Approved - Glam by Zebaish',
    html,
  });
}

// ========================================
// 4. ARTIST - APPLICATION REJECTED
// ========================================
export async function sendArtistRejectionEmail(email, artistData) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f5f0f8; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 30px; border: 1px solid #e8e0f0; }
    .header { border-bottom: 2px solid #dc3545; padding-bottom: 15px; margin-bottom: 20px; }
    .header h2 { color: #dc3545; margin: 0; font-weight: 400; }
    .divider { border-top: 1px solid #eee; margin: 15px 0; }
    .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; color: #999; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Application Update</h2>
    </div>
    
    <p style="color: #555;">Dear ${artistData.name},</p>
    <p style="color: #555;">Thank you for your interest in joining Glam by Zebaish as a makeup artist.</p>
    
    <div class="divider"></div>
    
    <p style="color: #dc3545;"><strong>Application Status: NOT APPROVED</strong></p>
    <p style="color: #555;">Unfortunately, we are unable to approve your application at this time.</p>
    ${artistData.rejectionReason ? `<p style="color: #555;"><strong>Reason:</strong> ${artistData.rejectionReason}</p>` : ''}
    
    <div class="divider"></div>
    
    <p style="color: #555;">Questions? Contact us at <a href="mailto:info@glambyzeba.com" style="color: #d4af37;">info@glambyzeba.com</a></p>
    <p style="color: #555;">We wish you all the best in your journey!</p>
    
    <div class="footer">
      Glam by Zebaish - Where Beauty Meets Excellence
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: email,
    subject: 'Artist Application Update - Glam by Zebaish',
    html,
  });
}

// ========================================
// PASSWORD RESET - CUSTOMER / ARTIST
// ========================================
export async function sendPasswordResetEmail(email, { name, resetLink, role }) {
  const roleLabel = role === 'artist' ? 'Makeup Artist' : 'Customer';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f5f0f8; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 30px; border: 1px solid #e8e0f0; }
    .header { border-bottom: 2px solid #d4af37; padding-bottom: 15px; margin-bottom: 20px; }
    .header h2 { color: #2d1b4e; margin: 0; font-weight: 400; }
    .divider { border-top: 1px solid #eee; margin: 15px 0; }
    .btn { display: inline-block; background: #2d1b4e; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 30px; font-weight: 600; margin: 15px 0; }
    .link-fallback { word-break: break-all; color: #6a4c93; font-size: 12px; }
    .notice { background: #fff3cd; padding: 10px 15px; border-radius: 4px; color: #856404; margin: 15px 0; font-size: 13px; }
    .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; color: #999; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Reset Your Password</h2>
    </div>

    <p style="color: #555;">Dear ${name || 'there'},</p>
    <p style="color: #555;">We received a request to reset the password for your Glam by Zebaish ${roleLabel} account. Click the button below to choose a new password.</p>

    <div style="text-align: center;">
      <a href="${resetLink}" class="btn">Reset Password</a>
    </div>

    <p style="color: #777; font-size: 13px;">Or copy and paste this link into your browser:</p>
    <p class="link-fallback">${resetLink}</p>

    <div class="notice">
      <strong>This link expires in 1 hour.</strong> If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.
    </div>

    <div class="divider"></div>

    <p style="color: #555;">Questions? Contact us at <a href="mailto:info@glambyzeba.com" style="color: #d4af37;">info@glambyzeba.com</a></p>

    <div class="footer">
      Glam by Zebaish - Where Beauty Meets Excellence
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: email,
    subject: 'Reset Your Password - Glam by Zebaish',
    html,
  });
}

// ========================================
// ARTIST - LOGIN CREDENTIALS (manual add / reset by admin)
// ========================================
export async function sendArtistCredentialsEmail(email, { name, username, password, loginUrl }) {
  const login = loginUrl || 'https://www.glambyzebaish.com/artist-login';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f5f0f8; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 30px; border: 1px solid #e8e0f0; }
    .header { border-bottom: 2px solid #d4af37; padding-bottom: 15px; margin-bottom: 20px; }
    .header h2 { color: #2d1b4e; margin: 0; font-weight: 400; }
    .divider { border-top: 1px solid #eee; margin: 15px 0; }
    .btn { display: inline-block; background: #2d1b4e; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 30px; font-weight: 600; margin: 15px 0; }
    .creds { background: #faf7ff; border: 1px solid #e8e0f0; border-radius: 8px; padding: 16px 20px; margin: 15px 0; }
    .creds p { margin: 6px 0; color: #333; font-size: 14px; }
    .creds strong { color: #2d1b4e; }
    .notice { background: #fff3cd; padding: 10px 15px; border-radius: 4px; color: #856404; margin: 15px 0; font-size: 13px; }
    .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; color: #999; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Your Artist Account is Ready</h2>
    </div>

    <p style="color: #555;">Dear ${name || 'there'},</p>
    <p style="color: #555;">An account has been created for you on Glam by Zebaish. Use the credentials below to log in to your Artist Dashboard.</p>

    <div class="creds">
      <p><strong>Username / Email:</strong> ${username}</p>
      <p><strong>Temporary Password:</strong> ${password}</p>
    </div>

    <div style="text-align: center;">
      <a href="${login}" class="btn">Login to Artist Dashboard</a>
    </div>

    <div class="notice">
      You can update your password in the <strong>My Profile</strong> page.
    </div>

    <div class="divider"></div>

    <p style="color: #555;">Questions? Contact us at <a href="mailto:info@glambyzeba.com" style="color: #d4af37;">info@glambyzeba.com</a></p>

    <div class="footer">
      Glam by Zebaish - Where Beauty Meets Excellence
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: email,
    subject: 'Your Artist Account Credentials - Glam by Zebaish',
    html,
  });
}

// ========================================
// 5. ADMIN - NEW BOOKING NOTIFICATION
// ========================================
// orderData now supports multiple packages booked together under one
// groupId (combined checkout). Pass orderData.orders as an array of
// { orderNumber, packageName, date, time, location, amount }.
// orderData.orderNumber / packageName / date / time / location / amount
// (single-package shape) still works for a booking with just one package.
export async function sendAdminNotificationEmail(orderData) {
  const orders = Array.isArray(orderData.orders) && orderData.orders.length > 0
    ? orderData.orders
    : [{
        orderNumber: orderData.orderNumber,
        packageName: orderData.packageName,
        date: orderData.date,
        time: orderData.time,
        location: orderData.location,
        amount: orderData.amount,
      }];

  const totalAmount = orderData.totalAmount ?? orders.reduce((sum, o) => sum + (o.amount || 0), 0);

  const packagesHtml = orders.map((order) => `
    <div class="divider"></div>
    <p><span class="label">Order Number:</span><br><span class="value">${order.orderNumber}</span></p>
    <p><span class="label">Package:</span><br><span class="value">${order.packageName}</span></p>
    <p><span class="label">Date:</span><br><span class="value">${order.date}</span></p>
    <p><span class="label">Time:</span><br><span class="value">${order.time}</span></p>
    <p><span class="label">Address:</span><br><span class="value">${order.location}</span></p>
    <p><span class="label">Amount:</span><br><span class="value">Rs.${order.amount}</span></p>
  `).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f5f0f8; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 30px; border: 1px solid #e8e0f0; }
    .header { border-bottom: 2px solid #d4af37; padding-bottom: 15px; margin-bottom: 20px; }
    .header h2 { color: #2d1b4e; margin: 0; font-weight: 400; }
    .label { color: #888; font-size: 13px; font-weight: 600; }
    .value { color: #2d1b4e; font-size: 14px; margin-bottom: 8px; }
    .divider { border-top: 1px solid #eee; margin: 15px 0; }
    .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; color: #999; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>New Booking Received</h2>
    </div>
    
    <p style="color: #555;">A new booking has been placed on Glam by Zebaish platform.</p>
    
    <div class="divider"></div>
    
    ${orderData.groupId ? `<p><span class="label">Group ID:</span><br><span class="value">${orderData.groupId}</span></p>` : ''}
    <p><span class="label">Customer:</span><br><span class="value">${orderData.customerName}</span></p>
    ${packagesHtml}
    <div class="divider"></div>
    <p><span class="label">Total Amount:</span><br><span class="value">Rs.${totalAmount}</span></p>
    
    <div class="footer">
      Glam by Zebaish - Admin Notification
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: process.env.ADMIN_EMAIL || 'glambyzebaish@gmail.com',
    subject: `New Booking ${orderData.groupId || orderData.orderNumber} - Glam by Zebaish`,
    html,
  });
}

// ========================================
// 6. CUSTOMER - BOOKING CONFIRMATION
// ========================================
// orderData now supports multiple packages booked together under one
// groupId (combined checkout). Pass orderData.orders as an array of
// { orderNumber, packageName, date, time, location, amount }.
// orderData.orderNumber / packageName / date / time / location / amount
// (single-package shape) still works for a booking with just one package.
export async function sendOrderConfirmationEmail(email, orderData) {
  const orders = Array.isArray(orderData.orders) && orderData.orders.length > 0
    ? orderData.orders
    : [{
        orderNumber: orderData.orderNumber,
        packageName: orderData.packageName,
        date: orderData.date,
        time: orderData.time,
        location: orderData.location,
        amount: orderData.amount,
      }];

  const totalAmount = orderData.totalAmount ?? orders.reduce((sum, o) => sum + (o.amount || 0), 0);

  const packagesHtml = orders.map((order) => `
    <div class="divider"></div>
    <p><span class="label">Order Number:</span><br><span class="value">${order.orderNumber}</span></p>
    <p><span class="label">Package:</span><br><span class="value">${order.packageName}</span></p>
    <p><span class="label">Date:</span><br><span class="value">${order.date}</span></p>
    <p><span class="label">Time:</span><br><span class="value">${order.time}</span></p>
    <p><span class="label">Address:</span><br><span class="value">${order.location}</span></p>
    <p><span class="label">Amount:</span><br><span class="value">Rs.${order.amount}</span></p>
  `).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f5f0f8; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 30px; border: 1px solid #e8e0f0; }
    .header { border-bottom: 2px solid #d4af37; padding-bottom: 15px; margin-bottom: 20px; }
    .header h2 { color: #2d1b4e; margin: 0; font-weight: 400; }
    .label { color: #888; font-size: 13px; font-weight: 600; }
    .value { color: #2d1b4e; font-size: 14px; margin-bottom: 8px; }
    .divider { border-top: 1px solid #eee; margin: 15px 0; }
    .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; color: #999; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Booking Confirmed!</h2>
    </div>
    
    <p style="color: #555;">Dear ${orderData.customerName},</p>
    <p style="color: #555;">Thank you for choosing Glam by Zebaish! Your booking has been confirmed.</p>
    
    <div class="divider"></div>
    
    ${orderData.groupId ? `<p><span class="label">Group ID:</span><br><span class="value">${orderData.groupId}</span></p>` : ''}
    ${packagesHtml}
    <div class="divider"></div>
    <p><span class="label">Total Amount:</span><br><span class="value">Rs.${totalAmount}</span></p>
    
    <div class="divider"></div>
    
    <h3 style="color: #2d1b4e; font-weight: 400;">What's Next?</h3>
    <p style="color: #555;">We will assign a professional makeup artist shortly and send you their details. You will receive a confirmation email once the artist is assigned.</p>
    
    <p style="color: #555;">Questions? Contact us at <a href="mailto:info@glambyzeba.com" style="color: #d4af37;">info@glambyzeba.com</a> | +91 9505777790</p>
    
    <div class="footer">
      Glam by Zebaish - Where Beauty Meets Excellence
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: email,
    subject: `Booking Confirmed ${orderData.groupId || orderData.orderNumber} - Glam by Zebaish`,
    html,
  });
}

// ========================================
// 7. CUSTOMER - ARTIST ASSIGNED
// ========================================
export async function sendArtistAssignedEmail(email, orderData, artistData) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f5f0f8; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 30px; border: 1px solid #e8e0f0; }
    .header { border-bottom: 2px solid #d4af37; padding-bottom: 15px; margin-bottom: 20px; }
    .header h2 { color: #2d1b4e; margin: 0; font-weight: 400; }
    .label { color: #888; font-size: 13px; font-weight: 600; }
    .value { color: #2d1b4e; font-size: 14px; margin-bottom: 8px; }
    .divider { border-top: 1px solid #eee; margin: 15px 0; }
    .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; color: #999; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Makeup Artist Assigned!</h2>
    </div>
    
    <p style="color: #555;">Dear ${orderData.customerName},</p>
    <p style="color: #555;">Good news! A professional makeup artist has been assigned to your booking.</p>

    <div class="divider"></div>

    <p><span class="label">Booking:</span><br><span class="value">${orderData.orderNumber}${orderData.packageName ? ' — ' + orderData.packageName : ''}</span></p>
    ${orderData.date ? `<p><span class="label">Date & Time:</span><br><span class="value">${new Date(orderData.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}${orderData.time ? ' at ' + orderData.time : ''}</span></p>` : ''}
    ${orderData.location ? `<p><span class="label">Venue:</span><br><span class="value">${orderData.location}</span></p>` : ''}

    <div class="divider"></div>

    <p><span class="label">Name:</span><br><span class="value">${artistData.name}</span></p>
    <p><span class="label">Phone:</span><br><span class="value">${artistData.phone || 'N/A'}</span></p>
    <p><span class="label">Experience:</span><br><span class="value">${artistData.experience || 0} years</span></p>

    <div class="divider"></div>

    <p style="color: #555;">Your makeup artist will contact you shortly to confirm the details.</p>
    
    <p style="color: #555;">Questions? Contact us at <a href="mailto:info@glambyzeba.com" style="color: #d4af37;">info@glambyzeba.com</a> | +91 9505777790</p>
    
    <div class="footer">
      Glam by Zebaish - Where Beauty Meets Excellence
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: email,
    subject: `Makeup Artist Assigned ${orderData.orderNumber} - Glam by Zebaish`,
    html,
  });
}
