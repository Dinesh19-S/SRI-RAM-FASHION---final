import mongoose from 'mongoose';

const FabricPurchaseItemSchema = new mongoose.Schema({
  purchase_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'fabric_purchases',
    required: true
  },
  fabric_name: {
    type: String,
    required: [true, 'Please add a fabric name']
  },
  color: {
    type: String
  },
  gsm: {
    type: Number
  },
  roll_no: {
    type: String
  },
  weight_kg: {
    type: Number,
    required: [true, 'Please add weight in Kg']
  },
  rate_per_kg: {
    type: Number,
    required: [true, 'Please add rate per Kg']
  },
  amount: {
    type: Number,
    required: true
  }
});

export default mongoose.model('fabric_purchase_items', FabricPurchaseItemSchema);
