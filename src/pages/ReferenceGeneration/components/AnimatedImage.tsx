type AnimatedImageProps = {
  src: string;
  alt: string;
  aspectRatio?: string;
};

export function AnimatedImage({ src, alt, aspectRatio = '1:1' }: AnimatedImageProps) {
  const aspectClass =
    {
      '1:1': 'aspect-square',
      '16:9': 'aspect-video',
      '9:16': 'aspect-[9/16]',
    }[aspectRatio] || 'aspect-square';

  return (
    <div className={`relative ${aspectClass}`}>
      <img
        src={src}
        alt={alt}
        className="h-full w-full rounded-lg object-cover transition-transform duration-200 hover:scale-105"
        loading="lazy"
      />
    </div>
  );
}
