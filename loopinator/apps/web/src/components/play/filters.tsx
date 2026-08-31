import { useCallback, useState, type KeyboardEvent } from "react";
import { GaugeIcon, HashIcon, Music2Icon } from "lucide-react";

import {
  Filters as FilterBar,
  createFilterQuery,
  type FilterEditorProps,
  type FilterField,
  type FilterOption,
  type FilterQuery,
  type FilterValueDisplayContext,
} from "@/components/reui/filters/filters";
import { KEY_CENTERS, TIME_SIGNATURES } from "@/lib/play-types";
import { Button } from "@loopinator/ui/components/button";
import { Slider } from "@loopinator/ui/components/slider";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@loopinator/ui/components/toggle-group";

/* -------------------------------------------------------------------------- */
/* BPM range slider (c-filters-6 pattern)                                     */
/* -------------------------------------------------------------------------- */

type Scale = {
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
};

const TARGET_BPM: Scale = {
  min: 40,
  max: 200,
  step: 1,
  format: (value) => `${value}`,
};

function makeSliderEditor({ min, max, step, format }: Scale) {
  function SliderEditor({
    value,
    onValueChange,
    commit,
    cancel,
    labels,
    field,
    operator,
    autoFocusProps,
  }: FilterEditorProps) {
    const dual = operator.arity === "range";
    const current = dual
      ? Array.isArray(value)
        ? (value as number[])
        : [min, max]
      : typeof value === "number"
        ? value
        : min;

    const reading = dual
      ? labels.valueRange(format((current as number[])[0]), format((current as number[])[1]))
      : format(current as number);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commit(current);
        return;
      }
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      cancel();
    };

    return (
      <div className="flex w-64 flex-col gap-2 p-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-muted-foreground">{field.label}</span>
          <span className="text-sm font-medium tabular-nums">{reading}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-8 shrink-0 text-xs tabular-nums text-muted-foreground">
            {format(min)}
          </span>
          <Slider
            {...autoFocusProps}
            className="min-w-0 flex-1"
            value={dual ? (current as number[]) : [current as number]}
            min={min}
            max={max}
            step={step}
            onValueChange={(next) => {
              const values = Array.isArray(next) ? [...next] : [next];
              onValueChange(dual ? values : values[0]);
            }}
            onKeyDown={onKeyDown}
          />
          <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
            {format(max)}
          </span>
        </div>

        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={cancel}>
            {labels.discard}
          </Button>
          <Button size="sm" onClick={() => commit(current)}>
            {labels.apply}
          </Button>
        </div>
      </div>
    );
  }

  return SliderEditor;
}

function MiniTrack({
  min,
  max,
  from,
  to,
}: {
  min: number;
  max: number;
  from: number;
  to: number;
}) {
  const span = max - min;
  const at = (value: number) =>
    span <= 0 || !Number.isFinite(value) ? 0 : Math.min(Math.max((value - min) / span, 0), 1);
  const start = at(from);
  const end = Math.max(start, at(to));

  return (
    <span aria-hidden="true" className="relative inline-block h-1 w-8 shrink-0 rounded-full bg-muted">
      <span
        className="absolute inset-y-0 rounded-full bg-primary"
        style={{ left: `${start * 100}%`, right: `${(1 - end) * 100}%` }}
      />
    </span>
  );
}

function readBand(
  { min, max, format }: Scale,
  { value, operator, labels }: FilterValueDisplayContext,
) {
  if (Array.isArray(value)) {
    const from = Number(value[0]);
    const to = Number(value[1]);
    return { from, to, text: labels.valueRange(format(from), format(to)) };
  }
  if (typeof value !== "number") return null;

  const upward = operator.value === "gte" || operator.value === "gt";
  return {
    from: upward ? value : min,
    to: upward ? max : value,
    text: format(value),
  };
}

function makeSliderDisplay(scale: Scale, empty: string) {
  const { min, max, format } = scale;

  return {
    renderValue: (context: FilterValueDisplayContext) => {
      const band = readBand(scale, context);
      if (!band) return empty;

      return (
        <span className="inline-flex items-center gap-1.5">
          <MiniTrack min={min} max={max} from={band.from} to={band.to} />
          <span className="tabular-nums">{band.text}</span>
          {band.text.includes(format(max)) ? null : (
            <span className="text-muted-foreground">/ {format(max)}</span>
          )}
        </span>
      );
    },
    valueText: (context: FilterValueDisplayContext) =>
      readBand(scale, context)?.text ?? empty,
  };
}

const TargetBpmSlider = makeSliderEditor(TARGET_BPM);
const targetBpmDisplay = makeSliderDisplay(TARGET_BPM, "any tempo");

/* -------------------------------------------------------------------------- */
/* Toggle group editors (c-filters-8 pattern)                                 */
/* -------------------------------------------------------------------------- */

const asArray = (value: unknown): string[] =>
  Array.isArray(value) ? (value as string[]) : [];

function PickedLabels({ options, empty }: { options: FilterOption[]; empty: string }) {
  if (options.length === 0) return <>{empty}</>;
  return (
    <span className="inline-flex items-center gap-1">
      <span>{options[0].label}</span>
      {options.length > 1 ? (
        <span className="tabular-nums text-muted-foreground">+{options.length - 1}</span>
      ) : null}
    </span>
  );
}

function makeToggleEditor(
  options: { value: string; label: string }[],
  groupClassName?: string,
) {
  function ToggleEditor({
    value,
    onValueChange,
    commit,
    field,
  }: FilterEditorProps<string[]>) {
    const current = asArray(value);

    return (
      <div className="p-1">
        <ToggleGroup
          multiple
          variant="outline"
          spacing={0}
          aria-label={field.label}
          value={current}
          className={groupClassName}
          onValueChange={(next) => {
            onValueChange(next);
            commit(next, { close: false });
          }}
        >
          {options.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value} size="sm">
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    );
  }

  return ToggleEditor;
}

const TIME_SIGNATURE_OPTIONS = TIME_SIGNATURES.map((signature) => ({
  value: signature,
  label: signature,
}));

const KEY_OPTIONS = KEY_CENTERS.map((center) => ({
  value: center,
  label: center,
}));

const TimeSignatureToggles = makeToggleEditor(TIME_SIGNATURE_OPTIONS);
const KeyToggles = makeToggleEditor(KEY_OPTIONS, "max-w-72 flex-wrap");

/* -------------------------------------------------------------------------- */
/* Schema                                                                     */
/* -------------------------------------------------------------------------- */

const fields: FilterField[] = [
  {
    id: "targetBpm",
    label: "Tempo",
    type: "range",
    defaultOperator: "between",
    editor: TargetBpmSlider,
    renderValue: targetBpmDisplay.renderValue,
    valueText: targetBpmDisplay.valueText,
    icon: <GaugeIcon className="size-3.5" />,
  },
  {
    id: "timeSignature",
    label: "Time signature",
    type: "multiselect",
    options: TIME_SIGNATURE_OPTIONS,
    editor: TimeSignatureToggles as never,
    renderValue: ({ options }) => <PickedLabels options={options} empty="any meter" />,
    icon: <HashIcon className="size-3.5" />,
  },
  {
    id: "key",
    label: "Key",
    type: "multiselect",
    options: KEY_OPTIONS,
    editor: KeyToggles as never,
    renderValue: ({ options }) => <PickedLabels options={options} empty="any key" />,
    icon: <Music2Icon className="size-3.5" />,
  },
];

export function Filters() {
  const [query, setQuery] = useState<FilterQuery>(() => createFilterQuery([]));

  const handleQueryChange = useCallback((next: FilterQuery) => {
    setQuery(next);
  }, []);

  return (
    <FilterBar
      fields={fields}
      query={query}
      onQueryChange={handleQueryChange}
      size="sm"
      showClear
      className="justify-center"
    />
  );
}
