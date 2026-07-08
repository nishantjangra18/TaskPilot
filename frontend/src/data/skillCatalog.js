export const SKILL_CATEGORIES = [
  'Primary Skills',
  'Secondary Skills',
  'Frameworks',
  'Languages',
  'Databases',
  'DevOps',
  'Design Tools',
  'AI / ML',
  'Cloud Platforms',
  'Other Skills',
];

export const PROFICIENCY_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
export const EXPERIENCE_LEVELS = ['', '0-1', '1-2', '2-4', '4-6', '6+'];

const catalogByCategory = {
  Frontend: ['React', 'Redux', 'Redux Toolkit', 'Next.js', 'Vue.js', 'Nuxt', 'Angular', 'Svelte', 'SvelteKit', 'SolidJS', 'JavaScript', 'TypeScript', 'HTML', 'HTML5', 'CSS', 'CSS3', 'Sass', 'Less', 'Tailwind CSS', 'Bootstrap', 'Material UI', 'Chakra UI', 'Ant Design', 'Radix UI', 'shadcn/ui', 'Framer Motion', 'Three.js', 'D3.js', 'Web Components', 'Responsive Design', 'Accessibility', 'WCAG', 'Storybook', 'Vite', 'Webpack', 'Babel'],
  Backend: ['Node.js', 'Express', 'NestJS', 'Fastify', 'Koa', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Laravel', 'Ruby on Rails', 'ASP.NET Core', 'GraphQL', 'REST API', 'gRPC', 'WebSockets', 'Socket.IO', 'Microservices', 'Serverless', 'API Design', 'Authentication', 'Authorization', 'OAuth', 'JWT', 'RBAC', 'Caching', 'Redis'],
  Mobile: ['React Native', 'Flutter', 'Dart', 'Swift', 'SwiftUI', 'Kotlin', 'Android', 'iOS', 'Jetpack Compose', 'Expo', 'Ionic', 'Capacitor', 'Mobile UI', 'Push Notifications', 'App Store Deployment', 'Play Store Deployment'],
  AI: ['OpenAI API', 'DeepSeek', 'Gemini API', 'Claude API', 'Prompt Engineering', 'RAG', 'LangChain', 'LlamaIndex', 'Vector Search', 'Embeddings', 'Function Calling', 'AI Agents', 'Chatbots', 'Natural Language Processing', 'Computer Vision', 'Speech Recognition', 'Text to Speech', 'Recommendation Systems'],
  ML: ['Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn', 'Pandas', 'NumPy', 'Matplotlib', 'Seaborn', 'XGBoost', 'LightGBM', 'Model Evaluation', 'Feature Engineering', 'MLOps', 'Data Labeling', 'Time Series', 'Classification', 'Regression', 'Clustering'],
  Cloud: ['AWS', 'Azure', 'Google Cloud', 'Firebase', 'Supabase', 'Vercel', 'Netlify', 'Railway', 'Render', 'Heroku', 'DigitalOcean', 'Cloudflare', 'AWS Lambda', 'EC2', 'S3', 'RDS', 'CloudFront', 'IAM', 'Azure Functions', 'Google Cloud Run', 'Firestore', 'Cloud Storage', 'Mongo Atlas'],
  DevOps: ['Docker', 'Kubernetes', 'Docker Compose', 'Terraform', 'Ansible', 'Jenkins', 'GitHub Actions', 'GitLab CI', 'CircleCI', 'CI/CD', 'Nginx', 'Apache', 'Linux', 'Bash', 'PowerShell', 'Monitoring', 'Grafana', 'Prometheus', 'Sentry', 'Datadog', 'ELK Stack', 'Load Balancing', 'Reverse Proxy'],
  'UI/UX': ['Figma', 'Adobe XD', 'Sketch', 'Framer', 'FigJam', 'Miro', 'Wireframing', 'Prototyping', 'UI Design', 'UX Research', 'Design Systems', 'Interaction Design', 'Information Architecture', 'User Testing', 'Usability Testing', 'Visual Design', 'Product Design', 'Accessibility Design'],
  Testing: ['Jest', 'Vitest', 'React Testing Library', 'Cypress', 'Playwright', 'Selenium', 'Mocha', 'Chai', 'Jasmine', 'JUnit', 'PyTest', 'Postman', 'Insomnia', 'Unit Testing', 'Integration Testing', 'E2E Testing', 'API Testing', 'Performance Testing', 'Load Testing', 'Test Automation', 'QA'],
  Database: ['MongoDB', 'Mongoose', 'PostgreSQL', 'MySQL', 'SQLite', 'SQL Server', 'Oracle', 'MariaDB', 'Redis', 'Elasticsearch', 'DynamoDB', 'Cassandra', 'Neo4j', 'Prisma', 'Drizzle ORM', 'Sequelize', 'TypeORM', 'Database Design', 'SQL', 'NoSQL', 'Data Modeling', 'Indexing', 'Query Optimization'],
  'Programming Languages': ['Python', 'Java', 'JavaScript', 'TypeScript', 'C', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby', 'Kotlin', 'Swift', 'Dart', 'Scala', 'R', 'MATLAB', 'Shell Scripting', 'Solidity', 'Elixir', 'Erlang'],
  Tools: ['Git', 'GitHub', 'GitLab', 'Bitbucket', 'Jira', 'Linear', 'Trello', 'Asana', 'Notion', 'Slack', 'VS Code', 'IntelliJ IDEA', 'WebStorm', 'Figma Dev Mode', 'Chrome DevTools', 'Swagger', 'OpenAPI', 'npm', 'pnpm', 'Yarn', 'Bun', 'ESLint', 'Prettier'],
  'Version Control': ['Git Flow', 'Branching Strategy', 'Code Review', 'Pull Requests', 'Merge Conflict Resolution', 'Semantic Versioning', 'Release Management', 'Monorepo', 'Turborepo', 'Nx'],
  Security: ['Application Security', 'OWASP', 'XSS Prevention', 'CSRF Protection', 'SQL Injection Prevention', 'Encryption', 'Password Hashing', 'Secrets Management', 'Security Audits', 'Penetration Testing', 'Secure Coding', 'Compliance', 'HIPAA', 'GDPR', 'SOC 2'],
  Analytics: ['Google Analytics', 'Mixpanel', 'Amplitude', 'Segment', 'Power BI', 'Tableau', 'Looker Studio', 'Metabase', 'Data Analysis', 'Business Intelligence', 'Event Tracking', 'A/B Testing', 'KPI Dashboards', 'Product Analytics'],
};

export const SKILL_CATALOG = Object.entries(catalogByCategory).flatMap(([category, skills]) =>
  skills.map(name => ({ name, category }))
);

export const getCatalogCategory = (skillName, fallback = 'Other Skills') => {
  const normalized = skillName.trim().toLowerCase();
  return SKILL_CATALOG.find(skill => skill.name.toLowerCase() === normalized)?.category || fallback;
};
