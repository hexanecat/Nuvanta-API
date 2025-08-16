// Copied from Nuvanta-Web/src/data/mockData.ts
// If you update the original, update this copy as well.

// Staff Data
export interface Nurse {
	id: number;
	name: string;
	unit: string;
	shift: "day" | "night";
	burnoutRisk: "low" | "medium" | "high";
	consecutiveShifts: number;
	lastBreak: string; // ISO date string
}

export interface Unit {
	id: number;
	name: string;
	beds: number;
	requiredNursesDay: number;
	requiredNursesNight: number;
}

export const nurses: Nurse[] = [
	// Day shift nurses (14)
	{ id: 1, name: "Sarah Chen", unit: "Medical-Surgical", shift: "day", burnoutRisk: "high", consecutiveShifts: 6, lastBreak: "2023-06-01" },
	{ id: 2, name: "James Wilson", unit: "Medical-Surgical", shift: "day", burnoutRisk: "low", consecutiveShifts: 2, lastBreak: "2023-06-10" },
	{ id: 3, name: "Emily Johnson", unit: "Medical-Surgical", shift: "day", burnoutRisk: "low", consecutiveShifts: 1, lastBreak: "2023-06-11" },
	{ id: 4, name: "David Lee", unit: "Medical-Surgical", shift: "day", burnoutRisk: "low", consecutiveShifts: 3, lastBreak: "2023-06-09" },
	{ id: 5, name: "Lisa Patel", unit: "Medical-Surgical", shift: "day", burnoutRisk: "low", consecutiveShifts: 2, lastBreak: "2023-06-10" },
	{ id: 6, name: "Robert Kim", unit: "Intensive Care", shift: "day", burnoutRisk: "low", consecutiveShifts: 1, lastBreak: "2023-06-11" },
	{ id: 7, name: "Jennifer Lopez", unit: "Intensive Care", shift: "day", burnoutRisk: "low", consecutiveShifts: 2, lastBreak: "2023-06-10" },
	{ id: 8, name: "Michael Johnson", unit: "Intensive Care", shift: "day", burnoutRisk: "high", consecutiveShifts: 4, lastBreak: "2023-06-08" },
	{ id: 9, name: "Nancy Garcia", unit: "Emergency", shift: "day", burnoutRisk: "low", consecutiveShifts: 1, lastBreak: "2023-06-11" },
	{ id: 10, name: "Thomas Brown", unit: "Emergency", shift: "day", burnoutRisk: "low", consecutiveShifts: 2, lastBreak: "2023-06-10" },
	{ id: 11, name: "Sandra Martinez", unit: "Emergency", shift: "day", burnoutRisk: "medium", consecutiveShifts: 3, lastBreak: "2023-06-09" },
	{ id: 12, name: "Kevin Smith", unit: "Emergency", shift: "day", burnoutRisk: "low", consecutiveShifts: 1, lastBreak: "2023-06-11" },
	{ id: 13, name: "Maria Gonzalez", unit: "Maternity", shift: "day", burnoutRisk: "low", consecutiveShifts: 2, lastBreak: "2023-06-10" },
	{ id: 14, name: "William Davis", unit: "Maternity", shift: "day", burnoutRisk: "low", consecutiveShifts: 1, lastBreak: "2023-06-11" },
  
	// Night shift nurses (12)
	{ id: 15, name: "Patricia White", unit: "Medical-Surgical", shift: "night", burnoutRisk: "low", consecutiveShifts: 1, lastBreak: "2023-06-11" },
	{ id: 16, name: "Richard Taylor", unit: "Medical-Surgical", shift: "night", burnoutRisk: "low", consecutiveShifts: 2, lastBreak: "2023-06-10" },
	{ id: 17, name: "Elizabeth Thomas", unit: "Medical-Surgical", shift: "night", burnoutRisk: "medium", consecutiveShifts: 3, lastBreak: "2023-06-09" },
	{ id: 18, name: "Joseph Harris", unit: "Intensive Care", shift: "night", burnoutRisk: "low", consecutiveShifts: 1, lastBreak: "2023-06-11" },
	{ id: 19, name: "Susan Jackson", unit: "Intensive Care", shift: "night", burnoutRisk: "low", consecutiveShifts: 2, lastBreak: "2023-06-10" },
	{ id: 20, name: "Daniel Moore", unit: "Intensive Care", shift: "night", burnoutRisk: "low", consecutiveShifts: 1, lastBreak: "2023-06-11" },
	{ id: 21, name: "Carol Martin", unit: "Emergency", shift: "night", burnoutRisk: "low", consecutiveShifts: 1, lastBreak: "2023-06-11" },
	{ id: 22, name: "Mark Thompson", unit: "Emergency", shift: "night", burnoutRisk: "low", consecutiveShifts: 2, lastBreak: "2023-06-10" },
	{ id: 23, name: "Michelle Walker", unit: "Emergency", shift: "night", burnoutRisk: "low", consecutiveShifts: 1, lastBreak: "2023-06-11" },
	{ id: 24, name: "George Young", unit: "Maternity", shift: "night", burnoutRisk: "low", consecutiveShifts: 1, lastBreak: "2023-06-11" },
	{ id: 25, name: "Karen Allen", unit: "Maternity", shift: "night", burnoutRisk: "low", consecutiveShifts: 2, lastBreak: "2023-06-10" },
	{ id: 26, name: "Edward King", unit: "Maternity", shift: "night", burnoutRisk: "low", consecutiveShifts: 1, lastBreak: "2023-06-11" }
];

export const units: Unit[] = [
	{ id: 1, name: "Medical-Surgical", beds: 12, requiredNursesDay: 6, requiredNursesNight: 4 },
	{ id: 2, name: "Intensive Care", beds: 8, requiredNursesDay: 3, requiredNursesNight: 3 },
	{ id: 3, name: "Emergency", beds: 10, requiredNursesDay: 4, requiredNursesNight: 3 },
	{ id: 4, name: "Maternity", beds: 10, requiredNursesDay: 2, requiredNursesNight: 3 }
];

// Follow-up Tasks
export interface FollowUpTask {
	id: number;
	description: string;
	dateCreated: string;
	status: "completed" | "pending" | "overdue";
	priority: "low" | "medium" | "high";
}

export const followUpTasks: FollowUpTask[] = [
	{ id: 1, description: "Equipment request for Room 202", dateCreated: "2023-06-10", status: "overdue", priority: "high" },
	{ id: 2, description: "Patient complaint follow-up", dateCreated: "2023-06-10", status: "overdue", priority: "medium" },
	{ id: 3, description: "Schedule adjustment request", dateCreated: "2023-06-10", status: "overdue", priority: "medium" },
	{ id: 4, description: "Staff training registration", dateCreated: "2023-06-12", status: "pending", priority: "low" },
	{ id: 5, description: "Inventory check for supplies", dateCreated: "2023-06-12", status: "pending", priority: "medium" }
];

// Compliance Reports
export interface ComplianceReport {
	id: number;
	name: string;
	dueDate: string;
	percentComplete: number;
	lastEdited: string;
}

export const complianceReports: ComplianceReport[] = [
	{ id: 1, name: "Quarterly staff performance report", dueDate: "2023-06-16", percentComplete: 65, lastEdited: "2023-06-12" },
	{ id: 2, name: "Monthly patient satisfaction survey", dueDate: "2023-06-30", percentComplete: 20, lastEdited: "2023-06-05" },
	{ id: 3, name: "Annual safety compliance audit", dueDate: "2023-07-15", percentComplete: 10, lastEdited: "2023-06-01" },
	{ id: 4, name: "Weekly medication error report", dueDate: "2023-06-14", percentComplete: 90, lastEdited: "2023-06-12" }
];

// Copilot response templates
export const copilotResponses: Record<string, string> = {
	"what should i follow up on today": `
		<p class="mb-2">Based on your current tasks, I recommend you follow up on:</p>
		<ol class="list-decimal pl-5 mb-3 space-y-1">
			<li>Equipment request for Room 202 (overdue by 3 days)</li>
			<li>Patient complaint follow-up from Mr. Johnson in Room 215</li>
			<li>Schedule adjustment request from Sarah Chen</li>
		</ol>
		<p>Would you like me to prioritize these tasks or help you create a follow-up plan?</p>
	`,
	"who is at risk of burnout": `
		<p class="mb-2">I've identified 2 staff members showing burnout risk indicators:</p>
		<ul class="list-disc pl-5 mb-3 space-y-1">
			<li><strong>Sarah Chen</strong> - Has worked 6 consecutive shifts, including 2 double shifts this week.</li>
			<li><strong>Michael Johnson</strong> - Recently experienced two code events and has requested schedule changes 3 times this month.</li>
		</ul>
		<p>Consider checking in with them individually. Would you like suggestions for supporting these team members?</p>
	`,
	"what are my top 3 priorities": `
		<p class="mb-2">Based on urgency and importance, your top 3 priorities today should be:</p>
		<ol class="list-decimal pl-5 mb-3 space-y-1">
			<li><strong>Staff burnout follow-up</strong> - Schedule brief check-ins with Sarah and Michael.</li>
			<li><strong>Complete overdue follow-up tasks</strong> - Especially the equipment request which impacts patient care.</li>
			<li><strong>Quarterly report progress</strong> - You need to complete at least 15% more by end of day to stay on track for Friday's deadline.</li>
		</ol>
		<p>Would you like help developing an action plan for any of these priorities?</p>
	`,
	"default": `
		<p>I'm your nurse manager copilot. How can I assist you today? I can help with staffing analysis, burnout risk assessment, task prioritization, or compliance reporting.</p>
	`
};
