/**
 * Barrel export for DGA-aligned UI primitives.
 *
 * Components here are presentational only — no business logic, no data
 * fetching. Each component carries TSDoc with at least one `@example`.
 *
 * Import sites should prefer the barrel:
 *   import { Button, Card, Field, Input } from "@/components/dga";
 */
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from "./button";
export { Card, CardHeader, CardBody, CardFooter } from "./card";
export { Field, type FieldProps } from "./field";
export { Input, type InputProps } from "./input";
export { Textarea } from "./textarea";
export { Select } from "./select";
export { Badge, type BadgeProps, type BadgeTone } from "./badge";
