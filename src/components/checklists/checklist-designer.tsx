"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createTab,
  updateTab,
  deleteTab,
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
  createItem,
  updateItem,
  deleteItem,
  updateChecklist,
  deleteChecklist,
} from "@/server/actions/checklists";
import { ImagePicker } from "@/components/checklists/image-picker";
import { FONT_OPTIONS, fontClassForKey } from "@/lib/fonts";
import { DEFAULT_TOKENS_PER_COMPLETION } from "@/lib/token-economy";
import { cn } from "@/lib/cn";

type ItemLayoutMode = "LIST" | "GRID";
type ImageFitMode = "CONTAIN" | "COVER";

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
  const map: Record<number, string> = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  };
  return map[cols] || "grid-cols-4";
}

export function ChecklistDesigner({ checklist, gameId }: { checklist: DesignerChecklist; gameId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [activeTabId, setActiveTabId] = useState(checklist.tabs[0]?.id ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<SelectedType>(null);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [name, setName] = useState(checklist.name);
  const [tokenReward, setTokenReward] = useState(checklist.tokenReward?.toString() ?? "");
  const [badgeName, setBadgeName] = useState(checklist.badgeName ?? "");
  const [badgeIconUrl, setBadgeIconUrl] = useState(checklist.badgeIconUrl ?? "");

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
    if (selectedType === "module") deleteSection(selectedId).then(refresh);
    else if (selectedType === "item") deleteItem(selectedId).then(refresh);
    setSelectedId(null);
    setSelectedType(null);
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

  const selectedData: DesignerTab | DesignerSection | DesignerItem | undefined =
    selectedType === "tab" ? selectedTab : selectedType === "module" ? selectedSection : selectedItem;

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

      <div className="flex items-center gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name !== checklist.name && updateChecklist(checklist.id, { name }).then(refresh)}
          className="max-w-xs rounded-md border border-neutral-300 px-3 py-2 text-lg font-semibold outline-none focus:border-neutral-900"
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
          className="ml-auto rounded-lg bg-neutral-900 px-4 py-2 text-sm font-bold text-white shadow hover:bg-neutral-700"
        >
          + Add Module
        </button>
        <button
          type="button"
          onClick={handleDeleteChecklist}
          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
        >
          Delete checklist
        </button>
      </div>

      <div className="flex items-end gap-3 rounded-lg border border-dashed border-neutral-300 p-3 dark:border-neutral-700">
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Badge awarded on approval
          <input
            value={badgeName}
            onChange={(e) => setBadgeName(e.target.value)}
            onBlur={() =>
              badgeName !== (checklist.badgeName ?? "") &&
              updateChecklist(checklist.id, { badgeName: badgeName.trim() || null }).then(refresh)
            }
            placeholder="Completionist (default)"
            className="w-56 rounded border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900"
          />
        </label>
        <div className="w-64">
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

      <div className="flex gap-6">
        <main
          className="flex-1 rounded-xl p-6"
          style={{
            backgroundColor: activeTab?.canvasBgColor ?? "#1e1830",
            backgroundImage: activeTab?.canvasBgImageUrl ? `url(${activeTab.canvasBgImageUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="grid auto-rows-min grid-cols-4 gap-4">
            {(activeTab?.sections ?? []).map((section) => {
              const isModuleSelected = selectedId === section.id && selectedType === "module";
              return (
                <div
                  key={section.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, section.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, section.id)}
                  onClick={() => {
                    setSelectedId(section.id);
                    setSelectedType("module");
                  }}
                  style={{
                    backgroundColor: section.bgColor ?? "#241b35",
                    borderColor: section.borderColor ?? (isModuleSelected ? "#7c3aed" : "#4c1d95"),
                  }}
                  className={cn(
                    "flex cursor-pointer flex-col overflow-hidden rounded-2xl border-2 transition-shadow",
                    isModuleSelected && "shadow-lg shadow-violet-200",
                    getColSpanClass(section.span),
                  )}
                >
                  <div className="flex items-center gap-2 border-b border-[#4c1d95]/40 bg-[#1e1830] p-3">
                    <span className="cursor-grab text-neutral-400">⋮⋮</span>
                    <h2
                      className="font-black"
                      style={{
                        color: section.textColor ?? "#ede9fe",
                        fontSize: section.textSize ? `${section.textSize}px` : "1.125rem",
                      }}
                    >
                      {section.name}
                    </h2>
                  </div>

                  <div className="flex-1 p-3">
                    <div
                      className={
                        section.itemLayout === "GRID"
                          ? `grid ${getGridColsClass(section.gridColumns)} gap-3`
                          : "flex flex-col gap-2"
                      }
                    >
                      {section.items.map((item) => {
                        const isItemSelected = selectedId === item.id && selectedType === "item";
                        return (
                          <div
                            key={item.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(item.id);
                              setSelectedType("item");
                            }}
                            style={{
                              backgroundColor: item.bgColor ?? "rgba(139,92,246,0.08)",
                              borderColor: item.borderColor ?? (isItemSelected ? "#7c3aed" : "transparent"),
                              color: item.textColor ?? "#ede9fe",
                              boxShadow: isItemSelected ? "0 0 0 2px #7c3aed" : "none",
                            }}
                            className={cn(
                              "cursor-pointer overflow-hidden rounded-xl border transition-transform hover:scale-[1.02]",
                              section.itemLayout === "GRID" ? "relative flex aspect-square flex-col" : "flex items-center gap-3 p-2",
                            )}
                          >
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
                                <div className="relative z-10 mt-auto w-full bg-gradient-to-t from-black/70 to-transparent p-2 pt-8">
                                  <span
                                    className={cn("block text-center font-bold leading-tight", fontClassForKey(item.fontFamily))}
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
                                <div>
                                  <h3
                                    className={cn("font-bold", fontClassForKey(item.fontFamily))}
                                    style={{ fontSize: item.textSize ? `${item.textSize}px` : "1rem" }}
                                  >
                                    {item.title}
                                  </h3>
                                  {item.description && (
                                    <p className="text-xs opacity-70">{item.description}</p>
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
                </div>
              );
            })}
          </div>
        </main>

        <aside className="w-80 shrink-0 rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
          {selectedData ? (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                  Editing {selectedType}
                </h3>
                <button
                  type="button"
                  onClick={selectedType === "tab" ? handleDeleteTab : deleteSelected}
                  className="rounded bg-red-50 px-2 py-1 text-xs font-bold text-red-600 hover:text-red-700"
                >
                  Delete
                </button>
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
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-neutral-500">Canvas color</label>
                    <input
                      type="color"
                      defaultValue={selectedTab?.canvasBgColor ?? "#1e1830"}
                      onChange={(e) => updateSelectedData("canvasBgColor", e.target.value)}
                      className="h-7 w-10 rounded border border-neutral-300"
                    />
                  </div>
                  <ImagePicker
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
                <div className="flex items-center justify-between">
                  <label className="text-xs text-neutral-500">Background</label>
                  <input
                    key={`${selectedData.id}-bg`}
                    type="color"
                    defaultValue={selectedData.bgColor ?? "#241b35"}
                    onChange={(e) => updateSelectedData("bgColor", e.target.value)}
                    className="h-7 w-10 rounded border border-neutral-300"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-neutral-500">Text color</label>
                  <input
                    key={`${selectedData.id}-text`}
                    type="color"
                    defaultValue={selectedData.textColor ?? "#ede9fe"}
                    onChange={(e) => updateSelectedData("textColor", e.target.value)}
                    className="h-7 w-10 rounded border border-neutral-300"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-neutral-500">Border color</label>
                  <input
                    key={`${selectedData.id}-border`}
                    type="color"
                    defaultValue={selectedData.borderColor ?? "#5b21b6"}
                    onChange={(e) => updateSelectedData("borderColor", e.target.value)}
                    className="h-7 w-10 rounded border border-neutral-300"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-neutral-500">Text size (px)</label>
                  <input
                    key={`${selectedData.id}-size`}
                    type="range"
                    min={10}
                    max={32}
                    defaultValue={selectedData.textSize ?? 16}
                    onChange={(e) => updateSelectedData("textSize", parseInt(e.target.value))}
                    className="w-24"
                  />
                </div>
                {selectedType === "item" && (
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-neutral-500">Font</label>
                    <select
                      key={`${selectedData.id}-font`}
                      defaultValue={selectedItem?.fontFamily ?? ""}
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
                      <label className="mb-2 flex justify-between text-xs text-neutral-500">
                        <span>Items per row</span>
                        <span className="font-bold text-neutral-900">{selectedSection.gridColumns}</span>
                      </label>
                      <input
                        type="range"
                        min={2}
                        max={6}
                        defaultValue={selectedSection.gridColumns}
                        onChange={(e) => updateSelectedData("gridColumns", parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              )}

              {selectedType === "item" && selectedItem && (
                <>
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
                        <input
                          type="range"
                          min={1}
                          max={3}
                          step={0.1}
                          defaultValue={selectedItem.imageScale}
                          onChange={(e) => updateSelectedData("imageScale", parseFloat(e.target.value))}
                          className="w-24"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-neutral-500">Pan X</label>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          defaultValue={selectedItem.imagePositionX}
                          onChange={(e) => updateSelectedData("imagePositionX", parseInt(e.target.value))}
                          className="w-24"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-neutral-500">Pan Y</label>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          defaultValue={selectedItem.imagePositionY}
                          onChange={(e) => updateSelectedData("imagePositionY", parseInt(e.target.value))}
                          className="w-24"
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
          )}
        </aside>
      </div>
    </div>
  );
}
