import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClienteFilterProps {
  clientes: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function ClienteFilter({ clientes, selected, onChange }: ClienteFilterProps) {
  const [open, setOpen] = useState(false);

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
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar cliente..." />
            <CommandList>
              <CommandEmpty>Sin resultados.</CommandEmpty>
              <CommandGroup>
                {clientes.map((c) => (
                  <CommandItem key={c} value={c} onSelect={() => toggle(c)}>
                    <Check className={cn("mr-2 h-4 w-4", selected.includes(c) ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{c}</span>
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
