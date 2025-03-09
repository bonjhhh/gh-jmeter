require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');

// Get Slack webhook URL from environment variable
const webhookUrl = process.env.SLACK_WEBHOOK_URL;
if (!webhookUrl) {
  console.error('Error: SLACK_WEBHOOK_URL environment variable is not set');
  process.exit(1);
}

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
async function sendToSlack(testPlanName, isPassed, runInfo) {
  try {
    // Create a simple status message
    const status = isPassed ? "✅ PASSED" : "❌ FAILED";
    const summaryText = `• Test Plan: ${testPlanName}\n• Status: ${status}`;

    // Start with the message format from config
    const payload = {
      username: slackConfig.username,
      icon_emoji: slackConfig.icon_emoji,
      channel: slackConfig.channel,
      text: slackConfig.messageFormat.text,
      blocks: JSON.parse(JSON.stringify(slackConfig.messageFormat.blocks))
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

// Simplified function to check if test passed
async function checkTestResults(jtlContent) {
  const parser = new xml2js.Parser();
  try {
    const result = await parser.parseStringPromise(jtlContent);
    const samples = result.testResults.httpSample || [];
    
    // Check if any requests failed
    const failedRequests = samples.filter(sample => sample.$.success === 'false').length;
    
    // Test passes if there are no failed requests
    return {
      testPassed: failedRequests === 0,
      totalSamples: samples.length
    };
  } catch (error) {
    console.error('Error parsing JTL results:', error);
    return {
      testPassed: false,
      totalSamples: 0
    };
  }
}

// Main function to report test results
async function reportResults() {
  // Get GitHub environment variables if running in GitHub Actions
  const runInfo = process.env.GITHUB_ACTIONS ? {
    runId: process.env.GITHUB_RUN_ID,
    repository: process.env.GITHUB_REPOSITORY,
    serverUrl: process.env.GITHUB_SERVER_URL || 'https://github.com'
  } : null;
  
  // Get test plan name from environment or use default
  const testPlanName = process.env.TEST_PLAN_NAME || "testPlan01";
  const resultsFilePath = path.resolve(__dirname, '../jmeter/results/testPlan01-results.jtl');
  
  try {
    if (!fs.existsSync(resultsFilePath)) {
      console.error(`Error: Results file not found at ${resultsFilePath}`);
      await sendToSlack(testPlanName, false, runInfo); // Report failure if results file not found
      process.exit(1);
    }
    
    const jtlContent = fs.readFileSync(resultsFilePath, 'utf8');
    const { testPassed } = await checkTestResults(jtlContent);
    
    await sendToSlack(testPlanName, testPassed, runInfo);
  } catch (error) {
    console.error('Error in report processing:', error);
    await sendToSlack(testPlanName, false, runInfo); // Report failure on any error
    process.exit(1);
  }
}

// Execute the reporting function
reportResults();