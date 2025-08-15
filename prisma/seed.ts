import { PrismaClient, ConversationType, ParticipantRole, MessageType, MessageStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ---------- Clean slate (dev only) ----------
  // Order matters due to FKs
  await prisma.message.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.user.deleteMany();

  // ---------- Users ----------
  const users = [
    {
      id: 'u_alice',
      email: 'alice@example.com',
      password: 'password123', // dev only; hash in real apps!
      name: 'Alice',
      avatarUrl: 'https://i.pravatar.cc/150?img=1',
    },
    {
      id: 'u_bob',
      email: 'bob@example.com',
      password: 'password123',
      name: 'Bob',
      avatarUrl: 'https://i.pravatar.cc/150?img=2',
    },
    {
      id: 'u_charlie',
      email: 'charlie@example.com',
      password: 'password123',
      name: 'Charlie',
      avatarUrl: 'https://i.pravatar.cc/150?img=3',
    },
    {
      id: 'u_bot',
      email: 'bot@chat.local',
      password: 'bot',
      name: 'Chat Assistant',
      avatarUrl: 'https://i.pravatar.cc/150?img=8',
    },
  ];

  await Promise.all(
    users.map((u) =>
      prisma.user.create({
        data: {
          id: u.id,
          email: u.email,
          password: u.password,
          name: u.name,
          avatarUrl: u.avatarUrl,
        },
      }),
    ),
  );

  // ---------- Conversations ----------
  const convDirectAliceBob = await prisma.conversation.create({
    data: {
      id: 'c_alice_bob',
      type: ConversationType.DIRECT,
    },
  });

  const convGroupGeneral = await prisma.conversation.create({
    data: {
      id: 'c_group_general',
      type: ConversationType.GROUP,
      title: 'General',
    },
  });

  const convAI = await prisma.conversation.create({
    data: {
      id: 'c_ai_helper',
      type: ConversationType.AI,
      title: 'Assistant',
    },
  });

  // ---------- Participants ----------
  await prisma.participant.createMany({
    data: [
      // DIRECT: Alice + Bob
      { id: 'p_alice_direct', userId: 'u_alice', conversationId: convDirectAliceBob.id, role: ParticipantRole.MEMBER },
      { id: 'p_bob_direct', userId: 'u_bob', conversationId: convDirectAliceBob.id, role: ParticipantRole.MEMBER },

      // GROUP: Alice (ADMIN), Bob, Charlie
      { id: 'p_alice_group', userId: 'u_alice', conversationId: convGroupGeneral.id, role: ParticipantRole.ADMIN },
      { id: 'p_bob_group', userId: 'u_bob', conversationId: convGroupGeneral.id, role: ParticipantRole.MEMBER },
      { id: 'p_charlie_group', userId: 'u_charlie', conversationId: convGroupGeneral.id, role: ParticipantRole.MEMBER },

      // AI: Alice + Bot
      { id: 'p_alice_ai', userId: 'u_alice', conversationId: convAI.id, role: ParticipantRole.MEMBER },
      { id: 'p_bot_ai', userId: 'u_bot', conversationId: convAI.id, role: ParticipantRole.MEMBER },
    ],
  });

  // ---------- Messages ----------
  // DIRECT messages (with a reply)
  const m1 = await prisma.message.create({
    data: {
      id: 'm1',
      conversationId: convDirectAliceBob.id,
      senderId: 'u_alice',
      type: MessageType.TEXT,
      text: 'Hey Bob! How are you?',
      status: MessageStatus.SENT,
      createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1h ago
    },
  });

  await prisma.message.create({
    data: {
      id: 'm2',
      conversationId: convDirectAliceBob.id,
      senderId: 'u_bob',
      type: MessageType.TEXT,
      text: "I'm good! Just setting up the chat app.",
      status: MessageStatus.DELIVERED,
      replyToMessageId: m1.id,
      createdAt: new Date(Date.now() - 1000 * 60 * 55), // 55m ago
    },
  });

  await prisma.message.create({
    data: {
      id: 'm3',
      conversationId: convDirectAliceBob.id,
      senderId: 'u_alice',
      type: MessageType.IMAGE,
      mediaUrl: 'https://placekitten.com/320/240',
      text: 'Check out this cat 😺',
      status: MessageStatus.READ,
      createdAt: new Date(Date.now() - 1000 * 60 * 54), // 54m ago
    },
  });

  // GROUP messages
  await prisma.message.create({
    data: {
      id: 'm4',
      conversationId: convGroupGeneral.id,
      senderId: 'u_charlie',
      type: MessageType.TEXT,
      text: 'Welcome to the General group!',
      status: MessageStatus.SENT,
      createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30m ago
    },
  });

  await prisma.message.create({
    data: {
      id: 'm5',
      conversationId: convGroupGeneral.id,
      senderId: 'u_bob',
      type: MessageType.FILE,
      mediaUrl: 'https://example.com/files/spec.pdf',
      text: 'Here’s the spec PDF.',
      status: MessageStatus.DELIVERED,
      createdAt: new Date(Date.now() - 1000 * 60 * 25), // 25m ago
    },
  });

  // AI conversation
  await prisma.message.create({
    data: {
      id: 'm6',
      conversationId: convAI.id,
      senderId: 'u_alice',
      type: MessageType.TEXT,
      text: 'Hey Assistant, summarize today’s chat progress.',
      status: MessageStatus.SENT,
      createdAt: new Date(Date.now() - 1000 * 60 * 10), // 10m ago
    },
  });

  await prisma.message.create({
    data: {
      id: 'm7',
      conversationId: convAI.id,
      senderId: 'u_bot',
      type: MessageType.TEXT,
      text: 'Summary: Schema finalized, seed data created, next step is auth + sockets.',
      status: MessageStatus.DELIVERED,
      createdAt: new Date(Date.now() - 1000 * 60 * 9), // 9m ago
    },
  });

  console.log('✅ Seeded: users, conversations, participants, messages');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
