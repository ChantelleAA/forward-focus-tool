import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Target, FileText, Linkedin, Heart, X, Maximize2 } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import ResultCard from "@/components/ResultCard";
import { extractTextFromPdf } from "@/lib/pdfExtract";
import { toast } from "sonner";

const WEBHOOK_URL = "https://chantelleaa.app.n8n.cloud/webhook/career-copilot";

interface AnalysisResults {
  fitAnalysis: string;
  cvSuggestions: string;
  linkedinSuggestions: string;
  confidenceLetter: string;
}

interface ExpandedCard {
  title: string;
  icon: React.ReactNode;
  content: string;
}

const Index = () => {
  const [experience, setExperience] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [linkedinFile, setLinkedinFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [expandedCard, setExpandedCard] = useState<ExpandedCard | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setResults(null);

    try {
      const cvText = cvFile ? await extractTextFromPdf(cvFile) : "";
      const linkedinText = linkedinFile ? await extractTextFromPdf(linkedinFile) : "";

      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brainDump: experience,
          cvText,
          linkedinText,
          jobDescription,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error("Webhook error:", response.status, errorText);
        throw new Error(`Request failed with status ${response.status}`);
      }

      const rawText = await response.text();
      console.log("Webhook raw response:", rawText);

      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        try {
          const parsed = JSON.parse(rawText);
          data = Array.isArray(parsed) ? parsed[0] : parsed;
        } catch {
          console.error("Failed to parse response as JSON:", rawText);
          throw new Error("Invalid response format from webhook");
        }
      }

      if (Array.isArray(data)) {
        data = data[0];
      }

      setResults({
        fitAnalysis: data.fitAnalysis || data.fit_analysis || data.fit || "",
        cvSuggestions: data.cvSuggestions || data.cv_suggestions || data.cv || "",
        linkedinSuggestions: data.linkedinSuggestions || data.linkedin_suggestions || data.linkedin || "",
        confidenceLetter: data.confidenceLetter || data.confidence_letter || data.letter || "",
      });
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = experience.trim().length > 0 || cvFile !== null;

  const cardDefs = results
    ? [
        {
          title: "Fit Analysis",
          icon: <Target className="h-5 w-5" />,
          accentColor: "primary" as const,
          content: results.fitAnalysis,
        },
        {
          title: "CV Suggestions",
          icon: <FileText className="h-5 w-5" />,
          accentColor: "accent" as const,
          content: results.cvSuggestions,
        },
        {
          title: "LinkedIn Suggestions",
          icon: <Linkedin className="h-5 w-5" />,
          accentColor: "primary" as const,
          content: results.linkedinSuggestions,
        },
        {
          title: "Career Confidence Letter",
          icon: <Heart className="h-5 w-5" />,
          accentColor: "accent" as const,
          content: results.confidenceLetter,
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Target className="h-5 w-5" />
          </div>
          <h1 className="font-heading text-xl font-bold tracking-tight">
            Career Transition Co-pilot
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        {/* Input Form */}
        <section className="space-y-6">
          <div>
            <p className="text-muted-foreground">
              Share your background and a target role. We'll analyse your fit and
              give you actionable next steps.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Tell us what you have done
            </label>
            <Textarea
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="Just write. No structure needed. Messy is fine."
              className="min-h-[140px] resize-y border-input bg-card text-sm"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <FileUpload
              label="Upload your CV (PDF)"
              file={cvFile}
              onFileChange={setCvFile}
            />
            <FileUpload
              label="Upload your LinkedIn profile (PDF, optional)"
              file={linkedinFile}
              onFileChange={setLinkedinFile}
              helperText="On LinkedIn: go to your profile, click More, Save to PDF"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Paste the job description you are targeting
            </label>
            <Textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Copy and paste the full job listing here…"
              className="min-h-[140px] resize-y border-input bg-card text-sm"
            />
          </div>

          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="w-full font-heading text-base font-semibold tracking-wide"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Analysing…
              </>
            ) : (
              "Analyse My Profile"
            )}
          </Button>
        </section>

        {/* Loading shimmer */}
        {loading && (
          <section className="mt-12 grid gap-5 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse-gentle rounded-xl bg-secondary"
              />
            ))}
          </section>
        )}

        {/* Results */}
        {results && !loading && (
          <>
            <p className="mt-12 mb-4 text-xs text-muted-foreground">
              Click any card to read the full output.
            </p>
            <section className="grid gap-5 sm:grid-cols-2">
              {cardDefs.map((card) => (
                <button
                  key={card.title}
                  onClick={() =>
                    setExpandedCard({
                      title: card.title,
                      icon: card.icon,
                      content: card.content,
                    })
                  }
                  className="group relative text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
                >
                  {/* Expand hint */}
                  <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <ResultCard
                    title={card.title}
                    icon={card.icon}
                    accentColor={card.accentColor}
                  >
                    {card.content}
                  </ResultCard>
                </button>
              ))}
            </section>
          </>
        )}
      </main>

      {/* Modal overlay */}
      {expandedCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={() => setExpandedCard(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-foreground font-heading font-semibold text-lg">
                {expandedCard.icon}
                {expandedCard.title}
              </div>
              <button
                onClick={() => setExpandedCard(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal content */}
            <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {expandedCard.content}
            </div>

            {/* Copy button */}
            <div className="mt-6 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(expandedCard.content);
                  toast.success("Copied to clipboard");
                }}
              >
                Copy to clipboard
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
