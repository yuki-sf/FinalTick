import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QrCode, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface QRCodeGeneratorProps {
  url: string;
  title: string;
}

const QRCodeGenerator = ({ url, title }: QRCodeGeneratorProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    generateQRCode();
  }, [url]);

  const generateQRCode = async () => {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrCodeDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.download = `qr-code-${title.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = qrCodeUrl;
    link.click();
    
    toast({
      title: "QR Code Downloaded",
      description: "The QR code has been saved to your downloads.",
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <QrCode className="h-4 w-4" />
          QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code</DialogTitle>
          <DialogDescription>
            Scan this QR code to quickly share your countdown
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4 p-4">
          {qrCodeUrl && (
            <img 
              src={qrCodeUrl} 
              alt="QR Code" 
              className="border rounded-lg shadow-sm"
            />
          )}
          <Button onClick={downloadQRCode} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Download QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeGenerator;
