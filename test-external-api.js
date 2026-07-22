// Test script to verify external Gemini API server
async function testExternalAPI() {
  try {
    console.log('Testing external Gemini API server...');
    
    const testData = {
      prompt: `You are a world-class career strategist and ATS optimization expert.
      Analyze the provided CV against the target career goal in the specified region.
      
      CV CONTENT:
      Experienced software developer with 5 years in web development, skilled in JavaScript, React, Node.js. Looking to advance to senior developer role.
      
      TARGET CAREER GOAL:
      Senior Software Engineer
      
      REGION:
      UK
      
      COMPARISON ROLES:
      Full Stack Developer, Frontend Developer
      
      Perform a deep neural analysis to identify:
      1. Skill Gaps: Specific technical or soft skills missing from the CV required for the target role.
      2. Missing Competencies: Higher-level behavioral or professional competencies.
      3. Required Certifications: Industry-standard credentials valuable for this role in UK.
      4. ATS Scoring: Match percentage and specific feedback.
      5. Timeline: A multi-phase upskilling roadmap.
      6. Comparison: side-by-side difficulty analysis vs comparison roles.`,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          required: ["skillGaps", "competencies", "certifications", "atsScore", "comparisonMatrix", "marketIntelligence"],
          properties: {
            skillGaps: { type: "array" },
            competencies: { type: "array" },
            certifications: { type: "array" },
            atsScore: { type: "object" },
            comparisonMatrix: { type: "array" },
            marketIntelligence: { type: "object" }
          }
        }
      }
    };

    console.log('Sending request to http://127.0.0.1:8005/fastapigemini');
    
    const response = await fetch('http://127.0.0.1:8005/fastapigemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('External API Error:', errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ External API Response received successfully!');
    console.log('Response structure:', Object.keys(result));
    console.log('Full response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ API call successful');
      console.log('Usage info:', result.usage);
      
      // Try to parse the content
      try {
        const content = result.candidates[0].content;
        const parsedContent = JSON.parse(content);
        console.log('✅ Content parsed successfully');
        console.log('Data keys:', Object.keys(parsedContent));
        
        // Save response to file
        const fs = require('fs').promises;
        await fs.writeFile('external-response.json', JSON.stringify(parsedContent, null, 2));
        console.log('✅ Response saved to external-response.json');
        
      } catch (parseError) {
        console.error('❌ Failed to parse content:', parseError);
        console.log('Raw content:', result.candidates[0].content.substring(0, 200));
      }
    } else if (result.output) {
      console.log('✅ Found output field');
      console.log('Output type:', typeof result.output);
      console.log('Output preview:', result.output.substring(0, 200));
      
      // Try to parse the output
      try {
        const parsedOutput = JSON.parse(result.output);
        console.log('✅ Output parsed successfully');
        console.log('Data keys:', Object.keys(parsedOutput));
        
        // Save response to file
        const fs = require('fs').promises;
        await fs.writeFile('external-response.json', JSON.stringify(parsedOutput, null, 2));
        console.log('✅ Response saved to external-response.json');
        
      } catch (parseError) {
        console.error('❌ Failed to parse output:', parseError);
        console.log('Raw output:', result.output.substring(0, 500));
      }
    } else {
      console.error('❌ API call failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testExternalAPI();
