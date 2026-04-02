import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Target, FileText, Linkedin, Heart, X, Maximize2 } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import VoiceRecordButton from "@/components/VoiceRecordButton";
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

// Minimal markdown renderer: bold, italic, bullet lists, numbered lists, headings
function MarkdownContent({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-1.5 text-sm text-foreground/90 leading-relaxed">
      {lines.map((line, i) => {
        // H3
        if (line.startsWith("### ")) {
          return (
            <h3 key={i} className="font-semibold text-base text-foreground mt-4 first:mt-0">
              {renderInline(line.slice(4))}
            </h3>
          );
        }
        // H2
        if (line.startsWith("## ")) {
          return (
            <h2 key={i} className="font-bold text-base text-foreground mt-5 first:mt-0">
              {renderInline(line.slice(3))}
            </h2>
          );
        }
        // H1
        if (line.startsWith("# ")) {
          return (
            <h1 key={i} className="font-bold text-lg text-foreground mt-5 first:mt-0">
              {renderInline(line.slice(2))}
            </h1>
          );
        }
        // Unordered list
        if (/^[-*•] /.test(line)) {
          return (
            <li key={i} className="ml-4 list-disc">
              {renderInline(line.slice(2))}
            </li>
          );
        }
        // Numbered list
        if (/^\d+\. /.test(line)) {
          return (
            <li key={i} className="ml-4 list-decimal">
              {renderInline(line.replace(/^\d+\. /, ""))}
            </li>
          );
        }
        // Blank line → spacer
        if (line.trim() === "") {
          return <div key={i} className="h-2" />;
        }
        // Normal paragraph
        return (
          <p key={i}>{renderInline(line)}</p>
        );
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  // Handle **bold** and *italic*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
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
        console.error("Failed to parse response as JSON:", rawText);
        throw new Error("Invalid response format from webhook");
      }

      if (Array.isArray(data)) {
        data = data[0];
      }

      // Check if this is an acknowledgment (processing) response
      const isAck =
        data.status === "processing" ||
        data.status === "pending" ||
        data.status === "in_progress" ||
        (data.executionId && !data.fitAnalysis && !data.fit_analysis);

      if (isAck) {
        console.log("Received ack, starting to poll…", data);
        toast.info("Your analysis is being processed…");

        const pollUrl = data.pollUrl || data.poll_url || WEBHOOK_URL;
        const executionId = data.executionId || data.execution_id || data.id || "";
        const maxAttempts = 60; // up to ~5 minutes
        const interval = 5000; // 5s

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          await new Promise((r) => setTimeout(r, interval));

          const pollResponse = await fetch(
            executionId ? `${pollUrl}?executionId=${executionId}` : pollUrl,
            { method: "GET" }
          );

          if (!pollResponse.ok) {
            console.warn(`Poll attempt ${attempt + 1} returned ${pollResponse.status}`);
            continue;
          }

          const pollRaw = await pollResponse.text();
          console.log(`Poll attempt ${attempt + 1}:`, pollRaw);

          let pollData: any;
          try {
            pollData = JSON.parse(pollRaw);
          } catch {
            continue;
          }

          if (Array.isArray(pollData)) pollData = pollData[0];

          // Still processing
          if (
            pollData.status === "processing" ||
            pollData.status === "pending" ||
            pollData.status === "in_progress"
          ) {
            continue;
          }

          // We have results
          if (pollData.fitAnalysis || pollData.fit_analysis || pollData.fit) {
            setResults({
              fitAnalysis: pollData.fitAnalysis || pollData.fit_analysis || pollData.fit || "",
              cvSuggestions: pollData.cvSuggestions || pollData.cv_suggestions || pollData.cv || "",
              linkedinSuggestions: pollData.linkedinSuggestions || pollData.linkedin_suggestions || pollData.linkedin || "",
              confidenceLetter: pollData.confidenceLetter || pollData.confidence_letter || pollData.letter || "",
            });
            setLoading(false);
            return;
          }
        }

        throw new Error("Timed out waiting for results");
      }

      // Direct (non-ack) response — use immediately
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
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-foreground">
                Tell us what you have done
              </label>
              <VoiceRecordButton
                onTranscript={(text) =>
                  setExperience((prev) => (prev ? prev + " " + text : text))
                }
              />
            </div>
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
                    {/* 2-line clamp with fade */}
                    <div className="relative">
                      <p className="line-clamp-2 text-sm text-foreground/80 leading-relaxed">
                        {card.content}
                      </p>
                      {/* Fade-out overlay */}
                      <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-card to-transparent" />
                    </div>
                    <span className="mt-3 inline-block text-xs font-medium text-primary group-hover:underline">
                      Read full output →
                    </span>
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
            className="relative w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border border-border bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header — sticky */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border/60">
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

            {/* Modal body — scrollable */}
            <div className="overflow-y-auto px-6 py-5 flex-1">
              <MarkdownContent text={expandedCard.content} />
            </div>

            {/* Modal footer — sticky */}
            <div className="px-6 py-4 border-t border-border/60 flex justify-end">
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
