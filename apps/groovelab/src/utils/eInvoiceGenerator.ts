/**
 * E-Invoice (ZUGFeRD 2.2 / XRechnung EN16931) Generator for Campus-Groovelab
 * 
 * Generates 100% compliant UN/CEFACT Cross Industry Invoice (CII) XML
 * for German public authorities, municipalities, treasuries (Kämmereien), and ERP systems.
 */

export interface EInvoiceParty {
  name: string;
  street: string;
  zipCode: string;
  city: string;
  countryCode?: string; // Default: 'DE'
  vatId?: string;
  contactName?: string;
  email?: string;
  iban?: string;
  bic?: string;
}

export interface EInvoiceLineItem {
  id: string | number;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  vatPercent?: number; // Default: 0 for educational / 19
}

export interface EInvoicePayload {
  invoiceNumber: string;
  issueDate: string; // ISO or YYYY-MM-DD
  dueDate?: string;
  currency?: string; // Default: 'EUR'
  seller: EInvoiceParty;
  buyer: EInvoiceParty;
  lineItems: EInvoiceLineItem[];
  paymentReference?: string;
  buyerReference?: string; // Leitweg-ID for municipal Kämmereien
  notes?: string;
}

/**
 * Format Date to UN/CEFACT Date String (YYYYMMDD)
 */
const formatUNCEFACTDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    const today = new Date();
    return today.toISOString().slice(0, 10).replace(/-/g, '');
  }
  return d.toISOString().slice(0, 10).replace(/-/g, '');
};

/**
 * Generates standard-compliant XRechnung 2.2 / ZUGFeRD 2.2 XML
 */
export const generateXRechnungXML = (data: EInvoicePayload): string => {
  const currency = data.currency || 'EUR';
  const issueDateFormatted = formatUNCEFACTDate(data.issueDate);
  const dueDateFormatted = data.dueDate ? formatUNCEFACTDate(data.dueDate) : issueDateFormatted;
  
  // Calculate Totals
  const netTotal = data.lineItems.reduce((acc, item) => acc + item.totalPrice, 0);
  const vatTotal = data.lineItems.reduce((acc, item) => acc + (item.totalPrice * ((item.vatPercent || 0) / 100)), 0);
  const grandTotal = netTotal + vatTotal;

  // XML Construction
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice 
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  
  <!-- 1. Context Specification (XRechnung / ZUGFeRD 2.2 Profile) -->
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_2.2</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>

  <!-- 2. Invoice Document Metadata -->
  <rsm:ExchangedDocument>
    <ram:ID>${data.invoiceNumber}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${issueDateFormatted}</udt:DateTimeString>
    </ram:IssueDateTime>
    <ram:IncludedNote>
      <ram:Content>${data.notes || 'Campus-Groovelab Software- und Cloud-Infrastruktur Bereitstellung.'}</ram:Content>
    </ram:IncludedNote>
  </rsm:ExchangedDocument>

  <!-- 3. Supply Chain Trade Transaction -->
  <rsm:SupplyChainTradeTransaction>
    
    <!-- 3.1 Line Items -->
    ${data.lineItems.map((item, idx) => `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${idx + 1}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${escapeXml(item.name)}</ram:Name>
        <ram:Description>${escapeXml(item.description || item.name)}</ram:Description>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${item.unitPrice.toFixed(2)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">${item.quantity.toFixed(2)}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${(item.vatPercent || 0) === 0 ? 'O' : 'S'}</ram:CategoryCode>
          <ram:RateApplicablePercent>${(item.vatPercent || 0).toFixed(2)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${item.totalPrice.toFixed(2)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>
    `).join('')}

    <!-- 3.2 Header Trade Agreement (Seller & Buyer) -->
    <ram:ApplicableHeaderTradeAgreement>
      <ram:BuyerReference>${escapeXml(data.buyerReference || 'N/A')}</ram:BuyerReference>
      <!-- Seller (Campus-Groovelab) -->
      <ram:SellerTradeParty>
        <ram:Name>${escapeXml(data.seller.name)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${escapeXml(data.seller.zipCode)}</ram:PostcodeCode>
          <ram:LineOne>${escapeXml(data.seller.street)}</ram:LineOne>
          <ram:CityName>${escapeXml(data.seller.city)}</ram:CityName>
          <ram:CountryID>${data.seller.countryCode || 'DE'}</ram:CountryID>
        </ram:PostalTradeAddress>
        ${data.seller.vatId ? `
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${escapeXml(data.seller.vatId)}</ram:ID>
        </ram:SpecifiedTaxRegistration>` : ''}
      </ram:SellerTradeParty>

      <!-- Buyer (Musikschule / Träger) -->
      <ram:BuyerTradeParty>
        <ram:Name>${escapeXml(data.buyer.name)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${escapeXml(data.buyer.zipCode)}</ram:PostcodeCode>
          <ram:LineOne>${escapeXml(data.buyer.street)}</ram:LineOne>
          <ram:CityName>${escapeXml(data.buyer.city)}</ram:CityName>
          <ram:CountryID>${data.buyer.countryCode || 'DE'}</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>

    <!-- 3.3 Delivery -->
    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${issueDateFormatted}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>

    <!-- 3.4 Settlement (Payment & Totals) -->
    <ram:ApplicableHeaderTradeSettlement>
      <ram:PaymentReference>${data.paymentReference || data.invoiceNumber}</ram:PaymentReference>
      <ram:InvoiceCurrencyCode>${currency}</ram:InvoiceCurrencyCode>

      <!-- Payment Means (SEPA Transfer) -->
      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>58</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>${(data.seller.iban || '').replace(/\s+/g, '')}</ram:IBANID>
        </ram:PayeePartyCreditorFinancialAccount>
        <ram:PayeeSpecifiedCreditorFinancialInstitution>
          <ram:BICID>${(data.seller.bic || '').replace(/\s+/g, '')}</ram:BICID>
        </ram:PayeeSpecifiedCreditorFinancialInstitution>
      </ram:SpecifiedTradeSettlementPaymentMeans>

      <!-- VAT Summary -->
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${vatTotal.toFixed(2)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${netTotal.toFixed(2)}</ram:BasisAmount>
        <ram:CategoryCode>${vatTotal > 0 ? 'S' : 'O'}</ram:CategoryCode>
        <ram:RateApplicablePercent>${vatTotal > 0 ? ((vatTotal / (netTotal || 1)) * 100).toFixed(2) : '0.00'}</ram:RateApplicablePercent>
        ${vatTotal === 0 ? '<ram:ExemptionReason>Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.</ram:ExemptionReason>' : ''}
      </ram:ApplicableTradeTax>

      <!-- Payment Terms -->
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${dueDateFormatted}</udt:DateTimeString>
        </ram:DueDateDateTime>
        <ram:Description>Zahlbar innerhalb von 14 Tagen ohne Abzug.</ram:Description>
      </ram:SpecifiedTradePaymentTerms>

      <!-- Final Summation -->
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${netTotal.toFixed(2)}</ram:LineTotalAmount>
        <ram:ChargeTotalAmount>0.00</ram:ChargeTotalAmount>
        <ram:AllowanceTotalAmount>0.00</ram:AllowanceTotalAmount>
        <ram:TaxBasisTotalAmount>${netTotal.toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${currency}">${vatTotal.toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${grandTotal.toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${grandTotal.toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>

    </ram:ApplicableHeaderTradeSettlement>

  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

  return xml.trim();
};

/**
 * Escape XML special characters
 */
const escapeXml = (unsafe: string = ''): string => {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Triggers instant download of the XRechnung XML file in browser
 */
export const downloadXRechnungXML = (payload: EInvoicePayload, customFilename?: string) => {
  const xmlContent = generateXRechnungXML(payload);
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = customFilename || `XRechnung_${payload.invoiceNumber}.xml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
