import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import notificationapi from 'notificationapi-node-server-sdk';
import { decrypt } from '@/lib/crypto';

notificationapi.init(
  process.env.NOTIFICATIONAPI_CLIENT_ID!,
  process.env.NOTIFICATIONAPI_CLIENT_SECRET!
);

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await request.json();

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, role')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let password = generatePassword();
    let driverCode = null;
    let phoneNumber = null;

    const { data: driverData } = await supabase
      .from('drivers')
      .select('driver_code, cell_number')
      .eq('email_address', userData.email)
      .single();

    if (driverData?.driver_code) {
      try {
        const decryptedCode = decrypt(driverData.driver_code);
        password = decryptedCode;
        driverCode = decryptedCode;
      } catch (error) {
        console.error('Decryption error:', error);
        password = driverData.driver_code;
        driverCode = driverData.driver_code;
      }
      phoneNumber = driverData.cell_number?.trim();
      if (phoneNumber?.startsWith('0')) {
        phoneNumber = '+27' + phoneNumber.substring(1);
      }
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      { password }
    );

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 50%, #fce7f3 100%); }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb; }
            .header { background: white; padding: 40px 20px; text-align: center; border-bottom: 1px solid #e5e7eb; }
            .logo-circle { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: black; border-radius: 50%; margin-bottom: 16px; }
            .brand { font-size: 28px; font-weight: bold; color: #111827; margin: 0; }
            .subtitle { color: #6b7280; margin: 8px 0 0; font-size: 14px; }
            .content { padding: 40px 30px; }
            .title { font-size: 24px; color: #111827; margin: 0 0 20px; font-weight: 600; }
            .text { color: #6b7280; line-height: 1.6; margin: 0 0 20px; }
            .credentials { background: #f9fafb; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0; border-radius: 8px; }
            .credential-row { margin: 10px 0; }
            .label { font-weight: 600; color: #111827; display: inline-block; width: 100px; }
            .value { color: #374151; font-family: monospace; background: white; padding: 6px 12px; border-radius: 6px; border: 1px solid #e5e7eb; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo-circle">
                <img src="https://jbactgkcijnkjpyqqzxv.supabase.co/storage/v1/object/public/assets/Logo.png" alt="Logo" width="48" height="48" style="border-radius: 50%;" />
              </div>
              <h1 class="brand">Breakdown Logistics</h1>
              <p class="subtitle">Welcome back to your Maysene Logistics</p>
            </div>
            <div class="content">
              <h2 class="title">Your Account Credentials</h2>
              <p class="text">Hello,</p>
              <p class="text">Your password has been reset. Please use the following credentials to access your account:</p>
              <div class="credentials">
                <div class="credential-row">
                  <span class="label">Email:</span>
                  <span class="value">${userData.email}</span>
                </div>
                <div class="credential-row">
                  <span class="label">Password:</span>
                  <span class="value">${password}</span>
                </div>
                ${driverCode ? `<div class="credential-row"><span class="label">Driver Code:</span><span class="value">${driverCode}</span></div>` : ''}
                ${phoneNumber ? `<div class="credential-row"><span class="label">Phone:</span><span class="value">${phoneNumber}</span></div>` : ''}
              </div>
              <p class="text">Please change your password after your first login for security purposes.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Soltrack & Maysene Logistics. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const smsMessage = `Maysene Login - Email: ${userData.email}, Password: ${password}`;

    await notificationapi.send({
      notificationId: 'user_credentials',
      user: {
        id: userId,
        email: userData.email,
        number: phoneNumber || undefined
      },
      email: {
        subject: 'Your Maysene Account Credentials',
        html: emailHtml,
        senderName: 'Maysene',
        senderEmail: process.env.EMAIL_FROM!
      },
      sms: phoneNumber ? {
        message: smsMessage
      } : undefined
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
