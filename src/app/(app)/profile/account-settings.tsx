"use client";

import { useActionState } from "react";
import { updateProfile, updatePassword } from "@/server/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState = { error: null, success: false };

export function AccountSettings({ username, displayName }: { username: string; displayName: string }) {
  const [profileState, profileAction, profilePending] = useActionState(updateProfile, initialState);
  const [passwordState, passwordAction, passwordPending] = useActionState(updatePassword, initialState);

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <form
        action={profileAction}
        className="flex flex-1 flex-col gap-2 rounded-lg border border-violet-200 p-4 dark:border-violet-800"
      >
        <h3 className="text-sm font-bold text-violet-950 dark:text-violet-100">Profile</h3>
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Display name
          <Input name="displayName" defaultValue={displayName} required minLength={1} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Username
          <Input name="username" defaultValue={username} required minLength={1} />
        </label>
        <Button type="submit" size="sm" disabled={profilePending} className="self-start">
          {profilePending ? "Saving…" : "Save profile"}
        </Button>
        {profileState.error && <p className="text-sm text-red-600">{profileState.error}</p>}
        {profileState.success && <p className="text-sm text-emerald-600">Profile updated.</p>}
      </form>

      <form
        action={passwordAction}
        className="flex flex-1 flex-col gap-2 rounded-lg border border-violet-200 p-4 dark:border-violet-800"
      >
        <h3 className="text-sm font-bold text-violet-950 dark:text-violet-100">Password</h3>
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Current password
          <Input name="currentPassword" type="password" required autoComplete="current-password" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          New password
          <Input name="newPassword" type="password" required minLength={8} autoComplete="new-password" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Confirm new password
          <Input name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" />
        </label>
        <Button type="submit" size="sm" disabled={passwordPending} className="self-start">
          {passwordPending ? "Saving…" : "Save password"}
        </Button>
        {passwordState.error && <p className="text-sm text-red-600">{passwordState.error}</p>}
        {passwordState.success && <p className="text-sm text-emerald-600">Password updated.</p>}
      </form>
    </div>
  );
}
