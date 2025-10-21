#!/usr/bin/env node

/**
 * Verification script for newly installed React Native dependencies
 * Run with: node scripts/verify-dependencies.js
 */

const fs = require('fs');
const path = require('path');

console.log('Verifying React Native dependencies installation...\n');

// Dependencies to check
const dependencies = [
  {
    name: 'react-native-config',
    package: 'react-native-config',
    importPath: 'react-native-config',
    purpose: 'Environment variable management'
  },
  {
    name: '@react-native-community/netinfo',
    package: '@react-native-community/netinfo',
    importPath: '@react-native-community/netinfo',
    purpose: 'Network status detection'
  },
  {
    name: 'react-native-keychain',
    package: 'react-native-keychain',
    importPath: 'react-native-keychain',
    purpose: 'Secure token storage'
  }
];

// Check package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

console.log('Checking package.json dependencies:');
console.log('=====================================');

let allDepsFound = true;

dependencies.forEach(dep => {
  const version = packageJson.dependencies[dep.package];
  if (version) {
    console.log(`✓ ${dep.name}: ${version}`);
    console.log(`  Purpose: ${dep.purpose}`);
  } else {
    console.log(`✗ ${dep.name}: NOT FOUND`);
    allDepsFound = false;
  }
  console.log();
});

// Check node_modules
console.log('Checking node_modules installation:');
console.log('====================================');

dependencies.forEach(dep => {
  const modulePath = path.join(__dirname, '..', 'node_modules', dep.package);
  if (fs.existsSync(modulePath)) {
    console.log(`✓ ${dep.name}: Installed in node_modules`);

    // Check for TypeScript definitions
    const indexDtsPath = path.join(modulePath, 'index.d.ts');
    const libTypescriptPath = path.join(modulePath, 'lib', 'typescript');

    if (fs.existsSync(indexDtsPath) || fs.existsSync(libTypescriptPath)) {
      console.log(`  ✓ TypeScript definitions found`);
    } else {
      console.log(`  ⚠ TypeScript definitions not found (may use @types package)`);
    }
  } else {
    console.log(`✗ ${dep.name}: NOT installed in node_modules`);
    console.log(`  Run 'pnpm install' to install dependencies`);
  }
  console.log();
});

// Check .env file
console.log('Checking environment configuration:');
console.log('===================================');

const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (fs.existsSync(envPath)) {
  console.log('✓ .env file exists');

  // Check for required environment variables
  const envContent = fs.readFileSync(envPath, 'utf8');
  const requiredVars = ['REACT_APP_API_URL', 'NODE_ENV'];

  requiredVars.forEach(varName => {
    if (envContent.includes(`${varName}=`)) {
      console.log(`  ✓ ${varName} is defined`);
    } else {
      console.log(`  ⚠ ${varName} is not defined`);
    }
  });
} else {
  console.log('✗ .env file does not exist');
  if (fs.existsSync(envExamplePath)) {
    console.log('  ℹ Copy .env.example to .env and configure your environment variables');
  }
}

console.log();

// Check files using the dependencies
console.log('Checking implementation files:');
console.log('==============================');

const filesToCheck = [
  {
    path: path.join(__dirname, '..', 'src', 'config', 'index.ts'),
    description: 'Config file using react-native-config'
  },
  {
    path: path.join(__dirname, '..', 'src', 'hooks', 'useAuth.ts'),
    description: 'Auth hook using @react-native-community/netinfo'
  },
  {
    path: path.join(__dirname, '..', 'src', 'utils', 'secureStorage.ts'),
    description: 'Secure storage using react-native-keychain'
  }
];

filesToCheck.forEach(file => {
  if (fs.existsSync(file.path)) {
    console.log(`✓ ${file.description}`);
    console.log(`  Path: ${path.relative(path.join(__dirname, '..'), file.path)}`);
  } else {
    console.log(`✗ ${file.description}`);
    console.log(`  File not found: ${path.relative(path.join(__dirname, '..'), file.path)}`);
  }
  console.log();
});

// Summary
console.log('=====================================');
console.log('SUMMARY');
console.log('=====================================');

if (allDepsFound && fs.existsSync(envPath)) {
  console.log('✓ All dependencies are properly installed!');
  console.log('\nNext steps:');
  console.log('1. For iOS: cd ios && pod install');
  console.log('2. For Android: Dependencies should auto-link');
  console.log('3. Follow platform-specific setup in SETUP_INSTRUCTIONS.md');
  console.log('4. Run the app with: pnpm ios or pnpm android');
} else {
  console.log('⚠ Some issues were found:');
  if (!allDepsFound) {
    console.log('  - Missing dependencies in package.json');
    console.log('    Run: pnpm add react-native-config @react-native-community/netinfo react-native-keychain');
  }
  if (!fs.existsSync(envPath)) {
    console.log('  - Missing .env file');
    console.log('    Run: cp .env.example .env');
  }
}

console.log('\nFor detailed setup instructions, see: SETUP_INSTRUCTIONS.md');