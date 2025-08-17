import { detectTaskCompletionRequest, extractTaskFromPrompt } from '../../tasks';

describe('Task Processing Functions', () => {
  describe('detectTaskCompletionRequest', () => {
    it('should detect "mark as complete" variations', () => {
      const positiveTests = [
        "mark task as complete",
        "mark as completed",
        "mark the task as complete",
        "mark task #5 as completed",
        "complete task 3",
        "task completed",
        "task is done",
        "task is complete",
        "finished task",
        "task is finished",
        "resolved task",
        "task is resolved",
        "done with task"
      ];

      positiveTests.forEach(prompt => {
        expect(detectTaskCompletionRequest(prompt)).toBe(true);
      });
    });

    it('should not detect non-completion requests', () => {
      const negativeTests = [
        "what tasks do I have?",
        "show me the tasks",
        "create a new task",
        "update task description",
        "assign task to someone",
        "when is this task due?",
        "how many tasks are pending?"
      ];

      negativeTests.forEach(prompt => {
        expect(detectTaskCompletionRequest(prompt)).toBe(false);
      });
    });

    it('should be case insensitive', () => {
      expect(detectTaskCompletionRequest("MARK TASK AS COMPLETE")).toBe(true);
      expect(detectTaskCompletionRequest("Mark Task As Complete")).toBe(true);
      expect(detectTaskCompletionRequest("mark task as complete")).toBe(true);
    });
  });

  describe('extractTaskFromPrompt', () => {
    it('should extract task ID from various formats', () => {
      const testCases = [
        { prompt: "mark task #5 as complete", expected: { id: 5 } },
        { prompt: "complete task 3", expected: { id: 3 } },
        { prompt: "task 10 is done", expected: { id: 10 } },
        { prompt: "mark task id 7 as completed", expected: { id: 7 } },
        { prompt: "task number 2 is finished", expected: { id: 2 } },
        { prompt: "#15 is complete", expected: { id: 15 } }
      ];

      testCases.forEach(({ prompt, expected }) => {
        const result = extractTaskFromPrompt(prompt);
        expect(result.id).toBe(expected.id);
      });
    });

    it('should extract task description', () => {
      const testCases = [
        { 
          prompt: "mark equipment request as complete", 
          expected: { description: "equipment request" } 
        },
        { 
          prompt: "completed the patient complaint follow-up", 
          expected: { description: "the patient complaint follow-up" } 
        },
        { 
          prompt: "finished staff training registration", 
          expected: { description: "staff training registration" } 
        },
        { 
          prompt: "done with inventory check", 
          expected: { description: "inventory check" } 
        }
      ];

      testCases.forEach(({ prompt, expected }) => {
        const result = extractTaskFromPrompt(prompt);
        expect(result.description).toBe(expected.description);
      });
    });

    it('should return empty object for non-matching prompts', () => {
      const nonMatchingPrompts = [
        "what tasks do I have?",
        "show me all tasks",
        "create a new task"
      ];

      nonMatchingPrompts.forEach(prompt => {
        const result = extractTaskFromPrompt(prompt);
        expect(result).toEqual({});
      });
    });

    it('should prefer ID over description when both are present', () => {
      const prompt = "mark task #5 equipment request as complete";
      const result = extractTaskFromPrompt(prompt);
      expect(result.id).toBe(5);
      expect(result.description).toBeUndefined();
    });

    it('should handle invalid ID formats gracefully', () => {
      const invalidPrompts = [
        "mark task #abc as complete",
        "complete task xyz",
        "task # is done"
      ];

      invalidPrompts.forEach(prompt => {
        const result = extractTaskFromPrompt(prompt);
        expect(result.id).toBeUndefined();
      });
    });
  });
});
