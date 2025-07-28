import { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZoomIn, Download, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MediaViewerProps {
  mediaUrl: string;
  mediaType?: string;
  title: string;
  children: React.ReactNode;
}

const MediaViewer = ({ mediaUrl, mediaType, title, children }: MediaViewerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const downloadMedia = async () => {
    try {
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Determine file extension from media type or URL
      const extension = mediaType?.split('/')[1] || mediaUrl.split('.').pop() || 'file';
      link.download = `${title.replace(/\s+/g, '-').toLowerCase()}.${extension}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "Media file download has started.",
      });
    } catch (error) {
      console.error('Error downloading media:', error);
      toast({
        title: "Download Failed",
        description: "There was an error downloading the media file.",
        variant: "destructive",
      });
    }
  };

  const isImage = mediaType?.startsWith('image/') || !mediaType;
  const isVideo = mediaType?.startsWith('video/');

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="relative group cursor-pointer">
          {children}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30"
            >
              <ZoomIn className="h-4 w-4 mr-2" />
              View Full Size
            </Button>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0 bg-black/95 border-0">
        <div className="relative w-full h-full">
          {/* Header with controls */}
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button
              onClick={downloadMedia}
              variant="secondary"
              size="sm"
              className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setIsOpen(false)}
              variant="secondary"
              size="sm"
              className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Media content */}
          <div className="flex items-center justify-center w-full h-[90vh] p-4">
            {isImage ? (
              <img
                src={mediaUrl}
                alt={title}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            ) : isVideo ? (
              <video
                src={mediaUrl}
                controls
                className="max-w-full max-h-full object-contain rounded-lg"
                autoPlay={false}
              />
            ) : (
              <div className="text-center text-white">
                <p className="text-lg mb-4">Media file preview not available</p>
                <Button onClick={downloadMedia} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download File
                </Button>
              </div>
            )}
          </div>

          {/* Media info */}
          <div className="absolute bottom-4 left-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white">
            <h3 className="font-semibold truncate">{title}</h3>
            {mediaType && (
              <p className="text-sm text-white/70 mt-1">
                Type: {mediaType}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MediaViewer;
