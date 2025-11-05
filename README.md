# Xray Action Library - Forge Rovo Agent

A Forge-based Rovo agent that provides comprehensive access to Xray test management data. This agent enables users to retrieve detailed test information from Xray through conversational AI, including test steps, preconditions, test sets, test plans, and execution history.

## 🚀 Features

### Xray Test Data Retrieval
- **Get Xray Data**: Retrieve comprehensive Xray data for any test issue with user choice of data type
- **Get Test Steps**: Fetch detailed test steps, actions, and expected results
- **Get Preconditions**: Retrieve test preconditions and setup requirements
- **Get Test Sets**: Find all test sets containing a specific test issue
- **Get Test Plans**: Discover test plans that include a specific test issue
- **Get Test Runs**: Access execution history and test run details

## 📋 Prerequisites

- Node.js 22.x or later
- Forge CLI installed and configured
- Valid Atlassian Developer account
- Xray Cloud API credentials

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
   forge deploy
   ```

5. **Install the app in your site**:
   ```bash
   forge install
   ```

## 🔧 Configuration

### Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `XRAY_CLIENT_ID` | Your Xray Cloud API client ID | Yes |
| `XRAY_CLIENT_SECRET` | Your Xray Cloud API client secret | Yes |

### Permissions

The app requires the following Atlassian permissions:
- `read:jira-work` - Read Jira issues and comments
- `write:jira-work` - Create and update Jira issues and comments

## 🎯 Usage

### Available Actions

#### 1. Get Xray Data
Retrieve comprehensive Xray data for a test issue with user choice of data type.

**Parameters**:
- `issueId`: The Jira test issue ID (e.g., "PROJ-123")
- `dataType`: Type of data to retrieve (optional): test-steps, preconditions, test-sets, test-plans, test-runs

**Example**:
```javascript
getXrayData({ issueId: "PROJ-123", dataType: "test-steps" })
```

#### 2. Get Test Steps
Fetch detailed test steps, actions, and expected results for a test issue.

**Parameters**:
- `issueId`: The Jira test issue ID

**Example**:
```javascript
getTestSteps({ issueId: "PROJ-123" })
```

#### 3. Get Preconditions
Retrieve preconditions and setup requirements for a test issue.

**Parameters**:
- `issueId`: The Jira test issue ID

**Example**:
```javascript
getPreconditions({ issueId: "PROJ-123" })
```

#### 4. Get Test Sets
Find all test sets that contain the specified test issue.

**Parameters**:
- `issueId`: The Jira test issue ID

**Example**:
```javascript
getTestSets({ issueId: "PROJ-123" })
```

#### 5. Get Test Plans
Discover test plans that include the specified test issue.

**Parameters**:
- `issueId`: The Jira test issue ID

**Example**:
```javascript
getTestPlans({ issueId: "PROJ-123" })
```

#### 6. Get Test Runs
Access execution history and test run details for a test issue.

**Parameters**:
- `issueId`: The Jira test issue ID

**Example**:
```javascript
getTestRuns({ issueId: "PROJ-123" })
```

### Conversational Interface

The Rovo agent supports natural language interactions. You can:

- Ask to "retrieve Xray data for this test case"
- Request to "get test steps for PROJ-123"
- Say "get test runs for this issue"
- Ask for "preconditions for test ABC-456"
- Request "show me test plans containing this test"

## 🏗️ Architecture

```
src/
├── index.js          # Main application logic
│   ├── getXrayData()         # Get comprehensive Xray data
│   ├── getTestSteps()        # Get test steps and expected results
│   ├── getPreconditions()    # Get test preconditions
│   ├── getTestSets()         # Get test sets containing the test
│   ├── getTestPlans()        # Get test plans containing the test
│   └── getTestRuns()         # Get execution history and test runs
│
manifest.yml          # Forge app configuration
├── Rovo agent definition
├── Six Xray-specific actions
└── Permission scopes
```

## 🔐 Security

- **No hardcoded credentials**: All sensitive data is stored in encrypted Forge variables
- **Secure API calls**: Uses Forge's built-in authentication mechanisms
- **User context**: All operations are performed in the context of the authenticated user

## 🚀 Development

### Local Development

1. **Start development server**:
   ```bash
   forge tunnel
   ```

2. **View logs**:
   ```bash
   forge logs
   ```

3. **Run tests** (if available):
   ```bash
   npm test
   ```

### Code Structure

The main logic is contained in `src/index.js` with the following exported functions:

- `getXrayData(payload)` - Retrieves comprehensive Xray data with user choice of data type
- `getTestSteps(payload)` - Fetches detailed test steps, actions, and expected results
- `getPreconditions(payload)` - Retrieves test preconditions and setup requirements
- `getTestSets(payload)` - Finds test sets containing the specified test issue
- `getTestPlans(payload)` - Discovers test plans that include the specified test issue
- `getTestRuns(payload)` - Accesses execution history and test run details

## 📝 API Reference

### Xray Cloud API Endpoints Used
- `POST /api/v1/authenticate` - Authentication endpoint for token generation
- `POST /api/v2/graphql` - GraphQL endpoint for retrieving test data including:
  - Test steps and expected results
  - Test preconditions
  - Test sets and test plans
  - Test execution history and runs

### Jira REST API Endpoints Used
- `GET /rest/api/3/issue/{issueId}` - Fetch issue details for Xray test data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Add tests if applicable
5. Commit your changes: `git commit -m "Add feature"`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Troubleshooting

### Common Issues

**Issue**: "Failed to authenticate with Xray"
- **Solution**: Verify your `XRAY_CLIENT_ID` and `XRAY_CLIENT_SECRET` are correctly set

**Issue**: "Permission denied when accessing Jira"
- **Solution**: Ensure the app has the required permissions and is properly installed

**Issue**: "Function not found"
- **Solution**: Make sure the app is deployed with `forge deploy`

### Debug Mode

Enable debug logging by setting the log level in your Forge app:

```bash
forge logs --tail
```

## 📞 Support

- Create an issue in this repository for bugs or feature requests
- Check the [Forge documentation](https://developer.atlassian.com/platform/forge/) for platform-specific questions
- Review [Xray Cloud API documentation](https://docs.getxray.app/display/XRAYCLOUD/REST+API) for Xray-related issues

## 🔄 Changelog

### v2.0.2
- Replaced hardcoded credentials with environment variables
- Added comprehensive error handling
- Improved security posture

### Previous Versions
- Initial implementation of Jira comment functionality
- Basic Xray integration
- Rovo agent setup

---

**Made with ❤️ using Atlassian Forge**