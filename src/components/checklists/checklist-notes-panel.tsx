import { resolveBackgroundStyle } from "@/lib/background-style";

interface NotesModule {
  id: string;
  title: string | null;
  bgColor: string | null;
  textColor: string | null;
  borderColor: string | null;
  body: string | null;
}

/** Read-only display of a checklist's notes modules -- editing happens in the designer. */
export function ChecklistNotesPanel({ notesModules }: { notesModules: NotesModule[] }) {
  if (notesModules.length === 0) {
    return <p className="text-sm text-neutral-500">No rules yet — add a notes module in the editor.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {notesModules.map((module_) => (
        <div
          key={module_.id}
          style={{
            ...resolveBackgroundStyle(module_.bgColor, "#241b35"),
            borderColor: module_.borderColor ?? "#4c1d95",
            color: module_.textColor ?? "#ede9fe",
          }}
          className="rounded-xl border-2 p-4"
        >
          {module_.title && <h3 className="mb-2 font-black">{module_.title}</h3>}
          {module_.body && <p className="whitespace-pre-wrap text-sm leading-relaxed">{module_.body}</p>}
        </div>
      ))}
    </div>
  );
}
