import api, { route, fetch } from '@forge/api';

// Xray Cloud API configuration
const XRAY_CLIENT_ID = process.env.XRAY_CLIENT_ID;
const XRAY_CLIENT_SECRET = process.env.XRAY_CLIENT_SECRET;
const XRAY_AUTH_URL = 'https://xray.cloud.getxray.app/api/v1/authenticate';
const XRAY_API_URL = 'https://xray.cloud.getxray.app/api/v2/graphql';

// Cache auth token to avoid re-authentication
let cachedAuthToken = null;
let tokenExpiration = null;

// Function to get Xray authentication token
async function getXrayAuthToken() {
  // Check if we have a cached token that's still valid
  if (cachedAuthToken && tokenExpiration && Date.now() < tokenExpiration) {
    console.log('🔐 Using cached authentication token');
    return cachedAuthToken;
  }

  console.log('🔐 Starting Xray authentication process...');
  console.log('📍 Auth URL: ', XRAY_AUTH_URL);
  console.log('🔑 Client ID:', XRAY_CLIENT_ID);
  console.log('🔒 Client Secret length:', XRAY_CLIENT_SECRET.length);
  
  try {
    const authPayload = {
      client_id: XRAY_CLIENT_ID,
      client_secret: XRAY_CLIENT_SECRET
    };
    
    console.log('📤 Sending authentication request...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(XRAY_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(authPayload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    console.log('📥 Authentication response status:', response.status);
    console.log('📥 Authentication response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Authentication failed - Status:', response.status);
      console.error('❌ Authentication failed - Status Text:', response.statusText);
      console.error('❌ Authentication failed - Response Body:', errorText);
      throw new Error(`Authentication failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const token = await response.text();
    console.log('✅ Authentication successful');
    console.log('🎫 Raw token length:', token.length);
    console.log('🎫 Raw token (first 20 chars):', token.substring(0, 20) + '...');
    
    const cleanToken = token.replace(/"/g, ''); // Remove quotes from token
    console.log('🎫 Clean token length:', cleanToken.length);
    console.log('🎫 Clean token (first 20 chars):', cleanToken.substring(0, 20) + '...');
    
    // Cache the token for 1 hour
    cachedAuthToken = cleanToken;
    tokenExpiration = Date.now() + (60 * 60 * 1000); // 1 hour
    console.log('💾 Token cached until:', new Date(tokenExpiration).toISOString());
    
    return cleanToken;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ Xray authentication timed out after 5 seconds');
      throw new Error('Xray authentication timeout');
    }
    console.error('💥 Error getting Xray auth token:', error);
    console.error('💥 Error stack:', error.stack);
    throw error;
  }
}

// Function to execute GraphQL query against Xray
async function executeXrayGraphQL(query, variables = {}) {
  console.log('🚀 Starting GraphQL query execution...');
  console.log('🎯 GraphQL URL:', XRAY_API_URL);
  console.log('📝 GraphQL Query:', query);
  console.log('🔧 GraphQL Variables:', JSON.stringify(variables, null, 2));
  
  try {
    console.log('🔐 Getting authentication token...');
    const token = await getXrayAuthToken();
    console.log('✅ Token received for GraphQL request');
    
    const requestBody = {
      query,
      variables
    };
    
    console.log('📤 Sending GraphQL request...');
    console.log('📦 Request body:', JSON.stringify(requestBody, null, 2));
    
    // Add timeout to GraphQL request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(XRAY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    console.log('📥 GraphQL response status:', response.status);
    console.log('📥 GraphQL response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ GraphQL request failed - Status:', response.status);
      console.error('❌ GraphQL request failed - Status Text:', response.statusText);
      console.error('❌ GraphQL request failed - Response Body:', errorText);
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log('✅ GraphQL request successful');
    console.log('📊 Response data:', JSON.stringify(responseData, null, 2));
    
    // Log specific details about the response
    if (responseData.data) {
      console.log('📊 Data field exists');
      if (responseData.data.getTest === null) {
        console.log('⚠️  getTest returned null - this usually means:');
        console.log('   - Issue is not a Test issue type');
        console.log('   - Issue doesn\'t exist in Xray');
        console.log('   - Issue has no test data defined');
      } else if (responseData.data.getTest) {
        console.log('✅ getTest returned data');
      }
    }
    
    return responseData;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ Xray GraphQL request timed out after 10 seconds');
      throw new Error('Xray GraphQL request timeout');
    }
    console.error('💥 Error executing Xray GraphQL query:', error);
    console.error('💥 Error stack:', error.stack);
    throw error;
  }
}

// Main function to handle user choice of data type
export async function getXrayData(payload) {
  console.log('🎯 === STARTING getXrayData FUNCTION ===');
  console.log('📥 Received payload:', JSON.stringify(payload, null, 2));
  
  // If no dataType is specified, ask the user what they want
  if (!payload.dataType) {
    return {
      message: "What Xray data would you like to retrieve for this test case?",
      options: [
        { id: "test-steps", label: "Test Steps", description: "Get test steps, actions, and expected results" },
        { id: "preconditions", label: "Preconditions", description: "Get test preconditions and requirements" },
        { id: "test-sets", label: "Test Sets", description: "Get test sets containing this test" },
        { id: "test-plans", label: "Test Plans", description: "Get test plans containing this test" },
        { id: "test-runs", label: "Test Runs", description: "Get execution history and results" }
      ]
    };
  }
  
  // Route to appropriate function based on user choice
  switch (payload.dataType) {
    case 'test-steps':
      return await getTestSteps(payload);
    case 'preconditions':
      return await getPreconditions(payload);
    case 'test-sets':
      return await getTestSets(payload);
    case 'test-plans':
      return await getTestPlans(payload);
    case 'test-runs':
      return await getTestRuns(payload);
    default:
      throw new Error(`Unknown data type: ${payload.dataType}`);
  }
}

// Function to get test steps (original functionality)
export async function getTestSteps(payload) {
  console.log('🎯 === STARTING getTestSteps FUNCTION ===');
  console.log('📥 Received payload:', JSON.stringify(payload, null, 2));
  
  let issueId = payload.issueId;
  console.log('🎫 Raw issueId:', issueId);
  
  if (!issueId) {
    console.error('❌ Issue ID validation failed - no issueId provided');
    throw new Error('Issue ID is required');
  }

  // Extract issue key from URL if a full URL is provided
  if (issueId.includes('/browse/')) {
    const urlParts = issueId.split('/browse/');
    issueId = urlParts[urlParts.length - 1];
    console.log('🔧 Extracted issue key from URL:', issueId);
  }
  
  console.log('🎫 Final issueKey to use:', issueId);
  console.log('✅ Issue key validation passed');

  // Convert issue key to issue ID for Xray API (with timeout handling)
  console.log('🔄 Converting issue key to issue ID for Xray...');
  let numericIssueId;
  try {
    // Set a shorter timeout for Jira API call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const jiraResponse = await api.asUser().requestJira(route`/rest/api/3/issue/${issueId}?fields=id`, {
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!jiraResponse.ok) {
      throw new Error(`Failed to get issue details: ${jiraResponse.status} ${jiraResponse.statusText}`);
    }
    
    const jiraData = await jiraResponse.json();
    numericIssueId = jiraData.id;
    console.log(`✅ Converted issue key ${issueId} to numeric ID: ${numericIssueId}`);
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ Jira API call timed out after 5 seconds');
      throw new Error(`Jira API timeout when getting issue ID for ${issueId}`);
    }
    console.error('❌ Failed to convert issue key to ID:', error.message);
    throw new Error(`Failed to get issue ID for ${issueId}: ${error.message}`);
  }

  try {
    console.log('📝 Preparing GraphQL query...');
    
    // GraphQL query to get test steps and related data
    const query = `
      query GetTestData($issueId: String!) {
        getTest(issueId: $issueId) {
          issueId
          testType {
            name
            kind
          }
          steps {
            id
            action
            data
            result
          }
        }
      }
    `;

    const variables = { issueId: numericIssueId };
    console.log('🔧 Query variables prepared:', JSON.stringify(variables, null, 2));
    console.log(`🔧 Using numeric issue ID ${numericIssueId} for Xray GraphQL query`);
    console.log('📤 Executing GraphQL query...');
    
    const result = await executeXrayGraphQL(query, variables);
    console.log('📥 GraphQL query completed');
    
    if (result.errors) {
      console.error('❌ GraphQL returned errors:', JSON.stringify(result.errors, null, 2));
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    console.log('✅ No GraphQL errors detected');

    if (!result.data) {
      console.error('❌ No data field in GraphQL response');
      console.error('❌ Full result:', JSON.stringify(result, null, 2));
      throw new Error(`No data in GraphQL response for issue ${issueId}`);
    }

    console.log('✅ Data field found in GraphQL response');

    if (!result.data.getTest) {
      console.error('❌ No getTest data in GraphQL response');
      console.error('❌ Available data keys:', Object.keys(result.data));
      console.error('❌ getTest value:', result.data.getTest);
      console.error('❌ This usually means the issue is not a Test issue or doesn\'t exist in Xray');
      
      // Try a simpler query to see if we can get any info about this issue
      console.log('🔍 Attempting to verify if issue exists with simpler query...');
      try {
        const simpleQuery = `
          query CheckIssue($issueId: String!) {
            getTest(issueId: $issueId) {
              issueId
            }
          }
        `;
        const simpleResult = await executeXrayGraphQL(simpleQuery, { issueId });
        console.log('🔍 Simple query result:', JSON.stringify(simpleResult, null, 2));
      } catch (error) {
        console.log('🔍 Simple query also failed:', error.message);
      }
      
      return {
        issueId: issueId,
        message: `Issue ${issueId} is a Test issue but has no test steps or test data defined in Xray yet. Please add test steps in Xray Cloud to see test data.`,
        testType: null,
        preconditions: [],
        steps: [],
        unstructured: null,
        gherkin: null
      };
    }

    console.log('✅ getTest data found in GraphQL response');
    const testData = result.data.getTest;
    console.log('📊 Raw test data:', JSON.stringify(testData, null, 2));
    
    console.log('🔄 Starting response formatting...');
    
    // Format the response for better readability
    const steps = testData.steps?.map((step, index) => {
      console.log(`📋 Processing step ${index + 1}:`, step);
      return {
        stepNumber: index + 1,
        id: step.id,
        action: step.action,
        data: step.data,
        expectedResult: step.result
      };
    }) || [];
    
    console.log(`📋 Processed ${steps.length} test steps`);
    
    const formattedResponse = {
      issueId: testData.issueId,
      testType: testData.testType,
      preconditions: testData.preconditions?.results || [],
      steps: steps,
      unstructured: testData.unstructured,
      gherkin: testData.gherkin
    };

    console.log('✅ Response formatting completed');
    console.log('📤 Final formatted response:', JSON.stringify(formattedResponse, null, 2));
    console.log(`🎉 Successfully retrieved Xray data for issue ${issueId}`);
    console.log('🎯 === ENDING getXrayData FUNCTION ===');
    
    return formattedResponse;
    
  } catch (error) {
    console.error(`💥 Error retrieving Xray data for issue ${issueId}:`, error);
    console.error('💥 Error stack:', error.stack);
    console.error('🎯 === ENDING getTestSteps FUNCTION WITH ERROR ===');
    throw new Error(`Failed to retrieve Xray data: ${error.message}`);
  }
}

// Function to get preconditions
export async function getPreconditions(payload) {
  console.log('🎯 === STARTING getPreconditions FUNCTION ===');
  console.log('📥 Received payload:', JSON.stringify(payload, null, 2));
  
  let issueId = payload.issueId;
  console.log('🎫 Raw issueId:', issueId);
  
  if (!issueId) {
    throw new Error('Issue ID is required');
  }

  // Extract issue key from URL if needed
  if (issueId.includes('/browse/')) {
    const urlParts = issueId.split('/browse/');
    issueId = urlParts[urlParts.length - 1];
    console.log('🔧 Extracted issue key from URL:', issueId);
  }
  
  console.log('🎫 Final issueKey to use:', issueId);

  // Convert issue key to issue ID for Xray API and determine Jira base URL
  let numericIssueId;
  let jiraBaseUrl;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const jiraResponse = await api.asUser().requestJira(route`/rest/api/3/issue/${issueId}?fields=id`, {
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!jiraResponse.ok) {
      throw new Error(`Failed to get issue details: ${jiraResponse.status} ${jiraResponse.statusText}`);
    }
    
    const jiraData = await jiraResponse.json();
    numericIssueId = jiraData.id;
    
    // Use the original payload URL if it was provided, otherwise construct from known pattern
    if (payload.issueId && payload.issueId.includes('/browse/')) {
      const originalUrl = payload.issueId;
      const urlParts = originalUrl.split('/browse/');
      jiraBaseUrl = urlParts[0];
    } else {
      // Fallback: Use the known Jira instance URL pattern
      jiraBaseUrl = 'https://one-atlas-jevs.atlassian.net';
    }
    
    console.log(`✅ Converted issue key ${issueId} to numeric ID: ${numericIssueId}`);
    console.log(`🌐 Jira base URL: ${jiraBaseUrl}`);
    
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Jira API timeout when getting issue ID for ${issueId}`);
    }
    throw new Error(`Failed to get issue ID for ${issueId}: ${error.message}`);
  }

  try {
    const query = `
      query GetTestPreconditions($issueId: String!) {
        getTest(issueId: $issueId) {
          issueId
          preconditions(limit: 100) {
            results {
              issueId
              jira(fields: ["key", "summary", "status"])
            }
            total
          }
        }
      }
    `;

    const variables = { issueId: numericIssueId };
    const result = await executeXrayGraphQL(query, variables);

    if (!result.data.getTest) {
      return {
        issueId: issueId,
        message: `Issue ${issueId} is a Test issue but has no preconditions defined in Xray yet.`,
        preconditions: [],
        total: 0
      };
    }

    const preconditionsData = result.data.getTest.preconditions || { results: [], total: 0 };
    
    // Format preconditions with clickable Jira links
    const formattedPreconditions = preconditionsData.results.map(precondition => {
      // Parse the jira field as JSON since it's returned as JSON type
      let jiraData = null;
      try {
        jiraData = typeof precondition.jira === 'string' ? JSON.parse(precondition.jira) : precondition.jira;
      } catch (error) {
        console.warn('Failed to parse jira data for precondition:', precondition.issueId, error);
      }
      
      const jiraKey = jiraData?.key;
      const jiraSummary = jiraData?.summary;
      const jiraStatus = jiraData?.status?.name;
      
      return {
        issueId: precondition.issueId,
        key: jiraKey,
        summary: jiraSummary,
        status: jiraStatus,
        link: jiraKey ? `${jiraBaseUrl}/browse/${jiraKey}` : null,
        linkMarkdown: jiraKey ? `[${jiraKey}](${jiraBaseUrl}/browse/${jiraKey})` : null,
        linkHtml: jiraKey ? `<a href="${jiraBaseUrl}/browse/${jiraKey}" target="_blank">${jiraKey}</a>` : null,
        linkDisplay: jiraKey ? `Precondition: ${jiraBaseUrl}/browse/${jiraKey}` : null
      };
    });
    
    // Create a summary message with links
    let summaryMessage = `Found ${preconditionsData.total} precondition(s) for test ${issueId}`;
    if (formattedPreconditions.length > 0) {
      summaryMessage += '\n\nPreconditions:\n';
      formattedPreconditions.forEach(precondition => {
        if (precondition.key) {
          summaryMessage += `• ${precondition.key}: ${jiraBaseUrl}/browse/${precondition.key}\n`;
        }
      });
    }

    const formattedResponse = {
      issueId: issueId,
      preconditions: formattedPreconditions,
      total: preconditionsData.total,
      message: summaryMessage,
      jiraBaseUrl: jiraBaseUrl,
      // Provide direct access to URLs for the UI
      preconditionLinks: formattedPreconditions.map(precondition => ({
        key: precondition.key,
        url: precondition.link,
        summary: precondition.summary
      })).filter(link => link.key)
    };

    console.log('🎉 === getPreconditions COMPLETED SUCCESSFULLY ===');
    return formattedResponse;
  } catch (error) {
    console.error('💥 === getPreconditions FAILED ===');
    console.error('💥 Error details:', error.message);
    throw error;
  }
}

// Function to get test sets
export async function getTestSets(payload) {
  console.log('🎯 === STARTING getTestSets FUNCTION ===');
  console.log('📥 Received payload:', JSON.stringify(payload, null, 2));
  
  let issueId = payload.issueId;
  
  if (!issueId) {
    throw new Error('Issue ID is required');
  }

  // Extract issue key from URL if needed
  if (issueId.includes('/browse/')) {
    const urlParts = issueId.split('/browse/');
    issueId = urlParts[urlParts.length - 1];
  }

  // Convert issue key to issue ID for Xray API and determine Jira base URL
  let numericIssueId;
  let jiraBaseUrl;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const jiraResponse = await api.asUser().requestJira(route`/rest/api/3/issue/${issueId}?fields=id`, {
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const jiraData = await jiraResponse.json();
    numericIssueId = jiraData.id;
    
    // Use the original payload URL if it was provided, otherwise construct from known pattern
    if (payload.issueId && payload.issueId.includes('/browse/')) {
      const originalUrl = payload.issueId;
      const urlParts = originalUrl.split('/browse/');
      jiraBaseUrl = urlParts[0];
    } else {
      // Fallback: Use the known Jira instance URL pattern
      jiraBaseUrl = 'https://one-atlas-jevs.atlassian.net';
    }
    
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Jira API timeout when getting issue ID for ${issueId}`);
    }
    throw new Error(`Failed to get issue ID for ${issueId}: ${error.message}`);
  }

  try {
    const query = `
      query GetTestSetsContainingTest($issueId: String!) {
        getTests(issueIds: [$issueId], limit: 10) {
          results {
            testSets(limit: 50) {
              results {
                issueId
                jira(fields: ["key", "summary", "status"])
              }
              total
            }
          }
        }
      }
    `;

    const variables = { issueId: numericIssueId };
    const result = await executeXrayGraphQL(query, variables);

    const testData = result.data.getTests?.results?.[0];
    const testSetsData = testData?.testSets || { results: [], total: 0 };
    
    // Format test sets with clickable Jira links
    const formattedTestSets = testSetsData.results.map(testSet => {
      // Parse the jira field as JSON since it's returned as JSON type
      let jiraData = null;
      try {
        jiraData = typeof testSet.jira === 'string' ? JSON.parse(testSet.jira) : testSet.jira;
      } catch (error) {
        console.warn('Failed to parse jira data for test set:', testSet.issueId, error);
      }
      
      const jiraKey = jiraData?.key;
      const jiraSummary = jiraData?.summary;
      const jiraStatus = jiraData?.status?.name;
      
      return {
        issueId: testSet.issueId,
        key: jiraKey,
        summary: jiraSummary,
        status: jiraStatus,
        link: jiraKey ? `${jiraBaseUrl}/browse/${jiraKey}` : null,
        linkMarkdown: jiraKey ? `[${jiraKey}](${jiraBaseUrl}/browse/${jiraKey})` : null,
        linkHtml: jiraKey ? `<a href="${jiraBaseUrl}/browse/${jiraKey}" target="_blank">${jiraKey}</a>` : null,
        linkDisplay: jiraKey ? `Test Set: [${jiraKey}](${jiraBaseUrl}/browse/${jiraKey}) - ${jiraSummary}` : null
      };
    });
    
    const formattedResponse = {
      issueId: issueId,
      testSets: formattedTestSets,
      total: testSetsData.total,
      message: `Found ${testSetsData.total} test set(s) containing test ${issueId}`,
      jiraBaseUrl: jiraBaseUrl
    };

    console.log('🎉 === getTestSets COMPLETED SUCCESSFULLY ===');
    return formattedResponse;
  } catch (error) {
    console.error('💥 === getTestSets FAILED ===');
    console.error('💥 Error details:', error.message);
    throw error;
  }
}

// Function to get test plans
export async function getTestPlans(payload) {
  console.log('🎯 === STARTING getTestPlans FUNCTION ===');
  console.log('📥 Received payload:', JSON.stringify(payload, null, 2));
  
  let issueId = payload.issueId;
  
  if (!issueId) {
    throw new Error('Issue ID is required');
  }

  // Extract issue key from URL if needed
  if (issueId.includes('/browse/')) {
    const urlParts = issueId.split('/browse/');
    issueId = urlParts[urlParts.length - 1];
  }

  // Convert issue key to issue ID for Xray API and determine Jira base URL
  let numericIssueId;
  let jiraBaseUrl;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const jiraResponse = await api.asUser().requestJira(route`/rest/api/3/issue/${issueId}?fields=id`, {
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const jiraData = await jiraResponse.json();
    numericIssueId = jiraData.id;
    
    // Use the original payload URL if it was provided, otherwise construct from known pattern
    if (payload.issueId && payload.issueId.includes('/browse/')) {
      const originalUrl = payload.issueId;
      const urlParts = originalUrl.split('/browse/');
      jiraBaseUrl = urlParts[0];
    } else {
      // Fallback: Use the known Jira instance URL pattern
      jiraBaseUrl = 'https://one-atlas-jevs.atlassian.net';
    }
    
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Jira API timeout when getting issue ID for ${issueId}`);
    }
    throw new Error(`Failed to get issue ID for ${issueId}: ${error.message}`);
  }

  try {
    const query = `
      query GetTestPlansContainingTest($issueId: String!) {
        getTests(issueIds: [$issueId], limit: 10) {
          results {
            testPlans(limit: 50) {
              results {
                issueId
                jira(fields: ["key", "summary", "status"])
              }
              total
            }
          }
        }
      }
    `;

    const variables = { issueId: numericIssueId };
    const result = await executeXrayGraphQL(query, variables);

    const testData = result.data.getTests?.results?.[0];
    const testPlansData = testData?.testPlans || { results: [], total: 0 };
    
    // Format test plans with clickable Jira links
    const formattedTestPlans = testPlansData.results.map(testPlan => {
      // Parse the jira field as JSON since it's returned as JSON type
      let jiraData = null;
      try {
        jiraData = typeof testPlan.jira === 'string' ? JSON.parse(testPlan.jira) : testPlan.jira;
      } catch (error) {
        console.warn('Failed to parse jira data for test plan:', testPlan.issueId, error);
      }
      
      const jiraKey = jiraData?.key;
      const jiraSummary = jiraData?.summary;
      const jiraStatus = jiraData?.status?.name;
      
      return {
        issueId: testPlan.issueId,
        key: jiraKey,
        summary: jiraSummary,
        status: jiraStatus,
        link: jiraKey ? `${jiraBaseUrl}/browse/${jiraKey}` : null,
        linkMarkdown: jiraKey ? `[${jiraKey}](${jiraBaseUrl}/browse/${jiraKey})` : null,
        linkHtml: jiraKey ? `<a href="${jiraBaseUrl}/browse/${jiraKey}" target="_blank">${jiraKey}</a>` : null,
        linkDisplay: jiraKey ? `Test Plan: [${jiraKey}](${jiraBaseUrl}/browse/${jiraKey}) - ${jiraSummary}` : null
      };
    });
    
    const formattedResponse = {
      issueId: issueId,
      testPlans: formattedTestPlans,
      total: testPlansData.total,
      message: `Found ${testPlansData.total} test plan(s) containing test ${issueId}`,
      jiraBaseUrl: jiraBaseUrl
    };

    console.log('🎉 === getTestPlans COMPLETED SUCCESSFULLY ===');
    return formattedResponse;
  } catch (error) {
    console.error('💥 === getTestPlans FAILED ===');
    console.error('💥 Error details:', error.message);
    throw error;
  }
}

// Function to get test runs
export async function getTestRuns(payload) {
  console.log('🎯 === STARTING getTestRuns FUNCTION ===');
  console.log('📥 Received payload:', JSON.stringify(payload, null, 2));
  
  let issueId = payload.issueId;
  
  if (!issueId) {
    throw new Error('Issue ID is required');
  }

  // Extract issue key from URL if needed
  if (issueId.includes('/browse/')) {
    const urlParts = issueId.split('/browse/');
    issueId = urlParts[urlParts.length - 1];
  }

  // Convert issue key to issue ID for Xray API and determine Jira base URL
  let numericIssueId;
  let jiraBaseUrl;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const jiraResponse = await api.asUser().requestJira(route`/rest/api/3/issue/${issueId}?fields=id`, {
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const jiraData = await jiraResponse.json();
    numericIssueId = jiraData.id;
    
    // Use the original payload URL if it was provided, otherwise construct from known pattern
    if (payload.issueId && payload.issueId.includes('/browse/')) {
      const originalUrl = payload.issueId;
      const urlParts = originalUrl.split('/browse/');
      jiraBaseUrl = urlParts[0];
    } else {
      // Fallback: Use the known Jira instance URL pattern
      jiraBaseUrl = 'https://one-atlas-jevs.atlassian.net';
    }
    
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Jira API timeout when getting issue ID for ${issueId}`);
    }
    throw new Error(`Failed to get issue ID for ${issueId}: ${error.message}`);
  }

  try {
    const query = `
      query GetTestRuns($issueId: String!) {
        getTestRuns(testIssueIds: [$issueId], limit: 50) {
          results {
            id
            status {
              name
              description
            }
            startedOn
            finishedOn
            testExecution {
              issueId
              jira(fields: ["key", "summary", "status"])
            }
          }
          total
        }
      }
    `;

    const variables = { issueId: numericIssueId };
    const result = await executeXrayGraphQL(query, variables);

    const testRunsData = result.data.getTestRuns || { results: [], total: 0 };
    
    // Format test runs with clickable Jira links
    const formattedTestRuns = testRunsData.results.map(testRun => {
      // Parse the jira field as JSON since it's returned as JSON type
      let jiraData = null;
      try {
        jiraData = typeof testRun.testExecution?.jira === 'string' ? 
          JSON.parse(testRun.testExecution.jira) : testRun.testExecution?.jira;
      } catch (error) {
        console.warn('Failed to parse jira data for test run:', testRun.id, error);
      }
      
      const jiraKey = jiraData?.key;
      const jiraSummary = jiraData?.summary;
      const jiraStatus = jiraData?.status?.name;
      
      return {
        id: testRun.id,
        status: testRun.status?.name,
        statusDescription: testRun.status?.description,
        startedOn: testRun.startedOn,
        finishedOn: testRun.finishedOn,
        testExecution: {
          issueId: testRun.testExecution?.issueId,
          key: jiraKey,
          summary: jiraSummary,
          status: jiraStatus,
          link: jiraKey ? `${jiraBaseUrl}/browse/${jiraKey}` : null,
          linkMarkdown: jiraKey ? `[${jiraKey}](${jiraBaseUrl}/browse/${jiraKey})` : null,
          // Additional link formats for better UI compatibility
          linkHtml: jiraKey ? `<a href="${jiraBaseUrl}/browse/${jiraKey}" target="_blank">${jiraKey}</a>` : null,
          linkDisplay: jiraKey ? `Link to Test Execution: ${jiraBaseUrl}/browse/${jiraKey}` : null,
          // Provide the raw URL separately for UI to use
          testExecutionUrl: jiraKey ? `${jiraBaseUrl}/browse/${jiraKey}` : null,
          testExecutionLabel: jiraKey ? `${jiraKey} - ${jiraSummary}` : null
        }
      };
    });
    
    // Create a summary message with links
    let summaryMessage = `Found ${testRunsData.total} test run(s) for test ${issueId}`;
    if (formattedTestRuns.length > 0) {
      summaryMessage += '\n\nTest Executions:\n';
      formattedTestRuns.forEach(run => {
        if (run.testExecution.key) {
          summaryMessage += `• ${run.testExecution.key}: ${run.testExecution.testExecutionUrl}\n`;
        }
      });
    }

    const formattedResponse = {
      issueId: issueId,
      testRuns: formattedTestRuns,
      total: testRunsData.total,
      message: summaryMessage,
      jiraBaseUrl: jiraBaseUrl,
      // Provide direct access to URLs for the UI
      executionLinks: formattedTestRuns.map(run => ({
        key: run.testExecution.key,
        url: run.testExecution.testExecutionUrl,
        label: run.testExecution.testExecutionLabel
      })).filter(link => link.key)
    };

    console.log('🎉 === getTestRuns COMPLETED SUCCESSFULLY ===');
    return formattedResponse;
  } catch (error) {
    console.error('💥 === getTestRuns FAILED ===');
    console.error('💥 Error details:', error.message);
    throw error;
  }
}

export async function getUserStory(payload) {
  console.log('🔍 === getUserStory STARTED ===');
  console.log('📋 Payload received:', JSON.stringify(payload, null, 2));
  
  const issueId = payload.issueId;
  
  if (!issueId) {
    console.error('💥 Missing required parameter: issueId');
    throw new Error('issueId is required');
  }

  console.log(`🎯 Finding user story for test: ${issueId}`);

  try {
    // Get issue links to find the "tests" link type
    const response = await api.asUser().requestJira(route`/rest/api/3/issue/${issueId}`, {
      headers: {
        'Accept': 'application/json'
      },
      query: {
        expand: 'issuelinks'
      }
    });

    if (!response.ok) {
      console.error(`💥 Failed to fetch issue ${issueId}: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('💥 Error response:', errorText);
      throw new Error(`Failed to fetch issue: ${response.status} ${response.statusText}`);
    }

    const issueData = await response.json();
    console.log('📄 Issue data retrieved successfully');
    console.log('🔗 Issue links found:', issueData.fields.issuelinks?.length || 0);

    // Find the "tests" link type
    const issueLinks = issueData.fields.issuelinks || [];
    const testsLinks = issueLinks.filter(link => 
      link.type.name === 'Tests' || 
      link.type.inward === 'is tested by' || 
      link.type.outward === 'tests'
    );

    console.log(`🎯 Found ${testsLinks.length} "tests" type links`);

    if (testsLinks.length === 0) {
      console.log('⚠️ No user stories found that this test is testing');
      return {
        testIssue: {
          key: issueData.key,
          summary: issueData.fields.summary
        },
        userStories: [],
        message: 'No user stories found that this test is testing'
      };
    }

    // Extract user stories (the target of the "tests" link)
    const userStories = testsLinks.map(link => {
      // For "tests" links, the user story is typically the inwardIssue 
      // (when the test "tests" the user story)
      const userStoryIssue = link.inwardIssue || link.outwardIssue;
      
      if (!userStoryIssue) {
        console.log('⚠️ Link found but no target issue:', link);
        return null;
      }

      console.log(`📋 Found user story: ${userStoryIssue.key} - ${userStoryIssue.fields.summary}`);
      
      return {
        key: userStoryIssue.key,
        summary: userStoryIssue.fields.summary,
        issueType: userStoryIssue.fields.issuetype.name,
        status: userStoryIssue.fields.status.name,
        url: `${userStoryIssue.self.replace('/rest/api/3/issue/', '/browse/')}`,
        linkType: link.type.name,
        linkDirection: link.inwardIssue ? 'inward' : 'outward'
      };
    }).filter(story => story !== null);

    const formattedResponse = {
      testIssue: {
        key: issueData.key,
        summary: issueData.fields.summary,
        issueType: issueData.fields.issuetype.name
      },
      userStories: userStories,
      totalFound: userStories.length,
      message: userStories.length > 0 
        ? `Found ${userStories.length} user story/stories that this test is testing`
        : 'No user stories found that this test is testing'
    };

    console.log('🎉 === getUserStory COMPLETED SUCCESSFULLY ===');
    console.log(`✅ Found ${userStories.length} user stories`);
    
    return formattedResponse;
  } catch (error) {
    console.error('💥 === getUserStory FAILED ===');
    console.error('💥 Error details:', error.message);
    throw error;
  }
}

// Function to generate comprehensive test case for user story
export async function generateTestCase(payload) {
  console.log('🎯 === STARTING generateTestCase FUNCTION ===');
  console.log('📥 Received payload:', JSON.stringify(payload, null, 2));
  
  const { userStory, additionalRequirements } = payload;
  
  // Extract project key from payload or context
  let projectKey = payload.projectKey;
  if (!projectKey && payload.context && payload.context.jira && payload.context.jira.projectKey) {
    projectKey = payload.context.jira.projectKey;
    console.log('📋 Using project key from context:', projectKey);
  }
  
  if (!userStory) {
    throw new Error('User story is required');
  }

  console.log('🔍 Processing user story input:', userStory);
  
  let userStoryData = null;
  let userStoryText = userStory;
  let jiraBaseUrl = null;
  
  // Check if userStory is a Jira issue key or URL
  const jiraUrlPattern = /https?:\/\/[^\/]+\/browse\/([A-Z]+-\d+)/;
  const jiraKeyPattern = /^[A-Z]+-\d+$/;
  
  if (jiraUrlPattern.test(userStory) || jiraKeyPattern.test(userStory)) {
    console.log('🎫 User story appears to be a Jira issue, fetching details...');
    
    try {
      let issueKey = userStory;
      
      // Extract issue key from URL if needed
      if (userStory.includes('/browse/')) {
        const urlMatch = userStory.match(jiraUrlPattern);
        if (urlMatch) {
          issueKey = urlMatch[1];
          jiraBaseUrl = userStory.split('/browse/')[0];
        }
      }
      
      console.log(`🔍 Fetching Jira issue: ${issueKey}`);
      
      const response = await api.asUser().requestJira(route`/rest/api/3/issue/${issueKey}`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        userStoryData = await response.json();
        
        // Fix the [object Object] issue by properly formatting the description
        let formattedDescription = 'No description provided';
        if (userStoryData.fields.description) {
          if (typeof userStoryData.fields.description === 'object') {
            // Handle ADF (Atlassian Document Format) description
            formattedDescription = extractTextFromADF(userStoryData.fields.description);
          } else {
            formattedDescription = userStoryData.fields.description;
          }
        }
        
        userStoryText = `${userStoryData.fields.summary}\n\nDescription: ${formattedDescription}`;
        
        // Extract Jira base URL if not already determined
        if (!jiraBaseUrl && userStoryData.self) {
          jiraBaseUrl = userStoryData.self.replace(/\/rest\/api\/3\/issue\/.*/, '');
        }
        
        console.log('✅ Jira issue details retrieved successfully');
        console.log(`📋 Issue: ${userStoryData.key} - ${userStoryData.fields.summary}`);
      } else {
        console.log('⚠️ Could not fetch Jira issue details, treating as plain text');
      }
    } catch (error) {
      console.log('⚠️ Error fetching Jira issue, treating as plain text:', error.message);
    }
  }

  // Generate comprehensive test case content
  const testCaseContent = generateTestCaseContent(userStoryText, additionalRequirements);
  
  console.log('🎯 Generated test case content');
  console.log('📝 Test summary:', testCaseContent.summary);
  console.log('📋 Number of test steps:', testCaseContent.testSteps.length);
  console.log('🔧 Number of preconditions:', testCaseContent.preconditions.length);

  // Format response with all generated test details
  const response = {
    userStory: {
      originalInput: userStory,
      text: userStoryText,
      jiraDetails: userStoryData ? {
        key: userStoryData.key,
        summary: userStoryData.fields.summary,
        description: userStoryData.fields.description,
        issueType: userStoryData.fields.issuetype.name,
        status: userStoryData.fields.status.name,
        url: jiraBaseUrl ? `${jiraBaseUrl}/browse/${userStoryData.key}` : null
      } : null
    },
    additionalRequirements: additionalRequirements || null,
    projectKey: projectKey || null,
    generatedTestCase: {
      summary: testCaseContent.summary,
      description: testCaseContent.description,
      testObjective: testCaseContent.testObjective,
      testSteps: testCaseContent.testSteps,
      preconditions: testCaseContent.preconditions,
      expectedResults: testCaseContent.expectedResults,
      testData: testCaseContent.testData,
      acceptanceCriteria: testCaseContent.acceptanceCriteria
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      totalTestSteps: testCaseContent.testSteps.length,
      totalPreconditions: testCaseContent.preconditions.length,
      hasAdditionalRequirements: Boolean(additionalRequirements),
      sourceType: userStoryData ? 'jira-issue' : 'plain-text'
    },
    recommendations: {
      message: "This is a generated test case based on the provided user story. Please review and customize as needed for your specific testing requirements.",
      nextSteps: [
        "Review the generated test steps and modify as necessary",
        "Validate preconditions are complete and accurate",
        "Ensure test data requirements are specified",
        "Consider edge cases and error scenarios",
        "Create the test case in your Xray Cloud instance"
      ]
    }
  };

  // If projectKey is provided, create the test case in Xray Cloud
  if (projectKey) {
    console.log(`🚀 Creating test case in Xray Cloud for project: ${projectKey}...`);
    try {
      const xrayTestCase = await createTestCaseInXray(testCaseContent, projectKey, jiraBaseUrl, userStoryData);
      response.xrayTestCase = xrayTestCase;
      response.recommendations.message = "Test case has been successfully created in Xray Cloud! You can now view and modify it in your Jira instance.";
      response.recommendations.nextSteps = [
        `View the created test case: ${xrayTestCase.jiraUrl}`,
        "Review and customize test steps as needed",
        "Add any additional test data or acceptance criteria",
        "Link the test case to relevant user stories or requirements",
        "Add the test to test sets or test plans for execution"
      ];
    } catch (error) {
      console.error('❌ Failed to create test case in Xray:', error.message);
      console.error('❌ Full error stack:', error.stack);
      response.xrayCreationError = {
        message: "Failed to create test case in Xray Cloud",
        error: error.message,
        fallback: "The test case has been generated but could not be automatically created in Xray. Please create it manually using the generated content."
      };
    }
  } else {
    console.log('⚠️ No projectKey provided - skipping Xray Cloud creation');
    response.recommendations.message += " Provide a projectKey to automatically create the test case in Xray Cloud.";
  }

  console.log('✅ === generateTestCase COMPLETED SUCCESSFULLY ===');
  return response;
}

/**
 * Finds all test cases linked to a user story via 'is tested by' / 'tests' link types
 */
export async function getLinkedTestCases(payload) {
  console.log('🎯 === STARTING getLinkedTestCases FUNCTION ===');
  console.log('📥 Received payload:', JSON.stringify(payload, null, 2));

  const { issueId } = payload;
  
  if (!issueId) {
    throw new Error('Issue ID is required');
  }

  console.log('🔗 Searching for linked test cases...');
  
  try {
    // Get issue links from Jira
    const response = await api.asUser().requestJira(route`/rest/api/3/issue/${issueId}?fields=issuelinks,summary,issuetype`, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get issue links: ${response.status} ${response.statusText}`);
    }

    const issueData = await response.json();
    console.log(`📋 Processing issue: ${issueData.key} (${issueData.fields.issuetype.name})`);
    console.log(`📝 Summary: ${issueData.fields.summary}`);
    
    const issueLinks = issueData.fields.issuelinks || [];
    console.log(`🔗 Found ${issueLinks.length} total links`);

    const testCases = [];

    // Process each link to find test cases
    for (const link of issueLinks) {
      const linkType = link.type.name.toLowerCase();
      console.log(`🔍 Processing link type: ${link.type.name}`);
      
      // Check outward links (this issue "is tested by" other issues)
      if (link.outwardIssue && (linkType.includes('test') || link.type.outward.toLowerCase().includes('tested'))) {
        const linkedIssue = link.outwardIssue;
        console.log(`➡️ Outward link: ${linkedIssue.key} (${linkedIssue.fields.issuetype.name})`);
        
        // Check if linked issue is a Test type
        if (linkedIssue.fields.issuetype.name.toLowerCase() === 'test') {
          testCases.push({
            key: linkedIssue.key,
            id: linkedIssue.id,
            summary: linkedIssue.fields.summary,
            linkType: link.type.outward,
            direction: 'outward'
          });
          console.log(`✅ Added test case: ${linkedIssue.key}`);
        }
      }
      
      // Check inward links (other issues "test" this issue)
      if (link.inwardIssue && (linkType.includes('test') || link.type.inward.toLowerCase().includes('test'))) {
        const linkedIssue = link.inwardIssue;
        console.log(`⬅️ Inward link: ${linkedIssue.key} (${linkedIssue.fields.issuetype.name})`);
        
        // Check if linked issue is a Test type
        if (linkedIssue.fields.issuetype.name.toLowerCase() === 'test') {
          testCases.push({
            key: linkedIssue.key,
            id: linkedIssue.id,
            summary: linkedIssue.fields.summary,
            linkType: link.type.inward,
            direction: 'inward'
          });
          console.log(`✅ Added test case: ${linkedIssue.key}`);
        }
      }
    }

    console.log(`🎯 Found ${testCases.length} linked test cases total`);

    const result = {
      userStory: {
        key: issueData.key,
        id: issueData.id,
        summary: issueData.fields.summary,
        issueType: issueData.fields.issuetype.name
      },
      testCases: testCases,
      totalLinks: issueLinks.length,
      testCasesFound: testCases.length
    };

    if (testCases.length === 0) {
      console.log('⚠️ No test cases found linked to this user story');
      result.message = `No test cases are linked to ${issueData.key}. Consider creating test cases and linking them with 'is tested by' relationships.`;
    } else {
      console.log('✅ Successfully found linked test cases');
      result.message = `Found ${testCases.length} test case(s) linked to ${issueData.key}`;
    }

    console.log('🎯 === ENDING getLinkedTestCases FUNCTION ===');
    return result;

  } catch (error) {
    console.error('❌ Error finding linked test cases:', error.message);
    throw new Error(`Failed to find linked test cases: ${error.message}`);
  }
}

// Helper function to generate test case content
function generateTestCaseContent(userStoryText, additionalRequirements) {
  console.log('🔧 === Generating test case content ===');
  
  // Extract key information from user story
  const storyLines = userStoryText.split('\n').filter(line => line.trim());
  const title = storyLines[0] || 'Generated Test Case';
  
  // Create test summary
  const summary = `Test: ${title}`;
  
  // Create test objective
  const testObjective = `Verify that the functionality described in the user story works as expected: "${title}"`;
  
  // Generate test description - fix the [object Object] issue
  let description = `This test case validates the user story:\n\n${userStoryText}`;
  if (additionalRequirements) {
    description += `\n\nAdditional Requirements:\n${additionalRequirements}`;
  }
  
  // Generate preconditions
  const preconditions = [
    {
      id: 1,
      condition: "User has valid access credentials and permissions",
      description: "The test user must be authenticated and have appropriate permissions to perform the required actions"
    },
    {
      id: 2,
      condition: "Test environment is properly configured",
      description: "All necessary systems, databases, and services are running and accessible"
    },
    {
      id: 3,
      condition: "Test data is prepared and available",
      description: "Required test data is set up in the system and ready for use"
    }
  ];
  
  // Generate test steps based on the actual user story content
  const testSteps = generateTestSteps(userStoryText, additionalRequirements, title);
  
  // Generate expected results
  const expectedResults = [
    "All test steps execute successfully without errors",
    "The functionality behaves as described in the user story",
    "System responds appropriately to user actions",
    "Data is processed and stored correctly",
    "User interface displays expected information and feedback"
  ];
  
  // Generate test data requirements
  const testData = [
    {
      category: "User Data",
      description: "Valid user credentials and profile information",
      examples: "Username, password, email, user roles"
    },
    {
      category: "System Data", 
      description: "Required system configuration and reference data",
      examples: "Configuration settings, lookup values, default parameters"
    },
    {
      category: "Test Scenarios Data",
      description: "Specific data needed for test scenario execution",
      examples: "Input values, expected outputs, boundary conditions"
    }
  ];
  
  // Generate acceptance criteria
  const acceptanceCriteria = generateAcceptanceCriteria(userStoryText, additionalRequirements);
  
  return {
    summary,
    description,
    testObjective,
    testSteps,
    preconditions,
    expectedResults,
    testData,
    acceptanceCriteria
  };
}

// Helper function to extract text from ADF (Atlassian Document Format)
function extractTextFromADF(adfContent) {
  if (!adfContent || typeof adfContent !== 'object') {
    return 'No description provided';
  }
  
  function extractTextRecursive(node) {
    if (!node) return '';
    
    if (node.text) {
      return node.text;
    }
    
    if (node.content && Array.isArray(node.content)) {
      return node.content.map(extractTextRecursive).join(' ');
    }
    
    return '';
  }
  
  return extractTextRecursive(adfContent).trim() || 'No description provided';
}

// Helper function to generate test steps specific to the user story
function generateTestSteps(userStoryText, additionalRequirements, title) {
  console.log('📝 Generating specific test steps for:', title);
  
  const lowerStory = userStoryText.toLowerCase();
  const lowerTitle = title.toLowerCase();
  
  // Start with basic setup steps
  const steps = [
    {
      stepNumber: 1,
      action: "Navigate to the application",
      data: "Open the application URL in a supported browser",
      expectedResult: "Application loads successfully and login page is displayed"
    },
    {
      stepNumber: 2,
      action: "Authenticate with valid credentials",
      data: "Enter valid username and password",
      expectedResult: "User is successfully logged in and redirected to main dashboard"
    }
  ];
  
  // Generate specific steps based on the user story content
  if (lowerStory.includes('clothing') && (lowerStory.includes('suggestion') || lowerStory.includes('recommend'))) {
    steps.push({
      stepNumber: steps.length + 1,
      action: "Navigate to the clothing recommendations section",
      data: "Access the personalized clothing suggestions feature from the main menu",
      expectedResult: "Clothing recommendations interface is displayed"
    });
    
    if (lowerStory.includes('weather') || lowerStory.includes('season') || lowerStory.includes('region')) {
      steps.push({
        stepNumber: steps.length + 1,
        action: "Set or verify location and preferences",
        data: "Ensure location is set correctly and weather preferences are configured",
        expectedResult: "Location and weather preferences are properly configured"
      });
      
      steps.push({
        stepNumber: steps.length + 1,
        action: "Request personalized clothing suggestions",
        data: "Click on 'Get Recommendations' or similar button to generate suggestions",
        expectedResult: "System processes request and generates personalized clothing suggestions"
      });
      
      steps.push({
        stepNumber: steps.length + 1,
        action: "Verify weather-based recommendations",
        data: "Check that clothing suggestions are appropriate for current weather conditions",
        expectedResult: "Clothing recommendations match current weather (e.g., warm clothes for cold weather)"
      });
      
      steps.push({
        stepNumber: steps.length + 1,
        action: "Verify seasonal appropriateness",
        data: "Ensure suggestions align with the current season",
        expectedResult: "Recommendations reflect seasonal clothing choices (e.g., winter coats in winter)"
      });
      
      steps.push({
        stepNumber: steps.length + 1,
        action: "Verify regional considerations",
        data: "Check that suggestions consider regional climate and cultural preferences",
        expectedResult: "Clothing suggestions are appropriate for the user's geographic region"
      });
    }
  } else {
    // Generate generic but more specific steps based on common patterns
    if (lowerStory.includes('create') || lowerStory.includes('add') || lowerStory.includes('new')) {
      steps.push({
        stepNumber: steps.length + 1,
        action: "Navigate to the creation feature",
        data: "Access the functionality for creating new items as described in the user story",
        expectedResult: "Creation interface is displayed with all necessary fields"
      });
      
      steps.push({
        stepNumber: steps.length + 1,
        action: "Fill in required information",
        data: "Enter all mandatory fields with valid data as specified in the user story",
        expectedResult: "Form accepts input and validation passes for all fields"
      });
      
      steps.push({
        stepNumber: steps.length + 1,
        action: "Submit the creation request",
        data: "Click save/create button to complete the action",
        expectedResult: "New item is created successfully with confirmation message displayed"
      });
    } else {
      // Default step for accessing the main feature
      steps.push({
        stepNumber: steps.length + 1,
        action: `Access the ${title.toLowerCase()} feature`,
        data: "Navigate to the specific functionality described in the user story",
        expectedResult: "Feature interface is displayed with all expected elements and controls"
      });
    }
  }
  
  // Add final verification step
  steps.push({
    stepNumber: steps.length + 1,
    action: "Verify final state and functionality",
    data: "Confirm that all expected functionality works as described in the user story",
    expectedResult: "All features function correctly and user story requirements are met"
  });
  
  return steps;
}

// Helper function to generate acceptance criteria
function generateAcceptanceCriteria(userStoryText, additionalRequirements) {
  const criteria = [
    {
      id: 1,
      criterion: "Functional Requirements",
      description: "All functionality described in the user story works as expected"
    },
    {
      id: 2,
      criterion: "User Interface",
      description: "UI elements are intuitive, responsive, and accessible"
    },
    {
      id: 3,
      criterion: "Performance",
      description: "Operations complete within acceptable time limits"
    },
    {
      id: 4,
      criterion: "Data Integrity",
      description: "Data is accurately processed, stored, and retrieved"
    },
    {
      id: 5,
      criterion: "Error Handling",
      description: "System handles errors gracefully with appropriate user feedback"
    }
  ];
  
  // Add specific criteria based on additional requirements
  if (additionalRequirements) {
    const reqLower = additionalRequirements.toLowerCase();
    
    if (reqLower.includes('security')) {
      criteria.push({
        id: criteria.length + 1,
        criterion: "Security",
        description: "All security requirements and access controls are enforced"
      });
    }
    
    if (reqLower.includes('mobile') || reqLower.includes('responsive')) {
      criteria.push({
        id: criteria.length + 1,
        criterion: "Mobile Compatibility",
        description: "Functionality works correctly on mobile and tablet devices"
      });
    }
    
    if (reqLower.includes('browser') || reqLower.includes('compatibility')) {
      criteria.push({
        id: criteria.length + 1,
        criterion: "Browser Compatibility",
        description: "Feature works across all supported browsers"
      });
    }
  }
  
  return criteria;
}

// Function to create test case in Xray Cloud using proper GraphQL workflow
async function createTestCaseInXray(testCaseContent, projectKey, jiraBaseUrl, userStoryData = null) {
  console.log('🎯 === STARTING createTestCaseInXray with proper Xray workflow ===');
  console.log('📋 Creating test case for project:', projectKey);
  console.log('📝 Test summary:', testCaseContent.summary);
  console.log('🔧 Test steps count:', testCaseContent.testSteps.length);
  console.log('📋 Preconditions count:', testCaseContent.preconditions.length);
  
  try {
    // Step 1: Create preconditions first using createPrecondition mutation
    let preconditionIds = [];
    if (testCaseContent.preconditions && testCaseContent.preconditions.length > 0) {
      console.log('🔧 Step 1: Creating preconditions using Xray GraphQL...');
      console.log(`📋 Preconditions to create:`, JSON.stringify(testCaseContent.preconditions, null, 2));
      preconditionIds = await createXrayPreconditions(testCaseContent.preconditions, projectKey);
      console.log(`✅ Created ${preconditionIds.length} preconditions in Xray`);
    } else {
      console.log('⚠️ No preconditions to create');
    }
    
    // Step 2: Create test steps (we'll create these as part of the test creation)
    console.log('📋 Step 2: Preparing test steps for test creation...');
    const testSteps = testCaseContent.testSteps.map(step => ({
      action: step.action,
      data: step.data || "",
      result: step.expectedResult || ""
    }));
    console.log(`📝 Prepared ${testSteps.length} test steps`);
    
    // Step 3: Create the complete test case using createTest mutation
    console.log('🎯 Step 3: Creating test case with steps and preconditions...');
    const testCase = await createXrayTestCase(
      testCaseContent, 
      projectKey, 
      testSteps, 
      preconditionIds,
      userStoryData // Pass user story data for linking
    );
    console.log(`✅ Test case created with ID: ${testCase.issueId}`);
    
    // Determine Jira base URL for linking
    let baseUrl = jiraBaseUrl;
    if (!baseUrl) {
      // Try to construct base URL from project key
      baseUrl = `https://one-atlas-jevs.atlassian.net`; // You may want to make this configurable
    }
    
    const result = {
      jiraIssueId: testCase.issueId,
      jiraKey: testCase.jiraKey,
      jiraUrl: `${baseUrl}/browse/${testCase.jiraKey}`,
      summary: testCaseContent.summary,
      testStepsAdded: testSteps.length,
      preconditionsCreated: preconditionIds.length,
      createdAt: new Date().toISOString(),
      projectKey: projectKey,
      method: 'xray-graphql-workflow',
      message: `Test case ${testCase.jiraKey} created successfully in Xray Cloud with ${testSteps.length} steps and ${preconditionIds.length} preconditions`
    };
    
    console.log('🎉 === createTestCaseInXray COMPLETED SUCCESSFULLY ===');
    return result;
    
  } catch (error) {
    console.error('💥 === createTestCaseInXray FAILED ===');
    console.error('💥 Error details:', error.message);
    throw error;
  }
}

// Function to create Jira test issue
async function createJiraTestIssue(testCaseContent, projectKey) {
  console.log('🎫 Creating Jira test issue...');
  
  const issueData = {
    fields: {
      project: {
        key: projectKey
      },
      summary: testCaseContent.summary,
      description: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: testCaseContent.description
              }
            ]
          }
        ]
      },
      issuetype: {
        name: "Test"
      }
    }
  };
  
  const response = await api.asUser().requestJira(route`/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(issueData)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Failed to create Jira issue:', errorText);
    throw new Error(`Failed to create Jira test issue: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const createdIssue = await response.json();
  console.log('✅ Jira test issue created:', createdIssue.key);
  
  return createdIssue;
}

// Function to create preconditions using Xray GraphQL createPrecondition mutation
async function createXrayPreconditions(preconditions, projectKey) {
  console.log('🔧 === Creating preconditions using Xray GraphQL ===');
  console.log('📋 Number of preconditions to create:', preconditions.length);
  
  const createdPreconditionIds = [];
  
  for (let i = 0; i < preconditions.length; i++) {
    const precondition = preconditions[i];
    console.log(`🔧 Creating precondition ${i + 1}/${preconditions.length}: ${precondition.condition}`);
    
    try {
      const createPreconditionMutation = `
        mutation CreatePrecondition($jira: JSON!, $definition: String!) {
          createPrecondition(
            jira: $jira
            definition: $definition
          ) {
            precondition {
              issueId
              jira(fields: ["key"])
            }
          }
        }
      `;
      
      // Prepare Jira issue data for precondition
      const preconditionJiraData = {
        fields: {
          project: {
            key: projectKey
          },
          summary: precondition.condition,
          description: precondition.description || precondition.condition,
          issuetype: {
            name: "Precondition"
          }
        }
      };
      
      const variables = {
        jira: preconditionJiraData,
        definition: precondition.description || precondition.condition
      };
      
      console.log(`🔧 Executing createPrecondition GraphQL mutation for precondition ${i + 1}...`);
      console.log('📦 Variables:', JSON.stringify(variables, null, 2));
      
      const result = await executeXrayGraphQL(createPreconditionMutation, variables);
      
      if (result.errors) {
        console.error(`❌ GraphQL errors while creating precondition ${i + 1}:`, JSON.stringify(result.errors, null, 2));
        console.log(`⚠️ Continuing with remaining preconditions...`);
        continue;
      }
      
      if (!result.data || !result.data.createPrecondition || !result.data.createPrecondition.precondition) {
        console.error(`❌ No data returned from createPrecondition mutation for precondition ${i + 1}`);
        console.error('❌ Full result:', JSON.stringify(result, null, 2));
        console.log(`⚠️ Continuing with remaining preconditions...`);
        continue;
      }
      
      const preconditionData = result.data.createPrecondition.precondition;
      const preconditionId = preconditionData.issueId;
      const preconditionKey = preconditionData.jira?.key;
      
      createdPreconditionIds.push(preconditionId);
      console.log(`✅ Precondition ${i + 1} created successfully with ID: ${preconditionId}, Key: ${preconditionKey}`);
      
    } catch (error) {
      console.error(`💥 Error creating precondition ${i + 1}:`, error.message);
      console.log(`⚠️ Continuing with remaining preconditions...`);
    }
  }
  
  console.log(`✅ Successfully created ${createdPreconditionIds.length}/${preconditions.length} preconditions in Xray`);
  return createdPreconditionIds;
}

// Function to create test case using Xray GraphQL createTest mutation
async function createXrayTestCase(testCaseContent, projectKey, testSteps, preconditionIds, userStoryData = null) {
  console.log('🎯 === Creating test case using Xray GraphQL ===');
  console.log('📋 Project:', projectKey);
  console.log('📝 Summary:', testCaseContent.summary);
  console.log('🔧 Test steps:', testSteps.length);
  console.log('📋 Preconditions:', preconditionIds.length);
  
  try {
    const createTestMutation = `
      mutation CreateTest(
        $jira: JSON!
        $testType: UpdateTestTypeInput
        $steps: [CreateStepInput!]
        $preconditionIssueIds: [String!]
      ) {
        createTest(
          jira: $jira
          testType: $testType
          steps: $steps
          preconditionIssueIds: $preconditionIssueIds
        ) {
          test {
            issueId
            jira(fields: ["key"])
            testType {
              name
              kind
            }
          }
        }
      }
    `;
    
    // Prepare Jira issue data as JSON (this creates the Jira issue)
    const jiraData = {
      fields: {
        project: {
          key: projectKey
        },
        summary: testCaseContent.summary,
        description: testCaseContent.description,
        issuetype: {
          name: "Test"
        }
      }
    };
    
    const variables = {
      jira: jiraData,
      testType: {
        name: "Manual"
      },
      steps: testSteps,
      preconditionIssueIds: preconditionIds
    };
    
    console.log('🔧 Executing createTest GraphQL mutation...');
    console.log('📦 Variables:', JSON.stringify(variables, null, 2));
    
    const result = await executeXrayGraphQL(createTestMutation, variables);
    
    if (result.errors) {
      console.error('❌ GraphQL errors while creating test case:', JSON.stringify(result.errors, null, 2));
      throw new Error(`Failed to create test case in Xray: ${JSON.stringify(result.errors)}`);
    }
    
    if (!result.data || !result.data.createTest || !result.data.createTest.test) {
      console.error('❌ No data returned from createTest mutation');
      console.error('❌ Full result:', JSON.stringify(result, null, 2));
      throw new Error('Failed to create test case in Xray - no data returned');
    }
    
    const testCase = result.data.createTest.test;
    const testKey = testCase.jira?.key;
    
    console.log('✅ Test case created successfully in Xray');
    console.log('📄 Test ID:', testCase.issueId);
    console.log('📄 Test Key:', testKey);
    console.log('📋 Test steps were included in creation request:', testSteps.length);
    console.log('🔧 Preconditions were included in creation request:', preconditionIds.length);
    
    // Step 4: Link the test case to the original user story with "tests" relationship
    if (userStoryData && userStoryData.id && testCase.issueId) {
      console.log('🔗 Step 4: Linking test case to user story...');
      console.log('🔍 User story data for linking:', JSON.stringify({
        id: userStoryData.id,
        key: userStoryData.key
      }, null, 2));
      try {
        await linkTestCaseToUserStory(testCase.issueId, userStoryData.id);
        console.log(`✅ Test case ${testKey} linked to user story ${userStoryData.key} with "tests" relationship`);
      } catch (linkError) {
        console.error('⚠️ Failed to link test case to user story:', linkError.message);
        console.log('📝 Test case created successfully but link creation failed');
      }
    } else {
      console.log('⚠️ No user story to link - test case created without story link');
      if (userStoryData) {
        console.log('🔍 User story data available but missing ID:', JSON.stringify({
          hasId: !!userStoryData.id,
          hasKey: !!userStoryData.key,
          keys: Object.keys(userStoryData)
        }, null, 2));
      }
    }
    
    return {
      issueId: testCase.issueId,
      jiraKey: testKey,
      testType: testCase.testType,
      stepsCreated: testSteps.length, // Steps were provided in creation
      preconditionsLinked: preconditionIds.length, // Preconditions were provided in creation
      userStoryLinked: userStoryData ? true : false
    };
    
  } catch (error) {
    console.error('💥 Error creating test case in Xray:', error.message);
    throw error;
  }
}

// Function to link test case to user story with "tests" relationship
async function linkTestCaseToUserStory(testCaseIssueId, userStoryIssueId) {
  console.log('🔗 === Linking test case to user story ===');
  console.log('🧪 Test Case Issue ID:', testCaseIssueId);
  console.log('📋 User Story Issue ID:', userStoryIssueId);
  
  try {
    // First, get available issue link types to find the correct "tests" link type
    console.log('🔍 Fetching available issue link types...');
    const linkTypesResponse = await api.asUser().requestJira(route`/rest/api/3/issueLinkType`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!linkTypesResponse.ok) {
      console.error('❌ Failed to fetch link types:', linkTypesResponse.status);
      throw new Error(`Failed to fetch link types: ${linkTypesResponse.status}`);
    }
    
    const linkTypesData = await linkTypesResponse.json();
    console.log('📋 Available link types:', JSON.stringify(linkTypesData.issueLinkTypes.map(lt => ({
      id: lt.id,
      name: lt.name,
      inward: lt.inward,
      outward: lt.outward
    })), null, 2));
    
    // Find the tests link type (could be "Tests", "Test", or similar)
    const testsLinkType = linkTypesData.issueLinkTypes.find(linkType => 
      linkType.name.toLowerCase().includes('test') ||
      linkType.inward.toLowerCase().includes('test') ||
      linkType.outward.toLowerCase().includes('test')
    );
    
    if (!testsLinkType) {
      console.error('❌ No tests-related link type found');
      throw new Error('No tests-related link type available. Please ensure Xray is properly installed.');
    }
    
    console.log('✅ Found tests link type:', JSON.stringify({
      id: testsLinkType.id,
      name: testsLinkType.name,
      inward: testsLinkType.inward,
      outward: testsLinkType.outward
    }, null, 2));
    
    // Create the issue link using the found link type
    // Direction: test case "tests" user story, user story "is tested by" test case
    const linkData = {
      type: {
        name: testsLinkType.name
      },
      inwardIssue: {
        id: testCaseIssueId.toString()  // Test case (inward - "tests")
      },
      outwardIssue: {
        id: userStoryIssueId.toString()  // User story (outward - "is tested by")
      }
    };
    
    console.log('🔧 Creating link via Jira REST API...');
    console.log('📦 Link data:', JSON.stringify(linkData, null, 2));
    
    const response = await api.asUser().requestJira(route`/rest/api/3/issueLink`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(linkData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to create issue link:', errorText);
      throw new Error(`Failed to create issue link: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    console.log('✅ Issue link created successfully');
    console.log(`🔗 Test case now "${testsLinkType.inward}" the user story`);
    
    return {
      success: true,
      linkType: testsLinkType.name,
      relationship: `${testsLinkType.outward} → ${testsLinkType.inward}`
    };
    
  } catch (error) {
    console.error('💥 Error linking test case to user story:', error.message);
    throw error;
  }
}

// Function to add test steps to Xray using the correct GraphQL addTestStep mutation
async function addTestStepsToXray(issueId, testSteps) {
  console.log('📋 Adding test steps to Xray using addTestStep GraphQL mutation...');
  console.log('🎯 Issue ID:', issueId);
  console.log('📝 Number of steps to add:', testSteps.length);
  
  const createdSteps = [];
  
  // Add each test step individually using addTestStep mutation
  for (let i = 0; i < testSteps.length; i++) {
    const step = testSteps[i];
    console.log(`📋 Adding step ${i + 1}/${testSteps.length}: ${step.action}`);
    
    try {
      const addStepMutation = `
        mutation AddTestStep($issueId: String!, $step: CreateStepInput!) {
          addTestStep(
            issueId: $issueId
            step: $step
          ) {
            id
            action
            data
            result
          }
        }
      `;
      
      const stepVariables = {
        issueId: issueId.toString(),
        step: {
          action: step.action,
          data: step.data || "",
          result: step.expectedResult || ""
        }
      };
      
      console.log(`🔧 Executing addTestStep GraphQL mutation for step ${i + 1}...`);
      console.log('📦 Variables:', JSON.stringify(stepVariables, null, 2));
      
      const result = await executeXrayGraphQL(addStepMutation, stepVariables);
      
      if (result.errors) {
        console.error(`❌ GraphQL errors while adding step ${i + 1}:`, JSON.stringify(result.errors, null, 2));
        console.log(`⚠️ Continuing with remaining steps...`);
        continue; // Continue with next step instead of throwing
      }
      
      if (!result.data || !result.data.addTestStep) {
        console.error(`❌ No data returned from addTestStep mutation for step ${i + 1}`);
        console.error('❌ Full result:', JSON.stringify(result, null, 2));
        console.log(`⚠️ Continuing with remaining steps...`);
        continue; // Continue with next step
      }
      
      createdSteps.push(result.data.addTestStep);
      console.log(`✅ Step ${i + 1} successfully added to Xray with ID: ${result.data.addTestStep.id}`);
      
    } catch (stepError) {
      console.error(`💥 Error adding step ${i + 1}:`, stepError.message);
      console.log(`⚠️ Continuing with remaining steps...`);
      // Continue with other steps even if one fails
    }
  }
  
  console.log(`✅ Successfully added ${createdSteps.length}/${testSteps.length} test steps to Xray`);
  
  return {
    issueId: issueId,
    steps: createdSteps,
    totalAdded: createdSteps.length,
    totalAttempted: testSteps.length,
    method: 'xray-graphql-addTestStep'
  };
}

// Function to create and link preconditions
async function createAndLinkPreconditions(testIssueId, preconditions, projectKey) {
  console.log('🔧 Creating and linking preconditions...');
  console.log('🎯 Test Issue ID:', testIssueId);
  console.log('📝 Number of preconditions:', preconditions.length);
  
  const createdPreconditions = [];
  
  for (const precondition of preconditions) {
    try {
      console.log(`📋 Creating precondition: ${precondition.condition}`);
      
      // Create precondition issue in Jira
      const preconditionIssue = await createJiraPreconditionIssue(precondition, projectKey);
      console.log(`✅ Precondition issue created: ${preconditionIssue.key}`);
      
      // Link the precondition to the test using Xray GraphQL
      await linkPreconditionToTest(testIssueId, preconditionIssue.id);
      console.log(`✅ Precondition ${preconditionIssue.key} linked to test`);
      
      createdPreconditions.push({
        id: preconditionIssue.id,
        key: preconditionIssue.key,
        summary: precondition.condition
      });
      
    } catch (error) {
      console.error(`❌ Failed to create/link precondition: ${precondition.condition}`, error.message);
      // Continue with other preconditions even if one fails
    }
  }
  
  console.log(`✅ Successfully created and linked ${createdPreconditions.length} preconditions`);
  return createdPreconditions;
}

// Function to create Jira precondition issue
async function createJiraPreconditionIssue(precondition, projectKey) {
  console.log(`📋 Creating Jira precondition issue: ${precondition.condition}`);
  
  const issueData = {
    fields: {
      project: {
        key: projectKey
      },
      summary: precondition.condition,
      description: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: precondition.description || precondition.condition
              }
            ]
          }
        ]
      },
      issuetype: {
        name: "Precondition"
      }
    }
  };
  
  const response = await api.asUser().requestJira(route`/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(issueData)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Failed to create precondition issue:', errorText);
    throw new Error(`Failed to create precondition issue: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const createdIssue = await response.json();
  console.log('✅ Precondition issue created:', createdIssue.key);
  
  return createdIssue;
}

// Function to link precondition to test using Xray GraphQL
async function linkPreconditionToTest(testIssueId, preconditionIssueId) {
  console.log('🔗 Linking precondition to test...');
  console.log('🎯 Test Issue ID:', testIssueId);
  console.log('🔧 Precondition Issue ID:', preconditionIssueId);
  
  const mutation = `
    mutation AddPreconditionToTest($testId: String!, $preconditionId: String!) {
      addTestPrecondition(
        issueId: $testId
        preconditionIssueId: $preconditionId
      ) {
        issueId
        preconditions {
          total
          results {
            issueId
          }
        }
      }
    }
  `;
  
  const variables = {
    testId: testIssueId.toString(),
    preconditionId: preconditionIssueId.toString()
  };
  
  try {
    console.log('🔧 Executing addTestPrecondition GraphQL mutation...');
    const result = await executeXrayGraphQL(mutation, variables);
    
    if (result.errors) {
      console.error('❌ GraphQL errors while linking precondition:', JSON.stringify(result.errors, null, 2));
      throw new Error(`Failed to link precondition to test: ${JSON.stringify(result.errors)}`);
    }
    
    if (!result.data || !result.data.addTestPrecondition) {
      console.error('❌ No data returned from addTestPrecondition mutation');
      console.error('❌ Full result:', JSON.stringify(result, null, 2));
      throw new Error('Failed to link precondition to test - no data returned');
    }
    
    console.log('✅ Precondition successfully linked to test');
    return result.data.addTestPrecondition;
  } catch (error) {
    console.error('💥 Error in linkPreconditionToTest:', error.message);
    throw error;
  }
}
