import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Copy, Share2, Twitter, Plus, ExternalLink, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import QRCodeGenerator from './QRCodeGenerator';
import CountdownExporter from './CountdownExporter';
import CommentsSection from './CommentsSection';
import MediaViewer from './MediaViewer';
import EmailNotificationForm from './EmailNotificationForm';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

interface CountdownTimerProps {
  targetDate: string;
  title: string;
  description?: string;
  mediaUrl?: string;
  mediaType?: string;
  template: string;
  slug: string;
  countdownId: string;
  viewCount?: number;
  category?: string;
  tags?: string[];
  userId?: string;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetDate,
  title,
  description,
  mediaUrl,
  mediaType,
  template,
  slug,
  countdownId,
  viewCount = 0,
  category,
  tags = [],
  userId
}) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const countdownRef = useRef<HTMLDivElement>(null);

  function calculateTimeLeft(): TimeLeft {
    const difference = +new Date(targetDate) - +new Date();
    
    if (difference > 0) {
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        total: difference
      };
    }
    
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  useEffect(() => {
    const trackView = async () => {
      try {
        await supabase
          .from('countdown_views')
          .insert({
            countdown_id: countdownId,
            user_id: user?.id || null,
            user_agent: navigator.userAgent
          });
      } catch (error) {
        console.error('Error tracking view:', error);
      }
    };

    trackView();
  }, [countdownId, user]);

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      
      if (newTimeLeft.total <= 0 && !isCompleted) {
        setIsCompleted(true);
        triggerCelebration();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, isCompleted]);

  const triggerCelebration = () => {
    setShowCelebration(true);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    setTimeout(() => setShowCelebration(false), 5000);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link Copied!",
      description: "Countdown link copied to clipboard"
    });
  };

  const addToCalendar = () => {
    const start = new Date(targetDate);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${end.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(description || '')}`;
    window.open(googleCalendarUrl, '_blank');
  };

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  const getTemplateColors = (template: string) => {
    const colors = {
      birthday: 'bg-gradient-to-br from-pink-400 to-purple-600',
      anniversary: 'bg-gradient-to-br from-red-400 to-pink-600',
      graduation: 'bg-gradient-to-br from-blue-400 to-indigo-600',
      newyear: 'bg-gradient-to-br from-yellow-400 to-orange-600',
    };
    return colors[template as keyof typeof colors] || 'bg-gradient-to-br from-purple-400 to-blue-600';
  };

  return (
    <div className={`min-h-screen ${getTemplateColors(template)} p-4`} ref={countdownRef}>
      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 text-center animate-bounce-celebration shadow-celebration">
            <h2 className="text-4xl font-bold text-primary mb-4">🎉 Celebration Time! 🎉</h2>
            <p className="text-lg text-foreground">The moment has arrived!</p>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2 text-white/80">
              <Eye className="h-4 w-4" />
              <span className="text-sm">{viewCount} views</span>
            </div>
            {user && userId === user.id && (
              <Button 
                onClick={() => navigate('/dashboard')} 
                variant="outline" 
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Dashboard
              </Button>
            )}
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            {title}
          </h1>
          
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {category && (
              <Badge variant="secondary" className="bg-white/20 text-white">
                {category}
              </Badge>
            )}
            {tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="border-white/30 text-white">
                #{tag}
              </Badge>
            ))}
          </div>
          
          {description && (
            <p className="text-xl text-white/90 max-w-2xl mx-auto drop-shadow">
              {description}
            </p>
          )}
        </div>

        {!isCompleted ? (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 mb-8 animate-scale-in">
            <CardContent className="p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: 'Days', value: timeLeft.days },
                  { label: 'Hours', value: timeLeft.hours },
                  { label: 'Minutes', value: timeLeft.minutes },
                  { label: 'Seconds', value: timeLeft.seconds }
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <div className="text-4xl md:text-6xl font-bold text-white mb-2">
                      {formatNumber(item.value)}
                    </div>
                    <div className="text-sm text-white/80 uppercase tracking-wide">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 mb-8 animate-scale-in">
            <CardContent className="p-8 text-center">
              <h2 className="text-4xl font-bold text-white mb-4">
                The moment is here! 🎊
              </h2>
              <p className="text-xl text-white/90">
                {title} has arrived!
              </p>
            </CardContent>
          </Card>
        )}

        {mediaUrl && (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 mb-8">
            <CardContent className="p-6">
              <MediaViewer mediaUrl={mediaUrl} mediaType={mediaType} title={title}>
                <div className="rounded-lg overflow-hidden">
                  {mediaType?.startsWith('image/') || !mediaType ? (
                    <img src={mediaUrl} alt={title} className="w-full h-auto max-h-96 object-cover" />
                  ) : (
                    <video src={mediaUrl} className="w-full h-auto max-h-96 object-cover" controls />
                  )}
                </div>
              </MediaViewer>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Share This Countdown
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Button onClick={copyToClipboard} variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                <Button onClick={addToCalendar} variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <Calendar className="h-4 w-4 mr-2" />
                  Calendar
                </Button>
                <QRCodeGenerator url={window.location.href} title={title} />
                <CountdownExporter countdownRef={countdownRef} title={title} countdownId={countdownId} />
              </div>
              <Button onClick={() => navigate('/')} variant="outline" className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Plus className="h-4 w-4 mr-2" />
                Create Your Own Countdown
              </Button>
            </CardContent>
          </Card>
          
          <div className="animate-scale-in">
            <EmailNotificationForm countdownId={countdownId} targetDate={targetDate} />
          </div>
          
          <div className="animate-scale-in">
            <CommentsSection countdownId={countdownId} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;
