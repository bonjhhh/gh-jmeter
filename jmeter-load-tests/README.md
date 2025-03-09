# JMeter Load Tests

This project is designed to perform load testing using Apache JMeter for both UI and API endpoints. It is set up to run tests automatically using GitHub Actions and report results to a Microsoft Teams channel.

## Project Structure

- **.github/workflows/load-test.yml**: GitHub Actions workflow configuration for running load tests.
- **jmeter/tests/ui-load-test.jmx**: JMeter test plan for UI load testing.
- **jmeter/tests/api-load-test.jmx**: JMeter test plan for API load testing.
- **jmeter/data/test-data.csv**: Test data used by JMeter tests.
- **jmeter/results/.gitkeep**: Keeps the results directory tracked by Git.
- **scripts/run-tests.sh**: Shell script to execute JMeter tests.
- **scripts/report-to-teams.js**: JavaScript file to send test results to Microsoft Teams.
- **config/jmeter.properties**: Configuration settings for JMeter.
- **config/teams-webhook.json**: Configuration for Microsoft Teams webhook.
- **.gitignore**: Specifies files and directories to be ignored by Git.

## Setup Instructions

1. **Clone the Repository**: 
   ```
   git clone <repository-url>
   cd jmeter-load-tests
   ```

2. **Configure JMeter**: 
   Update the `config/jmeter.properties` file with your desired settings.

3. **Set Up Microsoft Teams Webhook**: 
   Create a webhook in your Microsoft Teams channel and update the `config/teams-webhook.json` file with the webhook URL.

4. **Run Tests Locally**: 
   You can run the tests locally using the `scripts/run-tests.sh` script.

5. **Automated Testing**: 
   The tests will automatically run on every push to the repository, as defined in the GitHub Actions workflow.

## Reporting

Test results will be sent to the specified Microsoft Teams channel after each test run. Ensure that the webhook is correctly configured to receive messages.

## Usage Guidelines

- Modify the JMeter test plans in the `jmeter/tests` directory to suit your testing needs.
- Update the test data in `jmeter/data/test-data.csv` as necessary.
- Review the results in the `jmeter/results` directory after each test run.