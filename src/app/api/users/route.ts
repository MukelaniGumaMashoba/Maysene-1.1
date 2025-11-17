import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import notificationapi from 'notificationapi-node-server-sdk';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, role, phone_number } = body;

    if (!email || !role || !phone_number) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use admin client to create user without starting session
    const adminSupabase = await createClient(true);
    const { data: authData, error: signUpError } = await adminSupabase.auth.admin.createUser({
      email,
      password: phone_number,
      email_confirm: true
    });

    if (signUpError) {
      console.error('Auth signup error:', signUpError);
      return NextResponse.json({ error: signUpError.message }, { status: 400 });
    }

    const { error: profileError } = await adminSupabase
      .from('users')
      .update({ role, company: 'Maysene', phone: phone_number })
      .eq('id', authData.user?.id);

    if (profileError) {
      console.error('Users table error:', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    // If driver role, update drivers table
    if (role === 'driver') {
      const { error: driverError } = await adminSupabase
        .from('drivers')
        .update({ user_id: authData.user?.id, cell_number: phone_number })
        .eq('email_address', email);

      if (driverError) {
        console.error('Drivers table error:', driverError);
        return NextResponse.json({ error: driverError.message }, { status: 400 });
      }
    }

    // Send credentials via email and SMS
    notificationapi.init(process.env.NOTIFICATIONAPI_CLIENT_ID!, process.env.NOTIFICATIONAPI_CLIENT_SECRET!);
    
    const formattedPhone = phone_number.startsWith('0') 
      ? '+27' + phone_number.slice(1) 
      : phone_number;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 50%, #fce7f3 100%); padding: 40px 20px;">
        <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 80px; height: 80px; background: black; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 32px; font-weight: bold;">M</span>
            </div>
            <h1 style="color: #1e293b; margin: 0; font-size: 28px;">Breakdown Logistics</h1>
            <p style="color: #64748b; margin: 10px 0 0 0;">Maysene Transport Solutions</p>
          </div>
          <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 20px; margin: 30px 0; border-radius: 8px;">
            <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 20px;">Welcome to Maysene!</h2>
            <p style="color: #475569; margin: 0 0 20px 0; line-height: 1.6;">Your account has been created. Use these credentials to log in:</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">Email</p>
              <p style="margin: 0 0 20px 0; color: #1e293b; font-size: 16px; font-weight: 600;">${email}</p>
              <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">Password</p>
              <p style="margin: 0; color: #1e293b; font-size: 16px; font-weight: 600;">${phone_number}</p>
            </div>
            <p style="color: #475569; margin: 20px 0 0 0; line-height: 1.6;">Role: <strong>${role}</strong></p>
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_SUPABASE_URL}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">Login Now</a>
          </div>
        </div>
      </div>
    `;

    await notificationapi.send({
      notificationId: 'user_created',
      user: { id: authData.user?.id, email },
      mergeTags: { email, password: phone_number, role },
      email: {
        subject: 'Welcome to Maysene - Your Account Details',
        html: emailHtml,
        senderName: 'Maysene Logistics',
        senderEmail: process.env.EMAIL_FROM!
      },
      sms: {
        message: `Welcome to Maysene! Login: ${email} Password: ${phone_number}`,
        phoneNumber: formattedPhone
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, role, company, created_at')
      .eq('company', 'Maysene')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch last sign in from auth.users
    const adminSupabase = await createClient(true);
    const usersWithAuth = await Promise.all(
      (users || []).map(async (u) => {
        const { data: authUser } = await adminSupabase.auth.admin.getUserById(u.id);
        return { ...u, last_sign_in_at: authUser?.user?.last_sign_in_at || null };
      })
    );

    return NextResponse.json({ users: usersWithAuth });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}