export type EventSeverity = 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';

export type EventCategory = 'DETECTION' | 'RISK' | 'PLANNER' | 'CONTROL' | 'STATE' | 'USER' | 'CONFIG' | 'SMART_CONTROLLER';

export interface SimulationEvent {
  id: string;
  simTime: number; // Seconds since simulation start
  realTime: number; // Unix timestamp
  severity: EventSeverity;
  category: EventCategory;
  message: string;
  detail?: string;
}
