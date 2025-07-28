import { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Download, Image, Video, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CountdownExporterProps {
  countdownRef: React.RefObject<HTMLElement>;
  title: string;
  countdownId: string;
}

const CountdownExporter = ({ countdownRef, title, countdownId }: CountdownExporterProps) => {
  const { toast } = useToast();
  const exportAsImage = async () => {
    if (!countdownRef.current) return;

    try {
      const canvas = await html2canvas(countdownRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = `countdown-${title.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast({
        title: "Image Downloaded",
        description: "Your countdown has been exported as an image.",
      });
    } catch (error) {
      console.error('Error exporting image:', error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting your countdown.",
        variant: "destructive",
      });
    }
  };

  const exportAsPDF = async () => {
    try {
      // Fetch countdown data from Supabase
      const { data: countdownData, error } = await supabase
        .from('countdowns')
        .select(`
          *,
          countdown_comments (
            id,
            content,
            author_name,
            created_at
          ),
          countdown_views (
            id,
            viewed_at,
            user_agent
          )
        `)
        .eq('id', countdownId)
        .single();

      if (error) throw error;

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      let currentY = margin;

      // Helper function to add text with word wrapping
      const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12) => {
        pdf.setFontSize(fontSize);
        const lines = pdf.splitTextToSize(text, maxWidth);
        pdf.text(lines, x, y);
        return y + (lines.length * fontSize * 0.35); // Return new Y position
      };

      // Title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, margin, currentY);
      currentY += 15;

      // Basic Information
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Countdown Details', margin, currentY);
      currentY += 10;

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      
      const details = [
        `Target Date: ${new Date(countdownData.target_date).toLocaleString()}`,
        `Category: ${countdownData.category || 'General'}`,
        `Template: ${countdownData.template}`,
        `Description: ${countdownData.description || 'No description'}`,
        `Created: ${new Date(countdownData.created_at).toLocaleDateString()}`,
        `Total Views: ${countdownData.countdown_views?.length || 0}`,
        `Public: ${countdownData.is_public ? 'Yes' : 'No'}`,
        `Recurring: ${countdownData.is_recurring ? 'Yes' : 'No'}`,
        `Timezone: ${countdownData.timezone || 'UTC'}`
      ];

      details.forEach(detail => {
        currentY = addWrappedText(detail, margin, currentY, pageWidth - (margin * 2));
        currentY += 2;
      });

      // Tags
      if (countdownData.tags && countdownData.tags.length > 0) {
        currentY += 5;
        pdf.setFont('helvetica', 'bold');
        currentY = addWrappedText('Tags:', margin, currentY, pageWidth - (margin * 2));
        pdf.setFont('helvetica', 'normal');
        currentY = addWrappedText(countdownData.tags.join(', '), margin, currentY, pageWidth - (margin * 2));
        currentY += 5;
      }

      // Comments Section
      if (countdownData.countdown_comments && countdownData.countdown_comments.length > 0) {
        currentY += 10;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        currentY = addWrappedText('Comments', margin, currentY, pageWidth - (margin * 2), 14);
        currentY += 5;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        
        countdownData.countdown_comments.forEach((comment: any, index: number) => {
          if (currentY > 250) { // Add new page if needed
            pdf.addPage();
            currentY = margin;
          }
          
          const commentHeader = `${index + 1}. ${comment.author_name} - ${new Date(comment.created_at).toLocaleDateString()}`;
          pdf.setFont('helvetica', 'bold');
          currentY = addWrappedText(commentHeader, margin, currentY, pageWidth - (margin * 2));
          
          pdf.setFont('helvetica', 'normal');
          currentY = addWrappedText(comment.content, margin + 10, currentY, pageWidth - (margin * 2) - 10);
          currentY += 5;
        });
      }

      // View Analytics (if available)
      if (countdownData.countdown_views && countdownData.countdown_views.length > 0) {
        currentY += 10;
        if (currentY > 200) {
          pdf.addPage();
          currentY = margin;
        }
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        currentY = addWrappedText('View Analytics', margin, currentY, pageWidth - (margin * 2), 14);
        currentY += 5;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        
        const viewsByDate: { [key: string]: number } = {};
        countdownData.countdown_views.forEach((view: any) => {
          const date = new Date(view.viewed_at).toLocaleDateString();
          viewsByDate[date] = (viewsByDate[date] || 0) + 1;
        });

        Object.entries(viewsByDate).forEach(([date, count]) => {
          currentY = addWrappedText(`${date}: ${count} view${count > 1 ? 's' : ''}`, margin, currentY, pageWidth - (margin * 2));
          currentY += 2;
        });
      }

      // Save the PDF
      const fileName = `countdown-${title.replace(/\s+/g, '-').toLowerCase()}-data.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF Exported",
        description: "Your countdown data has been exported as a PDF.",
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting your countdown data.",
        variant: "destructive",
      });
    }
  };

  const exportAsVideo = async () => {
    // For now, we'll just export multiple frames as images
    // In a real implementation, you could use libraries like FFmpeg.wasm
    toast({
      title: "Video Export",
      description: "Video export is coming soon! For now, try the image export.",
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Countdown</DialogTitle>
          <DialogDescription>
            Export your countdown as an image, video, or detailed PDF report
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-3 p-4">
          <Button onClick={exportAsImage} className="w-full">
            <Image className="h-4 w-4 mr-2" />
            Export as Image
          </Button>
          <Button onClick={exportAsPDF} variant="outline" className="w-full">
            <FileText className="h-4 w-4 mr-2" />
            Export Data as PDF
          </Button>
          <Button onClick={exportAsVideo} variant="outline" className="w-full">
            <Video className="h-4 w-4 mr-2" />
            Export as Video (Coming Soon)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CountdownExporter;
