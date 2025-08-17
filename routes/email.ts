import { Router } from "express";
import { sendEmail, sendScheduleNotification, sendAlertNotification } from "../email";

const router = Router();

// Basic email sending endpoint
router.post("/send", async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;
    
    // Basic validation
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields: to, subject, and either text or html" 
      });
    }
    
    const result = await sendEmail({ to, subject, text, html });
    return res.json(result);
  } catch (error: any) {
    console.error("Error sending email:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to send email",
      error: error?.message || String(error) 
    });
  }
});

// Schedule notification endpoint
router.post("/schedule-notification", async (req, res) => {
  try {
    const { to, nurseName, scheduleDetails, startDate, endDate, additionalMessage } = req.body;
    
    // Basic validation
    if (!to || !nurseName || !scheduleDetails || !startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields: to, nurseName, scheduleDetails, startDate, endDate" 
      });
    }
    
    const result = await sendScheduleNotification({ 
      to, 
      nurseName, 
      scheduleDetails, 
      startDate, 
      endDate, 
      additionalMessage 
    });
    
    return res.json(result);
  } catch (error: any) {
    console.error("Error sending schedule notification:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to send schedule notification",
      error: error?.message || String(error) 
    });
  }
});

// Alert notification endpoint
router.post("/alert-notification", async (req, res) => {
  try {
    const { to, alertType, alertDetails, actionRequired, actionText, dueDate } = req.body;
    
    // Basic validation
    if (!to || !alertType || !alertDetails) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields: to, alertType, alertDetails" 
      });
    }
    
    // Validate alert type
    if (!['Critical', 'Important', 'Informational'].includes(alertType)) {
      return res.status(400).json({ 
        success: false, 
        message: "alertType must be one of: Critical, Important, Informational" 
      });
    }
    
    const result = await sendAlertNotification({ 
      to, 
      alertType, 
      alertDetails, 
      actionRequired, 
      actionText, 
      dueDate 
    });
    
    return res.json(result);
  } catch (error: any) {
    console.error("Error sending alert notification:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to send alert notification",
      error: error?.message || String(error) 
    });
  }
});

// Batch email endpoint (for sending to multiple staff)
router.post("/batch", async (req, res) => {
  try {
    const { recipients, subject, messageContent } = req.body;
    
    // Basic validation
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0 || !subject || !messageContent) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields: recipients (array), subject, messageContent" 
      });
    }
    
    // Map email addresses from recipients
    const emailAddresses = recipients.map(recipient => recipient.email);
    
    const result = await sendEmail({
      to: emailAddresses,
      subject,
      html: messageContent
    });
    
    return res.json(result);
  } catch (error: any) {
    console.error("Error sending batch email:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to send batch email",
      error: error?.message || String(error) 
    });
  }
});

export default router;
