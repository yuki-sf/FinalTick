import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send, User } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface Comment {
  id: string;
  content: string;
  author_name: string;
  created_at: string;
  user_id?: string;
}

interface CommentsSectionProps {
  countdownId: string;
}

const CommentsSection = ({ countdownId }: CommentsSectionProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [countdownId]);

  useEffect(() => {
    if (user) {
      // Try to get user's profile name
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();
    
    if (data?.username) {
      setAuthorName(data.username);
    }
  };

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('countdown_comments')
      .select('*')
      .eq('countdown_id', countdownId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
    } else {
      setComments(data || []);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !authorName.trim()) return;

    setLoading(true);

    const { error } = await supabase
      .from('countdown_comments')
      .insert({
        countdown_id: countdownId,
        content: newComment.trim(),
        author_name: authorName.trim(),
        user_id: user?.id || null,
      });

    if (error) {
      toast({
        title: "Error posting comment",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setNewComment('');
      fetchComments();
      toast({
        title: "Comment posted!",
        description: "Your comment has been added successfully.",
      });
    }

    setLoading(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Comment Form */}
        <form onSubmit={handleSubmitComment} className="space-y-4">
          <div>
            <Label htmlFor="author-name">Your Name</Label>
            <Input
              id="author-name"
              placeholder="Enter your name"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="comment">Comment</Label>
            <Textarea
              id="comment"
              placeholder="Share your thoughts..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            <Send className="h-4 w-4 mr-2" />
            {loading ? 'Posting...' : 'Post Comment'}
          </Button>
        </form>

        {/* Comments List */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No comments yet. Be the first to share your thoughts!
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{comment.author_name}</span>
                  <span className="text-muted-foreground">
                    {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                <p className="text-foreground">{comment.content}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CommentsSection;
