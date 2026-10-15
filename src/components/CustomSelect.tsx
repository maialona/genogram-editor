import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  ariaLabel: string;
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
}

export function CustomSelect({
  ariaLabel,
  value,
  options,
  onChange,
}: CustomSelectProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    setActiveIndex(selectedIndex);

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, [open, selectedIndex]);

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const moveActive = (direction: 1 | -1) => {
    setOpen(true);
    setActiveIndex((current) => {
      const start = open ? current : selectedIndex;
      return (start + direction + options.length) % options.length;
    });
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(options.length - 1);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(activeIndex);
      else setOpen(true);
      return;
    }
    if (event.key.length === 1 && /\S/.test(event.key)) {
      const query = event.key.toLocaleLowerCase();
      const match = options.findIndex((option) =>
        option.label.toLocaleLowerCase().startsWith(query)
      );
      if (match >= 0) {
        event.preventDefault();
        setOpen(true);
        setActiveIndex(match);
      }
    }
  };

  return (
    <div ref={rootRef} className={`ai-custom-select${open ? " is-open" : ""}`}>
      <button
        ref={buttonRef}
        type="button"
        className="ai-custom-select-trigger"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open ? `${listboxId}-option-${activeIndex}` : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onKeyDown}
      >
        <span>{selected?.label ?? value}</span>
        <ChevronDown size={15} strokeWidth={1.8} aria-hidden />
      </button>

      {open && (
        <div
          id={listboxId}
          className="ai-custom-select-menu"
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <button
                id={`${listboxId}-option-${index}`}
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                tabIndex={-1}
                className={`ai-custom-select-option${
                  index === activeIndex ? " is-active" : ""
                }${isSelected ? " is-selected" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(index)}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={14} strokeWidth={2} aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
