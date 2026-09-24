import { useTranslation } from "react-i18next";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { fallbackLng, languageOptions, normalizeLanguage } from "@/i18n/config";

type LanguageSwitcherProps = {
  className?: string;
  /**
   * "segmented" is the compact header toggle — the previous Select needed
   * `min-w-[140px]`, which crowded the mobile header and forced the action row
   * to wrap. "select" is kept for settings forms where the full label helps.
   */
  variant?: "segmented" | "select";
  /** Notified after the language changes, e.g. to persist it on the profile. */
  onChange?: (language: string) => void;
};

// Compact labels for the segmented toggle; the full label shows from `sm` up.
const shortLabels: Record<string, string> = {
  en: "EN",
  ta: "த",
};

export const LanguageSwitcher = ({ className, variant = "segmented", onChange }: LanguageSwitcherProps) => {
  const { i18n } = useTranslation();

  const currentLanguage =
    normalizeLanguage(i18n.resolvedLanguage ?? i18n.language) ?? fallbackLng;

  const change = (language: string) => {
    if (language !== currentLanguage) {
      void i18n.changeLanguage(language);
      onChange?.(language);
    }
  };

  if (variant === "select") {
    return (
      <Select value={currentLanguage} onValueChange={change}>
        <SelectTrigger className={cn("min-w-0 w-full sm:w-[160px]", className)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {languageOptions.map((language) => (
            <SelectItem key={language.value} value={language.value}>
              {language.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div
      role="group"
      aria-label="Language / மொழி"
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-card/70 p-0.5",
        className,
      )}
    >
      {languageOptions.map((language) => {
        const isActive = language.value === currentLanguage;
        return (
          <button
            key={language.value}
            type="button"
            onClick={() => change(language.value)}
            aria-pressed={isActive}
            className={cn(
              "rounded-md px-2 py-1.5 text-xs font-semibold transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <span className="sm:hidden">{shortLabels[language.value] ?? language.label}</span>
            <span className="hidden sm:inline">{language.label}</span>
          </button>
        );
      })}
    </div>
  );
};
