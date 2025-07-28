import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EmailNotificationFormProps {
  countdownId: string;
  targetDate: string;
}

const EmailNotificationForm: React.FC<EmailNotificationFormProps> = ({
  countdownId,
  targetDate
}) => {
  const [email, setEmail] = useState('');
  const [selectedTimes, setSelectedTimes] = useState<number[]>([24, 1]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const notificationOptions = [
    { hours: 168, label: '1 week before' },
    { hours: 24, label: '1 day before' },
    { hours: 1, label: '1 hour before' },
    { hours: 0, label: 'When it happens' },
  ];

  const handleTimeToggle = (hours: number) => {
    setSelectedTimes(prev =>
      prev.includes(hours)
        ? prev.filter(h => h !== hours)
        : [...prev, hours]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    if (selectedTimes.length === 0) {
      toast({
        title: "Select Notification Times",
        description: "Please select at least one notification time",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('send-countdown-notifications', {
        body: {
          countdownId,
          email: email.trim(),
          notificationTimes: selectedTimes
        }
      });

      if (error) throw error;

      toast({
        title: "Notifications Scheduled! 📧",
        description: `You'll receive ${selectedTimes.length} reminder${selectedTimes.length > 1 ? 's' : ''} at ${email}`,
      });

      setEmail('');
      setSelectedTimes([24, 1]);
    } catch (error: any) {
      console.error('Error scheduling notifications:', error);
      toast({
        title: "Failed to Schedule Notifications",
        description: error.message || "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if target date is in the past
  const isTargetPassed = new Date(targetDate) < new Date();

  if (isTargetPassed) {
    return null; // Don't show notification form for past events
  }

  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Get Email Reminders
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
            />
          </div>

          <div className="space-y-3">
            <p className="text-white/90 text-sm font-medium">When to remind you:</p>
            {notificationOptions.map((option) => {
              const isSelected = selectedTimes.includes(option.hours);
              const scheduledTime = new Date(new Date(targetDate).getTime() - (option.hours * 60 * 60 * 1000));
              const isPastTime = option.hours > 0 && scheduledTime < new Date();
              
              return (
                <div key={option.hours} className="flex items-center space-x-3">
                  <Checkbox
                    id={`time-${option.hours}`}
                    checked={isSelected}
                    disabled={isPastTime}
                    onCheckedChange={() => handleTimeToggle(option.hours)}
                    className="border-white/30 data-[state=checked]:bg-white data-[state=checked]:text-primary"
                  />
                  <label
                    htmlFor={`time-${option.hours}`}
                    className={`text-sm cursor-pointer ${
                      isPastTime 
                        ? 'text-white/40 line-through' 
                        : 'text-white/90 hover:text-white'
                    }`}
                  >
                    {option.label}
                    {isPastTime && ' (too late)'}
                  </label>
                </div>
              );
            })}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-white/10 border border-white/20 text-white hover:bg-white/20"
          >
            <Mail className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Scheduling...' : 'Schedule Reminders'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default EmailNotificationForm;
