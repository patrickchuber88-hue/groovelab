import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * POST /api/groovelab/tickets/report
 * body: { schoolId, stationNumber, componentType, description }
 */
export async function reportTicketHandler(req: Request, res: Response): Promise<void> {
  try {
    const { schoolId, stationNumber, componentType, description } = req.body;

    if (!schoolId || stationNumber === undefined || !componentType) {
      res.status(400).json({ error: 'schoolId, stationNumber, and componentType are required.' });
      return;
    }

    const { data, error } = await supabase
      .from('groovelab_tickets')
      .insert({
        school_id: schoolId,
        station_number: Number(stationNumber),
        component_type: componentType,
        description: description || null,
        status: 'OPEN'
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: 'Failed to create support ticket.', details: error.message });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Support ticket successfully created.',
      ticket: data
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

/**
 * POST /api/groovelab/tickets/resolve
 * body: { ticketId }
 */
export async function resolveTicketHandler(req: Request, res: Response): Promise<void> {
  try {
    const { ticketId } = req.body;
    const resolvedId = ticketId || req.query.ticketId;

    if (!resolvedId) {
      res.status(400).json({ error: 'ticketId is required.' });
      return;
    }

    const { data, error } = await supabase
      .from('groovelab_tickets')
      .update({ status: 'RESOLVED' })
      .eq('ticket_id', resolvedId)
      .select();

    if (error) {
      res.status(500).json({ error: 'Failed to resolve support ticket.', details: error.message });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Support ticket successfully marked as RESOLVED.',
      tickets: data
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
