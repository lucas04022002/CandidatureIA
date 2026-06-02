import { Card, CardContent } from "@/components/ui/card";

interface DataSourceBannerProps {
  source: "supabase";
  error?: string;
}

export function DataSourceBanner({ source, error }: DataSourceBannerProps) {
  if (source === "supabase" && !error) {
    return null;
  }

  return (
    <Card className="mb-6 border-amber-500/30 bg-amber-500/10">
      <CardContent className="p-4 text-sm text-amber-100">
        {error ? <p>{error}</p> : <p>Supabase non disponible.</p>}
      </CardContent>
    </Card>
  );
}
