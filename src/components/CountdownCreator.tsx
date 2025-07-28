import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Upload, Sparkles, Heart, GraduationCap, PartyPopper, X, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-image.jpg";
import birthdaySample from "@/assets/birthday-sample.jpg";
import anniversarySample from "@/assets/anniversary-sample.jpg";
import graduationSample from "@/assets/graduation-sample.jpg";
import newyearSample from "@/assets/newyear-sample.jpg";

const templates = [
  {
    id: "birthday",
    name: "Birthday",
    icon: Sparkles,
    color: "birthday",
    sample: "Riya's 25th Birthday!",
    gradient: "from-pink-400 to-purple-500",
    sampleImage: birthdaySample
  },
  {
    id: "anniversary",
    name: "Anniversary",
    icon: Heart,
    color: "anniversary",
    sample: "Our 5th Anniversary",
    gradient: "from-red-400 to-pink-500",
    sampleImage: anniversarySample
  },
  {
    id: "graduation",
    name: "Graduation",
    icon: GraduationCap,
    color: "graduation",
    sample: "Graduation Day 2025",
    gradient: "from-blue-400 to-indigo-500",
    sampleImage: graduationSample
  },
  {
    id: "newyear",
    name: "New Year",
    icon: PartyPopper,
    color: "newyear",
    sample: "New Year 2026",
    gradient: "from-yellow-400 to-orange-500",
    sampleImage: newyearSample
  }
];

interface CountdownData {
  title: string;
  date: Date | undefined;
  time: string;
  customSlug: string;
  description: string;
  template: string;
  mediaFile: File | null;
  mediaUrl: string;
  category: string;
  tags: string[];
  timezone: string;
  isPublic: boolean;
  isRecurring: boolean;
  recurringInterval: string;
  emailNotifications: boolean;
}

export function CountdownCreator() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [newTag, setNewTag] = useState("");
  
  const [formData, setFormData] = useState<CountdownData>({
    title: "",
    date: undefined,
    time: "00:00",
    customSlug: "",
    description: "",
    template: "birthday",
    mediaFile: null,
    mediaUrl: birthdaySample,
    category: "celebration",
    tags: [],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    isPublic: true,
    isRecurring: false,
    recurringInterval: "yearly",
    emailNotifications: false
  });

  const [titleEdited, setTitleEdited] = useState(false);

  const selectedTemplate = templates.find(t => t.id === formData.template);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    setFormData(prev => ({
      ...prev,
      template: templateId,
      title: !titleEdited ? (template?.sample || "") : prev.title,
      mediaUrl: !prev.mediaUrl ? template?.sampleImage || "" : prev.mediaUrl
    }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // Upload file to Supabase storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data } = supabase.storage
          .from('media')
          .getPublicUrl(filePath);

        setFormData(prev => ({
          ...prev,
          mediaFile: file,
          mediaUrl: data.publicUrl
        }));
      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: "Upload Failed",
          description: "Failed to upload media file. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const generateUniqueSlug = async () => {
    const adjectives = ["joyful", "amazing", "wonderful", "magical", "delightful", "cheerful"];
    const animals = ["koala", "panda", "dolphin", "butterfly", "unicorn", "rainbow"];
    
    let attempts = 0;
    let slug = "";
    
    while (attempts < 10) {
      const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
      const randomNum = Math.floor(Math.random() * 999) + 1;
      slug = `${randomAdj}-${randomAnimal}-${randomNum}`;
      
      // Check if slug exists
      const { data } = await supabase
        .from('countdowns')
        .select('slug')
        .eq('slug', slug)
        .single();
      
      if (!data) {
        return slug; // Slug is unique
      }
      
      attempts++;
    }
    
    // Fallback with timestamp if all attempts failed
    return `special-${Date.now()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.date) {
      toast({
        title: "Missing Information",
        description: "Please fill in the title and date fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      const slug = formData.customSlug || await generateUniqueSlug();
      const targetDateTime = new Date(`${format(formData.date, "yyyy-MM-dd")}T${formData.time}:00`);
      
      // Save to Supabase
      const { error } = await supabase
        .from('countdowns')
        .insert({
          slug,
          title: formData.title,
          target_date: targetDateTime.toISOString(),
          description: formData.description,
          template: formData.template,
          media_url: formData.mediaUrl,
          media_type: formData.mediaFile?.type || null,
          user_id: user?.id || null,
          category: formData.category,
          tags: formData.tags,
          timezone: formData.timezone,
          is_public: formData.isPublic,
          is_recurring: formData.isRecurring,
          recurring_interval: formData.isRecurring ? formData.recurringInterval : null,
          email_notifications: formData.emailNotifications
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Countdown Created! 🎉",
        description: "Your beautiful countdown page is ready to share!"
      });
      
      navigate(`/countdown/${slug}`);
    } catch (error) {
      console.error('Error creating countdown:', error);
      toast({
        title: "Error",
        description: "Failed to create countdown. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft p-4">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex justify-center mb-6">
            <img 
              src={heroImage} 
              alt="Countdown Creator" 
              className="rounded-2xl shadow-celebration max-w-md w-full h-48 object-cover"
            />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
            Create Your Countdown ✨
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Make beautiful, personalized countdown pages for special occasions that your friends and family will love to share
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form */}
          <Card className="shadow-soft animate-scale-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Countdown Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Template Selection */}
                <div className="space-y-3">
                  <Label>Choose Template</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {templates.map((template) => {
                      const Icon = template.icon;
                      return (
                        <Button
                          key={template.id}
                          type="button"
                          variant={formData.template === template.id ? "default" : "outline"}
                          className={cn(
                            "h-16 flex-col gap-2",
                            formData.template === template.id && "ring-2 ring-primary ring-offset-2"
                          )}
                          onClick={() => handleTemplateSelect(template.id)}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-sm">{template.name}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    placeholder={selectedTemplate?.sample}
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="text-lg"
                  />
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.date ? format(formData.date, "PPP") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.date}
                          onSelect={(date) => setFormData(prev => ({ ...prev, date }))}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Custom URL */}
                <div className="space-y-2">
                  <Label htmlFor="slug">Custom URL (optional)</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-r-0 border-input rounded-l-md">
                      countdown.app/
                    </span>
                    <Input
                      id="slug"
                      placeholder="my-special-day"
                      value={formData.customSlug}
                      onChange={(e) => setFormData(prev => ({ ...prev, customSlug: e.target.value.replace(/[^a-z0-9-]/g, '') }))}
                      className="rounded-l-none"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave blank for auto-generated friendly URL
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Message (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Join us at 7PM for the celebration!"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                {/* Media Upload */}
                <div className="space-y-3">
                  <Label>Photo or Video</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="media-upload"
                    />
                    <label htmlFor="media-upload" className="cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload image or video
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        JPG, PNG, MP4, WebM up to 10MB
                      </p>
                    </label>
                  </div>
                </div>

                {/* Category & Tags */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="celebration">Celebration</SelectItem>
                        <SelectItem value="milestone">Milestone</SelectItem>
                        <SelectItem value="holiday">Holiday</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="work">Work</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={formData.timezone} onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="Europe/London">London</SelectItem>
                        <SelectItem value="Europe/Paris">Paris</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                        <SelectItem value="Asia/Mumbai">Mumbai</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-3">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a tag"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" onClick={addTag} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => removeTag(tag)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Settings */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-medium">Settings</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Public Countdown</Label>
                      <p className="text-xs text-muted-foreground">Allow others to find your countdown</p>
                    </div>
                    <Switch
                      checked={formData.isPublic}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublic: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Recurring Event</Label>
                      <p className="text-xs text-muted-foreground">Automatically repeat this countdown</p>
                    </div>
                    <Switch
                      checked={formData.isRecurring}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isRecurring: checked }))}
                    />
                  </div>

                  {formData.isRecurring && (
                    <div className="space-y-2">
                      <Label>Repeat Interval</Label>
                      <Select value={formData.recurringInterval} onValueChange={(value) => setFormData(prev => ({ ...prev, recurringInterval: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select interval" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-xs text-muted-foreground">Get notified when countdown ends</p>
                    </div>
                    <Switch
                      checked={formData.emailNotifications}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, emailNotifications: checked }))}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full bg-gradient-primary hover:shadow-glow">
                  Create Countdown 🚀
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Live Preview */}
          <Card className="shadow-soft animate-scale-in">
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-6 p-6 bg-gradient-soft rounded-lg">
                {/* Title Preview */}
                <h2 className="text-2xl font-bold text-foreground">
                  {formData.title || selectedTemplate?.sample || "Your Event Title"}
                </h2>

                {/* Countdown Preview */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  {['Days', 'Hours', 'Minutes', 'Seconds'].map((unit, index) => (
                    <div key={unit} className="bg-card rounded-lg p-3 shadow-soft">
                      <div className="text-2xl font-bold text-primary">
                        {['12', '06', '45', '23'][index]}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">
                        {unit}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Media Preview */}
                <div className="rounded-lg overflow-hidden shadow-soft max-w-sm mx-auto">
                  {formData.mediaUrl ? (
                    formData.mediaFile?.type.startsWith('image/') || !formData.mediaFile ? (
                      <img
                        src={formData.mediaUrl}
                        alt="Preview"
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <video
                        src={formData.mediaUrl}
                        className="w-full h-48 object-cover"
                        controls
                      />
                    )
                  ) : (
                    <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                      <p className="text-muted-foreground">Media preview</p>
                    </div>
                  )}
                </div>

                {/* Description Preview */}
                {formData.description && (
                  <p className="text-muted-foreground">
                    {formData.description}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
