import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

mongoose.connect('mongodb+srv://dineshknight19_db_user:dinesh1910@cluster0.hepq0h5.mongodb.net/sri-ram-fashions').then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({ email: String, role: String, password: String }));
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await User.updateOne({email: 'sriramfashionstrp@gmail.com'}, {$set: {password: hashedPassword}});
  console.log('Password reset successfully to: admin123');
  process.exit(0);
}).catch(console.error);
