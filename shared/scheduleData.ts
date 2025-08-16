import { nurses } from './mockData';

export interface ShiftAssignment {
  nurseId: number;
  date: string; // ISO format YYYY-MM-DD
  shift: 'day' | 'night';
}

// Helper function to generate dates for May 2025
function getDatesInRange() {
  const dates: string[] = [];
  const year = 2025;
  const month = 4; // May (0-indexed in JS)
  
  // Get all days in May 2025
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }
  
  return dates;
}

// Create optimized schedule where:
// - Each nurse works 3 days per week (typically)
// - Day shift has 14 nurses scheduled when possible
// - Night shift has 12 nurses scheduled when possible
// - Fair distribution of weekends
export function generateMonthlySchedule(): ShiftAssignment[] {
  const schedule: ShiftAssignment[] = [];
  const dates = getDatesInRange();
  
  // Create arrays of day and night shift nurses
  const dayNurses = nurses.filter(n => n.shift === 'day');
  const nightNurses = nurses.filter(n => n.shift === 'night');
  
  // For each day in the month
  dates.forEach((date, dateIndex) => {
    // Convert ISO date to Day of Week (0 = Sunday, 6 = Saturday)
    const dayOfWeek = new Date(date).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Calculate which nurses should work today
    // We'll rotate the day shift nurses every 7 days to maintain fairness
    // Let's say we need 14 day nurses and 12 night nurses each day
    const dayShiftGroup = dateIndex % 2; // Alternating between groups 0 and 1
    const nightShiftGroup = dateIndex % 2; // Same rotation pattern
    
    // For day shift, select nurses based on their ID and the current shift group
    // This creates a rotating pattern where each nurse works ~3 days per week
    dayNurses.forEach(nurse => {
      const nurseDay = nurse.id % 7; // 0-6 representing which days of the week they tend to work
      const nurseGroup = nurse.id % 2; // 0 or 1, which rotation group they're in
      
      // Assign shift based on rotation pattern and making sure each nurse works ~3 days per week
      if (
        (nurseDay === dayOfWeek) || // Always work on their designated weekday
        (nurseGroup === dayShiftGroup && (dateIndex % 3 === nurse.id % 3)) // Additional rotation pattern
      ) {
        schedule.push({
          nurseId: nurse.id,
          date,
          shift: 'day'
        });
      }
    });
    
    // For night shift, similar logic but different pattern to distribute fairly
    nightNurses.forEach(nurse => {
      const nurseDay = nurse.id % 7;
      const nurseGroup = nurse.id % 2;
      
      if (
        (nurseDay === dayOfWeek) ||
        (nurseGroup === nightShiftGroup && (dateIndex % 4 === nurse.id % 4))
      ) {
        schedule.push({
          nurseId: nurse.id,
          date,
          shift: 'night'
        });
      }
    });
  });
  
  return schedule;
}

// Generate the schedule once
export const monthlySchedule = generateMonthlySchedule();

// Helper functions to work with the schedule
export function getNursesForDay(date: string, shift: 'day' | 'night'): number[] {
  return monthlySchedule
    .filter(assignment => assignment.date === date && assignment.shift === shift)
    .map(assignment => assignment.nurseId);
}

export function getShiftsForNurse(nurseId: number): ShiftAssignment[] {
  return monthlySchedule.filter(assignment => assignment.nurseId === nurseId);
}

export function getStaffingForDay(date: string): {
  day: number, 
  night: number, 
  dayRequired: number,
  nightRequired: number,
  dayShortage: number,
  nightShortage: number
} {
  const dayStaff = getNursesForDay(date, 'day').length;
  const nightStaff = getNursesForDay(date, 'night').length;
  
  // Required staffing (baseline)
  const dayRequired = 14;
  const nightRequired = 12;
  
  return {
    day: dayStaff,
    night: nightStaff,
    dayRequired,
    nightRequired,
    dayShortage: Math.max(0, dayRequired - dayStaff),
    nightShortage: Math.max(0, nightRequired - nightStaff)
  };
}

// Check which days are understaffed
export function getUnderstaffedDays(): { date: string, shift: 'day' | 'night', shortage: number }[] {
  const result: { date: string, shift: 'day' | 'night', shortage: number }[] = [];
  const dates = getDatesInRange();
  
  dates.forEach(date => {
    const staffing = getStaffingForDay(date);
    
    if (staffing.dayShortage > 0) {
      result.push({
        date,
        shift: 'day',
        shortage: staffing.dayShortage
      });
    }
    
    if (staffing.nightShortage > 0) {
      result.push({
        date,
        shift: 'night',
        shortage: staffing.nightShortage
      });
    }
  });
  
  return result;
}

// Get upcoming staffing issues for the next 5 days
type StaffingStatus = 'understaffed' | 'full';

export function getUpcomingStaffingIssues(fromDate: string): { 
  date: string, 
  dayOfWeek: string,
  fullDate: string,
  dayStaffing: { scheduled: number, required: number, status: StaffingStatus },
  nightStaffing: { scheduled: number, required: number, status: StaffingStatus }
}[] {
  const result: {
    date: string,
    dayOfWeek: string,
    fullDate: string,
    dayStaffing: { scheduled: number, required: number, status: StaffingStatus },
    nightStaffing: { scheduled: number, required: number, status: StaffingStatus }
  }[] = [];
  
  const startDate = new Date(fromDate);
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  // Get next 5 days
  for (let i = 0; i < 5; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const dateStr = currentDate.toISOString().split('T')[0];
    
    const staffing = getStaffingForDay(dateStr);
    const dayOfWeek = daysOfWeek[currentDate.getDay()];
    const fullDate = `${months[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
    
    result.push({
      date: dateStr,
      dayOfWeek,
      fullDate,
      dayStaffing: {
        scheduled: staffing.day,
        required: staffing.dayRequired,
        status: staffing.dayShortage > 0 ? 'understaffed' as const : 'full' as const
      },
      nightStaffing: {
        scheduled: staffing.night,
        required: staffing.nightRequired,
        status: staffing.nightShortage > 0 ? 'understaffed' as const : 'full' as const
      }
    });
  }
  
  return result;
}

// Get detailed staffing by unit
export function getStaffingByUnit(date: string): Record<string, {
  name: string,
  dayStaff: number,
  nightStaff: number,
  requiredDay: number,
  requiredNight: number,
  dayShortage: number,
  nightShortage: number
}> {
  const unitStaffing: Record<string, {
    name: string,
    dayStaff: number,
    nightStaff: number,
    requiredDay: number,
    requiredNight: number,
    dayShortage: number,
    nightShortage: number
  }> = {};
  
  // Initialize unit data
  nurses.forEach(nurse => {
    if (!unitStaffing[nurse.unit]) {
      unitStaffing[nurse.unit] = {
        name: nurse.unit,
        dayStaff: 0,
        nightStaff: 0,
        requiredDay: 0,
        requiredNight: 0, 
        dayShortage: 0,
        nightShortage: 0
      };
    }
  });
  
  // Get nurses working this day
  const dayNurseIds = getNursesForDay(date, 'day');
  const nightNurseIds = getNursesForDay(date, 'night');
  
  // Count nurses per unit
  dayNurseIds.forEach(nurseId => {
    const nurse = nurses.find(n => n.id === nurseId);
    if (nurse && unitStaffing[nurse.unit]) {
      unitStaffing[nurse.unit].dayStaff++;
    }
  });
  
  nightNurseIds.forEach(nurseId => {
    const nurse = nurses.find(n => n.id === nurseId);
    if (nurse && unitStaffing[nurse.unit]) {
      unitStaffing[nurse.unit].nightStaff++;
    }
  });
  
  // Set required staffing numbers based on common healthcare standards
  Object.keys(unitStaffing).forEach(unit => {
    if (unit === 'Medical-Surgical') {
      unitStaffing[unit].requiredDay = 6;
      unitStaffing[unit].requiredNight = 5;
    } else if (unit === 'Intensive Care') {
      unitStaffing[unit].requiredDay = 5;
      unitStaffing[unit].requiredNight = 4;
    } else if (unit === 'Emergency') {
      unitStaffing[unit].requiredDay = 3;
      unitStaffing[unit].requiredNight = 3;
    }
    
    // Calculate shortages
    unitStaffing[unit].dayShortage = Math.max(0, unitStaffing[unit].requiredDay - unitStaffing[unit].dayStaff);
    unitStaffing[unit].nightShortage = Math.max(0, unitStaffing[unit].requiredNight - unitStaffing[unit].nightStaff);
  });
  
  return unitStaffing;
}
