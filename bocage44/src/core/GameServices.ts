import { EventBus } from './EventBus';

/** The only global state: shared services reachable from every system. */
export const GameServices = {
  events: new EventBus(),
};
