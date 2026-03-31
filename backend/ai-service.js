async function extractDecisions(transcript) {
  // Mock response for testing
  return [
    "Launch the dashboard by May 1st",
    "Use React for frontend and Node.js for backend",
    "Set up CI/CD pipeline"
  ];
}

async function extractActionItems(transcript) {
  // Mock response for testing
  return [
    { action: "Handle backend API", assigned_to: "John", due_date: "2026-04-20" },
    { action: "Finish UI implementation", assigned_to: "Maria", due_date: "2026-04-25" }
  ];
}

module.exports = { extractDecisions, extractActionItems };