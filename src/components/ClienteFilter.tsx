import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, X, ArrowDownAZ, ArrowDownWideNarrow } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClienteData {
  name: string;
  ventas: number;
}

interface ClienteFilterProps {
  clientes: ClienteData[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

const fmtShort = (v: number) =>
  v >= 1000
    ? new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: true }).format(v) + " €"
    : v > 0
    ? v.toFixed(0) + " €"
    : "";

export default function ClienteFilter({ clientes, selected, onChange }: ClienteFilterProps) {
  const [open, setOpen] = useState(false);
  const [sortByVentas, setSortByVentas] = useState(false);

  const sorted = useMemo(() => {
    if (sortByVentas) {
      return [...clientes].sort((a, b) => b.ventas - a.ventas);
    }
    return [...clientes].sort((a, b) => a.name.localeCompare(b.name));
  }, [clientes, sortByVentas]);

  const toggle = (name: string) => {
    onChange(
      selected.includes(name)
        ? selected.filter((s) => s !== name)
        : [...selected, name]
    );
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between text-sm font-normal">
            {selected.length === 0
              ? "Todos los clientes"
              : `${selected.length} cliente${selected.length > 1 ? "s" : ""}`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <div className="flex items-center border-b">
              <CommandInput placeholder="Buscar cliente..." className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 mr-1 shrink-0"
                onClick={() => setSortByVentas((v) => !v)}
                title={sortByVentas ? "Ordenar A-Z" : "Ordenar por ventas"}
              >
                {sortByVentas ? <ArrowDownAZ className="h-4 w-4" /> : <ArrowDownWideNarrow className="h-4 w-4" />}
              </Button>
            </div>
            <CommandList>
              <CommandEmpty>Sin resultados.</CommandEmpty>
              <CommandGroup>
                {sorted.map((c) => (
                  <CommandItem key={c.name} value={c.name} onSelect={() => toggle(c.name)}>
                    <Check className={cn("mr-2 h-4 w-4 shrink-0", selected.includes(c.name) ? "opacity-100" : "opacity-0")} />
                    <span className="truncate flex-1">{c.name}</span>
                    {c.ventas > 0 && (
                      <span className="text-[10px] text-muted-foreground ml-2 shrink-0">{fmtShort(c.ventas)}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((s) => (
            <Badge key={s} variant="secondary" className="text-xs gap-1 max-w-[200px]">
              <span className="truncate">{s}</span>
              <X className="h-3 w-3 cursor-pointer shrink-0" onClick={() => toggle(s)} />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
