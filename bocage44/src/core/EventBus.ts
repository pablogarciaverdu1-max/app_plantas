/** Typed publish/subscribe bus. Event names and payloads are declared in GameEvents. */
export interface GameEvents {
  ShotFired: { weaponId: string; x: number; y: number; z: number };
  SoldierKilled: { soldierId: string };
  ObjectiveCompleted: { index: number };
  PlayerWounded: { damage: number };
}

type Handler<T> = (payload: T) => void;

export class EventBus<Events extends object = GameEvents> {
  private handlers = new Map<keyof Events, Set<Handler<never>>>();

  on<K extends keyof Events>(name: K, handler: Handler<Events[K]>): () => void {
    let set = this.handlers.get(name);
    if (!set) {
      set = new Set();
      this.handlers.set(name, set);
    }
    set.add(handler as Handler<never>);
    return () => set.delete(handler as Handler<never>);
  }

  emit<K extends keyof Events>(name: K, payload: Events[K]): void {
    const set = this.handlers.get(name);
    if (!set) return;
    for (const handler of set) (handler as Handler<Events[K]>)(payload);
  }
}
