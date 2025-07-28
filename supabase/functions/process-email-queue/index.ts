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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing email queue...");

    // Get pending notifications that are due
    const now = new Date();
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from('notification_queue')
      .select(`
        *,
        countdowns (
          title,
          target_date,
          description,
          slug,
          template
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', now.toISOString())
      .limit(50);

    if (fetchError) {
      throw new Error(`Error fetching notifications: ${fetchError.message}`);
    }

    console.log(`Found ${pendingNotifications?.length || 0} pending notifications`);

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending notifications to process" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Process each notification
    for (const notification of pendingNotifications) {
      try {
        const countdown = notification.countdowns;
        if (!countdown) continue;

        const targetDate = new Date(countdown.target_date);
        const isEventNow = notification.notification_type === 'event_now';
        const timeLeft = Math.round((targetDate.getTime() - Date.now()) / (1000 * 60 * 60));
        
        let subject = '';
        let emailHtml = '';
        
        const countdownUrl = `https://finaltick.vercel.app/countdown/${countdown.slug}`;
        
        if (isEventNow) {
          subject = `🚨 IT'S TIME! ${countdown.title} is happening NOW!`;
          emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%); padding: 40px; border-radius: 20px; text-align: center; color: white; margin: 20px 0;">
                <h1 style="margin: 0; font-size: 2.5em;">🎉 IT'S HAPPENING! 🎉</h1>
                <h2 style="margin: 20px 0; font-size: 1.8em;">"${countdown.title}"</h2>
                <p style="font-size: 1.2em; margin: 15px 0;">The wait is OVER! This is the moment you've been counting down to!</p>
              </div>
              
              <div style="background: #f0f9ff; padding: 25px; border-radius: 15px; margin: 20px 0; border-left: 5px solid #0ea5e9;">
                ${countdown.description ? `
                  <h3 style="color: #0c4a6e; margin-top: 0;">📋 Event Details:</h3>
                  <p style="color: #075985; font-size: 16px; line-height: 1.6;">${countdown.description}</p>
                ` : ''}
                <p style="color: #0c4a6e; font-weight: bold; margin: 15px 0 0 0;">
                  🕐 Right now: ${new Date().toLocaleString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${countdownUrl}" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 15px 25px; border-radius: 10px; font-size: 18px; font-weight: bold;">
                  🎊 VIEW THE COUNTDOWN 🎊
                </a>
              </div>
              
              <div style="background: #fef7cd; padding: 20px; border-radius: 10px; text-align: center;">
                <p style="margin: 0; color: #a16207; font-style: italic; font-size: 16px;">
                  "Today is the day you've been waiting for. Make it count!" ✨
                </p>
              </div>
            </div>
          `;
        } else {
          const days = Math.floor(timeLeft / 24);
          const hours = timeLeft % 24;
          
          let timeText = '';
          if (days > 0) {
            timeText = `${days} day${days > 1 ? 's' : ''} and ${hours} hour${hours !== 1 ? 's' : ''}`;
          } else {
            timeText = `${hours} hour${hours !== 1 ? 's' : ''}`;
          }
          
          let emoji = '⏰';
          let urgency = '';
          let headerColor = '#667eea';
          let headerGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
          
          if (timeLeft <= 1) {
            emoji = '🚨';
            urgency = 'FINAL HOUR! ';
            headerColor = '#ef4444';
            headerGradient = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
          } else if (timeLeft <= 24) {
            emoji = '⏰';
            urgency = 'Almost there! ';
            headerColor = '#f59e0b';
            headerGradient = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
          } else if (timeLeft <= 168) {
            emoji = '📅';
            urgency = 'This week! ';
          }
          
          subject = `${emoji} ${urgency}${countdown.title} in ${timeText}!`;
          emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: ${headerGradient}; padding: 30px; border-radius: 15px; text-align: center; color: white; margin: 20px 0;">
                <h1 style="margin: 0; font-size: 2.2em;">${emoji} Countdown Alert!</h1>
                <h2 style="margin: 15px 0; font-size: 1.5em;">"${countdown.title}"</h2>
                <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 10px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 1.3em; font-weight: bold;">⏳ Time Remaining: ${timeText}</p>
                </div>
              </div>
              
              <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin: 20px 0;">
                <h3 style="color: #1e293b; margin-top: 0; display: flex; align-items: center;">
                  📊 Event Details
                </h3>
                <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                  <p style="color: #475569; margin: 0 0 10px 0;"><strong>📅 Target Date:</strong> ${targetDate.toLocaleString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                  ${countdown.description ? `<p style="color: #475569; margin: 0;"><strong>📝 Description:</strong> ${countdown.description}</p>` : ''}
                </div>
              </div>
              
              ${timeLeft <= 24 ? `
                <div style="background: #fee2e2; border: 2px solid #fecaca; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
                  <h3 style="color: #dc2626; margin: 0 0 10px 0;">🚨 Final Countdown Phase!</h3>
                  <p style="color: #991b1b; margin: 0; font-weight: bold;">Less than 24 hours to go! Time to get everything ready! 🎯</p>
                </div>
              ` : ''}
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${countdownUrl}" style="display: inline-block; background: ${headerGradient}; color: white; text-decoration: none; padding: 15px 30px; border-radius: 25px; font-weight: bold; font-size: 16px;">
                  🔗 View Live Countdown
                </a>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <p style="color: #64748b; font-style: italic; font-size: 16px;">
                  ${timeLeft <= 1 
                    ? '"The final hour is here. This is it!" ⚡' 
                    : timeLeft <= 24 
                    ? '"Almost there! You can feel the excitement building..." 🔥'
                    : '"Good things come to those who wait... and prepare!" 🌟'
                  }
                </p>
              </div>
              
              <div style="background: linear-gradient(45deg, #f3f4f6, #e5e7eb); padding: 15px; border-radius: 8px; text-align: center;">
                <p style="margin: 0; color: #374151; font-size: 14px;">
                  💌 You're receiving this because you asked to be reminded about this countdown. The anticipation is real!
                </p>
              </div>
            </div>
          `;
        }

        // Send email using Resend
        if (resendApiKey) {
          const emailResult = await resend.emails.send({
            from: "FinalTick App <notifications@resend.dev>",
            to: [notification.email],
            subject: subject,
            html: emailHtml,
          });

          console.log(`Email sent for notification ${notification.id}:`, emailResult);
        } else {
          console.log("RESEND_API_KEY not configured, skipping email send");
        }

        // Mark notification as sent
        const { error: updateError } = await supabase
          .from('notification_queue')
          .update({ 
            status: 'sent', 
            sent_at: new Date().toISOString() 
          })
          .eq('id', notification.id);

        if (updateError) {
          console.error(`Error updating notification status:`, updateError);
        }

      } catch (emailError) {
        console.error(`Error processing notification ${notification.id}:`, emailError);
        
        // Mark as failed
        await supabase
          .from('notification_queue')
          .update({ status: 'failed' })
          .eq('id', notification.id);
      }
    }

    // Handle expired countdowns (1 day after target_date)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const { data: expiredCountdowns, error: expiredError } = await supabase
      .from('countdowns')
      .select('id, title, target_date, is_recurring, recurring_interval, recurring_end_date, notification_times, view_count')
      .lt('target_date', oneDayAgo.toISOString());

    if (expiredError) {
      console.error('Error fetching expired countdowns:', expiredError);
    } else if (expiredCountdowns && expiredCountdowns.length > 0) {
      console.log(`Found ${expiredCountdowns.length} expired countdowns to process`);
      
      const recurringCountdowns = expiredCountdowns.filter(c => c.is_recurring);
      const nonRecurringCountdowns = expiredCountdowns.filter(c => !c.is_recurring);
      
      // Process recurring countdowns
      for (const countdown of recurringCountdowns) {
        try {
          const currentDate = new Date(countdown.target_date);
          let nextDate = new Date(currentDate);
          
          // Calculate next occurrence based on recurring_interval
          switch (countdown.recurring_interval) {
            case 'daily':
              nextDate.setDate(nextDate.getDate() + 1);
              break;
            case 'weekly':
              nextDate.setDate(nextDate.getDate() + 7);
              break;
            case 'monthly':
              nextDate.setMonth(nextDate.getMonth() + 1);
              break;
            case 'yearly':
            default:
              nextDate.setFullYear(nextDate.getFullYear() + 1);
              break;
          }
          
          // Check if recurring end date has been reached
          if (countdown.recurring_end_date && nextDate > new Date(countdown.recurring_end_date)) {
            console.log(`Recurring countdown ${countdown.id} has reached end date, deleting`);
            await supabase.from('countdowns').delete().eq('id', countdown.id);
            continue;
          }
          
          // Update countdown to next occurrence
          const { error: updateError } = await supabase
            .from('countdowns')
            .update({
              target_date: nextDate.toISOString(),
              view_count: 0, // Reset view count for new cycle
              updated_at: new Date().toISOString()
            })
            .eq('id', countdown.id);
            
          if (updateError) {
            console.error(`Error updating recurring countdown ${countdown.id}:`, updateError);
            continue;
          }
          
          // Delete old pending notifications
          await supabase
            .from('notification_queue')
            .delete()
            .eq('countdown_id', countdown.id)
            .eq('status', 'pending');
          
          // Create new notifications for the next cycle
          if (countdown.notification_times && countdown.notification_times.length > 0) {
            const newNotifications = countdown.notification_times
              .map(hours => {
                const scheduledTime = new Date(nextDate);
                scheduledTime.setHours(scheduledTime.getHours() - hours);
                
                // Only create notifications for future times
                if (scheduledTime > new Date()) {
                  return {
                    countdown_id: countdown.id,
                    email: '', // Will be filled when someone subscribes
                    scheduled_for: scheduledTime.toISOString(),
                    notification_type: hours === 0 ? 'event_now' : `${hours}_hours_before`,
                    status: 'pending'
                  };
                }
                return null;
              })
              .filter(notification => notification !== null);
              
            if (newNotifications.length > 0) {
              await supabase
                .from('notification_queue')
                .insert(newNotifications);
            }
          }
          
          console.log(`Successfully renewed recurring countdown ${countdown.id} to ${nextDate.toISOString()}`);
          
        } catch (error) {
          console.error(`Error processing recurring countdown ${countdown.id}:`, error);
        }
      }
      
      // Delete non-recurring expired countdowns
      if (nonRecurringCountdowns.length > 0) {
        const nonRecurringIds = nonRecurringCountdowns.map(c => c.id);
        const { error: deleteError } = await supabase
          .from('countdowns')
          .delete()
          .in('id', nonRecurringIds);

        if (deleteError) {
          console.error('Error deleting non-recurring expired countdowns:', deleteError);
        } else {
          console.log(`Successfully deleted ${nonRecurringCountdowns.length} non-recurring expired countdowns`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: pendingNotifications.length,
        message: `Processed ${pendingNotifications.length} notifications` 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in process-email-queue function:", error);
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
