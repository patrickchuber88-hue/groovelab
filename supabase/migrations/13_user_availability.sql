-- Create user_availability table for the Weekly Planner
CREATE TABLE user_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL, -- 0 = Sunday, 1 = Monday, etc.
    time_slot TEXT NOT NULL, -- e.g., "14:00"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, day_of_week, time_slot)
);

-- Index for performance
CREATE INDEX idx_user_availability_user ON user_availability(user_id);
