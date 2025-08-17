import { Router } from "express";
import { nurses } from "../shared/mockData";

const router = Router();

/**
 * @swagger
 * /api/staffing:
 *   get:
 *     tags: [Staffing]
 *     summary: Get current staffing data
 *     description: Returns current nurse staffing information including day/night shift counts
 *     responses:
 *       200:
 *         description: Current staffing data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StaffingData'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
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

/**
 * @swagger
 * /api/staffing/burnout:
 *   get:
 *     tags: [Staffing]
 *     summary: Get burnout risk analysis
 *     description: Returns staff members who are at high risk of burnout
 *     responses:
 *       200:
 *         description: Burnout risk data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BurnoutData'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
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
