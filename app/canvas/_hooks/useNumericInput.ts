import { useState, useCallback, useEffect } from "react";

interface UseNumericInputParams {
  /** The current numeric value */
  value: number;
  /** Callback when value changes (called on blur with validated value) */
  onChange: (value: number) => void;
  /** Minimum allowed value (inclusive) */
  min?: number;
  /** Maximum allowed value (inclusive) */
  max?: number;
  /** Default value to use when input is empty or invalid */
  defaultValue?: number;
}

interface UseNumericInputReturn {
  /** The current display value (string for input field) */
  displayValue: string;
  /** Handler for input change events */
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Handler for input blur events - validates and clamps the value */
  handleBlur: () => void;
}

/**
 * Hook for managing numeric input with validation and clamping
 *
 * This hook provides safe numeric input handling for property panel inputs.
 * It allows temporary invalid values during typing (for better UX) but validates
 * and clamps values when the input loses focus (onBlur).
 *
 * @example
 * ```tsx
 * const { displayValue, handleChange, handleBlur } = useNumericInput({
 *   value: object.fontSize,
 *   onChange: (value) => onUpdate({ fontSize: value }),
 *   min: 8,
 *   max: 500,
 *   defaultValue: 16
 * });
 *
 * <Input
 *   type="number"
 *   value={displayValue}
 *   onChange={handleChange}
 *   onBlur={handleBlur}
 * />
 * ```
 *
 * **Features:**
 * - Safe parseFloat handling (prevents NaN)
 * - Clamps values to min/max range on blur
 * - Allows temporary invalid values during typing
 * - Handles edge cases: empty string, scientific notation, negative numbers
 * - Preserves decimal precision
 *
 * **Edge Cases Handled:**
 * - Empty string → uses defaultValue or min
 * - NaN from parseFloat → uses defaultValue or min
 * - Values below min → clamped to min
 * - Values above max → clamped to max
 * - Scientific notation (1e10) → parsed and clamped
 * - Negative numbers when min is positive → clamped to min
 *
 * @param params - Configuration object
 * @returns Object with displayValue, handleChange, and handleBlur
 */
export function useNumericInput({
  value,
  onChange,
  min,
  max,
  defaultValue,
}: UseNumericInputParams): UseNumericInputReturn {
  // Track the display value separately from the prop value
  // This allows temporary invalid values during typing
  const [displayValue, setDisplayValue] = useState<string>(String(value));

  // Sync display value when prop value changes (e.g., from Firestore sync)
  useEffect(() => {
    setDisplayValue(String(value));
  }, [value]);

  /**
   * Handle input change - allow any value during typing
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDisplayValue(e.target.value);
    },
    []
  );

  /**
   * Clamp a number to the specified min/max range
   */
  const clampValue = useCallback(
    (num: number): number => {
      let clamped = num;
      if (min !== undefined && clamped < min) {
        clamped = min;
      }
      if (max !== undefined && clamped > max) {
        clamped = max;
      }
      return clamped;
    },
    [min, max]
  );

  /**
   * Parse and validate the display value
   * Returns a valid number or the default/min value if invalid
   */
  const parseAndValidate = useCallback(
    (input: string): number => {
      // Handle empty string
      if (input.trim() === "") {
        return defaultValue ?? min ?? 0;
      }

      // Parse the value
      const parsed = parseFloat(input);

      // Handle NaN (invalid input)
      if (isNaN(parsed)) {
        return defaultValue ?? min ?? 0;
      }

      // Handle Infinity
      if (!isFinite(parsed)) {
        return defaultValue ?? min ?? 0;
      }

      // Clamp to min/max range
      return clampValue(parsed);
    },
    [defaultValue, min, clampValue]
  );

  /**
   * Handle blur - validate and clamp the value, then notify parent
   */
  const handleBlur = useCallback(() => {
    const validatedValue = parseAndValidate(displayValue);

    // Update display to show the validated value
    setDisplayValue(String(validatedValue));

    // Only call onChange if the value actually changed
    if (validatedValue !== value) {
      onChange(validatedValue);
    }
  }, [displayValue, value, onChange, parseAndValidate]);

  return {
    displayValue,
    handleChange,
    handleBlur,
  };
}
