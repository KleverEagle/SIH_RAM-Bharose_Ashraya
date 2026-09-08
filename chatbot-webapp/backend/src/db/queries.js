/**
 * Abstract database query stubs.
 *
 * All database reads, inserts, updates, and deletes are isolated behind
 * these abstract functions. Implementations will be provided later for
 * the target database (e.g. Firestore).
 */

// Note that conversationId == userId (not stored seperately) for now, since we are only supporting one-on-one conversations.

const db = require('./firebase');
const crypto = require('crypto');
const { FieldValue } = require('firebase-admin/firestore');

async function findUserByUsername(username) {
  const snapshot = await db
    .collection('victims')
    .where('name', '==', username)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const user = snapshot.docs[0];
  const userData = user.data();

  return {
    id: user.id,
    username: userData.name,
    // email: userData.email,
    password_hash: userData.password_hash || null,
    phone: userData.phone || null,
    name: userData.name
  };
  
}
async function findUserById(userId) {
  const user = await db.collection('victims').doc(userId).get();
  if (user.exists) {
    const userData = user.data();
    return {
      id: userId,
      username: userData.name,
      // email: userData.email,
      password_hash: userData.password_hash || null,
      phone: userData.phone || null,
      name: userData.name,
      age: userData.age,
      gender: userData.gender,
      crime_category: userData.crime_category,
      // case_stage: userData.case_stage,
    }
  } else {
    return null;
  }
}

async function findUserByEmail(email) {
  throw new Error('Not implemented');
}

async function updateUser(userId, data) {
  // console.log(`Updating user ${userId} with data:`, data);
  await db
    .collection('victims')
    .doc(userId)
    .update(
      {
        current_distress_score: data.latestDistressScore,
        current_risk_level: data.latestRiskLevel,
        last_interaction: FieldValue.serverTimestamp(),
        needs_escalation: data.needsEscalation,
        recommended_intervention: data.recommendedIntervention,
        latest_emotion: data.latestEmotion,
      }
    );
}

async function findConversationByUserId(userId) {
  const user = await db.collection('victims').doc(userId).get();
  if (user.exists) {
    const userData = user.data();
    return {
      id: userId,
      user_id: userId,
      created_at: userData.created_at || null,
      updated_at: userData.last_interaction || null,
    }
  } else {
    return null;
  }
}

async function createConversation(userId) {
  return null;// On the assumption that th conversation is created when the user is created, we can just return null.
}

async function updateConversation(conversationId, data) {
  await db
    .collection('victims')
    .doc(conversationId)
    .update({lastUpdate: data.updatedAt});
}

async function getMessages(conversationId) {
  const snapshot = await db
    .collection('chats')
    .doc(conversationId)
    .collection('messages')
    .orderBy('timestamp', 'asc')
    .get();

  return snapshot.docs.map(doc => {
    const data = doc.data();

    return {
      id: doc.id,
      role: data.role,
      content: data.text,
      created_at: data.timestamp.toDate().toISOString(),
      conversation_id: conversationId
    };
  });
}
async function createMessage(conversationId, { role, content }) {
  const messageRef = db
    .collection('chats')
    .doc(conversationId)
    .collection('messages')
    .doc();

  const message = {
    role: role,
    text: content,
    timestamp: FieldValue.serverTimestamp(),
  };

  await messageRef.set(message);

  const createdMessage = await messageRef.get();
  const data = createdMessage.data();

  return {
    id: createdMessage.id,
    role: data.role,
    content: data.text,
    created_at: data.timestamp.toDate().toISOString(),
    conversation_id: conversationId
  };
}
module.exports = {
  findUserByUsername,
  findUserById,
  findUserByEmail,
  updateUser,
  findConversationByUserId,
  createConversation,
  updateConversation,
  getMessages,
  createMessage,
};
