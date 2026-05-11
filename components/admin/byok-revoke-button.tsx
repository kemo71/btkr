"use client";

import { useActionState } from "react";
import {
  revokeByokKeyAction,
  type ActionResult,
} from "@/app/[locale]/admin/byok/actions";

/**
 * Revoke-key button. Submits a tiny form with the key id so the server
 * action receives FormData. Uses native `confirm` for the destructive
 * guard — replace with a `<Modal>` primitive once that lands.
 */
export function ByokRevokeButton({ id, label }: { id: string; label: string }) {
  const [, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    revokeByokKeyAction,
    null,
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm("Revoke this key?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-8 items-center rounded-md border border-danger-500/30 px-3 text-sm font-medium text-danger-600 transition-colors hover:bg-danger-500/10 disabled:opacity-50"
      >
        {isPending ? "…" : label}
      </button>
    </form>
  );
}
