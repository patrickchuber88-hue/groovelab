import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
// We can use a simple crypto or jwt library if available, but let's see if we can generate it using standard node crypto or just sign it.
// Or wait, is there a simpler way?
// Let's check if the anon key signature can be verified with 'super-secret-jwt-token-with-at-least-32-characters-long'.
import crypto from 'crypto'

const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NTUzODQzLCJleHAiOjE5MzcyMzM4NDN9.NPFKhuj3WiiJ7pqG7w91QAEy1V696kfTcEunScUAAoI';

function base64url(str: string) {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function verify(token: string, secret: string) {
  const [header, payload, signature] = token.split('.');
  const data = header + '.' + payload;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  const expectedSignature = hmac.digest('base64url');
  return signature === expectedSignature;
}

const defaultSecret = 'super-secret-jwt-token-with-at-least-32-characters-long';
console.log("Is default secret?", verify(anonKey, defaultSecret));
