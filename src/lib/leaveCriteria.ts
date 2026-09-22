// Casual-leave criteria exactly as printed on the paper "Leave Request Form".
// `no` is the 1-based row number the form refers to ("8 & 9 & 11 & 12 are not applicable…").
export interface CasualCriterion {
  no: number;
  text: string;
  allocation: string;
}

export const CASUAL_CRITERIA: CasualCriterion[] = [
  { no: 1,  text: 'Death of Parents, Siblings, Spouse, or Children', allocation: '5 Day(s)' },
  { no: 2,  text: 'Death of Grand Parents, Uncle, Aunt, Cousin, Nephew, Niece', allocation: '3 Day(s)' },
  { no: 3,  text: 'Death of a Family member other than the above member', allocation: '1 Day(s)' },
  { no: 4,  text: 'Marriage Ceremony (Self)', allocation: '5 Day(s)' },
  { no: 5,  text: 'Marriage Ceremony (Family member within a relative in the 2nd degree)', allocation: '2 Day(s)' },
  { no: 6,  text: 'Marriage Ceremony (Cousin)', allocation: '1 Day(s)' },
  { no: 7,  text: "Wife's Delivery", allocation: '3 Day(s)' },
  { no: 8,  text: 'Exam (1 Day/1 (Subject) Exam)', allocation: '1 Day(s)' },
  { no: 9,  text: 'Transfer Residential Location', allocation: '2 Day(s)' },
  { no: 10, text: 'Emergency Support (Write In Remarks)', allocation: '1 Day(s)' },
  { no: 11, text: 'Saturday', allocation: '(Beginning and End of the Month)' },
  { no: 12, text: 'Before or After religious holidays (other than Islamic holidays) only for other than Muslim', allocation: '1 Day(s)' },
];

export const CASUAL_CRITERIA_NOTE =
  'Those who submit resignation letter, 8 & 9 & 11 & 12 are not applicable as casual leave since resigning person is expected succeeding jobs.';

export const getCasualCriterion = (no?: number) => CASUAL_CRITERIA.find(c => c.no === no);
