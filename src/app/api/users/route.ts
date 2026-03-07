import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import notificationapi from 'notificationapi-node-server-sdk';
import { encrypt } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, role, phone_number, driver_code } = body;

    if (!email || !role || !phone_number) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (role === 'driver' && !driver_code) {
      return NextResponse.json({ error: 'Driver code is required for driver role' }, { status: 400 });
    }

    // Use service role key to create user without session
    const adminSupabase = await createClient(true);
    
    // Check if user already exists
    const { data: existingUser } = await adminSupabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const driverPassword = role === 'driver' ? `M${driver_code}` : phone_number;
    
    const { data: authData, error: signUpError } = await adminSupabase.auth.admin.createUser({
      email,
      password: driverPassword,
      email_confirm: true
    });

    if (signUpError) {
      console.error('Auth signup error:', signUpError);
      return NextResponse.json({ error: signUpError.message }, { status: 400 });
    }

    // Wait 5 seconds then update role with retry logic
    await new Promise(resolve => setTimeout(resolve, 5000));

    const updateUserRole = async (retryCount = 0) => {
      try {
        // Create a direct service role client to bypass RLS
        const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
        const serviceClient = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        );
        
        // Always try to upsert the user record
        const { data: upsertData, error: upsertError } = await serviceClient
          .from('users')
          .upsert({ 
            id: authData.user?.id,
            email,
            role, 
            company: 'Maysene', 
            phone: phone_number 
          }, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          })
          .select();

        if (upsertError) throw upsertError;
        console.log('User upserted:', upsertData);
      } catch (error) {
        if (retryCount < 1) {
          console.log('Retrying user role update after 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          return updateUserRole(retryCount + 1);
        }
        throw error;
      }
    };

    try {
      await updateUserRole();
    } catch (error) {
      console.error('Failed to update user role:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // If driver role, check and insert into drivers table
    if (role === 'driver') {
      const { data: existingDriver } = await adminSupabase
        .from('drivers')
        .select('id')
        .eq('email_address', email)
        .single();

      if (!existingDriver) {
        const { error: driverError } = await adminSupabase
          .from('drivers')
          .insert({ 
            user_id: authData.user?.id,
            first_name: email,
            email_address: email,
            cell_number: phone_number,
            driver_code: encrypt(driver_code)
          });

        if (driverError) {
          console.error('Drivers table error:', driverError);
          return NextResponse.json({ error: driverError.message }, { status: 400 });
        }
      } else {
        const { error: driverUpdateError } = await adminSupabase
          .from('drivers')
          .update({ 
            user_id: authData.user?.id, 
            first_name: email,
            cell_number: phone_number,
            driver_code: encrypt(driver_code)
          })
          .eq('email_address', email);

        if (driverUpdateError) {
          console.error('Drivers table update error:', driverUpdateError);
        }
      }
    }

    // Send credentials via email and SMS
    notificationapi.init(process.env.NOTIFICATIONAPI_CLIENT_ID!, process.env.NOTIFICATIONAPI_CLIENT_SECRET!);
    
    const formattedPhone = phone_number.startsWith('0') 
      ? '+27' + phone_number.slice(1) 
      : phone_number.startsWith('+') 
      ? phone_number 
      : '+27' + phone_number;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 50%, #fce7f3 100%); padding: 40px 20px;">
        <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 80px; height: 80px; background: black; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 32px; font-weight: bold;">M</span>
            </div>
            <h1 style="color: #1e293b; margin: 0; font-size: 28px;">Solflo</h1>
            <p style="color: #64748b; margin: 10px 0 0 0;">Maysene Transport Solutions</p>
          </div>
          <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 20px; margin: 30px 0; border-radius: 8px;">
            <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 20px;">Welcome to Maysene!</h2>
            <p style="color: #475569; margin: 0 0 20px 0; line-height: 1.6;">Your account has been created. Use these credentials to log in:</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">Email</p>
              <p style="margin: 0 0 20px 0; color: #1e293b; font-size: 16px; font-weight: 600;">${email}</p>
              <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">Password</p>
              <p style="margin: 0; color: #1e293b; font-size: 16px; font-weight: 600;">${driverPassword}</p>
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
      user: { id: authData.user?.id, email, number: formattedPhone },
      mergeTags: { email, password: driverPassword, role },
      email: {
        subject: 'Welcome to Maysene - Your Account Details',
        html: emailHtml,
        senderName: 'Maysene Logistics',
        senderEmail: process.env.EMAIL_FROM!
      },
      sms: {
        message: `Welcome to Maysene! Login: ${email} Password: ${driverPassword}`
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

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, ...updateData } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const adminSupabase = await createClient(true);
    
    // Update user in users table
    const { data: updatedUser, error: updateError } = await adminSupabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Users table update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const adminSupabase = await createClient(true);
    
    // Delete from auth table first
    const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error('Auth deletion error:', authDeleteError);
      // Continue with users table deletion even if auth deletion fails
    }

    // Delete from users table
    const { error: usersError } = await adminSupabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (usersError) {
      console.error('Users table deletion error:', usersError);
      return NextResponse.json({ error: usersError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}