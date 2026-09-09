import { SimulationEvent, EventCategory, EventSeverity } from '../types/events';

export class EventLogger {
  private events: SimulationEvent[] = [];
  private maxEvents = 250;
  private lastStates = new Map<string, string>();

  log(
    simTime: number,
    severity: EventSeverity,
    category: EventCategory,
    message: string,
    detail?: string
  ): SimulationEvent {
    const id = `ev_${simTime.toFixed(2)}_${Math.random().toString(36).substring(2, 6)}`;
    const event: SimulationEvent = {
      id,
      simTime,
      realTime: Date.now(),
      severity,
      category,
      message,
      detail,
    };

    this.events.unshift(event);
    if (this.events.length > this.maxEvents) {
      this.events.pop();
    }
    return event;
  }

  logStateChange(
    key: string,
    simTime: number,
    newValue: string,
    severity: EventSeverity,
    category: EventCategory,
    formatMsg: (oldVal: string, newVal: string) => string
  ): void {
    const oldVal = this.lastStates.get(key);
    if (oldVal !== undefined && oldVal !== newValue) {
      this.log(simTime, severity, category, formatMsg(oldVal, newValue));
    }
    this.lastStates.set(key, newValue);
  }

  getRecentEvents(count = 20): SimulationEvent[] {
    return this.events.slice(0, count);
  }

  getAllEvents(): SimulationEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
    this.lastStates.clear();
  }
}
