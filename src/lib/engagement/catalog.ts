export const DELIVERABLE_PERIODICITIES = [

  "daily",

  "weekly",

  "monthly",

  "bimonthly",

  "quarterly",

  "semiannual",

  "annual",

  "not_applicable",

] as const;



export type DeliverablePeriodicity = typeof DELIVERABLE_PERIODICITIES[number];



export const DELIVERABLE_PERIODICITY_LABELS: Record<DeliverablePeriodicity, string> = {

  daily: "Diariamente",

  weekly: "Semanalmente",

  monthly: "Mensalmente",

  bimonthly: "Bimensalmente",

  quarterly: "Trimestralmente",

  semiannual: "Semestralmente",

  annual: "Anualmente",

  not_applicable: "Não aplicável",

};



export interface EligibleTaskInput {

  macroprocess: string;

  process: string;

  label: string;

}



export interface EligibleDeliverableInput {

  label: string;

  periodicity: DeliverablePeriodicity;

}



export function formatEligibleTaskDisplay(task: {

  macroprocess: string;

  process: string;

  label: string;

}): string {

  return [task.macroprocess, task.process, task.label]

    .map((part) => part.trim())

    .filter((part) => part.length > 0)

    .join(' > ');

}



export function formatEligibleDeliverableDisplay(deliverable: {

  label: string;

  periodicity: DeliverablePeriodicity;

}): string {

  const label = deliverable.label.trim();

  if (deliverable.periodicity === 'not_applicable') {

    return label;

  }

  return `${label} (${DELIVERABLE_PERIODICITY_LABELS[deliverable.periodicity]})`;

}

