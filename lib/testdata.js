export const mockAnalysisData = {
  skillGaps: [
    {
      gap: "Deep Learning Frameworks",
      description: "Limited hands-on experience with PyTorch and TensorFlow.",
      category: "Technical",
      priority: "High",
      learningPath: "Learn neural network basics → build models → deploy solutions"
    },
    {
      gap: "MLOps & Model Deployment",
      description: "No experience with production ML pipelines or monitoring.",
      category: "Technical",
      priority: "High",
      learningPath: "Docker → Kubernetes → MLflow → CI/CD for ML"
    },
    {
      gap: "Vector Databases & RAG Systems",
      description: "Missing experience in semantic search and retrieval systems.",
      category: "Technical",
      priority: "High",
      learningPath: "Embeddings → vector DBs → RAG pipelines"
    },
    {
      gap: "Cloud AI Architecture",
      description: "Limited exposure to designing AI solutions on cloud platforms.",
      category: "Domain",
      priority: "Medium",
      learningPath: "Cloud architecture basics → AI services → scalable design"
    },
    {
      gap: "Prompt Engineering",
      description: "No structured experience optimizing LLM outputs.",
      category: "Technical",
      priority: "Medium",
      learningPath: "Prompt patterns → evaluation → guardrails → tuning"
    },
    {
      gap: "AI Governance & Responsible AI",
      description: "Missing knowledge of compliance, bias mitigation, and AI ethics.",
      category: "Domain",
      priority: "Medium",
      learningPath: "AI ethics → compliance → governance frameworks"
    }
  ],

  competencies: [
    {
      competency: "Analytical Thinking",
      description: "Break complex data problems into structured solutions.",
      importance: "Critical",
      timeToAcquire: "2-3 months",
      resources: ["Kaggle competitions", "case studies"]
    },
    {
      competency: "Stakeholder Communication",
      description: "Explain AI solutions to non-technical audiences.",
      importance: "Critical",
      timeToAcquire: "1-2 months",
      resources: ["Presentation practice", "technical storytelling"]
    },
    {
      competency: "System Design Thinking",
      description: "Design scalable and resilient AI systems.",
      importance: "Important",
      timeToAcquire: "3 months",
      resources: ["Architecture case studies"]
    },
    {
      competency: "Cross-functional Collaboration",
      description: "Work effectively with product and data teams.",
      importance: "Important",
      timeToAcquire: "1 month",
      resources: ["Agile projects"]
    },
    {
      competency: "Experimentation Mindset",
      description: "Iterative testing and model improvement.",
      importance: "Important",
      timeToAcquire: "2 months",
      resources: ["A/B testing frameworks"]
    },
    {
      competency: "Ethical Decision Making",
      description: "Apply responsible AI principles.",
      importance: "Beneficial",
      timeToAcquire: "1 month",
      resources: ["Responsible AI guidelines"]
    }
  ],

  certifications: [
    {
      name: "AWS Certified AI Practitioner",
      provider: "Amazon Web Services",
      description: "Validates AI and generative AI fundamentals on AWS.",
      difficulty: "Beginner",
      duration: "2 months",
      marketValue: "High",
      totalDuration: "6-8 weeks",
      steps: [
        {
          stepNumber: 1,
          title: "Cloud Foundations",
          description: "Understand AWS core services and cloud concepts.",
          duration: "1 week",
          resources: ["AWS Skill Builder"],
          milestones: ["Understand core AWS services"]
        },
        {
          stepNumber: 2,
          title: "AI Fundamentals",
          description: "Learn AI, ML, and GenAI concepts.",
          duration: "2 weeks",
          resources: ["AWS AI learning paths"],
          milestones: ["Understand AI lifecycle"]
        }
      ],
      flowDiagram:
        "Cloud Basics → AI Fundamentals → Hands-on Labs → Practice Tests → Certification"
    },

    {
      name: "AWS Certified Solutions Architect – Associate",
      provider: "Amazon Web Services",
      description: "Design resilient cloud architectures.",
      difficulty: "Intermediate",
      duration: "3 months",
      marketValue: "High",
      totalDuration: "10-12 weeks",
      steps: [
        {
          stepNumber: 1,
          title: "AWS Core Services",
          description: "Learn compute, storage, networking.",
          duration: "3 weeks",
          resources: ["AWS docs"],
          milestones: ["Understand VPC & EC2"]
        },
        {
          stepNumber: 2,
          title: "Architecture Patterns",
          description: "High availability and scaling.",
          duration: "3 weeks",
          resources: ["Well-Architected Framework"],
          milestones: ["Design resilient systems"]
        }
      ],
      flowDiagram:
        "AWS Fundamentals → Architecture Patterns → Hands-on Design → Mock Exams → Certification"
    },

    {
      name: "Google Professional Machine Learning Engineer",
      provider: "Google Cloud",
      description: "Design and productionize ML models.",
      difficulty: "Advanced",
      duration: "4 months",
      marketValue: "High",
      totalDuration: "16 weeks",
      steps: [
        {
          stepNumber: 1,
          title: "GCP Fundamentals",
          description: "Understand Google Cloud services.",
          duration: "3 weeks",
          resources: ["Google Cloud training"],
          milestones: ["Deploy GCP services"]
        }
      ],
      flowDiagram:
        "GCP Basics → Data Pipelines → Model Training → Deployment → Certification"
    },

    {
      name: "Microsoft Azure AI Engineer Associate",
      provider: "Microsoft",
      description: "Build AI solutions using Azure services.",
      difficulty: "Intermediate",
      duration: "3 months",
      marketValue: "High",
      totalDuration: "12 weeks",
      steps: [
        {
          stepNumber: 1,
          title: "Azure Fundamentals",
          description: "Learn Azure core services.",
          duration: "2 weeks",
          resources: ["Microsoft Learn"],
          milestones: ["Understand Azure basics"]
        }
      ],
      flowDiagram:
        "Azure Basics → AI Services → Integration → Practice Tests → Certification"
    },

    {
      name: "TensorFlow Developer Certificate",
      provider: "Google",
      description: "Build deep learning models.",
      difficulty: "Intermediate",
      duration: "2 months",
      marketValue: "Medium",
      totalDuration: "8 weeks",
      steps: [
        {
          stepNumber: 1,
          title: "Deep Learning Basics",
          description: "Learn neural networks and tensors.",
          duration: "2 weeks",
          resources: ["TensorFlow tutorials"],
          milestones: ["Build basic models"]
        }
      ],
      flowDiagram:
        "DL Basics → Vision/NLP → Optimization → Practice → Certification"
    },

    {
      name: "Certified Kubernetes Application Developer",
      provider: "CNCF",
      description: "Deploy cloud-native applications.",
      difficulty: "Intermediate",
      duration: "2 months",
      marketValue: "High",
      totalDuration: "8 weeks",
      steps: [
        {
          stepNumber: 1,
          title: "Containers",
          description: "Learn Docker fundamentals.",
          duration: "2 weeks",
          resources: ["Docker docs"],
          milestones: ["Build containers"]
        }
      ],
      flowDiagram:
        "Containers → Kubernetes Basics → Scaling → Practice → Certification"
    }
  ],

  atsScore: {
    overallScore: 64,
    skillsScore: 60,
    competenciesScore: 70,
    certificationsScore: 42,
    strengths: ["Strong programming foundation", "Python experience"],
    gaps: ["Missing ML deployment experience"],
    recommendations: ["Add AI projects", "Show cloud deployment"]
  },

  comparisonMatrix: [
    { role: "AI Engineer", score: 64, durationMonths: 8, difficulty: "High" },
    { role: "Data Scientist", score: 70, durationMonths: 6, difficulty: "Medium" },
    { role: "MLOps Engineer", score: 60, durationMonths: 8, difficulty: "High" }
  ],

  marketIntelligence: {
    demandGrowth: "Strong growth due to AI adoption.",
    demandDrivers: "Generative AI and automation.",
    topCities: ["London", "Manchester", "Cambridge", "Edinburgh"],
    medianSalary: "£75,000",
    salaryRange: "£55,000 - £110,000",
    contractRates: "£450 - £750 per day",
    remoteDemand: "High",
    topRemoteHiringRegions: ["UK", "Germany", "USA"],
    automationRisk: "Low",
    automationInsight: "AI roles remain resilient.",
    hiringSignals: ["Growth in AI projects", "Rising AI funding"],
    topCompanies: ["Google", "Microsoft", "Amazon", "DeepMind"],
    industryMomentum: ["Healthcare AI", "Fintech AI", "Retail personalization"],
    futureOutlook: "Demand will grow significantly.",
    globalOpportunities: ["USA", "Canada", "Germany"],
    marketInsight: "AI roles are among the fastest-growing careers."
  }
};
