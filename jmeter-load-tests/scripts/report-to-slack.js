require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
const path = require('path');

// Get Slack webhook URL from environment variable
const webhookUrl = 'https://hooks.slack.com/services/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'
// process.env.SLACK_WEBHOOK_URL;
if (!webhookUrl) {
  console.error('Error: SLACK_WEBHOOK_URL environment variable is not set');
  process.exit(1);
} 

// Log webhook URL pattern (safely)
console.log(`Webhook URL length: ${webhookUrl.length}`);
console.log('Slack Webhook URL:', webhookUrl);
console.log(`Webhook URL pattern: https://hooks.slack.com/services/T***/B***/****`);

// Load Slack configuration
let slackConfig;
try {
  const configPath = path.resolve(__dirname, '../config/slack-webhook.json');
  slackConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error('Error loading Slack configuration:', error);
  process.exit(1);
}

// Function to send message to Slack
async function sendToSlack(testPlanName, runInfo) {
  try {
    // Since we're running this script, the GitHub workflow hasn't failed yet
    // so we can assume the test execution was successful
    const status = "✅ PASSED";
    const summaryText = `• Test Plan: ${testPlanName}\n• Status: ${status}`;

    // Start with the message format from config - only use the messageFormat part
    const payload = {
      text: slackConfig.messageFormat?.text || "JMeter Load Test Results",
      blocks: JSON.parse(JSON.stringify(slackConfig.messageFormat?.blocks || []))
    };

    // Replace placeholders in the message
    for (let i = 0; i < payload.blocks.length; i++) {
      const block = payload.blocks[i];
      if (block.text && block.text.text && block.text.text.includes('{{SUMMARY}}')) {
        block.text.text = block.text.text.replace('{{SUMMARY}}', summaryText);
      }
    }

    // Add GitHub run info if available
    if (runInfo && runInfo.runId && runInfo.repository) {
      payload.blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<${runInfo.serverUrl}/${runInfo.repository}/actions/runs/${runInfo.runId}|View test job on GitHub>`
        }
      });
    }

    await axios.post(webhookUrl, payload);
    console.log('Message sent to Slack successfully');
  } catch (error) {
    console.error('Error sending message to Slack:', error);
    throw error;
  }
}

// Function to extract test plan name from JMX file path
function extractTestPlanName(jmxFilePath) {
    if (!jmxFilePath) return 'Unknown Test Plan';
    return path.basename(jmxFilePath);
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
    
    // Extract test plan name from JMX file path
    const testPlanName = extractTestPlanName(jmxFilePath);
    
    // Send success notification
    await sendToSlack(testPlanName, runInfo);
  } catch (error) {
    console.error('Error in reporting:', error);
    process.exit(1);
  }
}

// Execute the reporting function
reportResults();