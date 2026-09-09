import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sparkles, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface AiWriterButtonProps {
  onApply: (text: string) => void;
  type?: string;
  context?: string;
  placeholder?: string;
  label?: string;
  defaultPrompt?: string;
}

export function AiWriterButton({
  onApply,
  type = "general",
  context = "",
  placeholder = "Describe what you want to write...",
  label = "AI Write",
  defaultPrompt = "",
}: AiWriterButtonProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return toast.error("Enter a prompt first");
    setLoading(true);
    setResult("");

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-writer`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ prompt, context, type }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "AI error" }));
        throw new Error(err.error || "AI generation failed");
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setResult(fullText);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || "AI generation failed");
    }
    setLoading(false);
  };

  const handleApply = () => {
    onApply(result.trim());
    setOpen(false);
    setResult("");
    setPrompt(defaultPrompt);
    toast.success("AI text applied!");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1 text-primary hover:text-primary"
        >
          <Sparkles className="h-3 w-3" /> {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="end">
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">AI Writing Assistant</p>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            rows={2}
            className="text-sm"
          />
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={loading}
            className="w-full btn-brand"
          >
            {loading ? <><Loader2 className="h-3 w-3 animate-spin" /> Generating...</> : <><Sparkles className="h-3 w-3" /> Generate</>}
          </Button>

          {result && (
            <div className="space-y-2">
              <div className="rounded-md bg-muted p-2 text-sm max-h-32 overflow-y-auto whitespace-pre-wrap">
                {result}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="default" className="flex-1 gap-1" onClick={handleApply}>
                  <Check className="h-3 w-3" /> Apply
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => { setResult(""); handleGenerate(); }}>
                  Retry
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setResult("")}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
