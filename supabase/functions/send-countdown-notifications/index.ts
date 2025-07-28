import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";
import { Resend } from "npm:resend@2.0.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY");

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  countdownId: string;
  email: string;
  notificationTimes: number[]; // hours before event
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { countdownId, email, notificationTimes }: NotificationRequest = await req.json();
    
    console.log("Processing notification request for countdown:", countdownId);

    // Get countdown details
    const { data: countdown, error: countdownError } = await supabase
      .from('countdowns')
      .select('*')
      .eq('id', countdownId)
      .single();

    if (countdownError || !countdown) {
      throw new Error(`Countdown not found: ${countdownError?.message}`);
    }

    const targetDate = new Date(countdown.target_date);
    const now = new Date();

    // Send immediate confirmation email
    const confirmationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4F46E5; text-align: center;">🎉 You're All Set!</h1>
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 15px; text-align: center; color: white; margin: 20px 0;">
          <h2 style="margin: 0 0 10px 0;">Countdown Notifications Activated! ⏰</h2>
          <p style="margin: 0; font-size: 18px;">"${countdown.title}"</p>
          <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">
            Target: ${new Date(countdown.target_date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
        <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #1e293b; margin-top: 0;">📧 Your Reminder Schedule:</h3>
          <ul style="color: #475569; line-height: 1.8;">
            ${notificationTimes.map(hours => {
              if (hours === 0) return '<li>🚨 Right when it happens!</li>';
              if (hours === 1) return '<li>⏰ 1 hour before (last chance!)</li>';
              if (hours === 24) return '<li>📅 1 day before (time to prepare!)</li>';
              if (hours === 168) return '<li>📝 1 week before (plenty of time to plan!)</li>';
              return `<li>⏱️ ${hours} hours before</li>`;
            }).join('')}
          </ul>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://finaltick.vercel.app/countdown/${countdown.slug}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; text-decoration: none; padding: 15px 25px; border-radius: 25px; font-weight: bold; font-size: 16px; margin-bottom: 15px;">
            🔗 View Your Countdown
          </a>
          <p style="color: #64748b; font-style: italic;">
            "The best things in life are worth waiting for... and being reminded about!" 🌟
          </p>
        </div>
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            💡 <strong>Pro tip:</strong> Keep this email safe! You can always reference your countdown details here.
          </p>
        </div>
      </div>
    `;

    const { error: confirmationError } = await resend.emails.send({
      from: 'Countdown Central <onboarding@resend.dev>',
      to: [email],
      subject: `🎯 Confirmation: You'll be notified about "${countdown.title}"!`,
      html: confirmationHtml,
    });

    if (confirmationError) {
      console.error('Error sending confirmation email:', confirmationError);
    } else {
      console.log('Confirmation email sent successfully');
    }

    // Schedule notifications for each specified time
    for (const hoursBeforeEvent of notificationTimes) {
      const scheduledTime = new Date(targetDate.getTime() - (hoursBeforeEvent * 60 * 60 * 1000));
      
      // Only schedule if the time is in the future
      if (scheduledTime > now) {
        const { error: insertError } = await supabase
          .from('notification_queue')
          .insert({
            countdown_id: countdownId,
            email: email,
            scheduled_for: scheduledTime.toISOString(),
            notification_type: hoursBeforeEvent === 0 ? 'event_now' : 'reminder',
          });

        if (insertError) {
          console.error(`Error scheduling notification for ${hoursBeforeEvent}h before:`, insertError);
        } else {
          console.log(`Scheduled notification for ${hoursBeforeEvent}h before event at ${scheduledTime}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Notifications scheduled successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-countdown-notifications function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
