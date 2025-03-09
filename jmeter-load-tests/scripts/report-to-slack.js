require('dotenv').config();
const axios = require('axios');
const path = require('path');

// Get Slack webhook URL from environment variable
const webhookUrl = process.env.SLACK_WEBHOOK_URL
if (!webhookUrl) {
  console.error('Error: SLACK_WEBHOOK_URL environment variable is not set');
  process.exit(1);
} 

// Log webhook URL pattern (safely)
console.log(`Webhook URL length: ${webhookUrl.length}`);
console.log(`Webhook URL pattern: https://hooks.slack.com/services/T***/B***/****`);

// Function to send message to Slack
async function sendToSlack(testPlanName, runInfo) {
  try {
    // Simplified payload for testing
    const payload = {
      text: `Test Plan: ${testPlanName} - Status: PASSED`
    };

    console.log("Sending payload to Slack:", JSON.stringify(payload, null, 2));
    await axios.post(webhookUrl, payload);
    console.log('Message sent to Slack successfully');
  } catch (error) {
    console.error('Error sending message to Slack:', error);
    // Log detailed error info
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Function to extract test plan name from JMX file path
function extractTestPlanName(jmxFilePath) {
  if (!jmxFilePath) return 'Unknown Test Plan';
  
  // Just extract the filename without extension
  const basename = path.basename(jmxFilePath, '.jmx');
  return basename;
}

// Main function to report test results
async function reportResults() {
  try {
    // Get GitHub environment variables if running in GitHub Actions
    const runInfo = process.env.GITHUB_ACTIONS ? {
      runId: process.env.GITHUB_RUN_ID,
      repository: process.env.GITHUB_REPOSITORY,
      serverUrl: process.env.GITHUB_SERVER_URL || 'https://github.com'
    } : null;
    
    // Get JMX file path from environment variable
    const jmxFilePath = process.env.JMX_FILE_PATH || "jmeter-load-tests/jmeter/tests/testPlan01.jmx";
    console.log(`JMX file path from environment: ${jmxFilePath}`);
    
    // Extract test plan name from JMX file path
    const testPlanName = extractTestPlanName(jmxFilePath);
    console.log(`Extracted test plan name: ${testPlanName}`);
    
    // Send notification
    await sendToSlack(testPlanName, runInfo);
  } catch (error) {
    console.error('Error in reporting:', error);
    process.exit(1);
  }
}

// Execute the reporting function
reportResults();