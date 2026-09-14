import { useCallback, useMemo } from "react";
import { ButtonGroup, ButtonGroupText } from "@loopinator/ui/components/button-group";
import { cn } from "@loopinator/ui/lib/utils";

import { AutoDetectedIcon } from "@/components/play/auto-detected-icon";

import {
  createFilterQuery,
  createFilterRule,
  Filters as FilterBar,
  FilterValuePopover,
  flattenFilterRules,
  isFilterLocked,
  useFilterActions,
  useFilterChipFocused,
  useFilterFocusEmpty,
  useFilterFocusStore,
  useFilterRuleDisplay,
  useFilterState,
  type FilterChangeDetails,
  type FilterField,
  type FilterQuery,
  type FilterRule,
} from "@/components/reui/filters/filters";
import { getFilterField } from "@/components/reui/filters/filters-lib";
import { getFilterOperator, operatorTakesValue } from "@/components/reui/filters/filters-operators";

const CHIP_SEGMENT_CLASS =
  "bg-background px-1.5 text-xs whitespace-nowrap dark:bg-input/30";

type SlotChoiceChipProps = {
  slotId: string;
  fieldId: "timeSignature" | "key";
  fields: FilterField[];
  value: unknown;
  isComplete: (value: unknown) => boolean;
  onCommit: (value: unknown) => void;
  autoDetected?: boolean;
};

export function SlotChoiceChip({
  slotId,
  fieldId,
  fields,
  value,
  isComplete,
  onCommit,
  autoDetected = false,
}: SlotChoiceChipProps) {
  const ruleId = `${slotId}-${fieldId}`;
  const query = useMemo(
    () =>
      createFilterQuery([
        createFilterRule({
          id: ruleId,
          path: [fieldId],
          operator: "is",
          value,
        }),
      ]),
    [fieldId, ruleId, value],
  );

  const handleBeforeChange = useCallback(
    (next: FilterQuery, details: FilterChangeDetails) => {
      if (details.reason !== "update") return false;
      const rule = flattenFilterRules(next)[0];
      return Boolean(rule && rule.operator === "is" && isComplete(rule.value));
    },
    [isComplete],
  );

  const handleQueryChange = useCallback(
    (next: FilterQuery, details: FilterChangeDetails) => {
      if (details.reason !== "update") return;
      const rule = flattenFilterRules(next)[0];
      if (!rule || rule.operator !== "is" || !isComplete(rule.value)) return;
      onCommit(rule.value);
    },
    [isComplete, onCommit],
  );

  return (
    <FilterBar
      fields={fields}
      query={query}
      size="sm"
      onBeforeQueryChange={handleBeforeChange}
      onQueryChange={handleQueryChange}
    >
      <LockedChoiceChip autoDetected={autoDetected} />
    </FilterBar>
  );
}

function LockedChoiceChip({ autoDetected }: { autoDetected: boolean }) {
  const { query } = useFilterState();
  const rule = flattenFilterRules(query)[0];
  if (!rule) return null;
  return <LockedChoiceChipView autoDetected={autoDetected} rule={rule} />;
}

function LockedChoiceChipView({
  autoDetected,
  rule,
}: {
  autoDetected: boolean;
  rule: FilterRule;
}) {
  const actions = useFilterActions();
  const focusStore = useFilterFocusStore();
  const focused = useFilterChipFocused(rule.id);
  const noFocus = useFilterFocusEmpty();
  const locked = isFilterLocked(actions);
  const isTabStop = focused || noFocus;

  const field = getFilterField(actions.index, rule.path);
  const operators = field ? actions.resolveOperators(field) : [];
  const operator = getFilterOperator(operators, rule.operator);
  const {
    pathText,
    pathLabel,
    pathCollapsed,
    operatorLabel,
    valueLabel,
    valueText,
    valueFullText,
    valueEmpty,
  } = useFilterRuleDisplay(rule, field, operator);

  if (!field) return null;

  const hasValue = Boolean(rule.operator) && operatorTakesValue(operator);
  const valueName = valueEmpty && !field.valueText ? actions.labels.noValue : valueText;

  return (
    <ButtonGroup
      data-slot="filter-chip"
      role="group"
      aria-label={actions.labels.filterLabel(
        `${pathText} ${operatorLabel}${hasValue ? ` ${valueName}` : ""}`.trim(),
      )}
      data-focused={focused || undefined}
      data-rule-id={rule.id}
      data-index={0}
      tabIndex={isTabStop ? 0 : -1}
      className="h-6 w-max shrink-0"
      onFocusCapture={() => {
        if (!focused) focusStore.set({ id: rule.id, segment: null, autoOpen: false });
      }}
    >
      <ButtonGroupText
        title={pathCollapsed ? undefined : pathText}
        className={cn(
          "cursor-default gap-1 [&_svg]:size-3",
          CHIP_SEGMENT_CLASS,
          field.chipLabelClassName,
        )}
      >
        {field.icon}
        <span className="flex items-center whitespace-nowrap">{pathLabel}</span>
      </ButtonGroupText>

      <ButtonGroupText className={cn("cursor-default text-muted-foreground", CHIP_SEGMENT_CLASS)}>
        {operatorLabel}
      </ButtonGroupText>

      {hasValue ? (
        <FilterValuePopover
          rule={rule}
          field={field}
          operator={operator}
          trigger={
            <ButtonGroupText
              render={<button type="button" />}
              aria-label={
                autoDetected
                  ? `${locked ? valueFullText : valueText}, Auto-detected Key`
                  : locked
                    ? valueFullText
                    : valueText
              }
              title={valueFullText === valueText ? undefined : valueFullText}
              className={cn(
                "hover:bg-accent cursor-default",
                CHIP_SEGMENT_CLASS,
                autoDetected && "gap-1",
                valueEmpty && "text-muted-foreground",
              )}
              onPointerDown={() =>
                focusStore.set({ id: rule.id, segment: "value", autoOpen: false })
              }
            >
              {valueLabel}
              {autoDetected ? <AutoDetectedIcon embedded kind="key" /> : null}
            </ButtonGroupText>
          }
        />
      ) : null}
    </ButtonGroup>
  );
}
