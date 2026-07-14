import { resolveBackgroundStyle } from "@/lib/background-style";

interface NotesModule {
  id: string;
  title: string | null;
  span: number;
  bgColor: string | null;
  textColor: string | null;
  borderColor: string | null;
  titleBgColor: string | null;
  body: string | null;
}

function getColSpanClass(span: number): string {
  switch (span) {
    case 1:
      return "col-span-4 md:col-span-1";
    case 2:
      return "col-span-4 md:col-span-2";
    case 3:
      return "col-span-4 md:col-span-3";
    default:
      return "col-span-4";
  }
}

/** Read-only display of a checklist's notes modules -- editing happens in the designer. */
export function ChecklistNotesPanel({ notesModules }: { notesModules: NotesModule[] }) {
  if (notesModules.length === 0) {
    return <p className="text-sm text-neutral-500">No rules yet — add a notes module in the editor.</p>;
  }

  return (
    <div className="grid auto-rows-min grid-cols-4 gap-4">
      {notesModules.map((module_) => (
        <div
          key={module_.id}
          style={{
            ...resolveBackgroundStyle(module_.bgColor, "#241b35"),
            borderColor: module_.borderColor ?? "#4c1d95",
            color: module_.textColor ?? "#ede9fe",
          }}
          className={`flex flex-col overflow-hidden rounded-xl border-2 ${getColSpanClass(module_.span)}`}
        >
          {module_.title && (
            <h3
              style={resolveBackgroundStyle(module_.titleBgColor, "#1e1830")}
              className="border-b border-white/10 p-3 font-black"
            >
              {module_.title}
            </h3>
          )}
          {module_.body && <p className="whitespace-pre-wrap p-4 text-sm leading-relaxed">{module_.body}</p>}
        </div>
      ))}
    </div>
  );
}
