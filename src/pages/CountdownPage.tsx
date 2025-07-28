import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import CountdownTimer from "@/components/CountdownTimer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CountdownData {
  id: string;
  title: string;
  date: Date;
  time: string;
  description: string;
  template: string;
  mediaUrl: string;
  mediaFile?: File;
  slug: string;
  createdAt: string;
  viewCount: number;
  category?: string;
  tags?: string[];
  userId?: string;
}

export default function CountdownPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [countdownData, setCountdownData] = useState<CountdownData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [currentViewCount, setCurrentViewCount] = useState(0);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      return;
    }

    // Fetch countdown data from Supabase
    const fetchCountdown = async () => {
      try {
        const { data, error } = await supabase
          .from('countdowns')
          .select('*')
          .eq('slug', slug)
          .single();

        if (error || !data) {
          setNotFound(true);
          return;
        }

        setCountdownData({
          id: data.id,
          title: data.title,
          date: new Date(data.target_date),
          time: new Date(data.target_date).toTimeString().slice(0, 5),
          description: data.description || '',
          template: data.template,
          mediaUrl: data.media_url || '',
          mediaFile: data.media_type ? { type: data.media_type } as File : undefined,
          slug: data.slug,
          createdAt: data.created_at,
          viewCount: data.view_count || 0,
          category: data.category,
          tags: data.tags || [],
          userId: data.user_id,
        });
        setCurrentViewCount(data.view_count || 0);
      } catch (error) {
        console.error('Error fetching countdown data:', error);
        setNotFound(true);
      }
    };

    fetchCountdown();

    // Set up real-time subscription for view count updates
    const channel = supabase
      .channel('countdown-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'countdowns',
          filter: `slug=eq.${slug}`
        },
        (payload) => {
          if (payload.new && typeof payload.new.view_count === 'number') {
            setCurrentViewCount(payload.new.view_count);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [slug]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-foreground">
            Countdown Not Found 😕
          </h1>
          <p className="text-xl text-muted-foreground">
            This countdown page doesn't exist or may have expired.
          </p>
          <Button 
            onClick={() => navigate('/')}
            className="bg-gradient-primary"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Create New Countdown
          </Button>
        </div>
      </div>
    );
  }

  if (!countdownData) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <CountdownTimer
      targetDate={countdownData.date.toISOString()}
      title={countdownData.title}
      description={countdownData.description}
      mediaUrl={countdownData.mediaUrl}
      mediaType={countdownData.mediaFile?.type}
      template={countdownData.template}
      slug={slug!}
      countdownId={countdownData.id}
      viewCount={currentViewCount}
      category={countdownData.category}
      tags={countdownData.tags}
      userId={countdownData.userId}
    />
  );
}
