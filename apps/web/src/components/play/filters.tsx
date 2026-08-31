import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { GaugeIcon, HashIcon, ListFilterPlusIcon, Music2Icon } from "lucide-react";

import {
  FilterChip,
  Filters as FilterBar,
  FiltersBuilder,
  createFilterQuery,
  filterReadOnlyProps,
  flattenFilterRules,
  isFilterLocked,
  useFilterActions,
  useFilterFocusStore,
  useFilterState,
  type FilterEditorProps,
  type FilterField,
  type FilterOption,
  type FilterQuery,
  type FilterValueDisplayContext,
} from "@/components/reui/filters/filters";
import { filterControlSizes } from "@/components/reui/filters/filters-context";
import { getFilterField } from "@/components/reui/filters/filters-lib";
import {
  getFilterOperator,
  operatorTakesValue,
} from "@/components/reui/filters/filters-operators";
import { findFilterRule } from "@/components/reui/filters/filters-query";
import { KEY_CENTERS, TIME_SIGNATURES } from "@/lib/play-types";
import { Button } from "@loopinator/ui/components/button";
import { HoverButton } from "@loopinator/ui/components/hover-button";
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

type FiltersProps = {
  children: ReactNode;
};

type FiltersTriggerProps = {
  /** Replaces the Add filter control. */
  trigger?: ReactNode;
};

function DefaultAddFilterTrigger({
  simpleView = <ListFilterPlusIcon />,
  expandedView = "Add Filter",
  ...props
}: Omit<ComponentProps<typeof HoverButton>, "simpleView" | "expandedView"> & {
  simpleView?: ComponentProps<typeof HoverButton>["simpleView"];
  expandedView?: ComponentProps<typeof HoverButton>["expandedView"];
}) {
  return (
    <HoverButton
      variant="outline"
      size="sm"
      aria-label="Add filter"
      {...props}
      simpleView={simpleView}
      expandedView={expandedView}
    />
  );
}

export function Filters({ children }: FiltersProps) {
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
    >
      {children}
    </FilterBar>
  );
}

export function FiltersTrigger({ trigger }: FiltersTriggerProps) {
  const actions = useFilterActions();
  const sizes = filterControlSizes(actions);
  const { ruleCount, announcement, announcementSeq } = useFilterState();

  return (
    <div className="flex items-center justify-center gap-1.5">
      <FiltersBuilder trigger={trigger ?? <DefaultAddFilterTrigger />} />
      {ruleCount > 0 ? (
        <Button
          variant="outline"
          size={sizes.button}
          disabled={actions.disabled}
          {...filterReadOnlyProps(actions)}
          onClick={() => actions.clearQuery()}
        >
          {actions.labels.clear}
        </Button>
      ) : null}
      <div aria-live="polite" role="status" className="sr-only">
        <span key={announcementSeq}>{announcement}</span>
      </div>
    </div>
  );
}

export function FiltersChips() {
  const actions = useFilterActions();
  const { query } = useFilterState();
  const focusStore = useFilterFocusStore();
  const rootRef = useRef<HTMLDivElement>(null);
  const locked = isFilterLocked(actions);
  const rules = useMemo(() => flattenFilterRules(query), [query]);

  if (rules.length === 0) return null;

  const chips = () =>
    Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>('[data-slot="filter-chip"]') ?? [],
    );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-slot="filter-chip"]',
    );
    if (!target) return;
    if (event.target !== target) return;

    const all = chips();
    const current = all.indexOf(target);
    if (current === -1) return;

    const rtl = getComputedStyle(target).direction === "rtl";
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const backward = rtl ? "ArrowRight" : "ArrowLeft";

    const focusAt = (index: number) => {
      const next = all[Math.max(0, Math.min(index, all.length - 1))];
      if (!next) return;
      event.preventDefault();
      next.focus();
    };

    const ruleId = target.dataset.ruleId;
    if (!ruleId) return;

    if (event.altKey && (event.key === forward || event.key === backward)) {
      if (locked) return;
      event.preventDefault();
      actions.moveNode(ruleId, event.key === forward ? 1 : -1);
      return;
    }
    if (event.key === forward) return focusAt(current + 1);
    if (event.key === backward) return focusAt(current - 1);
    if (event.key === "Home") return focusAt(0);
    if (event.key === "End") return focusAt(all.length - 1);

    if (event.key === "Backspace" || event.key === "Delete") {
      if (locked) return;
      event.preventDefault();
      actions.removeNode(ruleId);
      requestAnimationFrame(() => {
        const remaining = chips();
        remaining[Math.min(current, remaining.length - 1)]?.focus();
      });
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      if (locked) return;
      event.preventDefault();
      const rule = findFilterRule(actions.getQuery(), ruleId);
      if (!rule) return;
      const field = getFilterField(actions.index, rule.path);
      if (!field) return;
      const operator = getFilterOperator(
        actions.resolveOperators(field),
        rule.operator,
      );
      const segment =
        rule.operator && operatorTakesValue(operator) ? "value" : "operator";
      focusStore.set({ id: ruleId, segment, autoOpen: true });
    }
  };

  return (
    <div
      ref={rootRef}
      data-slot="filters"
      role="toolbar"
      aria-label={actions.labels.filtersLabel}
      aria-orientation="horizontal"
      {...(actions.readOnly
        ? { "aria-description": actions.labels.readOnly }
        : null)}
      className="flex w-full flex-wrap items-center gap-1.5"
      onKeyDown={onKeyDown}
    >
      {rules.map((rule, index) => (
        <FilterChip key={rule.id} rule={rule} index={index} />
      ))}
    </div>
  );
}
