// src/config/options.js

export const COMPANIES = [
  { id: "privat", label: "Privat" },
  { id: "assistio_tech", label: "Assitio Tech AS" },
  { id: "bo_kommune", label: "Bø kommune" },
  { id: "alt_det_andre", label: "Alt det andre" },
  { id: "pa_plass_as", label: "På plass AS" },
];

export const COMPANY_DEFAULT_ID = "privat";
export const COMPANY_FILTER_ALL_ID = "all";

export const PRIORITIES = [
    { id: "low", label: "Low" },
    { id: "medium", label: "Medium" },
    { id: "high", label: "High" },
    { id: "critical", label: "Critical" },
  ];
  
  export const PRIORITY_DEFAULT_ID = "medium";
  
  export const WORK_TYPES = [
    { id: "admin", label: "Admin" },
    { id: "field", label: "Felt" },
    { id: "machine", label: "Maskin" },
    { id: "driving", label: "Kjøring" },
    { id: "maintenance", label: "Vedlikehold" },
    { id: "dev", label: "Dev" },
    { id: "other", label: "Annet" },
  ];
  
  export const WORKTYPE_DEFAULT_ID = "other";
  
  export const COLUMNS = [
    { id: "inbox", label: "Inbox" },
    { id: "todo", label: "To Do" },
    { id: "inProgress", label: "In Progress" },
    { id: "blocked", label: "Blocked" },
    { id: "done", label: "Done" },
  ];
  
  export const DEFAULT_COLUMN_ID = "inbox";
  
