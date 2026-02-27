import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DelegacionFilterProps {
  delegaciones: string[];
  selected: string[];
  onChange: (vals: string[]) => void;
}

export default function DelegacionFilter({ delegaciones, selected, onChange }: DelegacionFilterProps) {
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
      <MapPin className="h-4 w-4 text-muted-foreground" />
      <Select onValueChange={handleSelect} value="">
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Delegación..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todas</SelectItem>
          {delegaciones.map((d) => (
            <SelectItem key={d} value={d}>{d}</SelectItem>
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
