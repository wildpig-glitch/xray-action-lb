# Xray Action Library - Forge Rovo Agent

A Forge-based Rovo agent that provides seamless integration between Atlassian products and Xray test management. This agent enables users to manage Jira comments and execute Xray test operations directly through conversational AI.

## 🚀 Features

### Jira Integration
- **Fetch Comments**: Retrieve all comments from a Jira issue
- **Add Comments**: Add new comments to Jira issues with proper ADF formatting

### Xray Integration
- **Execute Tests**: Run Xray test executions
- **Import Test Results**: Import test results into Xray
- **Authenticate**: Secure authentication with Xray Cloud API

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

#### 1. Fetch Comments
Retrieve all comments from a specific Jira issue.

**Parameters**:
- `issueId`: The Jira issue ID (e.g., "PROJ-123")

**Example**:
```javascript
fetchComments({ issueId: "PROJ-123" })
```

#### 2. Add Comment
Add a new comment to a Jira issue.

**Parameters**:
- `issueId`: The Jira issue ID
- `comment`: The comment text to add

**Example**:
```javascript
addComment({ 
  issueId: "PROJ-123", 
  comment: "Test execution completed successfully" 
})
```

#### 3. Execute Xray Test
Execute an Xray test and return the results.

**Parameters**:
- `testId`: The Xray test ID
- Additional execution parameters as needed

#### 4. Import Test Results
Import test execution results into Xray.

**Parameters**:
- Test result data in the appropriate format

### Conversational Interface

The Rovo agent supports natural language interactions. You can:

- Ask to "fetch comments from PROJ-123"
- Request to "add a comment to issue ABC-456"
- Execute tests through conversational commands
- Import test results with simple instructions

## 🏗️ Architecture

```
src/
├── index.js          # Main application logic
│   ├── addComment()          # Jira comment creation
│   ├── fetchComments()       # Jira comment retrieval
│   ├── executeXrayTest()     # Xray test execution
│   └── importToXray()        # Test result import
│
manifest.yml          # Forge app configuration
├── Rovo agent definition
├── Action definitions
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

- `addComment(payload)` - Adds comments to Jira issues
- `fetchComments(payload)` - Retrieves comments from Jira issues
- `executeXrayTest(payload)` - Executes Xray tests
- `importToXray(payload)` - Imports test results to Xray

## 📝 API Reference

### Jira REST API Endpoints Used
- `GET /rest/api/3/issue/{issueId}/comment` - Fetch comments
- `POST /rest/api/3/issue/{issueId}/comment` - Add comments

### Xray Cloud API Endpoints Used
- Authentication endpoint for token generation
- Test execution endpoints
- Test result import endpoints

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