export interface Automobile {
  id: string;
  name: string;
  mpg: number;
  cylinders: number;
  displacement: number;
  horsepower: number;
  weight: number;
  acceleration: number;
  model_year: number;
  origin: string;
}

export type CreateAutomobilePayload = Omit<Automobile, 'id'>;

export interface AutomobileResponse {
  success: boolean;
  data: Automobile[];
}

export interface SingleAutomobileResponse {
  success: boolean;
  data: Automobile;
}
