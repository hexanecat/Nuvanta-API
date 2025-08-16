import OpenAI from "openai";
import {
  ChatCompletionMessageParam,
  ChatCompletionSystemMessageParam,
  ChatCompletionUserMessageParam,
} from "openai/resources";
import {
  nurses,
  units,
  followUpTasks,
  complianceReports,
  copilotResponses,
} from "../client/src/data/mockData";
import {
  getStaffingForDay,
  getUpcomingStaffingIssues,
  getStaffingByUnit,
  getUnderstaffedDays,
  getNursesForDay,
} from "../client/src/data/scheduleData";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "your-api-key-placeholder",
});

// Generate detailed staffing responses based on our schedule data
function generateStaffingResponse(prompt: string): string {
  const today = "2025-05-17"; // Use our fixed date for consistency

  // Get today's staffing situation
  const todayStaffing = getStaffingForDay(today);

  // Get future staffing issues
  const upcomingStaffing = getUpcomingStaffingIssues(today);

  // Get unit-specific staffing
  const unitStaffing = getStaffingByUnit(today);

  // Handle different types of staffing questions
  if (prompt.includes("today") || prompt.includes("current")) {
    return `
      <p>Today's staffing (May 17, 2025):</p>
      <ul>
        <li><strong>Day Shift (7am-7pm):</strong> ${todayStaffing.day}/${todayStaffing.dayRequired} nurses scheduled (${todayStaffing.dayShortage > 0 ? "Short " + todayStaffing.dayShortage + " RNs" : "Fully staffed"})</li>
        <li><strong>Night Shift (7pm-7am):</strong> ${todayStaffing.night}/${todayStaffing.nightRequired} nurses scheduled (${todayStaffing.nightShortage > 0 ? "Short " + todayStaffing.nightShortage + " RNs" : "Fully staffed"})</li>
      </ul>
      
      <p>Unit breakdown:</p>
      <ul>
        ${Object.values(unitStaffing)
          .map(
            (unit) =>
              `<li><strong>${unit.name}:</strong> ${unit.dayStaff}/${unit.requiredDay} day shift, ${unit.nightStaff}/${unit.requiredNight} night shift</li>`,
          )
          .join("")}
      </ul>
    `;
  }

  // For future forecasting questions
  if (
    prompt.includes("forecast") ||
    prompt.includes("upcoming") ||
    prompt.includes("next week") ||
    prompt.includes("future")
  ) {
    return `
      <p>Here's your 5-day staffing forecast:</p>
      <ul>
        ${upcomingStaffing
          .map(
            (day) =>
              `<li><strong>${day.dayOfWeek}, ${day.fullDate}:</strong> 
            <br>Day shift: ${day.dayStaffing.scheduled}/${day.dayStaffing.required} nurses (${day.dayStaffing.status === "understaffed" ? `<span style="color:#f87171">Short ${day.dayStaffing.required - day.dayStaffing.scheduled} RNs</span>` : '<span style="color:#6ee7b7">Fully staffed</span>'})
            <br>Night shift: ${day.nightStaffing.scheduled}/${day.nightStaffing.required} nurses (${day.nightStaffing.status === "understaffed" ? `<span style="color:#f87171">Short ${day.nightStaffing.required - day.nightStaffing.scheduled} RNs</span>` : '<span style="color:#6ee7b7">Fully staffed</span>'})
          </li>`,
          )
          .join("")}
      </ul>
      
      <p>The most critical staffing concerns appear to be on Wednesday, May 21st, when we're projected to be short 3 RNs.</p>
    `;
  }

  // For unit-specific questions
  if (
    prompt.includes("unit") ||
    prompt.includes("department") ||
    prompt.includes("floor")
  ) {
    const unitMatches = {
      medical: "Medical-Surgical",
      surgical: "Medical-Surgical",
      "med-surg": "Medical-Surgical",
      icu: "Intensive Care",
      intensive: "Intensive Care",
      emergency: "Emergency",
      er: "Emergency",
      ed: "Emergency",
    };

    // Try to find which unit they're asking about
    let targetUnit = "";
    for (const [keyword, unitName] of Object.entries(unitMatches)) {
      if (prompt.includes(keyword)) {
        targetUnit = unitName;
        break;
      }
    }

    if (targetUnit && unitStaffing[targetUnit]) {
      const unit = unitStaffing[targetUnit];
      return `
        <p><strong>${unit.name} Unit Staffing (May 17, 2025):</strong></p>
        <ul>
          <li><strong>Day Shift:</strong> ${unit.dayStaff}/${unit.requiredDay} nurses scheduled (${unit.dayShortage > 0 ? "Short " + unit.dayShortage + " RNs" : "Fully staffed"})</li>
          <li><strong>Night Shift:</strong> ${unit.nightStaff}/${unit.requiredNight} nurses scheduled (${unit.nightShortage > 0 ? "Short " + unit.nightShortage + " RNs" : "Fully staffed"})</li>
        </ul>
        
        <p>Nursing staff assigned to this unit today:</p>
        <ul>
          ${nurses
            .filter((nurse) => nurse.unit === targetUnit)
            .filter((nurse) => {
              // Check if this nurse is working today
              const todayDayNurses = getNursesForDay(today, "day");
              const todayNightNurses = getNursesForDay(today, "night");
              return (
                todayDayNurses.includes(nurse.id) ||
                todayNightNurses.includes(nurse.id)
              );
            })
            .map(
              (nurse) =>
                `<li>${nurse.name} (${nurse.shift === "day" ? "Day Shift" : "Night Shift"})</li>`,
            )
            .join("")}
        </ul>
      `;
    }
  }

  // For coverage and scheduling questions
  if (
    prompt.includes("coverage") ||
    prompt.includes("schedule") ||
    prompt.includes("understaffed")
  ) {
    const understaffedDays = getUnderstaffedDays();

    if (understaffedDays.length === 0) {
      return `
        <p>Good news! We have full staffing coverage for the entire month. All shifts have the required number of nurses scheduled.</p>
        <p>Here's a summary of our staffing requirements:</p>
        <ul>
          <li>Day shift (7am-7pm): 14 nurses required</li>
          <li>Night shift (7pm-7am): 12 nurses required</li>
        </ul>
        <p>Each nurse typically works 3 shifts per week, with a fair distribution of weekends.</p>
      `;
    } else {
      return `
        <p>I've identified ${understaffedDays.length} shifts this month that are currently understaffed:</p>
        <ul>
          ${understaffedDays
            .slice(0, 5)
            .map(
              (day) =>
                `<li><strong>${new Date(day.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}:</strong> 
             ${day.shift === "day" ? "Day" : "Night"} shift is short ${day.shortage} RNs</li>`,
            )
            .join("")}
          ${understaffedDays.length > 5 ? `<li>...and ${understaffedDays.length - 5} more understaffed shifts</li>` : ""}
        </ul>
        
        <p>I recommend reaching out to per-diem staff or offering overtime to cover these gaps. Would you like me to suggest specific nurses who might be available to pick up these shifts?</p>
      `;
    }
  }

  // Default staffing response for general questions
  return `
    <p>Current staffing overview (May 17, 2025):</p>
    <ul>
      <li><strong>Total nursing staff:</strong> 26 nurses (14 day shift, 12 night shift)</li>
      <li><strong>Today's coverage:</strong> ${todayStaffing.day}/${todayStaffing.dayRequired} day shift, ${todayStaffing.night}/${todayStaffing.nightRequired} night shift</li>
      <li><strong>Upcoming concerns:</strong> Friday, May 21st, when we're projected to be short 3 RNs</li>
    </ul>
    
    <p>Each nurse typically works 3 shifts per week, with schedules created to ensure adequate coverage across all units. Is there a specific aspect of our staffing you'd like more details about?</p>
  `;
}

// Helper function to find matching predefined responses
function findPreDefinedResponse(prompt: string): string | null {
  const lowerPrompt = prompt.toLowerCase().trim();

  // Check if the prompt directly matches any of our predefined keys
  for (const [key, response] of Object.entries(copilotResponses)) {
    if (lowerPrompt.includes(key.toLowerCase())) {
      console.log(`Using predefined response for query containing '${key}'`);
      return response;
    }
  }

  // For staffing questions, generate a detailed response from our schedule data
  // First, check for more specific staffing-related topics that should be handled by specialized functions
  if (
    lowerPrompt.includes("retain") ||
    lowerPrompt.includes("retention") ||
    (lowerPrompt.includes("keep") && lowerPrompt.includes("staff")) ||
    (lowerPrompt.includes("staff") && lowerPrompt.includes("turnover"))
  ) {
    // This is handled by the nurse retention response below
    return null;
  }

  if (
    lowerPrompt.includes("acuity") ||
    lowerPrompt.includes("workload") ||
    lowerPrompt.includes("patient ratio") ||
    lowerPrompt.includes("staffing model")
  ) {
    // This is handled by the acuity response below
    return null;
  }

  if (
    lowerPrompt.includes("education") ||
    lowerPrompt.includes("training") ||
    lowerPrompt.includes("competency") ||
    lowerPrompt.includes("certification")
  ) {
    // This is handled by the education response below
    return null;
  }

  if (
    lowerPrompt.includes("quality") ||
    lowerPrompt.includes("improvement") ||
    lowerPrompt.includes("metrics") ||
    lowerPrompt.includes("performance")
  ) {
    // This is handled by the quality metrics response below
    return null;
  }

  // Now handle general staffing questions about schedule, shifts, or coverage
  if (
    (lowerPrompt.includes("staff") && lowerPrompt.includes("schedule")) ||
    lowerPrompt.includes("shift coverage") ||
    (lowerPrompt.includes("nurse") && lowerPrompt.includes("schedule")) ||
    (lowerPrompt.includes("how many") && lowerPrompt.includes("nurses")) ||
    lowerPrompt.match(/^staff(ing)?$/i) ||
    (lowerPrompt.includes("today") && lowerPrompt.includes("staff"))
  ) {
    return generateStaffingResponse(lowerPrompt);
  }

  // For nurse retention questions
  if (
    (lowerPrompt.includes("retain") &&
      (lowerPrompt.includes("nurse") || lowerPrompt.includes("staff"))) ||
    lowerPrompt.includes("retention") ||
    (lowerPrompt.includes("keep") && lowerPrompt.includes("staff")) ||
    (lowerPrompt.includes("staff") && lowerPrompt.includes("turnover")) ||
    (lowerPrompt.includes("reduce") && lowerPrompt.includes("turnover"))
  ) {
    return `
      <p><strong>Nurse Retention Strategies:</strong></p>
      <p>Based on our hospital data and industry best practices, here are evidence-based strategies to improve nurse retention:</p>
      
      <ul>
        <li><strong>Address burnout proactively:</strong> Our dashboard shows 2 nurses currently at high burnout risk. Consider reducing their consecutive shifts and ensuring adequate breaks.</li>
        <li><strong>Competitive compensation:</strong> Benchmark salaries against regional averages (currently 8% below market in our ICU unit)</li>
        <li><strong>Career advancement:</strong> Implement clinical ladder programs with clear advancement paths</li>
        <li><strong>Scheduling flexibility:</strong> Allow self-scheduling within parameters - this has reduced turnover by 23% in similar hospitals</li>
        <li><strong>Leadership development:</strong> Train nurse managers in supportive leadership practices</li>
        <li><strong>Recognition programs:</strong> Implement formal and informal recognition systems</li>
        <li><strong>Shared governance:</strong> Include nurses in decision-making processes</li>
        <li><strong>Work-life balance:</strong> Enforce limits on overtime and consecutive shifts (recommend max 3 consecutive)</li>
      </ul>
      
      <p>Would you like me to analyze your current staffing patterns to identify specific retention risks or develop a more detailed retention plan for your hospital?</p>
    `;
  }

  // For burnout questions
  if (
    lowerPrompt.includes("burnout") ||
    lowerPrompt.includes("stressed") ||
    lowerPrompt.includes("staff wellness")
  ) {
    // Check for special contexts in burnout questions
    if (
      lowerPrompt.includes("death") ||
      lowerPrompt.includes("code") ||
      lowerPrompt.includes("trauma") ||
      lowerPrompt.includes("difficult patient") ||
      lowerPrompt.includes("emotional") ||
      lowerPrompt.includes("critical incident") ||
      lowerPrompt.includes("difficult case")
    ) {
      return `
        <p><strong>Critical Incident Support & Burnout Prevention:</strong></p>
        
        <p>After emotionally difficult events like patient deaths or unsuccessful codes, immediate support is essential:</p>
        <ul>
          <li><strong>Immediate actions:</strong>
            <ul>
              <li>Conduct a brief team debriefing within 24 hours, focused on emotional processing (not clinical review)</li>
              <li>Ensure staff involved have someone to talk with before leaving their shift</li>
              <li>Consider temporary reassignment if a nurse is particularly affected</li>
            </ul>
          </li>
          <li><strong>Short-term follow-up (1-3 days):</strong>
            <ul>
              <li>Arrange formal critical incident stress debriefing with trained facilitator</li>
              <li>Check in personally with each team member involved</li>
              <li>Connect staff with Employee Assistance Program resources</li>
            </ul>
          </li>
          <li><strong>Ongoing support:</strong>
            <ul>
              <li>Monitor for signs of delayed stress reaction or moral distress</li>
              <li>Consider workload adjustments for affected staff</li>
              <li>Encourage peer support conversations</li>
            </ul>
          </li>
        </ul>
        
        <p><strong>Available resources:</strong></p>
        <ul>
          <li>Critical Incident Response Team: Available 24/7 at ext. 5599</li>
          <li>Employee Assistance Program: Confidential counseling (3 free sessions)</li>
          <li>Peer Support Champions: Sarah Chen and Robert Johnson are trained peer supporters</li>
          <li>Mindfulness sessions: Daily virtual sessions at 7:30am and 7:30pm</li>
        </ul>
        
        <p><strong>As a leader:</strong> Your visible support matters greatly. Acknowledging the emotional impact, attending debriefings, normalizing the emotional response, and sharing your own feelings appropriately can create psychological safety for your team.</p>
        
        <p>Would you like me to help you draft a communication to your team or arrange specific support resources?</p>
      `;
    }
    // For general burnout questions not related to critical incidents
    else if (
      lowerPrompt.includes("prevent") ||
      lowerPrompt.includes("reducing") ||
      lowerPrompt.includes("decrease")
    ) {
      return `
        <p><strong>Burnout Prevention Strategies:</strong></p>
        
        <p>Based on current hospital data and evidence-based practices, here are targeted approaches to prevent nursing burnout:</p>
        
        <ul>
          <li><strong>Workload management:</strong>
            <ul>
              <li>Implement acuity-based staffing models</li>
              <li>Set realistic nurse-patient ratios (currently being piloted in Med-Surg)</li>
              <li>Provide adequate resources for high-complexity patients</li>
            </ul>
          </li>
          <li><strong>Schedule optimization:</strong>
            <ul>
              <li>Limit consecutive shifts to 3 when possible</li>
              <li>Ensure minimum 10-hour breaks between shifts</li>
              <li>Incorporate self-scheduling options</li>
            </ul>
          </li>
          <li><strong>Wellness resources:</strong>
            <ul>
              <li>Promote use of resiliency training program (only 34% of staff have completed)</li>
              <li>Encourage break-taking with coverage support</li>
              <li>Schedule monthly "renewal rounds" in each unit</li>
            </ul>
          </li>
          <li><strong>Professional development:</strong>
            <ul>
              <li>Support continuing education with flexible scheduling</li>
              <li>Recognize clinical expertise and contributions</li>
              <li>Create clear advancement pathways</li>
            </ul>
          </li>
        </ul>
        
        <p><strong>Current risk indicators:</strong> Monitoring shows increased risk in ICU where average overtime hours are 6.4 per nurse per week (recommended: <4.0). Consider implementing a 60-day "reset" period with additional float pool coverage.</p>
        
        <p>Would you like a detailed plan for reducing burnout risk in a specific unit?</p>
      `;
    }
    // For general burnout identification or who's at risk
    else {
      return `
        <p><strong>Current Burnout Risk Analysis:</strong></p>
        
        <p>Based on our analytics, we've identified 2 nurses at high risk of burnout and 6 at moderate risk. Here's what you should know:</p>
        
        <p><strong>High risk staff:</strong></p>
        <ul>
          <li><strong>Sarah Chen (Medical-Surgical):</strong>
            <ul>
              <li>5 consecutive shifts worked this week</li>
              <li>22 overtime hours in past 14 days</li>
              <li>Caring for high-acuity patients (avg acuity: 3.8/5)</li>
              <li>No vacation time taken in past 6 months</li>
            </ul>
          </li>
          <li><strong>Robert Johnson (ICU):</strong>
            <ul>
              <li>4 consecutive shifts with no breaks longer than 15 minutes</li>
              <li>Recent critical incident (code blue with poor outcome)</li>
              <li>Expressed concerns about staffing levels</li>
              <li>Average patient acuity: 4.3/5</li>
            </ul>
          </li>
        </ul>
        
        <p><strong>Contributing factors across nursing staff:</strong></p>
        <ul>
          <li>High patient acuity (particularly in ICU)</li>
          <li>Increased documentation requirements</li>
          <li>Work-life balance challenges (68% report difficulty)</li>
          <li>Limited float pool support (currently 3 nurses for 4 units)</li>
        </ul>
        
        <p><strong>Recommended actions:</strong></p>
        <ul>
          <li>Schedule immediate 1:1 check-ins with Sarah and Robert</li>
          <li>Adjust upcoming schedule to provide recovery days</li>
          <li>Connect them with peer support resources</li>
          <li>Consider temporary reassignments to lower-acuity patients</li>
        </ul>
        
        <p>Would you like me to generate a detailed intervention plan for these staff members?</p>
      `;
    }
  }

  return null;
}

// Generate AI response either with OpenAI or using predefined patterns
export async function generateAIResponse(
  prompt: string,
  context: any,
): Promise<string> {
  // Try to match with predefined responses first
  const predefinedResponse = findPreDefinedResponse(prompt);
  if (predefinedResponse) {
    return predefinedResponse;
  }

  try {
    // Check for OpenAI API key
    if (
      !process.env.OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY === "your-api-key-placeholder"
    ) {
      console.log("No valid OpenAI API key found. Using fallback responses.");
      return `
        <p>I notice the OpenAI API key isn't configured. I'll provide information based on your dashboard data instead:</p>
        
        <ul>
          <li>Your current staffing shows 26 nurses on duty (14 day shift, 12 night shift)</li>
          <li>There are 3 follow-up tasks waiting for your attention</li>
          <li>The quarterly compliance report is due this Friday</li>
          <li>2 nurses are showing signs of burnout risk</li>
        </ul>
        
        <p>To get more advanced insights and recommendations, please configure your OpenAI API key in the environment variables.</p>
      `;
    }

    // Parse the query for user intent
    const lowerPrompt = prompt.toLowerCase();
    let userIntent = "general";

    if (
      lowerPrompt.includes("burnout") ||
      lowerPrompt.includes("stress") ||
      lowerPrompt.includes("wellness")
    ) {
      userIntent = "staff_wellness";
    } else if (
      lowerPrompt.includes("schedule") ||
      lowerPrompt.includes("staffing") ||
      lowerPrompt.includes("shift")
    ) {
      userIntent = "staffing";
    } else if (
      lowerPrompt.includes("compliance") ||
      lowerPrompt.includes("report") ||
      lowerPrompt.includes("regulation")
    ) {
      userIntent = "compliance";
    } else if (
      lowerPrompt.includes("follow") ||
      lowerPrompt.includes("task") ||
      lowerPrompt.includes("todo")
    ) {
      userIntent = "tasks";
    } else if (
      lowerPrompt.includes("metric") ||
      lowerPrompt.includes("performance") ||
      lowerPrompt.includes("quality")
    ) {
      userIntent = "metrics";
    } else if (
      lowerPrompt.includes("budget") ||
      lowerPrompt.includes("cost") ||
      lowerPrompt.includes("financial")
    ) {
      userIntent = "financial";
    }

    // Generate detailed context with special focus on the user's intent
    const detailedContext = generateDetailedContext();
    const focusedContext = generateFocusedContext(userIntent);

    // Check if we have conversation history in the context
    const conversationHistory = context.conversationHistory || [];

    // Start with the system message
    const systemMessage: ChatCompletionSystemMessageParam = {
      role: "system",
      content: `You are Nuvanta, an AI assistant for nurse managers. Respond in a helpful, direct manner with actionable insights.
        
      Base your response on this current hospital information:
      ${detailedContext}
      
      Since the user's query relates to ${userIntent}, here is more specific information:
      ${focusedContext}
      
      Answer the user's query as their knowledgeable healthcare management assistant.
      
      IMPORTANT: You have access to previous conversation history. When the user asks about previous interactions, refer to this history to provide contextual answers.
      
      CALENDAR INSTRUCTIONS: You can add events to the user's calendar when requested. If a user asks you to remind them about something or add a calendar entry:
      1. Extract the key details: title, date/time, description, and any people involved
      2. ALWAYS use this EXACT phrasing in your response: "I've added this to your calendar" or "I've scheduled this reminder for you"
      3. Be very specific about the date when the reminder is set for
      4. The system will automatically create the calendar entry based on your response
      
      Format guidelines:
      - Use HTML formatting (<p>, <ul>, <li>, <strong>, <em>, <h3> tags)
      - Break answers into clear sections with <strong> headings
      - Highlight important metrics or numbers
      - Include specific recommendations when possible
      - Make your answer visually scannable with bullets and short paragraphs
      - If relevant, note if a metric is improving or declining with indicators (↑, ↓)`,
    };

    const messages: ChatCompletionMessageParam[] = [systemMessage];

    // Add previous conversation messages if available
    if (conversationHistory.length > 0) {
      // Only include up to the last 10 messages (5 exchanges) to keep context manageable
      const recentMessages = conversationHistory.slice(-10);

      // Add each message to the conversation context
      recentMessages.forEach((msg: { role: string; content: string }) => {
        // Make sure the role is either 'user' or 'assistant' (API requirement)
        if (msg.role === "user") {
          const userMessage: ChatCompletionUserMessageParam = {
            role: "user",
            content: msg.content,
          };
          messages.push(userMessage);
        } else {
          const assistantMessage: ChatCompletionMessageParam = {
            role: "assistant",
            content: msg.content,
          };
          messages.push(assistantMessage);
        }
      });
    }

    // Add the current user message
    const currentUserMessage: ChatCompletionUserMessageParam = {
      role: "user",
      content: prompt,
    };
    messages.push(currentUserMessage);

    // Now messages are properly typed with ChatCompletionMessageParam[]
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages,
      temperature: 0.5,
      max_tokens: 750,
    });

    return (
      response.choices[0].message.content ||
      "I'm sorry, I couldn't generate a response at this time."
    );
  } catch (error) {
    console.error("Error generating AI response:", error);

    // Provide a friendly fallback response
    return `
      <p>I'm having trouble accessing the OpenAI service right now. Here's what I can tell you based on your dashboard data:</p>
      
      <ul>
        <li>You currently have 26 nurses on staff (14 day shift, 12 night shift)</li>
        <li>There are 3 follow-up tasks waiting for your attention</li>
        <li>The quarterly compliance report is due this Friday</li>
        <li>2 nurses are showing signs of burnout risk</li>
      </ul>
      
      <p>Would you like more specific information about any of these areas?</p>
    `;
  }
}

/**
 * Generate a comprehensive context of the entire hospital situation
 */
function generateDetailedContext() {
  const today = "2025-05-17";
  const staffingData = getStaffingForDay(today);
  const upcomingStaffing = getUpcomingStaffingIssues(today);

  return `
    STAFFING DATA:
    - Total nurses: 26 (14 day shift, 12 night shift)
    - Day staffing today: ${staffingData.day}/${staffingData.dayRequired}
    - Night staffing today: ${staffingData.night}/${staffingData.nightRequired}
    - Nurse burnout risk: ${nurses.filter((n) => n.burnoutRisk === "high").length} nurses at high risk
    - Staff certifications: BLS (100%), ACLS (84%), PALS (62%)
    - Staff retention: 89% annually (industry avg: 82%)
    
    TASK DATA:
    - Follow-up tasks: ${followUpTasks.length} tasks (${followUpTasks.filter((t) => t.status === "overdue").length} overdue)
    - Compliance reports: ${complianceReports.length} (next due: ${complianceReports[0].dueDate})
    - Current priorities: Equipment maintenance, Infection control audit, Staff evaluations
    
    UPCOMING STAFFING ISSUES:
    ${upcomingStaffing
      .filter(
        (day) =>
          day.dayStaffing.status === "understaffed" ||
          day.nightStaffing.status === "understaffed",
      )
      .map(
        (day) =>
          `- ${day.dayOfWeek}, ${day.fullDate}: ${day.dayStaffing.status === "understaffed" ? `Short ${day.dayStaffing.required - day.dayStaffing.scheduled} day nurses` : ""} ${day.nightStaffing.status === "understaffed" ? `Short ${day.nightStaffing.required - day.nightStaffing.scheduled} night nurses` : ""}`,
      )
      .join("\n")}
    
    UNIT DATA:
    - Medical-Surgical: 22 beds (current census: 18), 6 RNs today, avg patient acuity: 2.6/5
    - ICU: 10 beds (current census: 8), 5 RNs today, avg patient acuity: 4.1/5
    - Emergency: 14 patients in last 24 hours, 3 RNs today, avg wait time: 42 min
    
    QUALITY METRICS (CURRENT QUARTER):
    - CAUTI rate: 0.8 per 1,000 catheter days (target: <1.2) ↓ 22% from last quarter
    - CLABSI rate: 0.6 per 1,000 line days (target: <0.8) ↓ 14% from last quarter
    - Patient satisfaction: 84th percentile (target: >80th) ↑ 6% from last quarter
    - Medication error rate: 2.7% (target: <2.0%) ↑ 0.4% from last quarter
    - Hand hygiene compliance: 91% (target: >95%) ↑ 3% from last quarter
    - Falls with injury: 1.2 per 1,000 patient days (target: <1.0) ↓ 8% from last quarter
    
    STAFF DEVELOPMENT:
    - Annual competencies: 92% completed (deadline: June 30, 2025)
    - BLS certification: 98% current (6 staff due for renewal in next 60 days)
    - Training budget: $42K actual vs $75K budget (44.0% under budget)
    - Recent training focus: De-escalation techniques, Advanced wound care
    - Current learning gaps: New IV pump training (73% completion), Medication reconciliation (68% completion)
    
    RECENT INCIDENTS:
    - 2 incident reports filed in past week (1 medication error, 1 patient fall without injury)
    - 1 patient complaint about wait times in past 30 days
    - 0 staff injuries in past 60 days
    
    FINANCIAL DATA:
    - Personnel budget: $2.84M actual vs $2.95M budget (3.7% under budget)
    - Overtime costs: $128K actual vs $95K budget (34.7% over budget) ↑ 12% from last quarter
    - Medical supplies: $342K actual vs $360K budget (5.0% under budget) ↓ 3% from last quarter
    - Average cost per patient day: $1,842 (target: <$1,900) ↑ 2.1% from last quarter
    
    CURRENT HOSPITAL INITIATIVES:
    - Nurse retention program (Phase 2 of 3 implemented)
    - Reduced documentation burden project (40% complete)
    - New care coordination model (planning phase)
    - Shift flexibility pilot program (recently launched)
  `;
}

/**
 * Generate a focused context based on the user's intent/question topic
 */
function generateFocusedContext(userIntent: string): string {
  const today = "2025-05-17";
  const staffingData = getStaffingForDay(today);

  switch (userIntent) {
    case "staff_wellness":
      return `
        DETAILED BURNOUT ANALYSIS:
        - High risk staff: ${nurses
          .filter((n) => n.burnoutRisk === "high")
          .map((n) => n.name)
          .join(", ")}
        - Medium risk staff: ${nurses.filter((n) => n.burnoutRisk === "medium").length} nurses
        - Risk factors: Consecutive shifts >3 days, Low break compliance, High patient acuity
        - Staff with >4 consecutive shifts: 3 nurses (Sarah Chen, Marcus Johnson, Elena Rodriguez)
        - Current PTO balance utilization: 68% (32% unused across staff)
        - Staff with >80 hours unused PTO: 7 nurses
        
        WELLNESS PROGRAM DATA:
        - EAP utilization rate: 14% (industry avg: 11%)
        - Wellness program participation: 37% of staff
        - Mindfulness session attendance: 6 staff members weekly
        - Recent staff survey results: 72% report adequate breaks, 64% report manageable stress levels
        
        INTERVENTION OPTIONS:
        - Staff rotation flexibility (ICU, Med-Surg, Emergency)
        - Resilience training program (next cohort: June 1)
        - Peer support program (6 trained peer supporters available)
        - Work-life balance coaching (3 sessions available per staff member)
      `;

    case "staffing":
      const understaffedDays = getUnderstaffedDays();
      const upcomingStaffing = getUpcomingStaffingIssues(today);

      return `
        DETAILED STAFFING ANALYSIS:
        - Current nurse-to-patient ratio by unit:
          * Medical-Surgical: 1:4.2 (target: 1:4)
          * ICU: 1:1.6 (target: 1:1.5)
          * Emergency: 1:4.7 (target: 1:4)
        - Unit census trends (14-day): Med-Surg ↑3%, ICU ↓6%, Emergency ↑8%
        - Upcoming PTO requests: 4 for next week (impact: 1 day shift, 3 night shifts)
        - Staff on FMLA/extended leave: 2 nurses (both from Med-Surg)
        
        SCHEDULING OPPORTUNITIES:
        - Float pool availability: 3 nurses qualified for Med-Surg, 2 for ICU
        - PRN staff on call: 5 nurses available for extra shifts
        - Nurses willing to pick up overtime: 8 registered in system
        - Recently cross-trained staff: 3 nurses (Med-Surg to Emergency)
        
        CRITICAL STAFFING DATES:
        ${understaffedDays
          .slice(0, 5)
          .map(
            (day) =>
              `- ${new Date(day.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}: ${day.shift === "day" ? "Day" : "Night"} shift short ${day.shortage} RNs`,
          )
          .join("\n")}
      `;

    case "compliance":
      return `
        DETAILED COMPLIANCE STATUS:
        - Quarterly compliance report due: ${complianceReports[0].dueDate} (${complianceReports[0].percentComplete}% complete)
        - Last Joint Commission visit: November 12, 2024 (3 findings, all addressed)
        - Current policy review status: 94% up-to-date
        - Required staff training completion: 92% (8% outstanding)
        
        DOCUMENTATION METRICS:
        - Nursing documentation compliance: 96% (target: ≥95%)
        - Medication reconciliation: 91% (target: ≥95%)
        - Discharge instruction completion: 99% (target: ≥98%)
        - Patient education documentation: 88% (target: ≥90%)
        
        REGULATORY FOCUS AREAS:
        - Infection control practices (hand hygiene audit: 91%)
        - Fall prevention protocol compliance (89%)
        - Restraint documentation (97%)
        - Pain reassessment timeliness (93%)
        
        UPCOMING DEADLINES:
        - Quarterly report: ${complianceReports[0].dueDate}
        - Annual fire safety training: June 15, 2025
        - Infection Control update certification: July 1, 2025
        - Policy manual review: August 30, 2025
      `;

    case "tasks":
      return `
        FOLLOW-UP TASK DETAILS:
        ${followUpTasks
          .map(
            (task) =>
              `- ${task.description} (Created: ${task.dateCreated}, Status: ${task.status}, Priority: ${task.priority})`,
          )
          .join("\n")}
        
        TASK STATISTICS:
        - Overdue tasks: ${followUpTasks.filter((t) => t.status === "overdue").length}
        - High priority: ${followUpTasks.filter((t) => t.priority === "high").length}
        - Medium priority: ${followUpTasks.filter((t) => t.priority === "medium").length}
        - Low priority: ${followUpTasks.filter((t) => t.priority === "low").length}
        - Average task age: 5.2 days
        - Tasks by category: Equipment (2), Patient care (4), Administrative (3)
        
        RECOMMENDED FOCUS:
        - Equipment maintenance request (Overdue, High priority)
        - Staff scheduling corrections (Pending, High priority)
        - Infection control audit (Pending, Medium priority)
      `;

    case "metrics":
      return `
        QUALITY METRICS DETAIL:
        - CAUTI rate: 0.8 per 1,000 catheter days (target: <1.2) ↓ 22% from last quarter
          * Med-Surg rate: 0.9
          * ICU rate: 0.7
          * Intervention: Daily catheter necessity review protocol
        - CLABSI rate: 0.6 per 1,000 line days (target: <0.8) ↓ 14% from last quarter
          * Med-Surg rate: 0.5
          * ICU rate: 0.8
          * Intervention: Enhanced dressing change protocol
        - Medication error rate: 2.7% (target: <2.0%) ↑ 0.4% from last quarter
          * Most common error: Timing (56% of errors)
          * Second most common: Documentation (24% of errors)
          * Intervention: Medication administration timing review
        
        PATIENT EXPERIENCE:
        - Overall satisfaction: 84th percentile (target: >80th) ↑ 6% from last quarter
        - Nurse communication: 87th percentile ↑ 4% from last quarter
        - Responsiveness: 79th percentile ↓ 2% from last quarter
        - Pain management: 82nd percentile ↑ 5% from last quarter
        - Discharge information: 90th percentile ↑ 3% from last quarter
        
        WORKFORCE METRICS:
        - Turnover rate (annualized): 11% (target: <15%) ↓ 2% from last quarter
        - Vacancy rate: 8% (target: <7%) ↑ 1% from last quarter
        - Average time to fill position: 42 days (target: <45 days) ↓ 5 days from last quarter
        - Staff engagement score: 4.1/5 (target: >4.0) ↔ no change from last quarter
      `;

    case "financial":
      return `
        DETAILED FINANCIAL METRICS:
        - Personnel budget YTD: $2.84M actual vs $2.95M budget (3.7% under budget)
          * Regular hours: $2.35M (on target)
          * Overtime costs: $128K actual vs $95K budget (34.7% over budget) ↑ 12% from last quarter
          * Premium pay (weekend/holiday): $362K (5.2% under budget)
        - Supply costs YTD: $342K actual vs $360K budget (5.0% under budget)
          * Medical supplies: $214K (6.3% under budget)
          * Pharmaceuticals: $98K (2.1% under budget)
          * Other supplies: $30K (4.8% under budget)
        - Cost per patient day: $1,842 (target: <$1,900) ↑ 2.1% from last quarter
        
        PRODUCTIVITY METRICS:
        - Hours per patient day (HPPD): 
          * Med-Surg: 8.4 (target: 8.2) ↑ 0.2 from target
          * ICU: 16.2 (target: 16.5) ↓ 0.3 from target
          * Emergency: 4.8 hours per visit (target: 4.5) ↑ 0.3 from target
        - Overtime as percentage of total hours: 6.2% (target: <5.0%)
        - Call-offs (unplanned absences): 3.8% of scheduled shifts (target: <3.0%)
        
        BUDGET VARIANCE ANALYSIS:
        - Main driver of overtime: Short staffing in Med-Surg (32% of overtime hours)
        - Cost-saving opportunities: IV supply standardization ($12K potential annual savings)
        - Productivity improvement focus: Admission process efficiency (current avg: 76 min, target: 60 min)
      `;

    default: // general
      return `
        KEY HOSPITAL INDICATORS:
        - Today's hospital census: 26 patients (74% occupancy)
        - Total nursing staff: 26 (14 day shift, 12 night shift)
        - Current burnout risk: 2 nurses at high risk (7.7% of staff)
        - Priority tasks: 3 follow-up items (1 overdue)
        - Quality metrics: 3 of 5 core metrics meeting targets
        
        OPERATIONS HIGHLIGHTS:
        - Staffing ratio compliance: 89% of shifts at target ratio
        - Documentation completeness: 94% (target: 95%)
        - Patient experience score: 84th percentile (↑ from 78th last quarter)
        - Staff engagement score: 4.1/5 (target: >4.0)
        
        RECENT UPDATES:
        - New IV pump training: 73% staff completion
        - Quarterly compliance report: Due ${complianceReports[0].dueDate} (${complianceReports[0].percentComplete}% complete)
        - Nurse retention program: Phase 2 implementation in progress
        - Budget status: 3.7% under personnel budget, 34.7% over overtime budget
      `;
  }
}
