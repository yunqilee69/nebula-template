interface ExternalIframePageProps {
  title: string;
  src: string;
}

export function ExternalIframePage({ title, src }: ExternalIframePageProps) {
  return (
    <iframe
      title={title}
      src={src}
      className="block w-full h-full min-h-[640px] border-0"
    />
  );
}
