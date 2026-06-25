import { Link } from "wouter";
import { ArrowRight, FileText, Image, RefreshCw, AlignLeft, FilePlus, Scissors, Archive, FileImage, FileOutput, RotateCw, Stamp, FileType, Lock, Minimize2, Expand, Crop, Images, FlipHorizontal, Code2, Hash, QrCode, Binary, Braces } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText, Image, RefreshCw, AlignLeft, FilePlus, Scissors, Archive,
  FileImage, FileOutput, RotateCw, Stamp, FileType, Lock, Minimize2,
  Expand, Crop, Images, FlipHorizontal, Code2, Hash, QrCode, Binary, Braces,
};

const categoryColors: Record<string, { bg: string; text: string; badge: string }> = {
  pdf:     { bg: "bg-red-50 hover:bg-red-100",     text: "text-red-600",    badge: "bg-red-100 text-red-700" },
  image:   { bg: "bg-blue-50 hover:bg-blue-100",   text: "text-blue-600",   badge: "bg-blue-100 text-blue-700" },
  convert: { bg: "bg-violet-50 hover:bg-violet-100", text: "text-violet-600", badge: "bg-violet-100 text-violet-700" },
  text:    { bg: "bg-emerald-50 hover:bg-emerald-100", text: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700" },
};

interface ToolCardProps {
  slug: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  route: string;
  usageCount?: number;
  isFeatured?: boolean;
  className?: string;
}

export function ToolCard({ slug, name, description, category, icon, route, usageCount, isFeatured, className }: ToolCardProps) {
  const Icon = iconMap[icon] ?? FileText;
  const colors = categoryColors[category] ?? categoryColors.pdf;

  return (
    <Link href={route} data-testid={`tool-card-${slug}`}>
      <div className={cn(
        "group relative rounded-xl border border-transparent p-5 cursor-pointer transition-all duration-200",
        "hover:shadow-md hover:border-border",
        colors.bg,
        className
      )}>
        {isFeatured && (
          <span className="absolute top-3 right-3 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
            Popular
          </span>
        )}
        <div className={cn("inline-flex p-2.5 rounded-xl mb-3", colors.badge.split(" ")[0], "bg-opacity-60")}>
          <Icon className={cn("h-5 w-5", colors.text)} />
        </div>
        <h3 className="font-semibold text-foreground text-sm mb-1 group-hover:text-primary transition-colors">{name}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{description}</p>
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowRight className={cn("h-4 w-4", colors.text)} />
        </div>
      </div>
    </Link>
  );
}
