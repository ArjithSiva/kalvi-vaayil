import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Images, X } from 'lucide-react';

interface WorkshopGalleryProps {
  images: string[];
  workshopTitle: string;
}

export function WorkshopGallery({ images, workshopTitle }: WorkshopGalleryProps) {
  const { t } = useTranslation();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (images.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Images className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Gallery</h3>
            <Badge variant="secondary">{images.length} images</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {images.slice(0, 8).map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(image)}
                className="group relative aspect-square overflow-hidden rounded-lg border border-border/50 transition-all hover:border-primary/50 hover:shadow-md"
              >
                <img
                  src={image}
                  alt={`${workshopTitle} - ${index + 1}`}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </button>
            ))}
          </div>
          {images.length > 8 && (
            <p className="mt-2 text-center text-sm text-muted-foreground">
              +{images.length - 8} more images
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl border-none bg-transparent p-0">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedImage(null)}
              className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full bg-background/80 text-foreground hover:bg-background"
            >
              <X className="h-4 w-4" />
            </Button>
            {selectedImage && (
              <img
                src={selectedImage}
                alt={workshopTitle}
                className="max-h-[80vh] w-full rounded-lg object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
