export type ExpenseCategory = 'Transport' | 'Accommodation' | 'Activity' | 'Food' | 'Other';

export interface Location {
  name: string;
  lat: number;
  lng: number;
  address?: string;
}

export enum TransportType {
  FLIGHT = 'Flight',
  TRAIN = 'Train',
  CAR = 'Car',
  BUS = 'Bus',
  WALK = 'Walk',
  FERRY = 'Ferry',
  NONE = 'None'
}

export interface Accommodation {
  id: string;
  name: string;
  address?: string;
  costPerNight: number;
  checkIn: string;
  checkOut: string;
  status: 'Confirmed' | 'Tentative' | 'Candidate';
}

export interface TransportDetails {
  id: string; // Unique ID for the option
  mode: TransportType;
  provider?: string; // e.g. "United Airlines", "Amtrak"
  number?: string; // e.g. "UA123"
  departureTime?: string;
  arrivalTime?: string;
  duration?: string;
  bookingReference?: string;
  cost?: number; // Specific cost for this option
  
  // New statuses
  isBooked?: boolean;
  trainStatus?: 'Confirmed' | 'Waitlist'; 
}

export interface SubItem {
  id: string;
  name: string;
  type: 'Stay' | 'Activity' | 'Food' | 'Note';
  cost: number;
  notes?: string;
  date?: string; // ISO datetime string
}

export interface TripItem {
  id: string;
  location: Location;
  date?: string;
  notes?: string;
  cost: number;
  category: ExpenseCategory;
  type: 'Stop' | 'Activity';
  
  // Sub-itinerary items
  subItems?: SubItem[];

  // Visual Canvas Props
  canvasX?: number; // Percentage 0-100
  canvasY?: number; // Percentage 0-100
  
  // Transport to the NEXT item
  transportToNext?: TransportType;
  
  // The currently ACTIVE/SELECTED transport details
  transportDetails?: TransportDetails;
  
  // List of potential options (e.g., Option A: Flight, Option B: Train)
  transportOptions?: TransportDetails[];

  transportHudOffset?: { x: number; y: number }; // Percentage offset from midpoint
}

export interface Trip {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  backgroundImage?: string; // Custom user uploaded map/image
  items: TripItem[];
  accommodations: Accommodation[];
  totalBudget: number;
  createdAt: number;
  returnTrip?: boolean; // Whether the trip loops back to start
  hasFinalReport?: boolean; // Whether a final report has been generated
}

export interface ChartData {
  name: string;
  value: number;
}