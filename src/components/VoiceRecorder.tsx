import { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { startRecording, type Recorder } from "@/lib/audio";
import { toast } from "@/hooks/use-toast";

interface Props {
  onAudio: (blob: Blob) => void;
  disabled?: boolean;
  processing?: boolean;
  hasResult?: boolean;
}

export function VoiceRecorder({ onAudio, disabled, processing, hasResult }: Props) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const recorderRef = useRef<Recorder | null>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    const tick = () => {
      if (recorderRef.current) setLevel(recorderRef.current.getLevel());
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      clearInterval(timer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [recording]);

  useEffect(() => () => recorderRef.current?.cancel(), []);

  const start = async () => {
    try {
      recorderRef.current = await startRecording();
      setSeconds(0);
      setRecording(true);
    } catch {
      toast({
        title: "No se puede acceder al micrófono",
        description: "Autoriza el micrófono en tu navegador para dictar la visita.",
        variant: "destructive",
      });
    }
  };

  const stop = async () => {
    const rec = recorderRef.current;
    if (!rec) return;
    setRecording(false);
    recorderRef.current = null;
    const blob = await rec.stop();
    setLevel(0);
    if (blob.size < 4096) {
      toast({
        title: "Grabación demasiado corta",
        description: "No se ha detectado voz. Vuelve a intentarlo.",
        variant: "destructive",
      });
      return;
    }
    onAudio(blob);
  };

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  if (processing) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Transcribiendo y analizando la nota…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6">
      {recording ? (
        <>
          <button
            type="button"
            onClick={stop}
            className="relative flex h-20 w-20 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg transition-transform active:scale-95"
            aria-label="Detener grabación"
          >
            <span
              className="absolute inset-0 rounded-full bg-destructive/30"
              style={{ transform: `scale(${1 + level * 0.6})`, transition: "transform 80ms linear" }}
            />
            <Square className="relative h-7 w-7 fill-current" />
          </button>
          <div className="text-center">
            <p className="font-mono text-lg font-semibold tabular-nums">{mmss}</p>
            <p className="text-xs text-muted-foreground">Grabando… pulsa para terminar</p>
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={start}
            disabled={disabled}
            className={cn(
              "flex h-20 w-20 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95",
              disabled ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
            )}
            aria-label="Grabar nota de voz"
          >
            {hasResult ? <RotateCcw className="h-7 w-7" /> : <Mic className="h-8 w-8" />}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            {disabled
              ? "Selecciona primero un motivo de visita"
              : hasResult
              ? "Vuelve a dictar para regenerar el informe"
              : "Pulsa y cuenta cómo ha ido la visita"}
          </p>
        </>
      )}
    </div>
  );
}
