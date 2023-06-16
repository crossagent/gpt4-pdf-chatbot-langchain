// db.ts
import mongoose from 'mongoose';

class Database {
  private connected: boolean;

  constructor() {
    this.connected = false;
  }

  connect(): mongoose.Connection {
    if (!this.connected) {
      mongoose.connect(String(process.env.MONGODB_PATH));
      const db = mongoose.connection;

      db.on('error', console.error.bind(console, 'MongoDB connection error:'));
      db.once('open', function () {
        console.log('MongoDB connected!');
      });

      this.connected = true;
    }
    return mongoose.connection;
  }
}

export default new Database();
