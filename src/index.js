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
