const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

// Item keys
const COUNTER = { PK: 'GAME', SK: 'COUNTER' };       // { count }
const STATS = { PK: 'GAME', SK: 'RETIRE_STATS' };    // aggregate retirement stats

exports.handler = async (event) => {
  const method = event.httpMethod;
  // The resource path (e.g. "/api/games/counter", "/api/startup", "/api/retire", "/api/stats")
  const resource = event.resource || event.path || '';
  let body = {};
  try { body = event.body ? JSON.parse(event.body) : {}; } catch (_) { body = {}; }

  try {
    // ── Games counter ──
    if (resource.endsWith('/games/counter')) {
      if (method === 'PUT') return json(200, await incrementCounter());
      if (method === 'GET') return json(200, { count: await getCount() });
      return json(405, { message: 'Method not allowed' });
    }

    // ── Startup idea save / update ──
    if (resource.endsWith('/startup')) {
      if (method === 'POST') return json(200, await saveStartupIdea(body));
      if (method === 'PUT') return json(200, await updateStartup(body));
      return json(405, { message: 'Method not allowed' });
    }

    // ── Retirement ──
    if (resource.endsWith('/retire')) {
      if (method === 'POST') return json(200, await recordRetirement(body));
      return json(405, { message: 'Method not allowed' });
    }

    // ── Aggregate stats ──
    if (resource.endsWith('/stats')) {
      if (method === 'GET') return json(200, await getStats());
      return json(405, { message: 'Method not allowed' });
    }

    return json(404, { message: 'Not found' });
  } catch (error) {
    console.error('Error:', error);
    return json(500, { message: 'Internal server error' });
  }
};

async function incrementCounter() {
  const result = await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: COUNTER,
    UpdateExpression: 'SET #count = if_not_exists(#count, :zero) + :inc',
    ExpressionAttributeNames: { '#count': 'count' },
    ExpressionAttributeValues: { ':zero': 0, ':inc': 1 },
    ReturnValues: 'UPDATED_NEW',
  }));
  return { message: 'Game started', count: result.Attributes.count };
}

async function getCount() {
  const result = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: COUNTER }));
  return result.Item ? result.Item.count : 0;
}

async function saveStartupIdea(body) {
  const { startupId, name, idea, gameId, week } = body;
  if (!startupId) return { message: 'startupId required' };
  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: 'STARTUP',
      SK: startupId,
      startupId,
      gameId: gameId || null,
      name: name || '',
      idea: idea || '',
      status: 'active',
      foundedWeek: week ?? null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      history: [{ event: 'founded', week: week ?? null, at: Date.now() }],
    },
  }));
  return { message: 'Startup idea saved', startupId };
}

async function updateStartup(body) {
  const { startupId, status, event: evt, week, detail } = body;
  if (!startupId) return { message: 'startupId required' };
  // Append to history and set the latest status
  await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: 'STARTUP', SK: startupId },
    UpdateExpression: 'SET #status = :status, updatedAt = :now, history = list_append(if_not_exists(history, :empty), :entry)',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status': status || 'active',
      ':now': Date.now(),
      ':empty': [],
      ':entry': [{ event: evt || 'update', week: week ?? null, detail: detail || null, at: Date.now() }],
    },
  }));
  return { message: 'Startup updated', startupId, status };
}

async function recordRetirement(body) {
  const { name, age, netWorth, gameId } = body;
  const safeName = name || 'Anonymous';
  const safeAge = Number(age) || 0;
  const safeNetWorth = Number(netWorth) || 0;

  // Store the individual retirement record
  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: 'RETIRE',
      SK: `${Date.now()}_${gameId || Math.random().toString(36).slice(2)}`,
      name: safeName, age: safeAge, netWorth: safeNetWorth, gameId: gameId || null, at: Date.now(),
    },
  }));

  // Update the aggregate stats item
  const current = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: STATS }));
  const s = current.Item || { retirements: 0 };
  const retirements = (s.retirements || 0) + 1;

  let highest = s.highest;
  if (!highest || safeNetWorth > highest.netWorth) {
    highest = { name: safeName, age: safeAge, netWorth: safeNetWorth };
  }
  let youngest = s.youngest;
  if (!youngest || safeAge < youngest.age) {
    youngest = { name: safeName, age: safeAge, netWorth: safeNetWorth };
  }

  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: { ...STATS, retirements, highest, youngest, updatedAt: Date.now() },
  }));

  return { message: 'Retirement recorded', retirements };
}

async function getStats() {
  const [countRes, statsRes] = await Promise.all([
    docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: COUNTER })),
    docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: STATS })),
  ]);
  const gamesStarted = countRes.Item ? countRes.Item.count : 0;
  const s = statsRes.Item || {};
  const retirements = s.retirements || 0;
  return {
    gamesStarted,
    retirements,
    retirementPct: gamesStarted > 0 ? Math.round((retirements / gamesStarted) * 1000) / 10 : 0,
    youngestRetiree: s.youngest || null,
    highestNetWorth: s.highest || null,
  };
}

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: JSON.stringify(payload),
  };
}
