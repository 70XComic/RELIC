"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { createLongPressGesture } from "./long-press";

type Portrait = { image: string; title: string };

export function useCharacterImagePreview() {
  const [portrait, setPortrait] = useState<Portrait | null>(null);
  const pending = useRef<Portrait | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const [gesture] = useState(() => createLongPressGesture(() => setPortrait(pending.current)));
  useEffect(() => () => gesture.cancel(), [gesture]);

  function bind(next: Portrait, keyboardButton = false) {
    return {
      onPointerDown(event: PointerEvent<HTMLElement>) {
        if (!event.isPrimary) { gesture.cancel(); return; }
        if (event.button !== 0) return;
        pending.current = next;
        trigger.current = event.currentTarget;
        gesture.start(event.pointerId, event.clientX, event.clientY);
      },
      onPointerMove(event: PointerEvent<HTMLElement>) {
        gesture.move(event.pointerId, event.clientX, event.clientY);
      },
      onPointerUp(event: PointerEvent<HTMLElement>) { gesture.end(event.pointerId); },
      onPointerCancel() { gesture.cancel(); },
      onPointerLeave() { gesture.cancel(); },
      onContextMenu(event: MouseEvent<HTMLElement>) { event.preventDefault(); },
      onClickCapture(event: MouseEvent<HTMLElement>) {
        if (gesture.consumeClick()) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      onKeyDown(event: KeyboardEvent<HTMLElement>) {
        if (event.key === "Enter" || event.key === " ") gesture.consumeClick();
        if ((keyboardButton && (event.key === "Enter" || event.key === " ")) ||
            (event.shiftKey && event.key === "Enter") || event.key === "ContextMenu") {
          event.preventDefault();
          gesture.cancel();
          trigger.current = event.currentTarget;
          setPortrait(next);
        }
      },
    };
  }

  const viewer = (
    <Dialog open={Boolean(portrait)} onOpenChange={(open) => {
      if (!open) { gesture.cancel(); setPortrait(null); }
    }}>
      <DialogContent
        className="character-image-dialog"
        showCloseButton={false}
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (trigger.current?.isConnected) trigger.current.focus({ preventScroll: true });
        }}
      >
        <DialogTitle>{portrait?.title}</DialogTitle>
        <div className="character-image-stage" onContextMenu={(event) => event.preventDefault()}>
          {portrait && <img src={portrait.image} alt={portrait.title} draggable={false} />}
        </div>
        <DialogClose className="character-image-close">閉じる</DialogClose>
      </DialogContent>
    </Dialog>
  );
  return { bind, viewer, cancel: gesture.cancel };
}
