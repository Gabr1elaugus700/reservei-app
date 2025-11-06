import amqp from 'amqplib';

let channel: amqp.Channel | null = null;

export async function getRabbitChannel() {
  if (channel) return channel;
  const connection = await amqp.connect('amqp://guest:guest@localhost');
  channel = await connection.createChannel();
  await channel.assertQueue('reservas', { durable: true });
  return channel;
}