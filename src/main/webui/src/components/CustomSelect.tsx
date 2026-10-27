import type {Key} from "react";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface CustomSelectProps<T extends Key> {
    value: T;
    onValueChange: (value: T | null) => void;
    items: { label: string, value: T }[];
    label?: string;
}

export default function CustomSelect<T extends Key>({value, onValueChange, items, label}: CustomSelectProps<T>) {
    return (
        <Select value={value} onValueChange={onValueChange}
                items={items}>
            <SelectTrigger className={"min-w-0 flex-1 h-8 sm:w-65 sm:flex-none"}>
                <SelectValue className="min-w-0 truncate"/>
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    {label && <SelectLabel>{label}</SelectLabel>}
                    {items.map(item =>
                        (
                            <SelectItem key={item.value} value={item.value}
                                        className="*:min-w-0 *:shrink *:whitespace-normal *:wrap-anywhere">
                                {item.label}
                            </SelectItem>
                        ))
                    }
                </SelectGroup>
            </SelectContent>
        </Select>
    )
}
