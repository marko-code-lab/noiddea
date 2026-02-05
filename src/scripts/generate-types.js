#!/usr/bin/env node

/**
 * Generate Supabase types from environment variables
 * This script reads the NEXT_PUBLIC_SUPABASE_URL from .env.local
 * and generates TypeScript types for your Supabase database
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found!');
  console.error('Please create a .env.local file with your Supabase credentials.');
  process.exit(1);
}

// Read .env.local
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envFile.split('\n').forEach(line => {
  const trimmedLine = line.trim();
  if (trimmedLine && !trimmedLine.startsWith('#')) {
    const [key, ...valueParts] = trimmedLine.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
});

// Extract project ID from Supabase URL
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL not found in .env.local');
  console.error('Please add your Supabase URL to .env.local');
  process.exit(1);
}

// Extract project ID from URL (format: https://[project-id].supabase.co)
const projectIdMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);

if (!projectIdMatch) {
  console.error('❌ Could not extract project ID from NEXT_PUBLIC_SUPABASE_URL');
  console.error('Expected format: https://[project-id].supabase.co');
  process.exit(1);
}

const projectId = projectIdMatch[1];
console.log(`✅ Found project ID: ${projectId}`);

// Check for access token
const accessToken = envVars.SUPABASE_ACCESS_TOKEN;
if (!accessToken) {
  console.error('❌ SUPABASE_ACCESS_TOKEN not found in .env.local');
  console.error('Please add your Supabase access token to .env.local');
  console.error('Get your token from: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

console.log('🔄 Generating TypeScript types...\n');

// Generate types
const outputPath = path.join(__dirname, '..', 'lib', 'supabase', 'database.types.ts');

try {
  const command = `npx --yes supabase@latest gen types typescript --project-id ${projectId}`;
  const types = execSync(command, { 
    encoding: 'utf8',
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: accessToken }
  });
  
  // Write to file
  fs.writeFileSync(outputPath, types);
  
  console.log(`\n✅ Types generated successfully!`);
  console.log(`📁 Output: ${outputPath}`);
} catch (error) {
  console.error('❌ Error generating types:', error.message);
  process.exit(1);
}

