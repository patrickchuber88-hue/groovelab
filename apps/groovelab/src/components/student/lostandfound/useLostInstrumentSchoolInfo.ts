/**
 * 🏛️ Campus-Groovelab Koffer-Tag Notfall-Zuordnung
 * useLostInstrumentSchoolInfo.ts
 * 
 * Holt autoritativ die offiziellen Kontaktdaten der Musikschule für den Finder-Screen:
 * - 100% reale Datenbank-Spalten aus 'schools' (name, street, house_number, zip_code, city, phone_number, email)
 * - Zero Fake Data / Keine erfundenen Felder
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export interface SchoolContactInfo {
  name: string;
  street: string | null;
  house_number: string | null;
  zip_code: string | null;
  city: string | null;
  phone_number: string | null;
  email: string | null;
}

export function useLostInstrumentSchoolInfo(schoolId?: string | null, initialSchool?: any) {
  const [schoolInfo, setSchoolInfo] = useState<SchoolContactInfo>(() => ({
    name: initialSchool?.name || 'Musikschule',
    street: initialSchool?.street || null,
    house_number: initialSchool?.house_number || null,
    zip_code: initialSchool?.zip_code || null,
    city: initialSchool?.city || null,
    phone_number: initialSchool?.phone_number || initialSchool?.phone || null,
    email: initialSchool?.email || null,
  }));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!schoolId && !initialSchool) return;

    // Falls initialSchool bereits alle Adressdaten enthält, keine zusätzliche DB-Abfrage
    if (initialSchool?.phone_number && initialSchool?.city) {
      setSchoolInfo({
        name: initialSchool.name || 'Musikschule',
        street: initialSchool.street || null,
        house_number: initialSchool.house_number || null,
        zip_code: initialSchool.zip_code || null,
        city: initialSchool.city || null,
        phone_number: initialSchool.phone_number || initialSchool.phone || null,
        email: initialSchool.email || null,
      });
      return;
    }

    const fetchSchool = async () => {
      setLoading(true);
      try {
        const query = supabase
          .from('schools')
          .select('name, street, house_number, zip_code, city, phone_number, email');

        if (schoolId) {
          query.eq('id', schoolId);
        } else if (initialSchool?.id) {
          query.eq('id', initialSchool.id);
        }

        const { data, error } = await query.maybeSingle();
        if (!error && data) {
          setSchoolInfo({
            name: data.name || 'Musikschule',
            street: data.street || null,
            house_number: data.house_number || null,
            zip_code: data.zip_code || null,
            city: data.city || null,
            phone_number: data.phone_number || null,
            email: data.email || null,
          });
        }
      } catch (e) {
        console.warn('Schul-Kontaktdaten konnten nicht geladen werden:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchSchool();
  }, [schoolId, initialSchool]);

  return { schoolInfo, loading };
}
