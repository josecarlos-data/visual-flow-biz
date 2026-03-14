import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VendedorFilterProps {
  vendedores: string[];
  selected: string[];
  onChange: (vals: string[]) => void;
}

export default function VendedorFilter({ vendedores, selected, onChange }: VendedorFilterProps) {
  const handleSelect = (val: string) => {
    if (val === "__all__") {
      onChange([]);
      return;
    }
    if (!selected.includes(val)) {
      onChange([...selected, val]);
    }
  };

  const remove = (val: string) => {
    onChange(selected.filter((s) => s !== val));
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <User className="h-4 w-4 text-muted-foreground" />
      <Select onValueChange={handleSelect} value="">
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Vendedor..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todos</SelectItem>
          {vendedores.map((v) => (
            <SelectItem key={v} value={v}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected.map((s) => (
        <Badge key={s} variant="secondary" className="flex items-center gap-1">
          {s}
          <Button variant="ghost" size="icon" className="h-4 w-4 p-0" onClick={() => remove(s)}>
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}
    </div>
  );
}
