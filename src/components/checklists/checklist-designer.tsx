"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createTab,
  updateTab,
  deleteTab,
  reorderTabs,
  createSection,
  updateSection,
  deleteSection,
  duplicateSection,
  reorderSections,
  createItem,
  updateItem,
  deleteItem,
  duplicateItem,
  moveItemToSection,
  updateChecklist,
  deleteChecklist,
  duplicateChecklist,
  moveChecklist,
  createColorPreset,
  deleteColorPreset,
} from "@/server/actions/checklists";
import { ImagePicker } from "@/components/checklists/image-picker";
import { GradientColorPicker } from "@/components/checklists/gradient-color-picker";
import { ChecklistSettingsMenu } from "@/components/checklists/checklist-settings-menu";
import { SliderWithInput } from "@/components/checklists/slider-with-input";
import { ColorField, type ColorPreset } from "@/components/checklists/color-field";
import { resolveBackgroundStyle, isGradient } from "@/lib/background-style";
import { FONT_OPTIONS, fontClassForKey } from "@/lib/fonts";
import { DEFAULT_TOKENS_PER_COMPLETION } from "@/lib/token-economy";
import { cn } from "@/lib/cn";

type ItemLayoutMode = "LIST" | "GRID";
type ImageFitMode = "CONTAIN" | "COVER";
type ItemKindMode = "CHECKBOX" | "COUNTER";

interface DesignerItem {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  url: string | null;
  order: number;
  bgColor: string | null;
  textColor: string | null;
  borderColor: string | null;
  textSize: number | null;
  fontFamily: string | null;
  pixelatedImage: boolean;
  imageFit: ImageFitMode;
  imageScale: number;
  imagePositionX: number;
  imagePositionY: number;
  kind: ItemKindMode;
  targetCount: number | null;
  currentCount: number;
  isComplete: boolean;
}

interface DesignerSection {
  id: string;
  name: string;
  order: number;
  itemLayout: ItemLayoutMode;
  gridColumns: number;
  span: number;
  bgColor: string | null;
  textColor: string | null;
  borderColor: string | null;
  textSize: number | null;
  fontFamily: string | null;
  titleBgColor: string | null;
  items: DesignerItem[];
}

interface DesignerTab {
  id: string;
  title: string;
  order: number;
  canvasBgColor: string | null;
  canvasBgImageUrl: string | null;
  bgColor: string | null;
  textColor: string | null;
  borderColor: string | null;
  textSize: number | null;
  sections: DesignerSection[];
}

interface DesignerChecklist {
  id: string;
  name: string;
  tokenReward: number | null;
  badgeName: string | null;
  badgeIconUrl: string | null;
  tabs: DesignerTab[];
}

type SelectedType = "tab" | "module" | "item" | null;

const SPANS = [1, 2, 3, 4] as const;

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

function getGridColsClass(cols: number): string {
  // Below `sm`, cards at the creator's chosen density (often much higher for
  // spreadsheet-style layouts) become too small to tap reliably, so mobile
  // always caps at 2 regardless of cols.
  const map: Record<number, string> = {
    2: "grid-cols-2 sm:grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-5",
    6: "grid-cols-2 sm:grid-cols-6",
    7: "grid-cols-2 sm:grid-cols-7",
    8: "grid-cols-2 sm:grid-cols-8",
    9: "grid-cols-2 sm:grid-cols-9",
    10: "grid-cols-2 sm:grid-cols-10",
    11: "grid-cols-2 sm:grid-cols-11",
    12: "grid-cols-2 sm:grid-cols-12",
    13: "grid-cols-2 sm:grid-cols-[repeat(13,minmax(0,1fr))]",
    14: "grid-cols-2 sm:grid-cols-[repeat(14,minmax(0,1fr))]",
    15: "grid-cols-2 sm:grid-cols-[repeat(15,minmax(0,1fr))]",
    16: "grid-cols-2 sm:grid-cols-[repeat(16,minmax(0,1fr))]",
    17: "grid-cols-2 sm:grid-cols-[repeat(17,minmax(0,1fr))]",
    18: "grid-cols-2 sm:grid-cols-[repeat(18,minmax(0,1fr))]",
    19: "grid-cols-2 sm:grid-cols-[repeat(19,minmax(0,1fr))]",
    20: "grid-cols-2 sm:grid-cols-[repeat(20,minmax(0,1fr))]",
  };
  return map[cols] || "grid-cols-2 sm:grid-cols-4";
}

export function ChecklistDesigner({
  checklist,
  gameId,
  games,
  colorPresets: initialColorPresets,
}: {
  checklist: DesignerChecklist;
  gameId: string;
  games: { id: string; title: string }[];
  colorPresets: ColorPreset[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [activeTabId, setActiveTabId] = useState(checklist.tabs[0]?.id ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<SelectedType>(null);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<Set<string>>(new Set());

  function toggleCollapsed(sectionId: string) {
    setCollapsedSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }
  const [name, setName] = useState(checklist.name);
  const [tokenReward, setTokenReward] = useState(checklist.tokenReward?.toString() ?? "");
  const [badgeName, setBadgeName] = useState(checklist.badgeName ?? "");
  const [badgeIconUrl, setBadgeIconUrl] = useState(checklist.badgeIconUrl ?? "");
  const [colorPresets, setColorPresets] = useState(initialColorPresets);

  function savePreset(color: string) {
    const name = window.prompt("Name this color preset:");
    if (!name) return;
    createColorPreset(checklist.id, name, color).then(({ id }) => {
      setColorPresets((prev) => [...prev, { id, name, color }]);
    });
  }

  function deletePreset(id: string) {
    setColorPresets((prev) => prev.filter((p) => p.id !== id));
    deleteColorPreset(id);
  }

  function refresh() {
    startTransition(() => router.refresh());
  }

  const activeTab = checklist.tabs.find((t) => t.id === activeTabId) ?? checklist.tabs[0];
  const allSections = checklist.tabs.flatMap((t) => t.sections);
  const allItems = allSections.flatMap((s) => s.items);

  const selectedTab = checklist.tabs.find((t) => t.id === selectedId);
  const selectedSection = allSections.find((s) => s.id === selectedId);
  const selectedItem = allItems.find((i) => i.id === selectedId);

  async function addTab() {
    const { id } = await createTab(checklist.id);
    setActiveTabId(id);
    setSelectedId(id);
    setSelectedType("tab");
    refresh();
  }

  function handleDeleteChecklist() {
    if (!window.confirm(`Delete "${checklist.name}"? This removes the whole checklist and its history — this can't be undone.`)) {
      return;
    }
    deleteChecklist(gameId, checklist.id);
  }

  function handleDuplicateChecklist() {
    duplicateChecklist(gameId, checklist.id);
  }

  function handleMoveChecklist(newGameId: string) {
    moveChecklist(checklist.id, newGameId);
  }

  async function handleDeleteTab() {
    if (checklist.tabs.length <= 1 || !selectedId) return;
    const remaining = checklist.tabs.filter((t) => t.id !== selectedId);
    await deleteTab(checklist.id, selectedId);
    setActiveTabId(remaining[0]?.id ?? "");
    setSelectedId(null);
    setSelectedType(null);
    refresh();
  }

  async function addModule() {
    if (!activeTab) return;
    const { id } = await createSection(activeTab.id);
    setSelectedId(id);
    setSelectedType("module");
    refresh();
  }

  async function addItemToModule(sectionId: string) {
    const { id } = await createItem(sectionId, { title: "New Target" });
    setSelectedId(id);
    setSelectedType("item");
    refresh();
  }

  function deleteSelected() {
    if (!selectedId) return;
    if (selectedType === "module") {
      deleteSection(selectedId).then(refresh);
      setSelectedId(null);
      setSelectedType(null);
    } else if (selectedType === "item") {
      // Select the target right before this one, so deleting a run of items
      // one at a time doesn't strand the editor with nothing selected.
      const section = allSections.find((s) => s.items.some((i) => i.id === selectedId));
      const siblings = section?.items ?? [];
      const index = siblings.findIndex((i) => i.id === selectedId);
      const precedingId = index > 0 ? siblings[index - 1].id : null;

      deleteItem(selectedId).then(refresh);
      setSelectedId(precedingId);
      setSelectedType(precedingId ? "item" : null);
    }
  }

  async function duplicateSelected() {
    if (!selectedId) return;
    if (selectedType === "module") {
      const { id } = await duplicateSection(selectedId);
      setSelectedId(id);
      setSelectedType("module");
      refresh();
    } else if (selectedType === "item") {
      const { id } = await duplicateItem(selectedId);
      setSelectedId(id);
      setSelectedType("item");
      refresh();
    }
  }

  function updateSelectedData(field: string, value: unknown) {
    if (!selectedId) return;
    if (selectedType === "tab") updateTab(selectedId, { [field]: value }).then(refresh);
    else if (selectedType === "module") updateSection(selectedId, { [field]: value }).then(refresh);
    else if (selectedType === "item") updateItem(selectedId, { [field]: value }).then(refresh);
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggedSectionId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!draggedSectionId || draggedSectionId === targetId || !activeTab) return;

    const ids = activeTab.sections.map((s) => s.id);
    const draggedIdx = ids.indexOf(draggedSectionId);
    const targetIdx = ids.indexOf(targetId);
    [ids[draggedIdx], ids[targetIdx]] = [ids[targetIdx], ids[draggedIdx]];

    reorderSections(activeTab.id, ids).then(refresh);
    setDraggedSectionId(null);
  }

  function handleTabDragStart(e: React.DragEvent, id: string) {
    setDraggedTabId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleTabDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!draggedTabId || draggedTabId === targetId) return;

    const ids = checklist.tabs.map((t) => t.id);
    const draggedIdx = ids.indexOf(draggedTabId);
    const targetIdx = ids.indexOf(targetId);
    [ids[draggedIdx], ids[targetIdx]] = [ids[targetIdx], ids[draggedIdx]];

    reorderTabs(checklist.id, ids).then(refresh);
    setDraggedTabId(null);
  }

  function handleItemDragStart(e: React.DragEvent, id: string) {
    e.stopPropagation();
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleItemDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
  }

  function handleItemDrop(e: React.DragEvent, targetSectionId: string, targetIndex: number) {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItemId) moveItemToSection(draggedItemId, targetSectionId, targetIndex).then(refresh);
    setDraggedItemId(null);
  }

  const selectedData: DesignerTab | DesignerSection | DesignerItem | undefined =
    selectedType === "tab" ? selectedTab : selectedType === "module" ? selectedSection : selectedItem;

  // Rendered from two spots: the side-by-side panel at `lg` and up, and --
  // when stacked on narrow screens -- inline right after the module being
  // edited, so it doesn't end up stranded at the bottom of the whole canvas.
  function renderPropertiesPanel() {
    return selectedData ? (
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500">
            Editing {selectedType}
          </h3>
          <div className="flex items-center gap-1">
            {(selectedType === "module" || selectedType === "item") && (
              <button
                type="button"
                onClick={duplicateSelected}
                className="rounded bg-neutral-100 px-2 py-1 text-xs font-bold text-neutral-600 hover:text-neutral-900 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:text-white"
              >
                Duplicate
              </button>
            )}
            <button
              type="button"
              onClick={selectedType === "tab" ? handleDeleteTab : deleteSelected}
              className="rounded bg-red-50 px-2 py-1 text-xs font-bold text-red-600 hover:text-red-700"
            >
              Delete
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">Title</label>
          <input
            key={selectedData.id}
            defaultValue={"title" in selectedData ? selectedData.title : selectedData.name}
            onBlur={(e) =>
              updateSelectedData(selectedType === "module" ? "name" : "title", e.target.value)
            }
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>

        {selectedType === "tab" && (
          <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
            <h4 className="text-xs font-bold text-neutral-500">Tab environment</h4>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Canvas color</label>
              <GradientColorPicker
                key={`${selectedTab?.id}-canvas`}
                value={selectedTab?.canvasBgColor ?? null}
                fallback="#1e1830"
                onChange={(value) => updateSelectedData("canvasBgColor", value)}
                presets={colorPresets}
                onSavePreset={savePreset}
                onDeletePreset={deletePreset}
              />
            </div>
            <ImagePicker
              key={`${selectedTab?.id}-canvas-image`}
              label="Canvas background image"
              value={selectedTab?.canvasBgImageUrl ?? ""}
              onChange={(url) => updateSelectedData("canvasBgImageUrl", url)}
              kind="covers"
            />
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
          <h4 className="text-xs font-bold text-neutral-500">
            {selectedType === "tab" ? "Tab button style" : "Appearance"}
          </h4>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Background</label>
            <GradientColorPicker
              key={`${selectedData.id}-bg`}
              value={selectedData.bgColor ?? null}
              fallback="#241b35"
              onChange={(value) => updateSelectedData("bgColor", value)}
              presets={colorPresets}
              onSavePreset={savePreset}
              onDeletePreset={deletePreset}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-neutral-500">Text color</label>
            <ColorField
              key={`${selectedData.id}-text`}
              defaultValue={selectedData.textColor ?? "#ede9fe"}
              onChange={(color) => updateSelectedData("textColor", color)}
              presets={colorPresets}
              onSavePreset={savePreset}
              onDeletePreset={deletePreset}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-neutral-500">Border color</label>
            <ColorField
              key={`${selectedData.id}-border`}
              defaultValue={selectedData.borderColor ?? "#5b21b6"}
              onChange={(color) => updateSelectedData("borderColor", color)}
              presets={colorPresets}
              onSavePreset={savePreset}
              onDeletePreset={deletePreset}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-neutral-500">Text size (px)</label>
            <SliderWithInput
              key={`${selectedData.id}-size`}
              value={selectedData.textSize ?? 16}
              min={10}
              max={32}
              onChange={(v) => updateSelectedData("textSize", v)}
            />
          </div>
          {(selectedType === "item" || selectedType === "module") && (
            <div className="flex items-center justify-between">
              <label className="text-xs text-neutral-500">Font</label>
              <select
                key={`${selectedData.id}-font`}
                defaultValue={(selectedType === "item" ? selectedItem?.fontFamily : selectedSection?.fontFamily) ?? ""}
                onChange={(e) => updateSelectedData("fontFamily", e.target.value || null)}
                className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
              >
                <option value="">Default</option>
                {FONT_OPTIONS.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {selectedType === "module" && selectedSection && (
          <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
            <div>
              <label className="mb-2 block text-xs font-bold text-neutral-500">Module width</label>
              <div className="grid grid-cols-4 gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-700 dark:bg-neutral-800">
                {SPANS.map((span) => (
                  <button
                    key={span}
                    type="button"
                    onClick={() => updateSelectedData("span", span)}
                    className={cn(
                      "rounded py-1 text-xs font-bold",
                      selectedSection.span === span ? "bg-white shadow" : "text-neutral-500",
                    )}
                  >
                    {span * 25}%
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold text-neutral-500">Layout</label>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-700 dark:bg-neutral-800">
                <button
                  type="button"
                  onClick={() => updateSelectedData("itemLayout", "LIST")}
                  className={cn(
                    "rounded py-1 text-xs font-bold",
                    selectedSection.itemLayout === "LIST" ? "bg-white shadow" : "text-neutral-500",
                  )}
                >
                  List
                </button>
                <button
                  type="button"
                  onClick={() => updateSelectedData("itemLayout", "GRID")}
                  className={cn(
                    "rounded py-1 text-xs font-bold",
                    selectedSection.itemLayout === "GRID" ? "bg-white shadow" : "text-neutral-500",
                  )}
                >
                  Grid
                </button>
              </div>
            </div>
            {selectedSection.itemLayout === "GRID" && (
              <div>
                <label className="mb-2 block text-xs text-neutral-500">Items per row</label>
                <SliderWithInput
                  key={`${selectedSection.id}-cols`}
                  value={selectedSection.gridColumns}
                  min={2}
                  max={20}
                  onChange={(v) => updateSelectedData("gridColumns", v)}
                  sliderClassName="w-full"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Title background</label>
              <GradientColorPicker
                key={`${selectedSection.id}-titlebg`}
                value={selectedSection.titleBgColor ?? null}
                fallback="#1e1830"
                onChange={(value) => updateSelectedData("titleBgColor", value)}
                presets={colorPresets}
                onSavePreset={savePreset}
                onDeletePreset={deletePreset}
              />
            </div>
          </div>
        )}

        {selectedType === "item" && selectedItem && (
          <>
            <div>
              <label className="mb-2 block text-xs font-bold text-neutral-500">Type</label>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-700 dark:bg-neutral-800">
                <button
                  type="button"
                  onClick={() => updateSelectedData("kind", "CHECKBOX")}
                  className={cn(
                    "rounded py-1 text-xs font-bold",
                    selectedItem.kind !== "COUNTER" ? "bg-white shadow" : "text-neutral-500",
                  )}
                >
                  Checkbox
                </button>
                <button
                  type="button"
                  onClick={() => updateSelectedData("kind", "COUNTER")}
                  className={cn(
                    "rounded py-1 text-xs font-bold",
                    selectedItem.kind === "COUNTER" ? "bg-white shadow" : "text-neutral-500",
                  )}
                >
                  Counter
                </button>
              </div>
              {selectedItem.kind === "COUNTER" && (
                <label className="mt-2 flex items-center justify-between text-xs text-neutral-500">
                  Target count
                  <input
                    key={`${selectedItem.id}-target`}
                    type="number"
                    min={1}
                    defaultValue={selectedItem.targetCount ?? 100}
                    onBlur={(e) =>
                      updateSelectedData("targetCount", Math.max(1, parseInt(e.target.value, 10) || 1))
                    }
                    className="w-20 rounded border border-neutral-300 px-1.5 py-1 text-sm text-neutral-900"
                  />
                </label>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs text-neutral-500">Description</label>
              <textarea
                key={`${selectedItem.id}-desc`}
                defaultValue={selectedItem.description ?? ""}
                onBlur={(e) => updateSelectedData("description", e.target.value || null)}
                rows={2}
                className="w-full resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-neutral-500">
                Reference link (guide, wiki, etc.)
              </label>
              <input
                key={`${selectedItem.id}-url`}
                type="url"
                defaultValue={selectedItem.url ?? ""}
                onBlur={(e) => updateSelectedData("url", e.target.value || null)}
                placeholder="https://..."
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
              />
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
              <ImagePicker
                key={`${selectedItem.id}-image`}
                label="Item image"
                value={selectedItem.imageUrl ?? ""}
                onChange={(url) => updateSelectedData("imageUrl", url)}
                kind="items"
              />

              <div className="flex items-center gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                <input
                  type="checkbox"
                  id="pixelated"
                  checked={selectedItem.pixelatedImage}
                  onChange={(e) => updateSelectedData("pixelatedImage", e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="pixelated" className="cursor-pointer select-none text-xs text-neutral-600">
                  <span className="block font-bold">Pixel art mode</span>
                  <span className="text-[10px] text-neutral-400">Keeps small sprites sharp</span>
                </label>
              </div>

              <div className="flex flex-col gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                <label className="text-xs font-bold text-neutral-500">Image framing</label>
                <div className="grid grid-cols-2 gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-700 dark:bg-neutral-800">
                  <button
                    type="button"
                    onClick={() => updateSelectedData("imageFit", "CONTAIN")}
                    className={cn(
                      "rounded py-1 text-xs font-bold",
                      selectedItem.imageFit !== "COVER" ? "bg-white shadow" : "text-neutral-500",
                    )}
                  >
                    Contain
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSelectedData("imageFit", "COVER")}
                    className={cn(
                      "rounded py-1 text-xs font-bold",
                      selectedItem.imageFit === "COVER" ? "bg-white shadow" : "text-neutral-500",
                    )}
                  >
                    Cover
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-neutral-500">Zoom</label>
                  <SliderWithInput
                    key={`${selectedItem.id}-scale`}
                    value={selectedItem.imageScale}
                    min={1}
                    max={3}
                    step={0.1}
                    onChange={(v) => updateSelectedData("imageScale", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-neutral-500">Pan X</label>
                  <SliderWithInput
                    key={`${selectedItem.id}-panx`}
                    value={selectedItem.imagePositionX}
                    min={0}
                    max={100}
                    onChange={(v) => updateSelectedData("imagePositionX", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-neutral-500">Pan Y</label>
                  <SliderWithInput
                    key={`${selectedItem.id}-pany`}
                    value={selectedItem.imagePositionY}
                    min={0}
                    max={100}
                    onChange={(v) => updateSelectedData("imagePositionY", v)}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    ) : (
      <div className="mt-4 rounded-xl border border-dashed border-neutral-300 p-6 text-center">
        <p className="text-xs leading-relaxed text-neutral-500">
          Click any Module, Target, or Tab to edit it.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link href={`/games/${gameId}`} className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Back to game
        </Link>
        <Link
          href={`/games/${gameId}/checklists/${checklist.id}`}
          className="text-sm text-neutral-500 hover:text-neutral-900"
        >
          View progress →
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name !== checklist.name && updateChecklist(checklist.id, { name }).then(refresh)}
          className="w-full max-w-xs rounded-md border border-neutral-300 px-3 py-2 text-lg font-semibold outline-none focus:border-neutral-900"
        />
        <label className="flex items-center gap-2 text-xs text-neutral-500">
          Token reward
          <input
            type="number"
            min={0}
            value={tokenReward}
            placeholder={String(DEFAULT_TOKENS_PER_COMPLETION)}
            onChange={(e) => setTokenReward(e.target.value)}
            onBlur={() => {
              const parsed = tokenReward.trim() === "" ? null : Math.max(0, parseInt(tokenReward, 10) || 0);
              updateChecklist(checklist.id, { tokenReward: parsed }).then(refresh);
            }}
            className="w-16 rounded border border-neutral-300 px-1.5 py-1 text-sm text-neutral-900"
          />
        </label>
        <button
          type="button"
          onClick={addModule}
          className="ml-auto rounded-lg bg-neutral-900 px-4 py-2 text-sm font-bold text-white shadow hover:bg-neutral-700 lg:hidden"
        >
          + Add Module
        </button>
        <ChecklistSettingsMenu
          checklistId={checklist.id}
          currentGameId={gameId}
          games={games}
          onDuplicate={handleDuplicateChecklist}
          onMove={handleMoveChecklist}
          onDelete={handleDeleteChecklist}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-neutral-300 p-3 dark:border-neutral-700">
        <label className="flex w-full flex-col gap-1 text-xs text-neutral-500 sm:w-56">
          Badge awarded on approval
          <input
            value={badgeName}
            onChange={(e) => setBadgeName(e.target.value)}
            onBlur={() =>
              badgeName !== (checklist.badgeName ?? "") &&
              updateChecklist(checklist.id, { badgeName: badgeName.trim() || null }).then(refresh)
            }
            placeholder="Completionist (default)"
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900"
          />
        </label>
        <div className="w-full sm:w-64">
          <ImagePicker
            label="Badge icon"
            value={badgeIconUrl}
            onChange={(url) => {
              setBadgeIconUrl(url);
              updateChecklist(checklist.id, { badgeIconUrl: url || null }).then(refresh);
            }}
            kind="badges"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-neutral-200 px-1 dark:border-neutral-700">
        {checklist.tabs.map((tab) => {
          const isActive = activeTab?.id === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              draggable
              onDragStart={(e) => handleTabDragStart(e, tab.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleTabDrop(e, tab.id)}
              onClick={() => {
                setActiveTabId(tab.id);
                setSelectedId(tab.id);
                setSelectedType("tab");
              }}
              style={{
                backgroundColor: tab.bgColor ?? undefined,
                color: tab.textColor ?? undefined,
                borderTopColor: isActive ? tab.borderColor ?? "#7c3aed" : "transparent",
                fontSize: tab.textSize ? `${tab.textSize}px` : undefined,
              }}
              className={cn(
                "whitespace-nowrap rounded-t-lg border-t-2 px-4 py-2 text-sm font-bold transition-colors",
                isActive ? "bg-violet-100 text-violet-900" : "border-transparent text-neutral-500 hover:text-violet-700",
              )}
            >
              {tab.title}
            </button>
          );
        })}
        <button type="button" onClick={addTab} className="px-3 py-2 text-lg font-bold text-violet-400 hover:text-violet-700">
          +
        </button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <main
          className="min-w-0 flex-1 rounded-xl p-6"
          style={{
            ...(activeTab?.canvasBgImageUrl
              ? { backgroundImage: `url(${activeTab.canvasBgImageUrl})` }
              : resolveBackgroundStyle(activeTab?.canvasBgColor, "#1e1830")),
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="grid auto-rows-min grid-cols-4 gap-4">
            {(activeTab?.sections ?? []).map((section) => {
              const isModuleSelected = selectedId === section.id && selectedType === "module";
              const isPanelForThisModule =
                isModuleSelected || (selectedType === "item" && section.items.some((i) => i.id === selectedId));
              const isCollapsed = collapsedSectionIds.has(section.id);
              return (
                <Fragment key={section.id}>
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, section.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, section.id)}
                  onClick={() => {
                    setSelectedId(section.id);
                    setSelectedType("module");
                  }}
                  style={{
                    ...resolveBackgroundStyle(section.bgColor, "#241b35"),
                    borderColor: section.borderColor ?? (isModuleSelected ? "#7c3aed" : "#4c1d95"),
                  }}
                  className={cn(
                    "flex cursor-pointer flex-col overflow-hidden rounded-2xl border-2 transition-shadow",
                    isModuleSelected && "shadow-lg shadow-violet-200",
                    getColSpanClass(section.span),
                  )}
                >
                  <div
                    style={resolveBackgroundStyle(section.titleBgColor, "#1e1830")}
                    className="flex items-center gap-2 border-b border-[#4c1d95]/40 p-3"
                  >
                    <span className="cursor-grab text-neutral-400">⋮⋮</span>
                    <h2
                      className={cn("min-w-0 flex-1 truncate font-black", fontClassForKey(section.fontFamily))}
                      style={{
                        color: section.textColor ?? "#ede9fe",
                        fontSize: section.textSize ? `${section.textSize}px` : "1.125rem",
                      }}
                    >
                      {section.name}
                    </h2>
                    <span
                      className={cn("shrink-0", fontClassForKey(section.fontFamily))}
                      style={{
                        color: section.textColor ?? "#ede9fe",
                        fontSize: section.textSize ? `${section.textSize}px` : "1.125rem",
                      }}
                    >
                      {section.items.length}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCollapsed(section.id);
                      }}
                      title={isCollapsed ? "Expand module" : "Collapse module"}
                      className="shrink-0 text-neutral-400 hover:text-white"
                    >
                      {isCollapsed ? "▸" : "▾"}
                    </button>
                  </div>

                  {!isCollapsed && (
                  <div className="flex-1 p-3">
                    <div
                      onDragOver={handleItemDragOver}
                      onDrop={(e) => handleItemDrop(e, section.id, section.items.length)}
                      className={
                        section.itemLayout === "GRID"
                          ? `grid ${getGridColsClass(section.gridColumns)} gap-3`
                          : "flex flex-col gap-2"
                      }
                    >
                      {section.items.map((item, itemIndex) => {
                        const isItemSelected = selectedId === item.id && selectedType === "item";
                        // A dark shading behind the title keeps text legible over a photo or
                        // a plain color, but it also muddies a deliberately-chosen gradient
                        // background -- so only apply it when there isn't one.
                        const hasGradientBg = !!item.bgColor && isGradient(item.bgColor);
                        return (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => handleItemDragStart(e, item.id)}
                            onDragOver={handleItemDragOver}
                            onDrop={(e) => handleItemDrop(e, section.id, itemIndex)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(item.id);
                              setSelectedType("item");
                            }}
                            style={{
                              borderColor: item.borderColor ?? (isItemSelected ? "#7c3aed" : "transparent"),
                              color: item.textColor ?? "#ede9fe",
                              boxShadow: isItemSelected ? "0 0 0 2px #7c3aed" : "none",
                            }}
                            className={cn(
                              "relative isolate cursor-pointer overflow-hidden rounded-xl border transition-transform hover:scale-[1.02]",
                              section.itemLayout === "GRID" ? "flex aspect-square flex-col" : "flex items-center gap-3 p-2",
                            )}
                          >
                            {/* Painted on its own layer, bled 1px past the edges -- a background
                                sized exactly to the box can leave a hairline gap at the rounded
                                corners once `hover:scale` promotes this element to its own
                                compositing layer, especially with a diagonal gradient. */}
                            <div
                              className="absolute -inset-px -z-10"
                              style={resolveBackgroundStyle(item.bgColor, "rgba(139,92,246,0.08)")}
                            />
                            {item.kind === "COUNTER" && (
                              <span
                                className={cn(
                                  "z-20 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white",
                                  section.itemLayout === "GRID" ? "absolute left-1.5 top-1.5" : "order-last ml-auto",
                                )}
                              >
                                0 / {item.targetCount ?? "?"}
                              </span>
                            )}
                            {section.itemLayout === "GRID" ? (
                              <>
                                <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black/5 p-2 pb-8 text-xs text-neutral-400">
                                  {item.imageUrl ? (
                                    <div className="h-full w-full" style={{ transform: `scale(${item.imageScale})` }}>
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={item.imageUrl}
                                        alt=""
                                        style={{
                                          imageRendering: item.pixelatedImage ? "pixelated" : "auto",
                                          objectFit: item.imageFit === "COVER" ? "cover" : "contain",
                                          objectPosition: `${item.imagePositionX}% ${item.imagePositionY}%`,
                                        }}
                                        className="h-full w-full"
                                      />
                                    </div>
                                  ) : (
                                    "No image"
                                  )}
                                </div>
                                <div
                                  className={cn(
                                    "relative z-10 mt-auto w-full p-2 pt-8",
                                    !hasGradientBg && "bg-gradient-to-t from-black/70 to-transparent",
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "block truncate text-center font-bold leading-tight",
                                      fontClassForKey(item.fontFamily),
                                    )}
                                    style={{ fontSize: item.textSize ? `${item.textSize}px` : "0.875rem" }}
                                  >
                                    {item.title}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <>
                                {item.imageUrl && (
                                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-black/10">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={item.imageUrl}
                                      alt=""
                                      style={{ imageRendering: item.pixelatedImage ? "pixelated" : "auto" }}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <h3
                                    className={cn("truncate font-bold", fontClassForKey(item.fontFamily))}
                                    style={{ fontSize: item.textSize ? `${item.textSize}px` : "1rem" }}
                                  >
                                    {item.title}
                                  </h3>
                                  {item.description && (
                                    <p className="truncate text-xs opacity-70">{item.description}</p>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addItemToModule(section.id);
                        }}
                        className={cn(
                          "flex items-center justify-center rounded-xl border border-dashed border-neutral-500 text-neutral-400 hover:bg-white/5",
                          section.itemLayout === "GRID" ? "aspect-square text-xl" : "min-h-[40px] p-2 text-sm font-bold",
                        )}
                      >
                        + Add Target
                      </button>
                    </div>
                  </div>
                  )}
                </div>
                {isPanelForThisModule && (
                  <div className="col-span-4 rounded-xl border border-neutral-200 p-5 lg:hidden dark:border-neutral-700">
                    {renderPropertiesPanel()}
                  </div>
                )}
                </Fragment>
              );
            })}
          </div>
        </main>

        <aside
          className={cn(
            "w-full self-start overflow-y-auto rounded-xl border border-neutral-200 p-5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:w-80 lg:shrink-0 dark:border-neutral-700",
            (selectedType === "module" || selectedType === "item") && "hidden lg:block",
          )}
        >
          <div className="mb-4 hidden lg:block">
            <button
              type="button"
              onClick={addModule}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-bold text-white shadow hover:bg-neutral-700"
            >
              + Add Module
            </button>
          </div>
          {renderPropertiesPanel()}
        </aside>
      </div>
    </div>
  );
}
