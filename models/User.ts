import mongoose from 'mongoose';
import { UserRole } from '../lib/types';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  empId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: Object.values(UserRole), required: true },
  college: { type: String },
  department: { type: String },
  contactNo: { type: String, required: true }, //contact no field added
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error: any) {
    next(error);
  }
});

export default mongoose.models.User || mongoose.model('User', userSchema);