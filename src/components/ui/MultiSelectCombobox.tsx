import { Check, ChevronDown, X } from 'lucide-react';
import { forwardRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { Badge } from './Badge';
import { Input } from './Input';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectComboboxProps {
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  maxDisplayedItems?: number;
}

const MultiSelectCombobox = forwardRef<HTMLDivElement, MultiSelectComboboxProps>(
  (
    {
      options,
      selectedValues,
      onChange,
      placeholder = 'Select items...',
      className,
      disabled = false,
      searchPlaceholder = 'Search...',
      emptyMessage = 'No items found',
      maxDisplayedItems = 3,
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');

    // Filter options based on search input
    const filteredOptions = options.filter((option) => option.label.toLowerCase().includes(searchValue.toLowerCase()));

    // Get selected options for display
    const selectedOptions = options.filter((option) => selectedValues.includes(option.value));

    // Handle option selection
    const handleSelect = (value: string) => {
      if (selectedValues.includes(value)) {
        // Remove from selection
        onChange(selectedValues.filter((v) => v !== value));
      } else {
        // Add to selection
        onChange([...selectedValues, value]);
      }
    };

    // Handle removing individual items
    const handleRemove = (value: string) => {
      onChange(selectedValues.filter((v) => v !== value));
    };

    // Handle clearing search when popover closes
    const handleOpenChange = (newOpen: boolean) => {
      setOpen(newOpen);
      if (!newOpen) {
        setSearchValue('');
      }
    };

    return (
      <div ref={ref} className={twMerge('relative', className)}>
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className={twMerge(
                'flex h-auto min-h-[2.5rem] w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                className,
              )}
            >
              <div className="flex flex-1 flex-wrap gap-1">
                {selectedOptions.length === 0 ? (
                  <span className="text-muted-foreground">{placeholder}</span>
                ) : (
                  <>
                    {selectedOptions.slice(0, maxDisplayedItems).map((option) => (
                      <Badge
                        key={option.value}
                        variant="secondary"
                        className="flex items-center gap-1 px-2 py-1 text-xs"
                      >
                        <span>{option.label}</span>
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(option.value);
                          }}
                        />
                      </Badge>
                    ))}
                    {selectedOptions.length > maxDisplayedItems && (
                      <Badge variant="outline" className="px-2 py-1 text-xs">
                        +{selectedOptions.length - maxDisplayedItems} more
                      </Badge>
                    )}
                  </>
                )}
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <div className="flex flex-col">
              {/* Search input */}
              <div className="border-b p-2">
                <Input
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="h-8 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              {/* Options list */}
              <div className="max-h-60 overflow-y-auto">
                {filteredOptions.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">{emptyMessage}</div>
                ) : (
                  filteredOptions.map((option) => {
                    const isSelected = selectedValues.includes(option.value);
                    return (
                      <div
                        key={option.value}
                        className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handleSelect(option.value)}
                      >
                        <div
                          className={twMerge(
                            'flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                            isSelected ? 'bg-primary text-primary-foreground' : 'opacity-50 [&_svg]:invisible',
                          )}
                        >
                          <Check className="h-3 w-3" />
                        </div>
                        <span className="flex-1">{option.label}</span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer with selection count */}
              {selectedValues.length > 0 && (
                <div className="border-t p-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {selectedValues.length} item{selectedValues.length !== 1 ? 's' : ''} selected
                    </span>
                    <button
                      type="button"
                      onClick={() => onChange([])}
                      className="text-destructive hover:text-destructive/80"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  },
);

MultiSelectCombobox.displayName = 'MultiSelectCombobox';

export { MultiSelectCombobox };
export type { MultiSelectComboboxProps };
