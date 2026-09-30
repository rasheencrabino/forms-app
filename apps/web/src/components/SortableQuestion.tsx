"use client";

import type { ComponentProps } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { QuestionEditor } from "./QuestionEditor";

type SortableQuestionProps = Omit<ComponentProps<typeof QuestionEditor>, "dragHandle">;

export function SortableQuestion(props: SortableQuestionProps) {
  const { question, position, moveDisabled } = props;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
    disabled: moveDisabled,
  });

  const dragHandle = (
    <button
      ref={setActivatorNodeRef}
      type="button"
      className="btn btn--secondary btn--sm question-card__handle"
      aria-label={`Drag to reorder question ${position}`}
      {...attributes}
      {...listeners}
    >
      ⋮⋮
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        position: "relative",
        zIndex: isDragging ? 1 : undefined,
      }}
    >
      <QuestionEditor {...props} dragHandle={dragHandle} />
    </div>
  );
}
