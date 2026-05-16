import { forwardRef } from 'react';
import InvoiceTemplate from './InvoiceTemplate';

const BillTemplate = forwardRef(function BillTemplate(props, ref) {
  return <InvoiceTemplate ref={ref} {...props} />;
});

export default BillTemplate;
