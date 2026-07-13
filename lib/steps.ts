/**
 * AGENCY CHECKLIST — update for each new agency deployment.
 * - Edit step names, notes, and links below.
 * - Add/remove steps as needed (keep unique `id` values).
 * - Adjust StepGroup names and STEP_GROUPS array to match the new workflow.
 */
export type StepGroup =
  | "Getting started"
  | "Licensing"
  | "Training"
  | "Contracting"
  | "Business launch"
  | "Go time!";

export type StepLink = { label: string; url: string };

export type Step = {
  id: string;
  name: string;
  group: StepGroup;
  licensedGroup?: StepGroup;
  note?: string;
  links?: StepLink[];
  unlicensedOnly?: boolean;
};

function l(label: string, url: string): StepLink {
  return { label, url };
}

export const STEPS: Step[] = [
  {
    id: "1",
    name: "Watch welcome video",
    group: "Getting started",
    note: "2 min intro video",
    links: [l("Watch video", "https://drive.google.com/file/d/1Cq8GpdmgVyo9ymu-8u7eb-r7C59E07rB/view?usp=sharing")],
  },
  { id: "2", name: "Pass state exam", group: "Licensing", unlicensedOnly: true },
  {
    id: "3",
    name: "Fingerprints done and submitted (if required)",
    group: "Licensing",
    note: "See state licensing requirements",
    unlicensedOnly: true,
    links: [l("State Requirements", "https://docs.google.com/document/d/1O3wmlDe9VLMu3jMmEO5OIrRPXfLvApSIt_GqcRLZnxE/edit?tab=t.0")],
  },
  {
    id: "4",
    name: "Apply for state licensure",
    group: "Licensing",
    unlicensedOnly: true,
    links: [l("Apply at NIPR", "https://nipr.com/")],
  },
  {
    id: "license_received",
    name: "Full license received",
    group: "Licensing",
    note: "Admin or agent confirms",
    unlicensedOnly: true,
  },
  { id: "5", name: "Confirm you're in agency Slack chats", group: "Getting started", links: [l("Join Slack", "https://join.slack.com/t/huntagency-master/shared_invite/zt-3ua3kgjb4-c9SwZZy8T_5b8GuKWPPFkg")] },
  {
    id: "6",
    name: "Add weekly calls to calendar",
    group: "Getting started",
    links: [l("View calendar", "https://docs.google.com/spreadsheets/d/18YvskC_fQ3e1IfXtAbtK6eN5H9ZfYrqwaFYCQ-ygavU/edit?usp=sharing")],
  },
  { id: "8", name: "Submit headshot for promotional purposes", group: "Getting started", links: [l("Submit headshot", "https://forms.gle/SyY4j2AK2yVP2JE38")] },
  { id: "9a", name: "Open separate banking account for insurance deposits", group: "Getting started" },
  { id: "9b", name: "Open separate email account for insurance work", group: "Getting started" },
  {
    id: "onboarding_login",
    name: "Create logins to onboarding portal",
    group: "Getting started",
    note: "Use your new work email and create a password — stop there for now.",
    links: [l("Open portal", "http://www.quilityonboarding.com/")],
    unlicensedOnly: true,
  },
  {
    id: "course_done",
    name: "Finished 20-hour pre-licensing course",
    group: "Getting started",
    note: "Agent OR admin can check.",
    unlicensedOnly: true,
  },
  {
    id: "7",
    name: "Complete SFG Application",
    group: "Licensing",
    licensedGroup: "Getting started",
    note: "Approval 24-48 hrs.",
    links: [l("Open application", "http://www.quilityonboarding.com/")],
  },
  {
    id: "10",
    name: "Complete Anti-Money Laundering (AML) course",
    group: "Contracting",
    links: [l("AML course", "https://www.webce.com/catalog/courses/course-information?c=9317")],
  },
  {
    id: "leake",
    name: "Enrolled in Leake Agency Mortgage Protection Sales Mastery",
    group: "Training",
    note: "$25. Get through Module 8.",
    links: [l("Purchase training", "https://training.theleakeagency.com/p/effective-mortgage-protection-sales?affcode=1444119_bbt65tue")],
  },
  {
    id: "quigley",
    name: "Role Play Appointment Setting with Quigley",
    group: "Training",
    note: "Choose your upline and they'll be able to see your progress and help coach. Practice 25 new mortgage holders and 25 aged leads.",
    links: [l("Open Quigley", "https://quigley.momentousfinancialpartners.com/sign-in")],
  },
  { id: "11", name: "Received 'Welcome to Symmetry' email", group: "Contracting" },
  {
    id: "12",
    name: "Create SureLC account",
    group: "Contracting",
    note: "Step 3 in welcome email. No red/yellow flags.",
  },
  {
    id: "13",
    name: "Purchase E&O Insurance and upload to SureLC",
    group: "Contracting",
    note: "Min $1M coverage. Click 'Other industries', type 'insurance agent', DBA is your name, enter address manually, coverage starts today, 0 employees, $75k expected income, select 'Life and Health', individual agent. Remove general liability from cart — total should be $21/mo.",
    links: [l("Get E&O Insurance", "https://refer.nextinsurance.com/AdqS82x")],
  },
  {
    id: "14",
    name: "Notify hiring agent and ops manager when SureLC complete",
    group: "Contracting",
    note: "Can take up to 2 weeks for writing numbers",
  },
  { id: "15", name: "Log into OPT and update password", group: "Contracting", note: "OPT ID is found in HQ profile, premium version not needed", links: [l("Open OPT", "https://v2.sfgcrm.com/")] },
  { id: "17", name: "Complete SureLC carrier contracts", group: "Contracting", note: "No LTC or annuity training needed" },
  { id: "18", name: "As carrier appointments arrive — save all login info", group: "Contracting", note: "Americo, F&G, UHL, Foresters, SBLI, Corebridge, American Amicable, Banner, Mutual of Omaha, Transamerica" },
  {
    id: "16",
    name: "Write first application and submit to OPT",
    group: "Contracting",
    note: "Triggers funnel stage: Wrote first business",
    links: [l("Watch tutorial", "https://www.loom.com/share/6674330eb81f4f32ba8fb23aa4bd25d4")],
  },
  {
    id: "19",
    name: "Complete HQ Summit Training through Basecamp",
    group: "Training",
    note: "~3-4 hours",
    links: [l("Open Summit", "https://hq.quility.com/summit")],
  },
  {
    id: "20",
    name: "Complete Navigator Training in HQ",
    group: "Training",
    links: [l("Watch walkthrough", "https://www.loom.com/share/ae8b5889c0384620a07ea2b14dac6cd1?sid=976049f6-790c-4521-bf8d-139203188e7a")],
  },
  {
    id: "21",
    name: "Get in the workroom and listen to live dialing",
    group: "Training",
    note: "Password: grit",
    links: [l("Join Zoom", "https://us02web.zoom.us/j/3580944678?pwd=bjVqVmJZMS9LaDJSMEFidkI4NWozQT09")],
  },
  {
    id: "22",
    name: "Watch New Agent Activation recording",
    group: "Training",
    note: "10 min",
    links: [l("Watch recording", "https://vimeo.com/1028199267?share=copy#t=0")],
  },
  {
    id: "23",
    name: "Print/save Levels of Leadership, Promo Guidelines, 4 Keys, 4 Cornerstones",
    group: "Training",
    links: [
      l("Levels of Leadership", "https://hq.quility.com/cms/document/view/44534"),
      l("Promo Guidelines", "https://hq.quility.com/page/promotion-guidelines-and-bonuses"),
      l("Core Values", "https://hq.quility.com/page/symmetry-core-values"),
      l("4 Keys", "https://hq.quility.com/api/public/document/57508/view/four-keys-successful-week"),
      l("4 Cornerstones", "https://hq.quility.com/api/public/document/62330/view/four-cornerstones-of-success"),
    ],
  },
  {
    id: "24",
    name: "Reach out to your upline to schedule a Goal Setting conversation",
    group: "Business launch",
  },
  {
    id: "flat_tire",
    name: "Flat Tire Appointments",
    group: "Business launch",
    links: [
      l("Flat Tire Script", "https://drive.google.com/file/d/1785rgWe9uSYXPXL2j_GTGghNBjWH5m3N/view?usp=sharing"),
      l("Flat Tire CQF", "https://docs.google.com/document/d/1O2mrqpp9bUs69FNv4pR54MWPvmf4iwCFgTBSxxmJ-z0/edit?usp=sharing"),
    ],
  },
  {
    id: "25",
    name: "Make your business known on social media",
    group: "Business launch",
    links: [
      l("Social guide", "https://docs.google.com/document/d/1sQVEQ437D6Lwr1KZBIopbXQavHfaYPosi_WEU79ZglY/edit?tab=t.0"),
    ],
  },
  {
    id: "26",
    name: "Purchase first set of leads (50 CIB's, 50 CIC's)",
    group: "Business launch",
    links: [
      l("Watch tutorial", "https://hq.quility.com/summit/first-lead-order"),
      l("Lead tracker", "https://docs.google.com/spreadsheets/d/1KOwljBH41JKIB9HRR-XU7QVQXH9k_ZHJ1TnkxiN3smA/edit?gid=0#gid=0"),
    ],
  },
  {
    id: "first_dials_docs",
    name: "Save/Print Documents for First Dials",
    group: "Business launch",
    links: [
      l("Bonus Script Modeled", "https://www.loom.com/share/917f78ace0ee42fe9d362459f51f6730"),
      l("Bonus Lead SCRIPT (opening paragraph)", "https://docs.google.com/document/d/1cnmFLDfX0KaG3rENWp-zdsRr6BnU5lR-/edit?usp=sharing&ouid=116442375128958332146&rtpof=true&sd=true"),
    ],
  },
  {
    id: "27",
    name: "Print/save CQF for dialing",
    group: "Business launch",
    links: [l("Open CQF", "https://drive.google.com/file/d/1v3TzBQMM7-2vx4dDj5mvZae8OWll5YDV/view?usp=sharing")],
  },
  {
    id: "activity_report",
    name: "Print/Save Activity Report",
    group: "Business launch",
    note: "Track your dials, contacts, and appointments to put into SimplicityAI.",
    links: [l("Open Activity Report", "https://drive.google.com/file/d/1WHS4Q4Gy_Hn_IkQhp20CMRjJtatl_ve6/view?usp=sharing")],
  },
  {
    id: "28",
    name: "Bookmark underwriting cheat sheet",
    group: "Business launch",
    links: [l("Open cheat sheet", "https://docs.google.com/spreadsheets/d/1vd7cjSb3wB6FlH--YrLfzVur3XOclbYSAp8hP_rhuNs/edit?usp=sharing")],
  },
  {
    id: "29",
    name: "Bookmark sfgquotes.com",
    group: "Business launch",
    links: [l("Open SFGQuotes", "http://sfgquotes.com/")],
  },
  {
    id: "30",
    name: "Begin using the SimplicityAI Counting What Counts tracker",
    group: "Business launch",
    links: [l("Open tracker", "https://simplicityai.netlify.app/?join=SFG0016490&by=Jordan%20Hunt")],
  },
  { id: "31", name: "Get in the Zoom Workroom and start dialing", group: "Go time!", note: "Password: grit", links: [l("Join Zoom", "https://us06web.zoom.us/j/3580944678?from=join#success")] },
  { id: "32", name: "Set your first appointments — keep dialing!", group: "Go time!" },
  {
    id: "33",
    name: "Watch Underwriting Basics video",
    group: "Go time!",
    note: "23 min",
    links: [l("Watch video", "https://www.loom.com/share/95d0ba5c23c44a0296313df49b362c8e?sid=5f1bc87e-0d9b-42be-bcd3-23a6c9214849")],
  },
  {
    id: "34",
    name: "Watch Running the Appointment video if needed",
    group: "Go time!",
    links: [l("Running the Appointment", "https://www.larsenlifegroup.com/appointments")],
  },
  {
    id: "35",
    name: "Congrats! You did it once, do it again!",
    group: "Go time!",
    links: [l("Wash Rinse Repeat", "https://www.loom.com/share/1089c1a6c20543a0927c9029d3f29e62")],
  },
];

export const STEP_GROUPS: StepGroup[] = [
  "Getting started",
  "Licensing",
  "Training",
  "Contracting",
  "Business launch",
  "Go time!",
];

export function stepsForAgent(type: "licensed" | "unlicensed"): Step[] {
  const steps = STEPS.filter((s) => !s.unlicensedOnly || type === "unlicensed");
  if (type === "licensed") {
    return steps.map((s) => s.licensedGroup ? { ...s, group: s.licensedGroup } : s);
  }
  return steps;
}
