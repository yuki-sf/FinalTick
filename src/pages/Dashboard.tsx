import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Calendar, Eye, Users, LogOut, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface CountdownData {
  id: string;
  title: string;
  target_date: string;
  description?: string;
  template: string;
  view_count: number;
  category: string;
  tags?: string[];
  is_public: boolean;
  created_at: string;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [countdowns, setCountdowns] = useState<CountdownData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchUserCountdowns();
  }, [user, navigate]);

  const fetchUserCountdowns = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('countdowns')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error fetching countdowns",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setCountdowns(data || []);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getTemplateColor = (template: string) => {
    const colors = {
      birthday: 'bg-birthday',
      anniversary: 'bg-anniversary',
      graduation: 'bg-graduation',
      newyear: 'bg-newyear',
    };
    return colors[template as keyof typeof colors] || 'bg-primary';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Countdowns</h1>
            <p className="text-muted-foreground">Manage your personal countdown timers</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => navigate('/')} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create New
            </Button>
            <Button 
              onClick={() => navigate('/profile')} 
              variant="outline"
              size="icon"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button 
              onClick={handleSignOut} 
              variant="outline"
              size="icon"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Countdowns</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{countdowns.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {countdowns.reduce((sum, c) => sum + c.view_count, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Public Countdowns</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {countdowns.filter(c => c.is_public).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Countdowns List */}
        <div className="space-y-4">
          {countdowns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No countdowns yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first countdown to get started
                </p>
                <Button onClick={() => navigate('/')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Countdown
                </Button>
              </CardContent>
            </Card>
          ) : (
            countdowns.map((countdown) => (
              <Card key={countdown.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {countdown.title}
                        <div className={`w-3 h-3 rounded-full ${getTemplateColor(countdown.template)}`} />
                      </CardTitle>
                      <CardDescription>
                        Target: {format(new Date(countdown.target_date), 'PPP p')}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={countdown.is_public ? 'default' : 'secondary'}>
                        {countdown.is_public ? 'Public' : 'Private'}
                      </Badge>
                      <Badge variant="outline">{countdown.category}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {countdown.description && (
                    <p className="text-muted-foreground mb-4">{countdown.description}</p>
                  )}
                  
                  {countdown.tags && countdown.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {countdown.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <Separator className="my-4" />
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {countdown.view_count} views
                      </span>
                      <span>Created {format(new Date(countdown.created_at), 'MMM d, yyyy')}</span>
                    </div>
                    <Button 
                      onClick={() => navigate(`/countdown/${countdown.id}`)}
                      size="sm"
                    >
                      View Countdown
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
