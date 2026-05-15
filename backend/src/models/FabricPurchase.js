import mongoose from 'mongoose';

const FabricPurchaseSchema = new mongoose.Schema({
  supplier_name: {
    type: String,
    required: [true, 'Please add a supplier name']
  },
  gstin: {
    type: String
  },
  mobile: {
    type: String
  },
  invoice_number: {
    type: String,
    required: [true, 'Please add an invoice number'],
    unique: true
  },
  invoice_date: {
    type: Date,
    required: [true, 'Please add an invoice date']
  },
  transport: {
    type: String
  },
  vehicle_number: {
    type: String
  },
  lr_number: {
    type: String
  },
  total_rolls: {
    type: Number,
    default: 0
  },
  total_weight: {
    type: Number,
    default: 0
  },
  total_amount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export default mongoose.model('fabric_purchases', FabricPurchaseSchema);
