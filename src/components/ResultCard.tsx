import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ReactNode } from "react";

interface ResultCardProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  accentColor: "primary" | "accent";
}

const ResultCard = ({ title, icon, children, accentColor }: ResultCardProps) => {
  return (
    <Card className="overflow-hidden border-none shadow-lg">
      <div
        className={`h-1.5 ${accentColor === "primary" ? "bg-primary" : "bg-accent"}`}
      />
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            accentColor === "primary"
              ? "bg-primary/10 text-primary"
              : "bg-accent/10 text-accent"
          }`}
        >
          {icon}
        </div>
        <CardTitle className="font-heading text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm leading-relaxed text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
};

export default ResultCard;
