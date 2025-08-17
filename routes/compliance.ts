import { Router } from "express";
import { complianceReports } from "../shared/mockData";

const router = Router();

// Get compliance data
router.get("/", (req, res) => {
  const quarterlyReport = complianceReports.find(report => 
    report.name === "Quarterly staff performance report"
  );
  
  const complianceData = {
    description: "Quarterly report due Friday",
    percentComplete: quarterlyReport?.percentComplete || 65,
    daysLeft: 3,
    lastEdited: "Yesterday"
  };
  
  res.json(complianceData);
});

export default router;
