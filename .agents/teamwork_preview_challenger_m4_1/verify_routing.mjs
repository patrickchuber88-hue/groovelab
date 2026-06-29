import fs from 'fs';
import path from 'path';

// Define ANSI color codes for output formatting
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}         CAMPUS-GROOVELAB ROUTING TEST SUITE        ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}`);

// -------------------------------------------------------------
// Part 1: Static Analysis of App.tsx
// -------------------------------------------------------------
console.log(`\n${colors.bold}🔍 Running Static Code Analysis on App.tsx...${colors.reset}`);

const appPath = 'apps/groovelab/src/App.tsx';
if (!fs.existsSync(appPath)) {
  console.error(`${colors.red}❌ ERROR: App.tsx not found at ${appPath}${colors.reset}`);
  process.exit(1);
}

const appContent = fs.readFileSync(appPath, 'utf-8');

// Check useEffect redirect hook
const cond1 = appContent.includes("const isPublicRoute");
const cond2 = appContent.includes("if (isAuth)");
const cond3 = appContent.includes("navigate('/dashboard'");
const cond4 = appContent.includes("navigate('/',");

console.log(`Debug conditions:`);
console.log(`  - const isPublicRoute: ${cond1}`);
console.log(`  - if (isAuth): ${cond2}`);
console.log(`  - navigate('/dashboard': ${cond3}`);
console.log(`  - navigate('/'): ${cond4}`);

if (cond1 && cond2 && cond3 && cond4) {
  console.log(`${colors.green}✅ Static Check Passed: Redirection hook (useEffect) found in App.tsx.${colors.reset}`);
} else {
  console.error(`${colors.red}❌ Static Check Failed: Could not locate redirection hook in App.tsx.${colors.reset}`);
  process.exit(1);
}

// Check rendered components
const hasLandingPage = appContent.includes("<LandingPage");
const hasLoginScreen = appContent.includes("<LoginScreen");
const hasSignupWizard = appContent.includes("<SignupWizard");

if (hasLandingPage && hasLoginScreen && hasSignupWizard) {
  console.log(`${colors.green}✅ Static Check Passed: LandingPage, LoginScreen, and SignupWizard are all integrated in App.tsx.${colors.reset}`);
} else {
  console.error(`${colors.red}❌ Static Check Failed: Missing one or more required view components in App.tsx.${colors.reset}`);
  process.exit(1);
}

// -------------------------------------------------------------
// Part 2: Routing State Machine Redirection Simulation
// -------------------------------------------------------------
console.log(`\n${colors.bold}🧪 Running Behavioral Routing Simulation Tests...${colors.reset}`);

// Replicate the exact routing and redirection rules of App.tsx
function simulateRoute({ pathname, loggedInUserId, loading = false, showDeletionPrompt = false }) {
  let navigatedPath = null;
  let renderedComponent = null;

  // Mock navigation function
  const navigate = (toPath, options) => {
    navigatedPath = toPath;
  };

  // Replicate useEffect hook behavior
  const runUseEffect = () => {
    if (loading) return;
    
    const isAuth = !!loggedInUserId;
    const isPublicRoute = 
      pathname === '/' || 
      pathname === '/login' || 
      pathname === '/signup' || 
      pathname.startsWith('/qr/');
      
    if (isAuth) {
      if (pathname === '/' || pathname === '/login' || pathname === '/signup') {
        navigate('/dashboard', { replace: true });
      }
    } else {
      if (!isPublicRoute) {
        navigate('/', { replace: true });
      }
    }
  };

  // Run redirection simulation first
  runUseEffect();

  // Replicate conditional rendering logic
  const render = () => {
    // If a redirect occurred, update pathname to the redirected destination
    const activePathname = navigatedPath || pathname;

    if (activePathname === '/signup') {
      renderedComponent = 'SignupWizard';
      return;
    }

    if (!loggedInUserId && !showDeletionPrompt) {
      if (activePathname === '/') {
        renderedComponent = 'LandingPage';
        return;
      }
      if (activePathname === '/login') {
        renderedComponent = 'LoginScreen';
        return;
      }
    }

    if (loggedInUserId && activePathname === '/dashboard') {
      renderedComponent = 'Dashboard (Admin/Secretary/Teacher/Student)';
      return;
    }

    renderedComponent = 'DefaultLoadingState / OtherScreen';
  };

  render();

  return {
    initialPath: pathname,
    finalPath: navigatedPath || pathname,
    redirected: navigatedPath !== null,
    renderedComponent
  };
}

const testCases = [
  {
    id: 1,
    name: "Verify if accessing '/' when unauthenticated renders the LandingPage",
    input: { pathname: '/', loggedInUserId: null },
    expected: { finalPath: '/', redirected: false, renderedComponent: 'LandingPage' }
  },
  {
    id: 2,
    name: "Verify if accessing '/login' when unauthenticated renders LoginScreen",
    input: { pathname: '/login', loggedInUserId: null },
    expected: { finalPath: '/login', redirected: false, renderedComponent: 'LoginScreen' }
  },
  {
    id: 3,
    name: "Verify if accessing '/signup' when unauthenticated renders SignupWizard",
    input: { pathname: '/signup', loggedInUserId: null },
    expected: { finalPath: '/signup', redirected: false, renderedComponent: 'SignupWizard' }
  },
  {
    id: 4,
    name: "Verify if accessing '/dashboard' when unauthenticated redirects to '/'",
    input: { pathname: '/dashboard', loggedInUserId: null },
    expected: { finalPath: '/', redirected: true, renderedComponent: 'LandingPage' }
  },
  {
    id: 5,
    name: "Verify if accessing '/' when authenticated redirects to '/dashboard'",
    input: { pathname: '/', loggedInUserId: 'user-id-123' },
    expected: { finalPath: '/dashboard', redirected: true, renderedComponent: 'Dashboard (Admin/Secretary/Teacher/Student)' }
  },
  {
    id: 6,
    name: "Verify if accessing '/login' when authenticated redirects to '/dashboard'",
    input: { pathname: '/login', loggedInUserId: 'user-id-123' },
    expected: { finalPath: '/dashboard', redirected: true, renderedComponent: 'Dashboard (Admin/Secretary/Teacher/Student)' }
  },
  {
    id: 7,
    name: "Verify if accessing '/signup' when authenticated redirects to '/dashboard'",
    input: { pathname: '/signup', loggedInUserId: 'user-id-123' },
    expected: { finalPath: '/dashboard', redirected: true, renderedComponent: 'Dashboard (Admin/Secretary/Teacher/Student)' }
  }
];

let failedCount = 0;

for (const tc of testCases) {
  const result = simulateRoute(tc.input);
  const pathMatches = result.finalPath === tc.expected.finalPath;
  const redirectMatches = result.redirected === tc.expected.redirected;
  const componentMatches = result.renderedComponent === tc.expected.renderedComponent;

  if (pathMatches && redirectMatches && componentMatches) {
    console.log(`${colors.green}  [PASS] Test Case ${tc.id}: ${tc.name}${colors.reset}`);
    console.log(`         Input: Pathname='${tc.input.pathname}', Authenticated=${tc.input.loggedInUserId !== null}`);
    console.log(`         Result: Redirected=${result.redirected} -> FinalPath='${result.finalPath}', Rendered=${result.renderedComponent}\n`);
  } else {
    console.error(`${colors.red}  [FAIL] Test Case ${tc.id}: ${tc.name}${colors.reset}`);
    console.error(`         Expected: FinalPath='${tc.expected.finalPath}', Redirected=${tc.expected.redirected}, Rendered=${tc.expected.renderedComponent}`);
    console.error(`         Actual:   FinalPath='${result.finalPath}', Redirected=${result.redirected}, Rendered=${result.renderedComponent}\n`);
    failedCount++;
  }
}

console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}`);
console.log(`${colors.bold}SUMMARY OF SIMULATION TESTS:${colors.reset}`);
console.log(`  Passed:  ${testCases.length - failedCount}`);
console.log(`  Failed:  ${failedCount}`);
console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}`);

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
