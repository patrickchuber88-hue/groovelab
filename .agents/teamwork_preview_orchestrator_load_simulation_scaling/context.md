# Project Context: Load Simulation Scaling

## Context Overview
The Campus-Groovelab application utilizes a Supabase/PostgreSQL backend on Hetzner VPS `178.105.10.2`. To understand platform scalability and performance limits, a stress test is executed simulating 8 schools and 4,400 concurrent users. 

## Key Inputs and Configs
- **SSH Host**: `178.105.10.2`
- **SSH User**: `root`
- **DB Connection**: Loaded dynamically from `.env.local`
- **Anonymization Standard**: First name + Last initial (e.g. "Liam P."), no student email, payment, SEPA, or contract data stored.
- **Cleanup Rule**: 100% of generated entities (schools, users, bookings, matrix notes, stats) are deleted from the database.

## System Bottleneck
The system's scaling bottleneck was identified at Iteration 1. The VPS CPU load average reached 8.71, exceeding the threshold of 8.0.
- **Max Stable Config**: Less than 8 schools and 4,400 users on the current hardware configuration.
