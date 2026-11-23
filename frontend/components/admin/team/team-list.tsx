"use client";

import { useState, useTransition } from "react";
import { updateTeamMember } from "@/app/admin/(panel)/team/actions";
import { Badge, Button } from "@/components/ui";
import { roleLabel, SEO_EDITOR_ROLE } from "@/lib/admin-role";
import { cn } from "@/lib/utils";
import { WidgetEmpty, cardClasses } from "../dashboard/widget";
import { ForbiddenNotice } from "../forbidden";
import { ActionsMenu } from "../ui/actions-menu";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { DetailField } from "../ui/detail-list";
import { useToast } from "../ui/toast";
import { TeamMemberSheet, type TeamForm } from "./team-member-sheet";

interface TeamRow {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLogin: string;
  created: string;
}

const COLUMNS = ["Name", "Email", "Role", "Status", "Last login", "Created"];

function TeamStatus({ active }: { active: boolean }) {
  return <Badge variant={active ? "green" : "neutral"}>{active ? "Active" : "Deactivated"}</Badge>;
}

export function TeamList({ rows }: { rows: TeamRow[] }) {
  const toast = useToast();
  const [form, setForm] = useState<TeamForm | null>(null);
  const [confirm, setConfirm] = useState<TeamRow | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [pending, startTransition] = useTransition();

  function changeStatus() {
    if (!confirm || pending) return;
    const active = !confirm.isActive;
    startTransition(async () => {
      const result = await updateTeamMember(confirm.id, "is_active", active);
      setConfirm(null);
      if (result.ok) {
        toast(active ? "Account reactivated." : "Account deactivated.");
      } else if (result.status === 403) {
        setForbidden(true);
      } else {
        toast(result.errors.form ?? "Couldn't update the account. Please try again.", "error");
      }
    });
  }

  function rowActions(row: TeamRow) {
    return (
      <ActionsMenu
        label={`More actions for ${row.name}`}
        items={[
          { label: "Edit name", onSelect: () => setForm({ kind: "edit", member: row }) },
          { label: "Reset password", onSelect: () => setForm({ kind: "reset", member: row }) },
          {
            label: row.isActive ? "Deactivate" : "Reactivate",
            tone: row.isActive ? "danger" : "default",
            separated: true,
            onSelect: () => setConfirm(row),
          },
        ]}
      />
    );
  }

  if (forbidden) return <ForbiddenNotice />;

  const deactivating = confirm?.isActive === true;

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
      <section className={cn(cardClasses, "p-0 sm:p-0")} aria-label="Team accounts">
        <div className="flex justify-end border-b border-[var(--border)] p-4 sm:p-5">
          <Button type="button" onClick={() => setForm({ kind: "add" })}>Add editor</Button>
        </div>
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          {!rows.some((row) => row.role === SEO_EDITOR_ROLE) && (
            <WidgetEmpty title="No editors yet." text="Add an editor to give someone access to manage the blog." />
          )}
          {rows.length > 0 && (
            <>
              <ul className="flex flex-col gap-3 lg:hidden">
                {rows.map((row) => (
                  <li key={row.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-[var(--text)]">{row.name}</p>
                        <p className="mt-1.5 break-words text-sm text-[var(--text)]">{row.email}</p>
                      </div>
                      {rowActions(row)}
                    </div>
                    <dl className="mt-2 divide-y divide-[var(--border)]">
                      <DetailField label="Role">{roleLabel(row.role)}</DetailField>
                      <DetailField label="Status"><TeamStatus active={row.isActive} /></DetailField>
                      <DetailField label="Last login">{row.lastLogin}</DetailField>
                      <DetailField label="Created">{row.created}</DetailField>
                    </dl>
                  </li>
                ))}
              </ul>
              <div className="relative -mx-2 hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
                      {COLUMNS.map((column) => (
                        <th key={column} scope="col" className="px-2 pb-2.5 font-medium">{column}</th>
                      ))}
                      <th scope="col" className="px-2 pb-2.5 text-right font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {rows.map((row) => (
                      <tr key={row.id} className="transition-colors duration-150 hover:bg-[var(--bg)] motion-reduce:transition-none">
                        <th scope="row" className="px-2 py-3 font-medium text-[var(--text)]">{row.name}</th>
                        <td className="max-w-[16rem] break-words px-2 py-3 text-[var(--text)]">{row.email}</td>
                        <td className="px-2 py-3">{roleLabel(row.role)}</td>
                        <td className="px-2 py-3"><TeamStatus active={row.isActive} /></td>
                        <td className="whitespace-nowrap px-2 py-3 text-[var(--text-muted)] tabular-nums">{row.lastLogin}</td>
                        <td className="whitespace-nowrap px-2 py-3 text-[var(--text-muted)] tabular-nums">{row.created}</td>
                        <td className="px-2 py-2">
                          <div className="flex justify-end">{rowActions(row)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>

      {form && (
        <TeamMemberSheet form={form} onClose={() => setForm(null)} onForbidden={() => setForbidden(true)} />
      )}
      <ConfirmDialog
        open={confirm !== null}
        title={deactivating ? "Deactivate this account?" : "Reactivate this account?"}
        description={deactivating
          ? `${confirm?.name} will be logged out immediately and cannot sign in until reactivated.`
          : `${confirm?.name} will be able to sign in again.`}
        confirmLabel={deactivating ? "Deactivate" : "Reactivate"}
        cancelLabel={deactivating ? "Keep active" : "Keep deactivated"}
        tone={deactivating ? "danger" : "default"}
        pending={pending}
        onConfirm={changeStatus}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
