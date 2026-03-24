import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Eye, Pencil, RotateCcw, Save, ChevronDown, HelpCircle, AlertTriangle, Copy, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SystemFunction {
  id: string;
  name: string;
  formula: string;
  excel_equivalent: string | null;
  description: string | null;
  updated_at: string;
}

const KNOWN_VARIABLES = [
  "ventasActual", "ventasPrevio", "mesesConDatos", "mesesRestantes",
  "clientesActivos", "clientesActivosPrev", "totalReal", "sumWeightsReal",
  "peso_mes", "proyeccion_mes", "totalPrevio", "mes",
];

function validateFormula(formula: string): { valid: boolean; suggestion?: string; warning?: string } {
  const trimmed = formula.trim();
  if (!trimmed) return { valid: false, warning: "La fórmula no puede estar vacía." };

  let depth = 0;
  for (const ch of trimmed) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (depth < 0) break;
  }
  if (depth !== 0) {
    if (depth > 0) {
      return { valid: false, suggestion: trimmed + ")".repeat(depth) };
    }
    return { valid: false, warning: "Paréntesis desbalanceados. Revisa la fórmula." };
  }

  return { valid: true };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0 shrink-0"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

function FunctionCard({ fn, onSave }: { fn: SystemFunction; onSave: (id: string, formula: string, excelEquiv: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftFormula, setDraftFormula] = useState(fn.formula);
  const [draftExcel, setDraftExcel] = useState(fn.excel_equivalent || "");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [warningMsg, setWarningMsg] = useState("");
  const [suggestionFormula, setSuggestionFormula] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    const result = validateFormula(draftFormula);
    if (!result.valid && result.suggestion) {
      setSuggestionFormula(result.suggestion);
      setWarningMsg("La fórmula tiene paréntesis desbalanceados.");
      setWarningOpen(true);
      return;
    }
    if (!result.valid) {
      setWarningMsg(result.warning || "Fórmula inválida.");
      setSuggestionFormula(null);
      setWarningOpen(true);
      return;
    }
    if (result.warning) {
      setWarningMsg(result.warning + "\n\nSi continúa, la fórmula podría no mostrar datos correctos.");
      setSuggestionFormula(null);
      setWarningOpen(true);
      return;
    }
    setConfirmOpen(true);
  };

  const doSave = async () => {
    setSaving(true);
    try {
      await onSave(fn.id, draftFormula, draftExcel);
      setEditing(false);
      setConfirmOpen(false);
      setWarningOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const resetDrafts = () => {
    setDraftFormula(fn.formula);
    setDraftExcel(fn.excel_equivalent || "");
  };

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="font-mono text-primary">ƒ</span>
                {fn.name}
                <span className="text-xs font-normal text-muted-foreground ml-auto mr-2">
                  {fn.description}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Última actualización: {new Date(fn.updated_at).toLocaleDateString("es-ES")}
                </span>
                <div className="flex items-center gap-1">
                  <HelpPopover functionName={fn.name} />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => { setEditing(!editing); resetDrafts(); }}
                    title={editing ? "Ver" : "Editar"}
                  >
                    {editing ? <Eye className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              {/* Main formula block */}
              <div>
                <p className="text-[11px] font-medium text-muted-foreground mb-1">Fórmula del sistema</p>
                {editing ? (
                  <Textarea
                    value={draftFormula}
                    onChange={(e) => setDraftFormula(e.target.value)}
                    className="font-mono text-sm min-h-[80px] bg-muted/50"
                    placeholder="Escribe la fórmula del sistema..."
                  />
                ) : (
                  <div className="bg-muted/50 rounded-md p-3 font-mono text-sm whitespace-pre-wrap break-all border flex items-start gap-2">
                    <span className="flex-1">{fn.formula}</span>
                    <CopyButton text={fn.formula} />
                  </div>
                )}
              </div>

              {/* Excel equivalent block */}
              {(fn.excel_equivalent || editing) && (
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    📊 Equivalente Excel
                  </p>
                  {editing ? (
                    <Textarea
                      value={draftExcel}
                      onChange={(e) => setDraftExcel(e.target.value)}
                      className="font-mono text-xs min-h-[50px] bg-muted/30 border-dashed"
                      placeholder="=fórmula en formato Excel..."
                    />
                  ) : (
                    <div className="bg-muted/30 rounded p-2 font-mono text-xs whitespace-pre-wrap break-all border border-dashed flex items-start gap-2">
                      <span className="flex-1">{fn.excel_equivalent}</span>
                      <CopyButton text={fn.excel_equivalent || ""} />
                    </div>
                  )}
                </div>
              )}

              {/* Edit actions */}
              {editing && (
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={resetDrafts}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Deshacer
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={handleSave}
                  >
                    <Save className="h-3 w-3" />
                    Guardar
                  </Button>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Confirmar cambio</DialogTitle>
            <DialogDescription className="text-xs">
              Este cambio afectará al sistema y sus cálculos. ¿Desea continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={doSave} disabled={saving}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warning dialog */}
      <Dialog open={warningOpen} onOpenChange={setWarningOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Advertencia
            </DialogTitle>
            <DialogDescription className="text-xs whitespace-pre-line">
              {warningMsg}
            </DialogDescription>
          </DialogHeader>
          {suggestionFormula ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Corrección sugerida:</p>
              <div className="bg-muted/50 rounded p-2 font-mono text-xs break-all">{suggestionFormula}</div>
              <DialogFooter className="gap-2">
                <Button variant="outline" size="sm" onClick={() => setWarningOpen(false)}>Cancelar</Button>
                <Button size="sm" onClick={() => { setDraftFormula(suggestionFormula); setWarningOpen(false); }}>
                  Usar corrección
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setWarningOpen(false)}>Cancelar</Button>
              <Button variant="destructive" size="sm" onClick={() => { setWarningOpen(false); setConfirmOpen(true); }}>
                Continuar de todos modos
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function HelpPopover({ functionName }: { functionName: string }) {
  const content = getHelpContent(functionName);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Ayuda">
          <HelpCircle className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] sm:w-[420px] max-h-[480px] overflow-auto text-xs space-y-3" align="end">
        <h4 className="font-semibold text-sm">ƒ {functionName}</h4>

        <div>
          <p className="font-medium text-primary mb-1">¿Qué calcula?</p>
          <p className="text-muted-foreground">{content.whatItDoes}</p>
        </div>

        <div>
          <p className="font-medium text-primary mb-1">¿Cómo funciona?</p>
          <ol className="list-decimal list-inside text-muted-foreground space-y-1">
            {content.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>

        {content.importantNote && (
          <div className="bg-accent/50 rounded p-2 text-muted-foreground border">
            <p className="font-medium text-foreground text-[11px] mb-0.5">💡 Nota importante</p>
            <p>{content.importantNote}</p>
          </div>
        )}

        <div>
          <p className="font-medium text-primary mb-1">Ejemplo numérico</p>
          <div className="bg-muted/50 rounded p-2 space-y-1 font-mono text-[11px]">
            {content.example.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>

        <div>
          <p className="font-medium text-primary mb-1">Variables utilizadas</p>
          <ul className="text-muted-foreground space-y-0.5">
            {content.variables.map((v, i) => (
              <li key={i}><code className="text-foreground bg-muted px-1 rounded">{v.name}</code> — {v.desc}</li>
            ))}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function getHelpContent(name: string) {
  const lower = name.toLowerCase();

  if (lower.includes("proyecci")) {
    return {
      whatItDoes: "Estima las ventas de los meses que aún no tienen datos reales para predecir el cierre del año. No aplica un porcentaje fijo de crecimiento: el crecimiento viene implícito en la diferencia entre las ventas reales actuales y las del año anterior.",
      steps: [
        "Identifica los meses del año actual que ya tienen ventas reales (ej: enero-febrero = 1.500.000 €).",
        "Consulta el año anterior para calcular qué peso (%) tuvo cada mes sobre el total anual (ej: enero = 7%, febrero = 8%).",
        "Suma los pesos de los meses con datos reales: 7% + 8% = 15% (0,15).",
        "Calcula el factor de escala: 1.500.000 / 0,15 = 10.000.000 € (proyección anual implícita).",
        "Para cada mes sin datos, multiplica el factor por el peso de ese mes: si marzo pesó 9% → 10.000.000 × 0,09 = 900.000 €.",
        "Si no hay datos del año anterior, usa pesos uniformes (1/12 ≈ 8,33%) con un ligero sesgo de +0,5% mensual acumulativo a partir de julio (segundo semestre).",
      ],
      importantNote: "No se aplica un porcentaje fijo de crecimiento (ej: 5%). Si en los mismos meses vendes un 10% más que el año pasado, la proyección reflejará ese +10% proporcionalmente en todos los meses futuros. El sesgo del segundo semestre (+0,5%/mes) solo se activa cuando no hay datos históricos del año anterior.",
      example: [
        "Ventas reales ene-feb 2026: 1.500.000 €",
        "Peso ene+feb en 2025: 15% del total anual",
        "Factor escala: 1.500.000 / 0,15 = 10.000.000 €",
        "Marzo (peso 9%): 10.000.000 × 0,09 = 900.000 €",
        "Abril (peso 8%): 10.000.000 × 0,08 = 800.000 €",
        "...",
        "Total proyectado anual: ~10.000.000 €",
      ],
      variables: [
        { name: "totalReal", desc: "Suma de ventas de los meses con datos reales" },
        { name: "peso_mes", desc: "Proporción de cada mes sobre el total del año anterior" },
        { name: "totalPrevio", desc: "Total de ventas del año anterior (para calcular pesos)" },
        { name: "mesesConDatos", desc: "Cantidad de meses con ventas reales en el año actual" },
        { name: "mesesRestantes", desc: "12 − mesesConDatos" },
        { name: "sumWeightsReal", desc: "Suma de los pesos de los meses con datos reales" },
        { name: "proyeccion_mes", desc: "Valor proyectado para un mes sin datos" },
      ],
    };
  }

  if (lower.includes("crecimiento")) {
    return {
      whatItDoes: "Calcula la variación porcentual entre las ventas del año actual y las del año anterior. Un valor positivo indica crecimiento, uno negativo indica descenso.",
      steps: [
        "Toma el total de ventas del año actual (ventasActual).",
        "Toma el total de ventas del año anterior (ventasPrevio).",
        "Resta: ventasActual − ventasPrevio = diferencia.",
        "Divide la diferencia entre ventasPrevio.",
        "Multiplica por 100 para obtener el porcentaje.",
      ],
      importantNote: null,
      example: [
        "Ventas 2026: 8.000.000 €",
        "Ventas 2025: 7.500.000 €",
        "Diferencia: 8.000.000 − 7.500.000 = 500.000 €",
        "Crecimiento: (500.000 / 7.500.000) × 100 = 6,67%",
      ],
      variables: [
        { name: "ventasActual", desc: "Total ventas del año actual (o proyectado)" },
        { name: "ventasPrevio", desc: "Total ventas del año anterior" },
      ],
    };
  }

  if (lower.includes("ticket")) {
    return {
      whatItDoes: "Calcula el gasto medio por cliente activo. Indica cuánto factura de media cada cliente que ha comprado al menos una vez en el período.",
      steps: [
        "Toma el total de ventas del período (ventasActual).",
        "Cuenta los clientes activos: aquellos con al menos una venta > 0 en el año.",
        "Divide el total entre el número de clientes activos.",
      ],
      importantNote: null,
      example: [
        "Ventas totales: 8.000.000 €",
        "Clientes activos: 350",
        "Ticket medio: 8.000.000 / 350 = 22.857 €/cliente",
      ],
      variables: [
        { name: "ventasActual", desc: "Total de ventas del período" },
        { name: "clientesActivos", desc: "Número de clientes con ventas > 0" },
      ],
    };
  }

  return {
    whatItDoes: "Función de cálculo del sistema.",
    steps: ["Consulta la fórmula mostrada para ver la lógica aplicada."],
    importantNote: null,
    example: ["Sin ejemplo específico disponible."],
    variables: [
      { name: "ventasActual", desc: "Total ventas año actual" },
      { name: "ventasPrevio", desc: "Total ventas año anterior" },
    ],
  };
}
    {
      label: "Proyección (Excel)",
      code: "=((([@[Ventas 2025]]+([@[Ventas 2025]]/(12-Meses_restantes))*Meses_restantes+((([@[Ventas 2025]]/(12-Meses_restantes))*Meses_restantes*0.6/100)))))",
    },
    {
      label: "Crecimiento (sistema)",
      code: "((ventasActual - ventasPrevio) / ventasPrevio) × 100",
    },
    {
      label: "Crecimiento simple (Excel)",
      code: "=G3069/F3069*1.065",
    },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Ayuda">
          <HelpCircle className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 max-h-[420px] overflow-auto text-xs space-y-3" align="end">
        <h4 className="font-semibold text-sm">Ayuda — Fórmulas del sistema</h4>
        <p className="text-muted-foreground">
          Cada función tiene dos campos: la <strong>fórmula del sistema</strong> (lógica real) y el <strong>equivalente Excel</strong> (referencia visual).
        </p>

        <div className="space-y-1.5">
          <p className="font-medium">Variables disponibles:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
            <li><code className="text-foreground">ventasActual</code> — Total ventas año actual</li>
            <li><code className="text-foreground">ventasPrevio</code> — Total ventas año anterior</li>
            <li><code className="text-foreground">mesesConDatos</code> — Meses con datos reales</li>
            <li><code className="text-foreground">mesesRestantes</code> — 12 - mesesConDatos</li>
            <li><code className="text-foreground">clientesActivos</code> — Clientes con ventas &gt; 0</li>
            <li><code className="text-foreground">totalReal</code> — Suma ventas meses reales</li>
            <li><code className="text-foreground">peso_mes</code> — Peso estacional del mes</li>
          </ul>
        </div>

        <div className="space-y-2">
          <p className="font-medium">Ejemplos de fórmulas:</p>
          {examples.map((ex, i) => (
            <div key={i}>
              <p className="text-muted-foreground mb-0.5">{ex.label}:</p>
              <div className="flex items-start gap-1">
                <code className="bg-muted p-1.5 rounded text-[11px] break-all flex-1">{ex.code}</code>
                <CopyButton text={ex.code} />
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function AdminFunctions() {
  const [functions, setFunctions] = useState<SystemFunction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFunctions();
  }, []);

  const loadFunctions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("system_functions")
      .select("*")
      .order("name");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setFunctions((data as SystemFunction[]) || []);
    }
    setLoading(false);
  };

  const handleSave = async (id: string, formula: string, excelEquiv: string) => {
    const { error } = await supabase
      .from("system_functions")
      .update({ formula, excel_equivalent: excelEquiv, updated_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Fórmula actualizada", description: "Los cambios se han guardado correctamente." });
    loadFunctions();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Funciones</h1>
        <p className="text-sm text-muted-foreground">Configuración de fórmulas de cálculo del sistema</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="py-6"><div className="h-4 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {functions.map((fn) => (
            <FunctionCard key={fn.id} fn={fn} onSave={handleSave} />
          ))}
        </div>
      )}
    </div>
  );
}
