import Image from "next/image";

export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/nns-enterprise-logo.png"
      alt="NNS Enterprise"
      width={1600}
      height={534}
      priority
      className={`rounded-sm dark:bg-white dark:p-1 ${className}`}
    />
  );
}
