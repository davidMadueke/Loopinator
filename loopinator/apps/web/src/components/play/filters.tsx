import {
  useCallback,
  useEffect,
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
  type FilterOperator,
  type FilterOption,
  type FilterQuery,
  type FilterValueDisplayContext,
} from "@/components/reui/filters/filters";
import { filterControlSizes } from "@/components/reui/filters/filters-context";
import { getFilterField } from "@/components/reui/filters/filters-lib";
import {
  DEFAULT_FILTER_OPERATORS,
  getFilterOperator,
  operatorTakesValue,
} from "@/components/reui/filters/filters-operators";
import { findFilterRule } from "@/components/reui/filters/filters-query";
import { KEY_CENTERS, TIME_SIGNATURES } from "@/lib/play-types";
import { Button } from "@loopinator/ui/components/button";
import { HoverButton } from "@loopinator/ui/components/hover-button";
import { Input } from "@loopinator/ui/components/input";
import { Slider } from "@loopinator/ui/components/slider";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@loopinator/ui/components/toggle-group";
import { cn } from "@loopinator/ui/lib/utils";

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

const BOUND_INPUT_CLASS =
  "h-7 w-12 shrink-0 px-1 text-center text-xs tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

function BoundInput({
  value,
  min,
  max,
  step,
  ariaLabel,
  onCommit,
  onEnter,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  ariaLabel: string;
  onCommit: (next: number) => void;
  onEnter: (next: number) => void;
}) {
  const [text, setText] = useState(() => String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const snap = (raw: string) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return value;
    const snapped = Math.round((parsed - min) / step) * step + min;
    return Math.min(max, Math.max(min, snapped));
  };

  const apply = (raw: string) => {
    const next = snap(raw);
    setText(String(next));
    return next;
  };

  return (
    <Input
      type="number"
      min={min}
      max={max}
      step={step}
      aria-label={ariaLabel}
      value={text}
      className={BOUND_INPUT_CLASS}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => {
        const next = apply(text);
        if (next !== value) onCommit(next);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        onEnter(apply(text));
      }}
    />
  );
}

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

    const from = dual ? (current as number[])[0] : (current as number);
    const to = dual ? (current as number[])[1] : (current as number);

    const write = (next: number | number[], shouldCommit: boolean) => {
      onValueChange(next);
      if (shouldCommit) commit(next);
    };

    const setFrom = (next: number, shouldCommit: boolean) => {
      if (!dual) {
        write(next, shouldCommit);
        return;
      }
      write(next <= to ? [next, to] : [to, next], shouldCommit);
    };

    const setTo = (next: number, shouldCommit: boolean) => {
      write(next >= from ? [from, next] : [next, from], shouldCommit);
    };

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
          <span className="text-xs text-muted-foreground">BPM</span>
        </div>

        <div className="flex items-center gap-2">
          <BoundInput
            value={from}
            min={min}
            max={max}
            step={step}
            ariaLabel={labels.rangeFrom(field.label)}
            onCommit={(next) => setFrom(next, false)}
            onEnter={(next) => setFrom(next, true)}
          />
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
          {dual ? (
            <BoundInput
              value={to}
              min={min}
              max={max}
              step={step}
              ariaLabel={labels.rangeTo(field.label)}
              onCommit={(next) => setTo(next, false)}
              onEnter={(next) => setTo(next, true)}
            />
          ) : (
            <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {format(max)}
            </span>
          )}
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
  const { min, max } = scale;

  return {
    renderValue: (context: FilterValueDisplayContext) => {
      const band = readBand(scale, context);
      if (!band) return empty;

      return (
        <span className="inline-flex items-center gap-1.5">
          <MiniTrack min={min} max={max} from={band.from} to={band.to} />
          <span className="tabular-nums">{band.text}</span>
            <span className="text-muted-foreground">BPM</span>
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
  {
    groupClassName,
    itemClassName,
  }: { groupClassName?: string; itemClassName?: string } = {},
) {
  function ToggleEditor({
    value,
    onValueChange,
    commit,
    field,
    operator,
  }: FilterEditorProps) {
    const many = operator.arity === "many";
    const current = many
      ? asArray(value)
      : typeof value === "string" && value
        ? [value]
        : asArray(value).slice(0, 1);

    const write = (next: string[]) => {
      if (many) {
        onValueChange(next);
        commit(next, { close: false });
        return;
      }
      const picked = next.length <= 1 ? next[0] : next[next.length - 1];
      onValueChange(picked);
      commit(picked, { close: false });
    };

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
            write(Array.isArray(next) ? next : next ? [next] : []);
          }}
        >
          {options.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              size="sm"
              className={itemClassName}
            >
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

const TOGGLE_ITEM_SELECTED_CLASS =
  "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground";

const TimeSignatureToggles = makeToggleEditor(TIME_SIGNATURE_OPTIONS, {
  itemClassName: TOGGLE_ITEM_SELECTED_CLASS,
});
const KeyToggles = makeToggleEditor(KEY_OPTIONS, {
  groupClassName: "max-w-72 flex-wrap",
  itemClassName: TOGGLE_ITEM_SELECTED_CLASS,
});

/* -------------------------------------------------------------------------- */
/* Schema                                                                     */
/* -------------------------------------------------------------------------- */

export const CHOICE_FILTER_OPERATORS = [
  "is",
  "is_not",
  "is_any_of",
  "is_none_of",
] as const;

export type ChoiceFilterOperator = (typeof CHOICE_FILTER_OPERATORS)[number];

function resolveChoiceOperators(
  ids: readonly ChoiceFilterOperator[] | undefined,
): FilterOperator[] {
  const picked = ids && ids.length > 0 ? ids : CHOICE_FILTER_OPERATORS;
  return picked.map((id) => {
    const fromCatalog = DEFAULT_FILTER_OPERATORS.select.find((operator) => operator.value === id);
    if (!fromCatalog) return { value: id, label: id };
    return id === "is_any_of" ? { ...fromCatalog, label: "is one of" } : fromCatalog;
  });
}

function defaultChoiceOperator(operators: FilterOperator[]): string {
  return operators.some((operator) => operator.value === "is_any_of")
    ? "is_any_of"
    : operators[0].value;
}

function makeFields(
  keyOperators: FilterOperator[],
  timeSignatureOperators: FilterOperator[],
): FilterField[] {
  return [
    {
      id: "targetBpm",
      label: "Tempo",
      type: "range",
      defaultOperator: "between",
      editor: TargetBpmSlider,
      renderValue: targetBpmDisplay.renderValue,
      valueText: targetBpmDisplay.valueText,
      icon: <GaugeIcon className="size-3.5" />,
      chipLabelClassName: "bg-primary/20",
    },
    {
      id: "timeSignature",
      label: "Time signature",
      type: "multiselect",
      options: TIME_SIGNATURE_OPTIONS,
      operators: timeSignatureOperators,
      defaultOperator: defaultChoiceOperator(timeSignatureOperators),
      editor: TimeSignatureToggles as never,
      renderValue: ({ options }) => (
        <span className={options.length > 0 ? "text-primary" : undefined}>
          <PickedLabels options={options} empty="any meter" />
        </span>
      ),
      icon: <HashIcon className="size-3.5" />,
      chipLabelClassName: "bg-primary/40",
    },
    {
      id: "key",
      label: "Key",
      type: "multiselect",
      options: KEY_OPTIONS,
      operators: keyOperators,
      defaultOperator: defaultChoiceOperator(keyOperators),
      editor: KeyToggles as never,
      renderValue: ({ options }) => (
        <span className={options.length > 0 ? "text-primary" : undefined}>
          <PickedLabels options={options} empty="any key" />
        </span>
      ),
      icon: <Music2Icon className="size-3.5" />,
      chipLabelClassName: "bg-primary/60",
    },
  ];
}

type FiltersProps = {
  children: ReactNode;
  /** Operators offered on the Key chip. Defaults to is / is not / is one of / is none of. */
  keyOperators?: readonly ChoiceFilterOperator[];
  /** Operators offered on the Time signature chip. Same default as Key. */
  timeSignatureOperators?: readonly ChoiceFilterOperator[];
};

type FiltersTriggerProps = {
  /** Replaces the Add filter control. */
  trigger?: ReactNode;
};

function DefaultAddFilterTrigger({
  simpleView = <ListFilterPlusIcon />,
  expandedView = "Add Filter",
  compact = false,
  className,
  ...props
}: Omit<ComponentProps<typeof HoverButton>, "simpleView" | "expandedView"> & {
  simpleView?: ComponentProps<typeof HoverButton>["simpleView"];
  expandedView?: ComponentProps<typeof HoverButton>["expandedView"];
  /** Filled icon-only idle once any chip is on the bar. */
  compact?: boolean;
}) {
  return (
    <HoverButton
      variant={compact ? "default" : "outline"}
      size="sm"
      aria-label="Add filter"
      {...props}
      className={cn(
        "aria-expanded:bg-primary aria-expanded:text-primary-foreground"/* , "aria-expanded:hover:bg-transparent aria-expanded:hover:text-primary-on-muted aria-expanded:[&_svg]:text-primary-on-muted" */,  "dark:aria-expanded:hover:bg-transparent",
        className,
      )}
      simpleView={simpleView}
      expandedView={expandedView}
    />
  );
}

export function Filters({
  children,
  keyOperators,
  timeSignatureOperators,
}: FiltersProps) {
  const [query, setQuery] = useState<FilterQuery>(() => createFilterQuery([]));
  const fields = useMemo(
    () =>
      makeFields(
        resolveChoiceOperators(keyOperators),
        resolveChoiceOperators(timeSignatureOperators),
      ),
    [keyOperators, timeSignatureOperators],
  );

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
      <FiltersBuilder trigger={trigger ?? <DefaultAddFilterTrigger compact={ruleCount > 0} />} />
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
