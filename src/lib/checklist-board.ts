import { computeChecklistProgress, flattenProgressItems } from "@/lib/checklist-progress";
import { asStages, type StageDef } from "@/lib/stages";

type ItemProgress = { isComplete: boolean; completedAt: Date | null; currentCount: number };
type BoardItem = { id: string; kind: "CHECKBOX" | "COUNTER" | "STAGE" | "TITLE"; targetCount: number | null };
type BoardTab = { title: string; sections: { stages: unknown; items: BoardItem[] }[] };

type SectionOf<T extends BoardTab> = T["sections"][number];
type ItemOf<T extends BoardTab> = SectionOf<T>["items"][number];

type BuiltItem<T extends BoardTab> = ItemOf<T> & ItemProgress;
type BuiltSection<T extends BoardTab> = Omit<SectionOf<T>, "stages" | "items"> & {
  stages: StageDef[];
  items: BuiltItem<T>[];
};
type BuiltTab<T extends BoardTab> = Omit<T, "sections"> & { sections: BuiltSection<T>[] };

const NOT_STARTED: ItemProgress = { isComplete: false, completedAt: null, currentCount: 0 };

/**
 * Lays one player's progress over a checklist's tabs, in display order, with
 * everything the progress page renders from it: the tabs themselves, the box
 * view's flat item list, each tab's percentage, and the overall total.
 *
 * `progressFor` supplies an item's state -- live rows for a run being played,
 * or a reconstructed finished state for an archived one.
 */
export function buildBoard<T extends BoardTab>(
  tabs: T[],
  progressFor: (item: ItemOf<T>, stageCount: number) => ItemProgress | undefined,
) {
  const progressTabs: BuiltTab<T>[] = tabs.map((tab) => ({
    ...tab,
    // Indexing T["sections"] inside the function resolves to the constraint,
    // which would drop every field the caller's sections carry beyond it.
    sections: (tab.sections as SectionOf<T>[]).map((section): BuiltSection<T> => {
      const stages = asStages(section.stages);
      const items = (section.items as ItemOf<T>[]).map((item) => ({
        ...item,
        ...(progressFor(item, stages.length) ?? NOT_STARTED),
      }));
      return { ...section, stages, items };
    }),
  }));

  // Flattened in the same tab/module/item display order, each item carrying
  // its own module's stages -- so the box view can re-chunk into fixed-size
  // groups (e.g. 30, to mirror a Pokemon game's PC box) independent of
  // whatever module grouping the stats page relies on. TITLE items are
  // headings, not catchable targets, so they're excluded from box slots.
  const boxItems = progressTabs.flatMap((tab) =>
    tab.sections.flatMap((section) =>
      section.items.filter((item) => item.kind !== "TITLE").map((item) => ({ ...item, stages: section.stages })),
    ),
  );

  const unitsOf = (sections: BuiltSection<T>[]) =>
    computeChecklistProgress(
      flattenProgressItems(sections.map((s) => ({ stageCount: s.stages.length, items: s.items }))),
    );

  const tabProgress = progressTabs.map((tab) => ({ tab: tab.title, percent: unitsOf(tab.sections).percent }));
  const progress = unitsOf(progressTabs.flatMap((t) => t.sections));

  return { progressTabs, boxItems, tabProgress, progress };
}

/**
 * The state every item was in when a run finished. Submission requires every
 * item complete, so a submitted run's board is fully known without its rows --
 * which approval clears. A counter sits at its target and a stage item at its
 * module's last stage.
 */
export function finishedProgress(item: BoardItem, stageCount: number, finishedAt: Date): ItemProgress {
  const currentCount = item.kind === "COUNTER" ? (item.targetCount ?? 0) : item.kind === "STAGE" ? stageCount : 0;
  return { isComplete: true, completedAt: finishedAt, currentCount };
}

/**
 * The checklist as it stood when a run was submitted: items added to the
 * design afterwards were never part of that run, so they're left off rather
 * than shown as something it missed. Modules and tabs left empty go too.
 */
export function asOfSubmission<
  T extends { sections: { items: { createdAt: Date }[] }[] },
>(tabs: T[], submittedAt: Date): T[] {
  return tabs
    .map((tab) => ({
      ...tab,
      sections: tab.sections
        .map((section) => ({ ...section, items: section.items.filter((i) => i.createdAt <= submittedAt) }))
        .filter((section) => section.items.length > 0),
    }))
    .filter((tab) => tab.sections.length > 0);
}
