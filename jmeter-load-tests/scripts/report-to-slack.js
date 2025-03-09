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
async function sendToSlack(metrics, runInfo) {
  try {
    // Create summary text
    const summaryText = `• Total Requests: ${metrics.totalRequests}
• Failed Requests: ${metrics.failedRequests}
• Success Rate: ${metrics.successRate}%
• Average Response Time: ${metrics.avgResponseTime}ms
• 90th Percentile: ${metrics.percentile90}ms
• Test Duration: ${metrics.duration}s`;

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
          text: `<${runInfo.serverUrl}/${runInfo.repository}/actions/runs/${runInfo.runId}|View detailed results on GitHub>`
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

// Function to parse JTL file and extract metrics
async function parseJtlResults(jtlContent) {
  const parser = new xml2js.Parser();
  try {
    const result = await parser.parseStringPromise(jtlContent);
    const samples = result.testResults.httpSample || [];
    
    // Calculate metrics
    const totalRequests = samples.length;
    let failedRequests = 0;
    let totalResponseTime = 0;
    let minTime = Number.MAX_VALUE;
    let maxTime = 0;
    const responseTimes = [];
    const startTime = samples.length > 0 ? parseInt(samples[0].$.ts || 0, 10) : 0;
    const endTime = samples.length > 0 ? parseInt(samples[samples.length - 1].$.ts || 0, 10) : 0;
    const duration = Math.round((endTime - startTime) / 1000);
    
    samples.forEach(sample => {
      const success = sample.$.success === 'true';
      const time = parseInt(sample.$.time || 0, 10);
      
      if (!success) failedRequests++;
      totalResponseTime += time;
      minTime = Math.min(minTime, time);
      maxTime = Math.max(maxTime, time);
      responseTimes.push(time);
    });
    
    // Calculate percentiles
    responseTimes.sort((a, b) => a - b);
    const p90Index = Math.floor(responseTimes.length * 0.9);
    const percentile90 = responseTimes[p90Index] || 0;
    
    const avgResponseTime = totalRequests > 0 ? Math.round(totalResponseTime / totalRequests) : 0;
    const successRate = totalRequests > 0 ? ((totalRequests - failedRequests) / totalRequests * 100).toFixed(2) : '0.00';
    
    return {
      totalRequests,
      failedRequests,
      successRate,
      avgResponseTime,
      minTime: minTime === Number.MAX_VALUE ? 0 : minTime,
      maxTime,
      percentile90,
      duration
    };
  } catch (error) {
    console.error('Error parsing JTL results:', error);
    return {
      totalRequests: 0,
      failedRequests: 0,
      successRate: '0.00',
      avgResponseTime: 0,
      minTime: 0,
      maxTime: 0,
      percentile90: 0,
      duration: 0
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
  
  const resultsFilePath = path.resolve(__dirname, '../jmeter/results/testPlan01-results.jtl');
  
  try {
    if (!fs.existsSync(resultsFilePath)) {
      console.error(`Error: Results file not found at ${resultsFilePath}`);
      process.exit(1);
    }
    
    const jtlContent = fs.readFileSync(resultsFilePath, 'utf8');
    const metrics = await parseJtlResults(jtlContent);
    
    await sendToSlack(metrics, runInfo);
  } catch (error) {
    console.error('Error in report processing:', error);
    process.exit(1);
  }
}

// Execute the reporting function
reportResults();