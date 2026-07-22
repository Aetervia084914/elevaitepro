// Test script to verify Gemini API response
async function testAnalysisAPI() {
  try {
    console.log('Testing analysis API...');
    
    const testData = {
      cvContent: "Experienced software developer with 5 years in web development, skilled in JavaScript, React, Node.js. Looking to advance to senior developer role.",
      careerGoal: "Senior Software Engineer",
      comparisonCareerGoals: ["Full Stack Developer", "Frontend Developer"],
      region: "UK"
    };

    const response = await fetch('http://localhost:3000/api/getanalysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      
      // Try to parse as JSON first
      try {
        const errorData = JSON.parse(errorText);
        console.error('Parsed API Error:', errorData);
      } catch (parseError) {
        console.error('Response was not JSON, likely HTML error page');
        console.error('Status:', response.status);
        console.error('Status Text:', response.statusText);
      }
      return;
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      console.error('Response is not JSON:', responseText.substring(0, 200));
      return;
    }

    const result = await response.json();
    console.log('API Response received successfully!');
    console.log('Response structure:', Object.keys(result));
    
    // Check if response has expected structure
    if (result.tabs && result.tabs.skillGaps) {
      console.log('✅ Skill gaps found:', result.tabs.skillGaps.length);
    }
    if (result.atsScore) {
      console.log('✅ ATS score found:', result.atsScore.overallScore);
    }
    if (result.tabs && result.tabs.certifications) {
      console.log('✅ Certifications found:', result.tabs.certifications.length);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testAnalysisAPI();
