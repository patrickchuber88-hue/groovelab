import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { useMasterPricing } from '../../../context/MasterPricingContext';

export interface UseSecretaryOperatorBillingReturn {
  operatorCompany: string;
  setOperatorCompany: React.Dispatch<React.SetStateAction<string>>;
  operatorContact: string;
  setOperatorContact: React.Dispatch<React.SetStateAction<string>>;
  operatorStreet: string;
  setOperatorStreet: React.Dispatch<React.SetStateAction<string>>;
  operatorZip: string;
  setOperatorZip: React.Dispatch<React.SetStateAction<string>>;
  operatorCity: string;
  setOperatorCity: React.Dispatch<React.SetStateAction<string>>;
  operatorIban: string;
  setOperatorIban: React.Dispatch<React.SetStateAction<string>>;
  operatorBic: string;
  setOperatorBic: React.Dispatch<React.SetStateAction<string>>;
  currentSchoolProfile: any;
  setCurrentSchoolProfile: React.Dispatch<React.SetStateAction<any>>;
  effectiveSchoolRates: ReturnType<ReturnType<typeof useMasterPricing>['getSchoolRates']>;
  masterRates: {
    campus: number;
    groovelab: number;
    kombi: number;
    teacher: number;
    student: number;
  };
  setMasterRates: React.Dispatch<React.SetStateAction<{
    campus: number;
    groovelab: number;
    kombi: number;
    teacher: number;
    student: number;
  }>>;
}

/**
 * Encapsulates operator billing details (Patrick Huber Einzelunternehmer),
 * bank coordinates, current school profile rates, and master pricing synchronization.
 */
export function useSecretaryOperatorBilling(masterPricing: ReturnType<typeof useMasterPricing>): UseSecretaryOperatorBillingReturn {
  const [operatorCompany, setOperatorCompany] = useState('Patrick Huber (Einzelunternehmer)');
  const [operatorContact, setOperatorContact] = useState('Patrick Huber');
  const [operatorStreet, setOperatorStreet] = useState('Karl-Fürstenberg-Str. 59');
  const [operatorZip, setOperatorZip] = useState('79618');
  const [operatorCity, setOperatorCity] = useState('Rheinfelden');
  const [operatorIban, setOperatorIban] = useState('DE89 3704 0044 0532 9482 11');
  const [operatorBic, setOperatorBic] = useState('WELADED1XYZ');
  const [currentSchoolProfile, setCurrentSchoolProfile] = useState<any>(null);

  const effectiveSchoolRates = useMemo(() => {
    return masterPricing.getSchoolRates(currentSchoolProfile);
  }, [masterPricing, currentSchoolProfile]);

  const [masterRates, setMasterRates] = useState({
    campus: masterPricing.priceCampus,
    groovelab: masterPricing.priceGroovelab,
    kombi: masterPricing.priceKombi,
    teacher: masterPricing.priceTeacher,
    student: masterPricing.priceStudent
  });

  useEffect(() => {
    setMasterRates({
      campus: masterPricing.priceCampus,
      groovelab: masterPricing.priceGroovelab,
      kombi: masterPricing.priceKombi,
      teacher: masterPricing.priceTeacher,
      student: masterPricing.priceStudent
    });
  }, [masterPricing.priceCampus, masterPricing.priceGroovelab, masterPricing.priceKombi, masterPricing.priceTeacher, masterPricing.priceStudent]);

  useEffect(() => {
    let isMounted = true;
    const fetchOperatorBillingSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('master_billing_settings')
          .select('*')
          .eq('id', 1)
          .maybeSingle();
        if (data && isMounted) {
          if (data.company_name) setOperatorCompany(data.company_name);
          if (data.contact_person) setOperatorContact(data.contact_person);
          if (data.street) setOperatorStreet(data.street);
          if (data.zip_code) setOperatorZip(data.zip_code);
          if (data.city) setOperatorCity(data.city);
          if (data.iban) setOperatorIban(data.iban);
          if (data.bic) setOperatorBic(data.bic);
        }
      } catch (err) {
        console.error('Error fetching operator billing settings:', err);
      }
    };
    fetchOperatorBillingSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  return {
    operatorCompany,
    setOperatorCompany,
    operatorContact,
    setOperatorContact,
    operatorStreet,
    setOperatorStreet,
    operatorZip,
    setOperatorZip,
    operatorCity,
    setOperatorCity,
    operatorIban,
    setOperatorIban,
    operatorBic,
    setOperatorBic,
    currentSchoolProfile,
    setCurrentSchoolProfile,
    effectiveSchoolRates,
    masterRates,
    setMasterRates
  };
}
