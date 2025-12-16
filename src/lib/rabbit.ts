import amqp from 'amqplib';

let channel: amqp.Channel | null = null;

// Use RABBITMQ_URL env var or fallback to localhost for development
const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost';

export async function getRabbitChannel() {
  if (channel) return channel;
  
  try {
    const connection = await amqp.connect(rabbitUrl);
    channel = await connection.createChannel();
    await channel.assertQueue('reservas', { durable: true });
    
    // Handle connection errors
    connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err);
      channel = null;
    });
    
    connection.on('close', () => {
      console.warn('RabbitMQ connection closed');
      channel = null;
    });
    
    return channel;
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    throw error;
  }
}