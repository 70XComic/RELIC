export function createLongPressGesture(onHold: () => void, delay = 450) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let origin: { id: number; x: number; y: number } | undefined;
  let blockClick = false;
  const clearTimer = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  return {
    start(id: number, x: number, y: number) {
      clearTimer();
      origin = { id, x, y };
      blockClick = false;
      timer = setTimeout(() => {
        timer = undefined;
        blockClick = true;
        onHold();
      }, delay);
    },
    move(id: number, x: number, y: number) {
      if (!origin || origin.id !== id) return;
      if (Math.hypot(x - origin.x, y - origin.y) > 10) {
        clearTimer();
        blockClick = true;
        origin = undefined;
      }
    },
    end(id: number) {
      if (origin?.id !== id) return;
      clearTimer();
      origin = undefined;
    },
    cancel() {
      if (origin) blockClick = true;
      clearTimer();
      origin = undefined;
    },
    consumeClick() {
      const blocked = blockClick;
      blockClick = false;
      return blocked;
    },
  };
}
