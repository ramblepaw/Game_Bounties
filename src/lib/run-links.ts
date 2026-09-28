/** Where one submitted run of a checklist -- archived or awaiting review -- is viewed. */
export function runHref(gameId: string, checklistId: string, completionId: string): string {
  return `/games/${gameId}/checklists/${checklistId}/runs/${completionId}`;
}
