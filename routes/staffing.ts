import { Router } from "express";
import { nurses } from "../shared/mockData";

const router = Router();

// Get current staffing data
router.get("/", (req, res) => {
  const dayShiftNurses = nurses.filter(nurse => nurse.shift === "day").length;
  const nightShiftNurses = nurses.filter(nurse => nurse.shift === "night").length;
  const totalNurses = nurses.length;
  
  const staffingData = {
    status: "Fully staffed today",
    onDuty: totalNurses,
    total: totalNurses,
    dayShift: dayShiftNurses,
    nightShift: nightShiftNurses
  };
  
  res.json(staffingData);
});

// Get burnout risk analysis
router.get("/burnout", (req, res) => {
  const atRiskStaff = nurses.filter(nurse => nurse.burnoutRisk === "high");
  
  const burnoutData = {
    count: atRiskStaff.length,
    staff: atRiskStaff.map(nurse => ({ name: nurse.name })),
    lastUpdated: "Today, 6:30 AM"
  };
  
  res.json(burnoutData);
});

export default router;
