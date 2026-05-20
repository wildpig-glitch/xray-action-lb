# Xray Action Library - Forge Rovo Agent

A Forge-based Rovo agent that integrates Jira and Xray Cloud through conversational AI. The agent can retrieve detailed test management data from Xray and **generate high-quality, LLM-driven test cases** directly from user stories — including specific test steps derived from acceptance criteria, error scenarios, and preconditions — all created automatically in Xray Cloud.

## 🚀 Features

### AI-Driven Test Case Generation
- **Get User Story Details**: Fetch a user story's summary, description, and structured acceptance criteria by issue key. Automatically resolves the linked story when given a Test issue key.
- **Create Xray Test Case**: Creates a complete test case in Xray Cloud from LLM-generated content, including test steps, preconditions, and a link back to the originating user story.

The Rovo agent's LLM reads the user story acceptance criteria and generates:
- One focused, traceable test step per acceptance criterion (happy path)
- 2–3 negative/error scenario steps (e.g. invalid tokens, 404s, unauthorised access)
- Story-specific preconditions
- A descriptive test summary and description

### Xray Test Data Retrieval
- **Get Xray Data**: Retrieve comprehensive Xray data for any test issue with user choice of data type
- **Get Test Steps**: Fetch detailed test steps, actions, and expected results
- **Get Preconditions**: Retrieve test preconditions and setup requirements
- **Get Test Sets**: Find all test sets containing a specific test issue
- **Get Test Plans**: Discover test plans that include a specific test issue
- **Get Test Runs**: Access execution history and test run details
- **Get User Story**: Retrieve the user story linked to a test issue
- **Get Linked Test Cases**: Find all test cases linked to a user story

## 📋 Prerequisites

- Node.js 22.x or later
- Forge CLI installed and configured
- Valid Atlassian Developer account
- Xray Cloud API credentials (client ID and client secret)

## 🛠️ Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/wildpig-glitch/xray-action-lb.git
   cd xray-action-lb
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   forge variables set --encrypt XRAY_CLIENT_ID "your-xray-client-id"
   forge variables set --encrypt XRAY_CLIENT_SECRET "your-xray-client-secret"
   ```

4. **Deploy the app**:
   ```bash
   forge deploy --non-interactive -e development
   ```

5. **Install the app in your site**:
   ```bash
   forge install --non-interactive --site <your-site>.atlassian.net --product jira --environment development
   ```

## 🔧 Configuration

### Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `XRAY_CLIENT_ID` | Your Xray Cloud API client ID | Yes |
| `XRAY_CLIENT_SECRET` | Your Xray Cloud API client secret | Yes |

### Permissions

The app requires the following Atlassian permissions:
- `read:jira-work` - Read Jira issues and issue links
- `write:jira-work` - Create and update Jira issues (test cases, preconditions)

## 🎯 Usage

### Available Actions

#### Test Case Generation

##### Get User Story Details
Fetches a user story's full details including structured acceptance criteria. If a Test issue key is provided, automatically follows the "tests" link to find and return the linked user story.

**Parameters**:
- `issueKey` (required): Jira issue key of the user story (e.g. `SDF-22`) or a linked test issue (e.g. `SDF-28`)

##### Create Xray Test Case
Creates a complete test case in Xray Cloud from LLM-generated content and links it to the originating user story.

**Parameters**:
- `projectKey` (required): Jira project key (e.g. `SDF`)
- `userStoryKey` (required): Issue key of the user story being tested (e.g. `SDF-22`)
- `summary` (required): Test case title (max 255 characters)
- `description` (optional): Plain text description of what the test validates
- `testSteps` (required): JSON array string of steps — `[{"action":"...","data":"...","result":"..."}]`
- `preconditions` (optional): JSON array string of precondition strings — `["precondition 1", "precondition 2"]`

#### Xray Data Retrieval

##### Get Xray Data
Retrieve comprehensive Xray data for a test issue.

**Parameters**:
- `issueId`: The Jira test issue ID (e.g. `PROJ-123`)
- `dataType` (optional): `test-steps`, `preconditions`, `test-sets`, `test-plans`, `test-runs`

##### Get Test Steps
Fetch detailed test steps, actions, and expected results for a test issue.

**Parameters**:
- `issueId`: The Jira test issue ID

##### Get Preconditions
Retrieve preconditions and setup requirements for a test issue.

**Parameters**:
- `issueId`: The Jira test issue ID

##### Get Test Sets
Find all test sets that contain the specified test issue.

**Parameters**:
- `issueId`: The Jira test issue ID

##### Get Test Plans
Discover test plans that include the specified test issue.

**Parameters**:
- `issueId`: The Jira test issue ID

##### Get Test Runs
Access execution history and test run details for a test issue.

**Parameters**:
- `issueId`: The Jira test issue ID

##### Get User Story
Retrieve the user story linked to a test issue via the "tests" relationship.

**Parameters**:
- `issueId`: The Jira test issue ID

##### Get Linked Test Cases
Find all test cases linked to a user story.

**Parameters**:
- `issueId`: The Jira user story issue ID

### Conversational Interface

The Rovo agent supports natural language interactions. You can:

**Test case generation:**
- "Generate a test case for SDF-22"
- "Create an Xray test for this user story: SDF-45"
- "Generate tests for the data lineage tracking story"

**Test data retrieval:**
- "Retrieve Xray data for this test case"
- "Get test steps for PROJ-123"
- "Show me test runs for SDF-28"
- "What are the preconditions for test ABC-456"
- "Show me test plans containing this test"
- "Find all test cases linked to SDF-22"

## 🏗️ Architecture

```
src/
├── index.js                      # Main application logic
│   ├── getUserStoryDetails()     # Fetch user story details + acceptance criteria
│   ├── createXrayTest()          # Create LLM-generated test case in Xray
│   ├── getXrayData()             # Get comprehensive Xray data
│   ├── getTestSteps()            # Get test steps and expected results
│   ├── getPreconditions()        # Get test preconditions
│   ├── getTestSets()             # Get test sets containing the test
│   ├── getTestPlans()            # Get test plans containing the test
│   ├── getTestRuns()             # Get execution history and test runs
│   ├── getUserStory()            # Get user story linked to a test
│   └── getLinkedTestCases()      # Get test cases linked to a user story
│
prompts/                          # Rovo agent scenario prompts
├── Generate Test Case            # LLM-driven test case generation workflow
├── Assess Test Case              # Test case assessment workflow
└── Assess Test Coverage          # Test coverage assessment workflow
│
manifest.yml                      # Forge app configuration
├── Rovo agent definition
├── Action definitions
└── Permission scopes
```

### How Test Case Generation Works

1. The agent calls **`get-user-story-details`** with the provided issue key
2. The action fetches the Jira issue, extracts the ADF description, and returns structured acceptance criteria
3. The **Rovo LLM** reasons about the acceptance criteria and generates:
   - Happy-path test steps (one per criterion)
   - Negative/error scenario steps
   - Story-specific preconditions
4. The agent calls **`create-xray-test`** with the LLM-generated content
5. The action creates the Xray test issue, adds test steps and preconditions, and links the test to the user story

## 🔐 Security

- **No hardcoded credentials**: All sensitive data is stored in encrypted Forge environment variables
- **User context**: Jira API calls use `.asUser()` so they respect the authenticated user's permissions
- **Minimal scopes**: Only the permissions strictly required for Jira read/write operations are requested

## 🚀 Development

### Local Development

1. **Start tunnel for live reloading**:
   ```bash
   forge tunnel
   ```

2. **View logs**:
   ```bash
   forge logs -e development --since 15m
   ```

3. **Lint before deploying**:
   ```bash
   forge lint
   ```

### Code Structure

The main logic is contained in `src/index.js` with the following exported functions:

**Test case generation:**
- `getUserStoryDetails(payload)` — Fetches user story details and structured acceptance criteria
- `createXrayTest(payload)` — Creates a test case in Xray from LLM-generated content

**Xray data retrieval:**
- `getXrayData(payload)` — Retrieves comprehensive Xray data with user choice of data type
- `getTestSteps(payload)` — Fetches detailed test steps, actions, and expected results
- `getPreconditions(payload)` — Retrieves test preconditions and setup requirements
- `getTestSets(payload)` — Finds test sets containing the specified test issue
- `getTestPlans(payload)` — Discovers test plans that include the specified test issue
- `getTestRuns(payload)` — Accesses execution history and test run details
- `getUserStory(payload)` — Retrieves the user story linked to a test issue
- `getLinkedTestCases(payload)` — Finds all test cases linked to a user story

## 📝 API Reference

### Xray Cloud API Endpoints Used
- `POST /api/v1/authenticate` — Authentication endpoint for token generation
- `POST /api/v2/graphql` — GraphQL endpoint for:
  - Retrieving test steps, preconditions, test sets, test plans, test runs
  - Creating test cases, preconditions, and issue links

### Jira REST API Endpoints Used
- `GET /rest/api/3/issue/{issueId}` — Fetch issue details, description (ADF), and issue links
- `POST /rest/api/3/issue` — Create test and precondition issues
- `POST /rest/api/3/issueLink` — Link test cases to user stories

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Lint before committing: `forge lint`
5. Commit your changes: `git commit -m "Add feature"`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Troubleshooting

### Common Issues

**Issue**: "Failed to authenticate with Xray"
- **Solution**: Verify your `XRAY_CLIENT_ID` and `XRAY_CLIENT_SECRET` are correctly set using `forge variables list`

**Issue**: "Permission denied when accessing Jira"
- **Solution**: Ensure the app has the required permissions and is properly installed. Run `forge install --upgrade` if scopes have changed.

**Issue**: "testSteps must be a non-empty JSON array"
- **Solution**: The `create-xray-test` action expects a valid JSON string. Ensure the agent is formatting the steps correctly as `[{"action":"...","data":"...","result":"..."}]`

**Issue**: "Test issue has no linked user story"
- **Solution**: Ensure the test issue is linked to a user story via a "Tests" issue link in Jira before calling `get-user-story-details` with a test key.

**Issue**: "Function not found"
- **Solution**: Make sure the app is deployed with `forge deploy --non-interactive -e development`

### Debug Mode

View recent logs:
```bash
forge logs -e development --since 15m
```

## 📞 Support

- Create an issue in this repository for bugs or feature requests
- Check the [Forge documentation](https://developer.atlassian.com/platform/forge/) for platform-specific questions
- Review [Xray Cloud API documentation](https://docs.getxray.app/display/XRAYCLOUD/REST+API) for Xray-related issues

## 🔄 Changelog

### v3.0.0
- **LLM-driven test case generation**: Replaced rule-based step generation with Rovo LLM reasoning
- Added `get-user-story-details` action for structured acceptance criteria extraction
- Added `create-xray-test` action as a lean Xray creation endpoint for LLM-generated content
- Updated `Generate Test Case` agent prompt to orchestrate the new 4-step generation flow
- Added negative/error scenario test steps to all generated test cases
- Removed `generate-test-case` monolithic action and all associated rule-based helper functions

### v2.0.2
- Replaced hardcoded credentials with encrypted environment variables
- Added comprehensive error handling
- Improved security posture
- Re-enabled Xray auth token caching

### Previous Versions
- Initial implementation of Xray data retrieval actions
- Basic Rovo agent setup

---

**Made with ❤️ using Atlassian Forge**
